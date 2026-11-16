package com.nexusai.android.data.remote

import kotlinx.serialization.Serializable

/**
 * Modelos exatos que refletem os contratos JSON do servidor NEXUS AI em server.ts.
 */
@Serializable
data class HealthResponse(
    val ok: Boolean = false,
    val status: String = "",
    val service: String = "",
    val apiVersion: String? = null,
    val port: Int? = null,
    val uptimeSeconds: Long? = null
)

@Serializable
data class HistoryMessageDto(
    val role: String, // "user" | "assistant"
    val content: String
)

@Serializable
data class InterpretRequest(
    val command: String,
    val history: List<HistoryMessageDto> = emptyList(),
    val userName: String = "Utilizador",
    val language: String = "pt-AO",
    val highThinking: Boolean = false,
    val availableTracks: List<String> = emptyList(),
    val availableFiles: List<String> = emptyList(),
    val availableAutomations: List<String> = emptyList(),
    val currentTrackTitle: String? = null,
    val currentDocumentTitle: String? = null
)

@Serializable
data class IntentParamsDto(
    val query: String? = null,
    val category: String? = null,
    val app: String? = null,
    val trigger: String? = null,
    val trackNumber: Int? = null
)

@Serializable
data class NexusIntentDto(
    val module: String = "conversation",
    val action: String = "chat",
    val params: IntentParamsDto? = null,
    val confidence: Double? = null
)

@Serializable
data class InterpretResponse(
    val assistantReply: String,
    val needsClarification: Boolean = false,
    val thinkingSummary: String? = null,
    val intent: NexusIntentDto? = null
)

@Serializable
data class DocumentAnalyzeRequest(
    val title: String = "Documento",
    val pageNumber: Int = 1,
    val content: String,
    val task: String = "summarize", // "summarize" | "explain"
    val language: String = "pt-AO"
)

@Serializable
data class DocumentAnalyzeResponse(
    val result: String
)

@Serializable
data class ScienceAttachmentDto(
    val mimeType: String,
    val dataBase64: String,
    val fileName: String? = null
)

@Serializable
data class LocalKnowledgeSnippetDto(
    val title: String,
    val subject: String,
    val excerpt: String,
    val sourceType: String? = null
)

@Serializable
data class ScienceSourceDto(
    val title: String,
    val uri: String
)

@Serializable
data class ScienceUsageDto(
    val promptTokens: Int = 0,
    val candidateTokens: Int = 0,
    val totalTokens: Int = 0
)

@Serializable
data class ScienceChatRequest(
    val question: String,
    val mode: String = "ADVANCED", // "FAST" | "ADVANCED" | "PROFESSOR"
    val learnerDepth: String = "INTERMEDIO", // "INICIANTE" | "INTERMEDIO" | "AVANCADO"
    val language: String = "pt-AO",
    val userName: String = "Utilizador",
    val enableWebSearch: Boolean = true,
    val enableCodeVerification: Boolean = true,
    val history: List<HistoryMessageDto> = emptyList(),
    val localKnowledgeContext: List<LocalKnowledgeSnippetDto> = emptyList(),
    val attachments: List<ScienceAttachmentDto> = emptyList()
)

@Serializable
data class ScienceChatResponse(
    val answer: String,
    val modeUsed: String = "ADVANCED",
    val learnerDepth: String = "INTERMEDIO",
    val modelUsed: String = "gemini-4-hydrogen",
    val usedLocalKnowledge: Boolean = false,
    val usedWebSearch: Boolean = false,
    val usedCodeExecution: Boolean = false,
    val codeExecutionResult: String? = null,
    val sources: List<ScienceSourceDto> = emptyList(),
    val usage: ScienceUsageDto? = null
)

@Serializable
data class TtsCustomVoiceProfileDto(
    val consentGranted: Boolean = true,
    val geminiVoiceName: String = "Kore",
    val acousticStylePrompt: String = "",
    val aiDisclosureEnabled: Boolean = false
)

@Serializable
data class TtsSettingsDto(
    val language: String = "pt-AO",
    val assistantUserName: String = "Utilizador"
)

@Serializable
data class TtsSynthesizeRequest(
    val text: String,
    val customVoiceProfile: TtsCustomVoiceProfileDto,
    val settings: TtsSettingsDto
)

@Serializable
data class TtsSynthesizeResponse(
    val audioBase64: String? = null,
    val mimeType: String? = null,
    val modelUsed: String? = null,
    val voiceName: String? = null,
    val fallbackRecommended: Boolean = false,
    val reason: String? = null,
    val aiDisclosure: String? = null
)

@Serializable
data class ApiErrorResponse(
    val error: String? = null
)
