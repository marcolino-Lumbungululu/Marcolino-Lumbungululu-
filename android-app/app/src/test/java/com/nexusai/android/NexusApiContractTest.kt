package com.nexusai.android

import com.nexusai.android.data.remote.InterpretRequest
import com.nexusai.android.data.remote.LocalKnowledgeSnippetDto
import com.nexusai.android.data.remote.NexusApiService
import com.nexusai.android.data.remote.ScienceChatRequest
import com.nexusai.android.data.remote.TtsCustomVoiceProfileDto
import com.nexusai.android.data.remote.TtsSettingsDto
import com.nexusai.android.data.remote.TtsSynthesizeRequest
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class NexusApiContractTest {

    private lateinit var server: MockWebServer
    private lateinit var service: NexusApiService

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        explicitNulls = false
    }

    @Before
    fun setup() {
        server = MockWebServer()
        server.start()
        service = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(NexusApiService::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `parses root health endpoint with apiVersion matching server_ts`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"ok":true,"status":"operational","service":"nexus-ai","apiVersion":"v1beta","port":3000,"uptimeSeconds":42}""")
        )

        val health = service.checkRootHealth()
        val recorded = server.takeRequest()
        assertEquals("/health", recorded.path)
        assertEquals("GET", recorded.method)
        assertTrue(health.ok)
        assertEquals("operational", health.status)
        assertEquals("nexus-ai", health.service)
        assertEquals("v1beta", health.apiVersion)
        assertEquals(3000, health.port)
    }

    @Test
    fun `parses api health response matching server_ts`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"ok":true,"status":"operational","service":"nexus-ai","apiVersion":"v1beta","port":3000,"uptimeSeconds":42}""")
        )

        val health = service.checkHealth()
        assertTrue(health.ok)
        assertEquals("operational", health.status)
        assertEquals("nexus-ai", health.service)
        assertEquals("v1beta", health.apiVersion)
        assertEquals(3000, health.port)
    }

    @Test
    fun `parses api ai interpret response matching server_ts`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "assistantReply": "Olá Utilizador, consigo responder às suas perguntas.",
                      "needsClarification": false,
                      "thinkingSummary": null,
                      "intent": {
                        "module": "conversation",
                        "action": "chat",
                        "params": {
                          "query": null,
                          "category": null,
                          "app": null,
                          "trigger": null,
                          "trackNumber": null
                        },
                        "confidence": 0.94
                      }
                    }
                    """.trimIndent()
                )
        )

        val res = service.interpret(
            InterpretRequest(
                command = "Olá Nexus",
                userName = "Utilizador",
                language = "pt-AO"
            )
        )

        val recorded = server.takeRequest()
        assertEquals("/api/ai/interpret", recorded.path)
        assertEquals("POST", recorded.method)
        assertEquals("Olá Utilizador, consigo responder às suas perguntas.", res.assistantReply)
        assertFalse(res.needsClarification)
        assertEquals("conversation", res.intent?.module)
        assertEquals("chat", res.intent?.action)
    }

    @Test
    fun `parses api ai science response with grounding sources, code verification and usage`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "answer": "1. Identificação do problema: Determinar V = R * I. 7. Resultado final: 12 V.",
                      "modeUsed": "PROFESSOR",
                      "learnerDepth": "INTERMEDIO",
                      "modelUsed": "gemini-4-hydrogen",
                      "usedLocalKnowledge": true,
                      "usedWebSearch": true,
                      "usedCodeExecution": true,
                      "codeExecutionResult": "V = 12.0",
                      "sources": [
                        { "title": "Lei de Ohm - Física", "uri": "https://pt.wikipedia.org/wiki/Lei_de_Ohm" }
                      ],
                      "usage": {
                        "promptTokens": 410,
                        "candidateTokens": 320,
                        "totalTokens": 730
                      }
                    }
                    """.trimIndent()
                )
        )

        val res = service.askScienceEngine(
            ScienceChatRequest(
                question = "Calcula a tensão com R=4 ohm e I=3 A",
                mode = "PROFESSOR",
                localKnowledgeContext = listOf(
                    LocalKnowledgeSnippetDto(
                        title = "Lei de Ohm",
                        subject = "Física",
                        excerpt = "V = R * I"
                    )
                )
            )
        )

        val recorded = server.takeRequest()
        assertEquals("/api/ai/science", recorded.path)
        assertEquals("POST", recorded.method)
        assertEquals("PROFESSOR", res.modeUsed)
        assertTrue(res.usedLocalKnowledge)
        assertTrue(res.usedWebSearch)
        assertTrue(res.usedCodeExecution)
        assertEquals("V = 12.0", res.codeExecutionResult)
        assertEquals(1, res.sources.size)
        assertEquals("https://pt.wikipedia.org/wiki/Lei_de_Ohm", res.sources.first().uri)
        assertEquals(730, res.usage?.totalTokens)
    }

    @Test
    fun `parses api ai tts response matching server_ts`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "audioBase64": "UklGRg==",
                      "mimeType": "audio/wav",
                      "modelUsed": "gemini-3.8-flash-tts",
                      "voiceName": "Kore",
                      "fallbackRecommended": false
                    }
                    """.trimIndent()
                )
        )

        val res = service.synthesizeCustomVoice(
            TtsSynthesizeRequest(
                text = "A aceleração é 2 metros por segundo ao quadrado.",
                customVoiceProfile = TtsCustomVoiceProfileDto(consentGranted = true),
                settings = TtsSettingsDto(language = "pt-AO", assistantUserName = "Ana")
            )
        )

        val recorded = server.takeRequest()
        assertEquals("/api/ai/tts", recorded.path)
        assertFalse(res.fallbackRecommended)
        assertEquals("audio/wav", res.mimeType)
        assertEquals("UklGRg==", res.audioBase64)
    }
}
