package com.nexusai.android

import com.nexusai.android.ai.KnowledgeRagScorer
import com.nexusai.android.ai.VoicePedagogicalCommand
import com.nexusai.android.data.local.KnowledgeConceptLinkEntity
import com.nexusai.android.data.local.KnowledgeEntryEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NexusAIEngineLogicTest {

    @Test
    fun `computeContentHash detects duplicates across accent and case differences`() {
        val h1 = KnowledgeRagScorer.computeContentHash(
            title = "Lei de Ohm",
            subject = "Física",
            content = "V = R * I em circuitos lineares"
        )
        val h2 = KnowledgeRagScorer.computeContentHash(
            title = "lei de ohm",
            subject = "fisica",
            content = "  v = r * i em circuitos lineares "
        )
        val h3 = KnowledgeRagScorer.computeContentHash(
            title = "Segunda Lei de Newton",
            subject = "Física",
            content = "F = m * a"
        )

        assertEquals(h1, h2)
        assertNotEquals(h1, h3)
    }

    @Test
    fun `rankRelevantEntries prioritizes matching subject and boosts linked concepts`() {
        val entries = listOf(
            KnowledgeEntryEntity(
                id = 1,
                title = "Lei de Ohm",
                subject = "Física",
                content = "Relação entre tensão, corrente elétrica e resistência: V = R * I.",
                summary = "V = R * I",
                tags = "eletricidade, circuitos, ohm",
                contentHash = "h1"
            ),
            KnowledgeEntryEntity(
                id = 2,
                title = "Potência Elétrica",
                subject = "Física",
                content = "P = V * I representa a energia dissipada por segundo.",
                summary = "P = V * I",
                tags = "potencia, joule",
                contentHash = "h2"
            ),
            KnowledgeEntryEntity(
                id = 3,
                title = "Fotossíntese",
                subject = "Biologia",
                content = "Conversão de energia luminosa em glicose nos cloroplastos.",
                summary = "Cloroplastos",
                tags = "plantas, clorofila",
                contentHash = "h3"
            )
        )
        val links = listOf(
            KnowledgeConceptLinkEntity(
                id = 10,
                sourceEntryId = 1,
                targetEntryId = 2,
                relationLabel = "fundamenta"
            )
        )

        val ranked = KnowledgeRagScorer.rankRelevantEntries(
            query = "Explica a lei de Ohm na eletricidade",
            entries = entries,
            links = links
        )

        assertTrue(ranked.isNotEmpty())
        assertEquals(1L, ranked.first().entry.id)
        assertTrue(ranked.any { it.entry.id == 2L })
        assertFalse(ranked.any { it.entry.id == 3L })
    }

    @Test
    fun `voice pedagogical and device command classifiers route accurately`() {
        assertEquals(
            VoicePedagogicalCommand.SWITCH_MODE_PROFESSOR,
            KnowledgeRagScorer.detectVoicePedagogicalCommand("Ativa o modo professor")
        )
        assertEquals(
            VoicePedagogicalCommand.SIMPLER_EXPLANATION,
            KnowledgeRagScorer.detectVoicePedagogicalCommand("Explica mais simples")
        )
        assertEquals(
            VoicePedagogicalCommand.MORE_EXAMPLES,
            KnowledgeRagScorer.detectVoicePedagogicalCommand("Dá mais exemplos práticos")
        )
        assertTrue(KnowledgeRagScorer.detectDeviceControlCommand("Toca música cristã"))
        assertFalse(KnowledgeRagScorer.detectDeviceControlCommand("Calcula a derivada de x^2"))
    }
}
