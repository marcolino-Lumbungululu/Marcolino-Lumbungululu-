package com.nexusai.android.ai

import com.nexusai.android.data.local.KnowledgeConceptLinkEntity
import com.nexusai.android.data.local.KnowledgeEntryEntity
import java.security.MessageDigest
import java.text.Normalizer
import java.util.Locale

data class ScoredKnowledgeEntry(
    val entry: KnowledgeEntryEntity,
    val score: Double
)

enum class VoicePedagogicalCommand {
    SWITCH_MODE_FAST,
    SWITCH_MODE_ADVANCED,
    SWITCH_MODE_PROFESSOR,
    CONTINUE_EXPLANATION,
    MORE_EXAMPLES,
    SIMPLER_EXPLANATION,
    DEEPER_EXPLANATION,
    STOP_SPEAKING
}

object KnowledgeRagScorer {

    private val STOP_WORDS = setOf(
        "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
        "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "sob", "sobre",
        "que", "qual", "quais", "quem", "como", "onde", "quando", "porque", "por que",
        "e", "ou", "mas", "se", "ao", "aos", "pelo", "pela", "entre", "ate", "the", "and",
        "for", "with", "what", "why", "how", "is", "are", "in", "on", "of", "to", "me",
        "explica", "explique", "calcula", "calcule", "resolve", "resolva", "fala", "diz"
    )

    private val DEVICE_CONTROL_PREFIXES = listOf(
        "toca musica", "tocar musica", "abre o", "abrir o", "abre a", "abrir a",
        "abrir galeria", "mostrar os videos", "mostrar videos", "listar aplicacoes",
        "pausar musica", "parar musica", "proxima faixa", "faixa anterior",
        "ativar modo estudo e abrir"
    )

    fun normalizeText(input: String): String {
        val decomposed = Normalizer.normalize(input.trim().lowercase(Locale.ROOT), Normalizer.Form.NFD)
        return decomposed
            .replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
            .replace(Regex("[^a-z0-9\\s+\\-*/=.]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    fun tokenizeKeywords(input: String): Set<String> {
        return normalizeText(input)
            .split(" ")
            .asSequence()
            .map { it.trim('.', ',', ';', ':', '?', '!', '(', ')') }
            .filter { it.length >= 2 && it !in STOP_WORDS }
            .toSet()
    }

    fun computeContentHash(title: String, subject: String, content: String): String {
        val canonical = "${normalizeText(title)}|${normalizeText(subject)}|${normalizeText(content)}"
        val digest = MessageDigest.getInstance("SHA-256").digest(canonical.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun rankRelevantEntries(
        query: String,
        entries: List<KnowledgeEntryEntity>,
        links: List<KnowledgeConceptLinkEntity> = emptyList(),
        limit: Int = 5
    ): List<ScoredKnowledgeEntry> {
        if (entries.isEmpty() || query.isBlank()) return emptyList()

        val normalizedQuery = normalizeText(query)
        val queryTokens = tokenizeKeywords(query)
        if (queryTokens.isEmpty() && normalizedQuery.length < 3) return emptyList()

        val rawScores = entries.map { entry ->
            val normTitle = normalizeText(entry.title)
            val normSubject = normalizeText(entry.subject)
            val normTags = normalizeText(entry.tags)
            val entryTokens = tokenizeKeywords("${entry.title} ${entry.subject} ${entry.tags} ${entry.summary} ${entry.content}")

            var score = 0.0
            if (normTitle.isNotEmpty() && (normalizedQuery.contains(normTitle) || normTitle.contains(normalizedQuery))) {
                score += 6.0
            }
            if (normSubject.isNotEmpty() && normalizedQuery.contains(normSubject)) {
                score += 2.5
            }
            val titleTokens = tokenizeKeywords(entry.title)
            val tagTokens = tokenizeKeywords(entry.tags)

            for (token in queryTokens) {
                if (token in titleTokens) score += 3.0
                if (token in tagTokens) score += 2.2
                if (normSubject.contains(token)) score += 1.5
                if (token in entryTokens) score += 1.0
            }

            if (entry.isVerified && score > 0.0) {
                score += 0.4
            }
            ScoredKnowledgeEntry(entry = entry, score = score)
        }.associateBy { it.entry.id }.toMutableMap()

        // Boost linked concepts when a primary concept strongly matches
        val topMatchedIds = rawScores.values
            .filter { it.score >= 2.0 }
            .sortedByDescending { it.score }
            .take(2)
            .map { it.entry.id }
            .toSet()

        if (topMatchedIds.isNotEmpty() && links.isNotEmpty()) {
            for (link in links) {
                if (link.sourceEntryId in topMatchedIds) {
                    rawScores[link.targetEntryId]?.let { existing ->
                        rawScores[link.targetEntryId] = existing.copy(score = existing.score + 1.8)
                    }
                }
                if (link.targetEntryId in topMatchedIds) {
                    rawScores[link.sourceEntryId]?.let { existing ->
                        rawScores[link.sourceEntryId] = existing.copy(score = existing.score + 1.8)
                    }
                }
            }
        }

        return rawScores.values
            .filter { it.score > 0.5 }
            .sortedWith(
                compareByDescending<ScoredKnowledgeEntry> { it.score }
                    .thenByDescending { it.entry.updatedAt }
            )
            .take(limit)
    }

    fun detectDeviceControlCommand(prompt: String): Boolean {
        val norm = normalizeText(prompt)
        return DEVICE_CONTROL_PREFIXES.any { norm.startsWith(it) }
    }

    fun detectVoicePedagogicalCommand(prompt: String): VoicePedagogicalCommand? {
        val norm = normalizeText(prompt)
        return when {
            norm == "parar" || norm == "interromper" || norm == "silencio" || norm == "para de falar" ->
                VoicePedagogicalCommand.STOP_SPEAKING
            norm.contains("modo professor") || norm.contains("ativa professor") || norm.contains("ativar professor") ->
                VoicePedagogicalCommand.SWITCH_MODE_PROFESSOR
            norm.contains("modo rapido") || norm.contains("ativa modo rapido") ->
                VoicePedagogicalCommand.SWITCH_MODE_FAST
            norm.contains("modo avancado") || norm.contains("ativa modo avancado") ->
                VoicePedagogicalCommand.SWITCH_MODE_ADVANCED
            norm == "continua" || norm == "continuar" || norm.contains("continua a explicacao") || norm.contains("prossegue") ->
                VoicePedagogicalCommand.CONTINUE_EXPLANATION
            norm.contains("mais exemplos") || norm.contains("da um exemplo") || norm.contains("exemplos praticos") ->
                VoicePedagogicalCommand.MORE_EXAMPLES
            norm.contains("explica mais simples") || norm.contains("mais simples") || norm.contains("simplifica") ->
                VoicePedagogicalCommand.SIMPLER_EXPLANATION
            norm.contains("aprofunda") || norm.contains("mais detalhes") || norm.contains("mais profundo") || norm.contains("aprofundar") ->
                VoicePedagogicalCommand.DEEPER_EXPLANATION
            else -> null
        }
    }
}
