package com.nexusai.android.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.nexusai.android.data.local.ChatMessageEntity
import com.nexusai.android.data.local.ConversationSessionEntity
import com.nexusai.android.data.local.ConversationSessionSummary
import com.nexusai.android.data.local.IntelligenceMode
import com.nexusai.android.data.local.LearnerDepth
import com.nexusai.android.data.local.NexusDao
import com.nexusai.android.data.local.NexusSettings
import com.nexusai.android.data.local.ThemeMode
import com.nexusai.android.data.local.UserSettingsStore
import com.nexusai.android.data.local.VoiceModeOption
import com.nexusai.android.data.remote.DynamicRetrofitProvider
import com.nexusai.android.data.remote.HealthResponse
import com.nexusai.android.data.remote.HistoryMessageDto
import com.nexusai.android.data.remote.InterpretRequest
import com.nexusai.android.data.remote.InterpretResponse
import com.nexusai.android.data.remote.UrlValidator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext

sealed interface NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>
    data class Failure(val message: String) : NetworkResult<Nothing>
}

data class HealthDiagnosticResult(
    val health: HealthResponse,
    val latencyMs: Long,
    val endpointUrl: String,
    val checkedAtMillis: Long
)

class NexusRepository(
    private val context: Context,
    private val dao: NexusDao,
    private val settingsStore: UserSettingsStore,
    private val retrofitProvider: DynamicRetrofitProvider
) {

    val settingsFlow: Flow<NexusSettings> = settingsStore.settingsFlow
    val sessionsFlow: Flow<List<ConversationSessionSummary>> = dao.observeSessions()

    fun observeMessages(sessionId: Long): Flow<List<ChatMessageEntity>> =
        dao.observeMessagesForSession(sessionId)

    suspend fun ensureActiveSession(): Long = withContext(Dispatchers.IO) {
        val currentSettings = settingsStore.settingsFlow.first()
        if (currentSettings.activeSessionId > 0) {
            val existing = dao.getSessionById(currentSettings.activeSessionId)
            if (existing != null) {
                return@withContext existing.id
            }
        }
        val latest = dao.getLatestSession()
        if (latest != null) {
            settingsStore.updateActiveSessionId(latest.id)
            return@withContext latest.id
        }
        createNewSession()
    }

    suspend fun createNewSession(initialTitle: String = "Nova conversa"): Long =
        withContext(Dispatchers.IO) {
            val now = System.currentTimeMillis()
            val id = dao.insertSession(
                ConversationSessionEntity(
                    title = initialTitle,
                    createdAt = now,
                    updatedAt = now
                )
            )
            settingsStore.updateActiveSessionId(id)
            id
        }

    suspend fun selectSession(sessionId: Long) = withContext(Dispatchers.IO) {
        settingsStore.updateActiveSessionId(sessionId)
    }

    suspend fun deleteSessions(sessionIds: List<Long>) = withContext(Dispatchers.IO) {
        if (sessionIds.isEmpty()) return@withContext
        val currentActive = settingsStore.settingsFlow.first().activeSessionId
        dao.deleteSessionsByIds(sessionIds)
        if (currentActive in sessionIds) {
            val next = dao.getLatestSession()
            if (next != null) {
                settingsStore.updateActiveSessionId(next.id)
            } else {
                createNewSession()
            }
        }
    }

    suspend fun checkServerHealth(overrideUrl: String? = null): NetworkResult<HealthResponse> {
        return when (val diagnostic = checkEndpointHealthDiagnostic(overrideUrl)) {
            is NetworkResult.Success -> NetworkResult.Success(diagnostic.data.health)
            is NetworkResult.Failure -> diagnostic
        }
    }

    suspend fun checkEndpointHealthDiagnostic(
        overrideUrl: String? = null
    ): NetworkResult<HealthDiagnosticResult> = withContext(Dispatchers.IO) {
        if (!isNetworkConnected()) {
            return@withContext NetworkResult.Failure(
                "Sem ligação à internet no telemóvel. Ativa o Wi-Fi ou dados móveis e tenta novamente."
            )
        }
        val rawUrl = overrideUrl ?: settingsStore.settingsFlow.first().cloudRunBaseUrl
        val validation = UrlValidator.validateHttpsBaseUrl(rawUrl)
        val normalizedBaseUrl = when (validation) {
            is UrlValidator.ValidationResult.Valid -> validation.normalizedBaseUrl
            is UrlValidator.ValidationResult.Invalid -> {
                return@withContext NetworkResult.Failure(validation.errorMessage)
            }
        }
        val endpointUrl = "${normalizedBaseUrl}health"
        try {
            val service = retrofitProvider.getService(normalizedBaseUrl)
            val startedAtNs = System.nanoTime()
            val response = service.checkRootHealth()
            val latencyMs = ((System.nanoTime() - startedAtNs) / 1_000_000L).coerceAtLeast(1L)
            if (response.ok) {
                NetworkResult.Success(
                    HealthDiagnosticResult(
                        health = response,
                        latencyMs = latencyMs,
                        endpointUrl = endpointUrl,
                        checkedAtMillis = System.currentTimeMillis()
                    )
                )
            } else {
                NetworkResult.Failure(
                    "O servidor respondeu em ${latencyMs} ms, mas indicou estado indisponível (${response.status})."
                )
            }
        } catch (t: Throwable) {
            NetworkResult.Failure(retrofitProvider.formatThrowable(t))
        }
    }

    suspend fun sendCommand(
        sessionId: Long,
        prompt: String,
        isVoiceInput: Boolean
    ): NetworkResult<ChatMessageEntity> = withContext(Dispatchers.IO) {
        val cleanPrompt = prompt.trim()
        if (cleanPrompt.isEmpty()) {
            return@withContext NetworkResult.Failure("Escreve ou dita uma mensagem primeiro.")
        }

        val settings = settingsStore.settingsFlow.first()
        val now = System.currentTimeMillis()

        // 1. Guarda imediatamente a mensagem do utilizador na memória local (Room)
        dao.insertMessage(
            ChatMessageEntity(
                sessionId = sessionId,
                role = "user",
                content = cleanPrompt,
                isVoiceInput = isVoiceInput,
                timestamp = now
            )
        )

        val currentSession = dao.getSessionById(sessionId)
        val existingHistory = dao.getConversationMessagesSnapshot(sessionId)
        if (currentSession != null && currentSession.title == "Nova conversa") {
            val derivedTitle = cleanPrompt.take(42).let {
                if (cleanPrompt.length > 42) "$it…" else it
            }
            dao.updateSessionMetadata(sessionId, derivedTitle, now)
        } else {
            dao.touchSession(sessionId, now)
        }

        if (!isNetworkConnected()) {
            val offlineMsg = "Sem ligação à internet. Não foi possível contactar o servidor NEXUS AI."
            dao.insertMessage(
                ChatMessageEntity(
                    sessionId = sessionId,
                    role = "error",
                    content = offlineMsg,
                    timestamp = System.currentTimeMillis()
                )
            )
            return@withContext NetworkResult.Failure(offlineMsg)
        }

        // Histórico recente enviado ao backend existente (máx. 8 turnos antes da pergunta atual)
        val historyPayload = existingHistory
            .dropLast(1)
            .takeLast(8)
            .map { HistoryMessageDto(role = it.role, content = it.content) }

        return@withContext try {
            val service = retrofitProvider.getService(settings.cloudRunBaseUrl)
            val response: InterpretResponse = service.interpret(
                InterpretRequest(
                    command = cleanPrompt,
                    history = historyPayload,
                    userName = settings.userName,
                    language = settings.languageTag,
                    highThinking = settings.highThinking
                )
            )

            val assistantEntity = ChatMessageEntity(
                sessionId = sessionId,
                role = "assistant",
                content = response.assistantReply,
                thinkingSummary = response.thinkingSummary,
                module = response.intent?.module,
                action = response.intent?.action,
                isVoiceInput = false,
                timestamp = System.currentTimeMillis()
            )
            val savedId = dao.insertMessage(assistantEntity)
            dao.touchSession(sessionId, System.currentTimeMillis())

            NetworkResult.Success(assistantEntity.copy(id = savedId))
        } catch (t: Throwable) {
            val errMessage = retrofitProvider.formatThrowable(t)
            dao.insertMessage(
                ChatMessageEntity(
                    sessionId = sessionId,
                    role = "error",
                    content = errMessage,
                    timestamp = System.currentTimeMillis()
                )
            )
            NetworkResult.Failure(errMessage)
        }
    }

    suspend fun saveCloudRunUrl(rawUrl: String): UrlValidator.ValidationResult {
        val result = UrlValidator.validateHttpsBaseUrl(rawUrl)
        if (result is UrlValidator.ValidationResult.Valid) {
            settingsStore.updateCloudRunUrl(result.normalizedBaseUrl)
        }
        return result
    }

    suspend fun updateUserName(name: String) = settingsStore.updateUserName(name)
    suspend fun updateLanguageTag(tag: String) = settingsStore.updateLanguageTag(tag)
    suspend fun updateAutoSpeak(enabled: Boolean) = settingsStore.updateAutoSpeak(enabled)
    suspend fun updateVoiceMode(mode: VoiceModeOption) = settingsStore.updateVoiceMode(mode)
    suspend fun updateTtsRate(rate: Float) = settingsStore.updateTtsRate(rate)
    suspend fun updateTtsVolume(volume: Float) = settingsStore.updateTtsVolume(volume)
    suspend fun updateHighThinking(enabled: Boolean) = settingsStore.updateHighThinking(enabled)
    suspend fun updateIntelligenceMode(mode: IntelligenceMode) = settingsStore.updateIntelligenceMode(mode)
    suspend fun updateLearnerDepth(depth: LearnerDepth) = settingsStore.updateLearnerDepth(depth)
    suspend fun updateWebSearchGrounding(enabled: Boolean) = settingsStore.updateWebSearchGrounding(enabled)
    suspend fun updateLocalRagEnabled(enabled: Boolean) = settingsStore.updateLocalRagEnabled(enabled)
    suspend fun updateCodeVerificationEnabled(enabled: Boolean) = settingsStore.updateCodeVerificationEnabled(enabled)
    suspend fun updateCustomVoiceApiEnabled(enabled: Boolean) = settingsStore.updateCustomVoiceApiEnabled(enabled)
    suspend fun updateThemeMode(mode: ThemeMode) = settingsStore.updateThemeMode(mode)

    private fun isNetworkConnected(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
