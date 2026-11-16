package com.nexusai.android.data.remote

import com.nexusai.android.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.ConnectionSpec
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLException

class DynamicRetrofitProvider {

    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        explicitNulls = false
    }

    private val okHttpClient: OkHttpClient by lazy {
        val builder = OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .writeTimeout(45, TimeUnit.SECONDS)
            .callTimeout(105, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .connectionSpecs(listOf(ConnectionSpec.MODERN_TLS, ConnectionSpec.COMPATIBLE_TLS))

        if (BuildConfig.DEBUG) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }
            builder.addInterceptor(logging)
        }

        builder.build()
    }

    @Volatile
    private var cachedBaseUrl: String? = null

    @Volatile
    private var cachedService: NexusApiService? = null

    fun getService(rawBaseUrl: String): NexusApiService {
        val validation = UrlValidator.validateHttpsBaseUrl(rawBaseUrl)
        val normalizedUrl = when (validation) {
            is UrlValidator.ValidationResult.Valid -> validation.normalizedBaseUrl
            is UrlValidator.ValidationResult.Invalid -> throw IllegalArgumentException(validation.errorMessage)
        }

        val currentUrl = cachedBaseUrl
        val currentService = cachedService
        if (currentUrl == normalizedUrl && currentService != null) {
            return currentService
        }

        synchronized(this) {
            if (cachedBaseUrl == normalizedUrl && cachedService != null) {
                return cachedService!!
            }
            val retrofit = Retrofit.Builder()
                .baseUrl(normalizedUrl)
                .client(okHttpClient)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()

            val created = retrofit.create(NexusApiService::class.java)
            cachedBaseUrl = normalizedUrl
            cachedService = created
            return created
        }
    }

    fun formatThrowable(error: Throwable): String {
        return when (error) {
            is IllegalArgumentException -> error.message ?: "URL do servidor inválida."
            is UnknownHostException ->
                "Sem ligação à internet ou endereço Cloud Run não encontrado. Verifica a tua rede e a URL nas Configurações."
            is SocketTimeoutException ->
                "Tempo limite esgotado ao aguardar resposta do servidor NEXUS AI. Tenta novamente."
            is ConnectException ->
                "Não foi possível ligar ao servidor Cloud Run neste momento."
            is SSLException ->
                "Falha na verificação de segurança HTTPS (TLS). Confirma se o endereço Cloud Run é válido."
            is HttpException -> {
                val rawBody = error.response()?.errorBody()?.string()
                val serverMessage = rawBody?.let { body ->
                    runCatching { json.decodeFromString<ApiErrorResponse>(body).error }.getOrNull()
                }
                when (error.code()) {
                    400 -> serverMessage ?: "Pedido inválido enviado ao servidor (HTTP 400)."
                    404 -> "Endpoint não encontrado no servidor Cloud Run (HTTP 404). Confirma a URL base nas Configurações."
                    503 -> serverMessage ?: "O serviço Gemini no servidor está temporariamente indisponível (HTTP 503)."
                    else -> serverMessage ?: "Erro do servidor NEXUS AI (HTTP ${error.code()})."
                }
            }
            is IOException ->
                "Falha de rede durante a comunicação com o servidor. Verifica a tua ligação."
            else -> error.localizedMessage ?: "Erro inesperado ao comunicar com o NEXUS AI."
        }
    }
}
