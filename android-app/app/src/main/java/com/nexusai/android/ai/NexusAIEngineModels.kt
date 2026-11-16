package com.nexusai.android.ai

import com.nexusai.android.data.local.ChatMessageEntity
import com.nexusai.android.data.local.KnowledgeEntryEntity
import com.nexusai.android.data.remote.ScienceSourceDto
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

data class AiAttachment(
    val fileName: String,
    val mimeType: String,
    val dataBase64: String,
    val sizeBytes: Int
)

data class AiUsageStats(
    val sessionRequests: Int = 0,
    val promptTokens: Int = 0,
    val candidateTokens: Int = 0,
    val totalTokens: Int = 0,
    val estimatedCostUsd: Double = 0.0
)

sealed interface KnowledgeSaveResult {
    data class Saved(val entry: KnowledgeEntryEntity) : KnowledgeSaveResult
    data class DuplicateDetected(val existing: KnowledgeEntryEntity) : KnowledgeSaveResult
    data class Updated(val entry: KnowledgeEntryEntity) : KnowledgeSaveResult
}

data class EngineAskOutcome(
    val message: ChatMessageEntity,
    val sources: List<ScienceSourceDto> = emptyList(),
    val isDeviceOperation: Boolean = false,
    val operationLabel: String? = null
)

object ScienceSourceCodec {
    fun encode(json: Json, sources: List<ScienceSourceDto>): String? {
        if (sources.isEmpty()) return null
        return runCatching { json.encodeToString(sources) }.getOrNull()
    }

    fun decode(json: Json, raw: String?): List<ScienceSourceDto> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching { json.decodeFromString<List<ScienceSourceDto>>(raw) }
            .getOrDefault(emptyList())
    }
}
