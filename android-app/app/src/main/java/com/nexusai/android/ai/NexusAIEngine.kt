package com.nexusai.android.ai

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.nexusai.android.data.local.ChatMessageEntity
import com.nexusai.android.data.local.IntelligenceMode
import com.nexusai.android.data.local.KnowledgeConceptLinkEntity
import com.nexusai.android.data.local.KnowledgeDao
import com.nexusai.android.data.local.KnowledgeEntryEntity
import com.nexusai.android.data.local.NexusDao
import com.nexusai.android.data.local.NexusSettings
import com.nexusai.android.data.local.UserSettingsStore
import com.nexusai.android.data.local.VoiceModeOption
import com.nexusai.android.data.remote.DynamicRetrofitProvider
import com.nexusai.android.data.remote.HistoryMessageDto
import com.nexusai.android.data.remote.InterpretRequest
import com.nexusai.android.data.remote.LocalKnowledgeSnippetDto
import com.nexusai.android.data.remote.ScienceAttachmentDto
import com.nexusai.android.data.remote.ScienceChatRequest
import com.nexusai.android.data.remote.ScienceSourceDto
import com.nexusai.android.data.remote.TtsCustomVoiceProfileDto
import com.nexusai.android.data.remote.TtsSettingsDto
import com.nexusai.android.data.remote.TtsSynthesizeRequest
import com.nexusai.android.data.repository.NetworkResult
import com.nexusai.android.voice.NexusTextToSpeech
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicReference

/**
 * Motor independente de Inteligência Artificial Avançada (NexusAIEngine).
 * Responsável por raciocínio científico, modo Professor Nexus, contexto multi-turno,
 * RAG local sobre Room, pesquisa web fundamentada, análise multimodal e síntese de voz.
 * Todas as chamadas Gemini passam exclusivamente pelo servidor Cloud Run seguro (zero chaves no APK).
 */
class NexusAIEngine(
    private val context: Context,
    private val chatDao: NexusDao,
    private val knowledgeDao: KnowledgeDao,
    private val settingsStore: UserSettingsStore,
    private val retrofitProvider: DynamicRetrofitProvider,
    private val textToSpeech: NexusTextToSpeech
) {
    private val engineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val activeRequestJob = AtomicReference<Job?>(null)

    private val _usageStats = MutableStateFlow(AiUsageStats())
    val usageStats: StateFlow<AiUsageStats> = _usageStats.asStateFlow()

    val knowledgeEntriesFlow: Flow<List<KnowledgeEntryEntity>> = knowledgeDao.observeAllEntries()

    fun observeConceptLinks(entryId: Long): Flow<List<KnowledgeConceptLinkEntity>> =
        knowledgeDao.observeConceptLinksForEntry(entryId)

    fun cancelActiveRequest() {
        activeRequestJob.getAndSet(null)?.cancel()
    }

    suspend fun ask(
        sessionId: Long,
        prompt: String,
        isVoiceInput: Boolean,
        attachments: List<AiAttachment> = emptyList(),
        modeOverride: IntelligenceMode? = null
    ): NetworkResult<EngineAskOutcome> = withContext(Dispatchers.IO) {
        val cleanPrompt = prompt.trim()
        if (cleanPrompt.isEmpty() && attachments.isEmpty()) {
            return@withContext NetworkResult.Failure("Escreve, dita ou anexa um material científico primeiro.")
        }

        val currentJob = currentCoroutineContext()[Job]
        activeRequestJob.set(currentJob)

        val settings = settingsStore.settingsFlow.first()
        val effectiveMode = modeOverride ?: settings.intelligenceMode
        val now = System.currentTimeMillis()
        val displayPrompt = cleanPrompt.ifEmpty {
            "Analisa os anexos científicos enviados (${attachments.joinToString { it.fileName }})."
        }

        // 1. Guarda imediatamente a mensagem do utilizador no Room
        chatDao.insertMessage(
            ChatMessageEntity(
                sessionId = sessionId,
                role = "user",
                content = displayPrompt,
                isVoiceInput = isVoiceInput,
                timestamp = now
            )
        )

        val currentSession = chatDao.getSessionById(sessionId)
        val existingHistory = chatDao.getConversationMessagesSnapshot(sessionId)
        if (currentSession != null && currentSession.title == "Nova conversa") {
            val derivedTitle = displayPrompt.take(42).let {
                if (displayPrompt.length > 42) "$it…" else it
            }
            chatDao.updateSessionMetadata(sessionId, derivedTitle, now)
        } else {
            chatDao.touchSession(sessionId, now)
        }

        // 2. Pesquisa na Base de Conhecimento Local (Room RAG)
        val localSnippets = if (settings.localRagEnabled) {
            retrieveRelevantLocalKnowledge(displayPrompt)
        } else {
            emptyList()
        }

        // 3. Recuperação offline: responde a partir da Base de Conhecimento Local se disponível
        if (!isNetworkConnected()) {
            if (localSnippets.isNotEmpty()) {
                val offlineRagReply = buildOfflineRagFallbackReply(displayPrompt, localSnippets)
                val entity = ChatMessageEntity(
                    sessionId = sessionId,
                    role = "assistant",
                    content = offlineRagReply,
                    module = "knowledge_rag",
                    action = "offline_rag",
                    intelligenceMode = effectiveMode.apiValue,
                    usedLocalKnowledge = true,
                    usedWebSearch = false,
                    timestamp = System.currentTimeMillis()
                )
                val savedId = chatDao.insertMessage(entity)
                return@withContext NetworkResult.Success(
                    EngineAskOutcome(
                        message = entity.copy(id = savedId),
                        operationLabel = "Base Local (Offline)"
                    )
                )
            }
            val offlineMsg = "Sem ligação à internet. Verifica a tua rede ou guarda notas na Base de Conhecimento para consulta offline."
            chatDao.insertMessage(
                ChatMessageEntity(
                    sessionId = sessionId,
                    role = "error",
                    content = offlineMsg,
                    timestamp = System.currentTimeMillis()
                )
            )
            return@withContext NetworkResult.Failure(offlineMsg)
        }

        // 4. Gestão inteligente do histórico (máx. 10 turnos anteriores e limite de caracteres)
        val historyPayload = buildBoundedHistoryPayload(existingHistory.dropLast(1))

        return@withContext try {
            val service = retrofitProvider.getService(settings.cloudRunBaseUrl)

            // Rota de controlo de módulos/dispositivo vs Raciocínio Científico Avançado
            if (attachments.isEmpty() && KnowledgeRagScorer.detectDeviceControlCommand(displayPrompt)) {
                val interpretResp = service.interpret(
                    InterpretRequest(
                        command = displayPrompt,
                        history = historyPayload,
                        userName = settings.userName,
                        language = settings.languageTag,
                        highThinking = effectiveMode != IntelligenceMode.FAST
                    )
                )
                val entity = ChatMessageEntity(
                    sessionId = sessionId,
                    role = "assistant",
                    content = interpretResp.assistantReply,
                    thinkingSummary = interpretResp.thinkingSummary,
                    module = interpretResp.intent?.module,
                    action = interpretResp.intent?.action,
                    intelligenceMode = effectiveMode.apiValue,
                    timestamp = System.currentTimeMillis()
                )
                val savedId = chatDao.insertMessage(entity)
                chatDao.touchSession(sessionId, System.currentTimeMillis())
                return@withContext NetworkResult.Success(
                    EngineAskOutcome(
                        message = entity.copy(id = savedId),
                        isDeviceOperation = true,
                        operationLabel = interpretResp.intent?.action ?: interpretResp.intent?.module
                    )
                )
            }

            val scienceRequest = ScienceChatRequest(
                question = displayPrompt,
                mode = effectiveMode.apiValue,
                learnerDepth = settings.learnerDepth.apiValue,
                language = settings.languageTag,
                userName = settings.userName,
                enableWebSearch = settings.webSearchGroundingEnabled,
                enableCodeVerification = settings.codeVerificationEnabled,
                history = historyPayload,
                localKnowledgeContext = localSnippets,
                attachments = attachments.map {
                    ScienceAttachmentDto(
                        mimeType = it.mimeType,
                        dataBase64 = it.dataBase64,
                        fileName = it.fileName
                    )
                }
            )

            val response = service.askScienceEngine(scienceRequest)
            recordUsage(response.usage?.promptTokens ?: 0, response.usage?.candidateTokens ?: 0, response.usage?.totalTokens ?: 0)

            val encodedSources = ScienceSourceCodec.encode(retrofitProvider.json, response.sources)
            val assistantEntity = ChatMessageEntity(
                sessionId = sessionId,
                role = "assistant",
                content = response.answer,
                module = "nexus_science_engine",
                action = response.modeUsed.lowercase(),
                intelligenceMode = response.modeUsed,
                sourcesJson = encodedSources,
                codeVerification = response.codeExecutionResult,
                usedLocalKnowledge = response.usedLocalKnowledge,
                usedWebSearch = response.usedWebSearch,
                timestamp = System.currentTimeMillis()
            )
            val savedId = chatDao.insertMessage(assistantEntity)
            chatDao.touchSession(sessionId, System.currentTimeMillis())

            NetworkResult.Success(
                EngineAskOutcome(
                    message = assistantEntity.copy(id = savedId),
                    sources = response.sources,
                    operationLabel = when (effectiveMode) {
                        IntelligenceMode.FAST -> "Modo Rápido"
                        IntelligenceMode.PROFESSOR -> "Professor Nexus"
                        IntelligenceMode.ADVANCED -> "Raciocínio Científico"
                    }
                )
            )
        } catch (ce: CancellationException) {
            throw ce
        } catch (t: Throwable) {
            val errMessage = retrofitProvider.formatThrowable(t)
            chatDao.insertMessage(
                ChatMessageEntity(
                    sessionId = sessionId,
                    role = "error",
                    content = errMessage,
                    timestamp = System.currentTimeMillis()
                )
            )
            NetworkResult.Failure(errMessage)
        } finally {
            activeRequestJob.compareAndSet(currentJob, null)
        }
    }

    fun speakResponse(text: String, settings: NexusSettings) {
        if (!settings.autoSpeakReplies || settings.voiceMode == VoiceModeOption.SILENT) {
            textToSpeech.stop()
            return
        }

        val shouldTryCustomVoice =
            settings.voiceMode == VoiceModeOption.CUSTOM &&
                settings.customVoiceApiEnabled &&
                isNetworkConnected()

        if (!shouldTryCustomVoice) {
            textToSpeech.speak(
                text = text,
                languageTag = settings.languageTag,
                speechRate = settings.ttsSpeechRate,
                volume = settings.ttsVolume,
                voiceMode = settings.voiceMode
            )
            return
        }

        engineScope.launch {
            try {
                val service = retrofitProvider.getService(settings.cloudRunBaseUrl)
                val ttsResp = service.synthesizeCustomVoice(
                    TtsSynthesizeRequest(
                        text = text.take(1800),
                        customVoiceProfile = TtsCustomVoiceProfileDto(
                            consentGranted = true,
                            geminiVoiceName = "Kore",
                            acousticStylePrompt = "Voz clara, didática e natural em ${settings.languageTag}.",
                            aiDisclosureEnabled = false
                        ),
                        settings = TtsSettingsDto(
                            language = settings.languageTag,
                            assistantUserName = settings.userName
                        )
                    )
                )
                val audioB64 = ttsResp.audioBase64
                if (!ttsResp.fallbackRecommended && !audioB64.isNullOrBlank()) {
                    withContext(Dispatchers.Main) {
                        textToSpeech.playWavBase64(audioB64, settings.ttsVolume) {
                            textToSpeech.speak(
                                text = text,
                                languageTag = settings.languageTag,
                                speechRate = settings.ttsSpeechRate,
                                volume = settings.ttsVolume,
                                voiceMode = VoiceModeOption.MALE
                            )
                        }
                    }
                    return@launch
                }
            } catch (_: Throwable) {
                // Fallback transparente para o TextToSpeech nativo do Android
            }
            withContext(Dispatchers.Main) {
                textToSpeech.speak(
                    text = text,
                    languageTag = settings.languageTag,
                    speechRate = settings.ttsSpeechRate,
                    volume = settings.ttsVolume,
                    voiceMode = VoiceModeOption.MALE
                )
            }
        }
    }

    suspend fun saveKnowledgeEntry(
        title: String,
        subject: String,
        content: String,
        sourceType: String = "Nota do Utilizador",
        tags: String = "",
        isVerified: Boolean = true,
        updateExistingId: Long? = null
    ): KnowledgeSaveResult = withContext(Dispatchers.IO) {
        val cleanTitle = title.trim()
        val cleanSubject = subject.trim().ifEmpty { "Ciências Gerais" }
        val cleanContent = content.trim()
        val hash = KnowledgeRagScorer.computeContentHash(cleanTitle, cleanSubject, cleanContent)
        val summary = cleanContent.take(220).let { if (cleanContent.length > 220) "$it…" else it }
        val now = System.currentTimeMillis()

        if (updateExistingId != null) {
            val current = knowledgeDao.getEntryById(updateExistingId)
            if (current != null) {
                val updated = current.copy(
                    title = cleanTitle,
                    subject = cleanSubject,
                    content = cleanContent,
                    summary = summary,
                    sourceType = sourceType,
                    tags = tags.trim(),
                    contentHash = hash,
                    isVerified = isVerified,
                    updatedAt = now
                )
                knowledgeDao.updateEntry(updated)
                return@withContext KnowledgeSaveResult.Updated(updated)
            }
        }

        val duplicate = knowledgeDao.findByContentHash(hash)
        if (duplicate != null) {
            return@withContext KnowledgeSaveResult.DuplicateDetected(duplicate)
        }

        val entry = KnowledgeEntryEntity(
            title = cleanTitle,
            subject = cleanSubject,
            content = cleanContent,
            summary = summary,
            sourceType = sourceType,
            tags = tags.trim(),
            contentHash = hash,
            isVerified = isVerified,
            createdAt = now,
            updatedAt = now
        )
        val insertedId = knowledgeDao.insertEntry(entry)
        KnowledgeSaveResult.Saved(entry.copy(id = insertedId))
    }

    suspend fun linkConcepts(
        sourceEntryId: Long,
        targetEntryId: Long,
        relationLabel: String
    ) = withContext(Dispatchers.IO) {
        if (sourceEntryId == targetEntryId) return@withContext
        knowledgeDao.insertConceptLink(
            KnowledgeConceptLinkEntity(
                sourceEntryId = sourceEntryId,
                targetEntryId = targetEntryId,
                relationLabel = relationLabel.trim().ifEmpty { "relacionado com" }
            )
        )
    }

    suspend fun deleteKnowledgeEntry(entryId: Long) = withContext(Dispatchers.IO) {
        knowledgeDao.deleteEntryById(entryId)
    }

    suspend fun searchLocalKnowledge(query: String): List<KnowledgeEntryEntity> = withContext(Dispatchers.IO) {
        if (query.isBlank()) return@withContext knowledgeDao.getAllEntriesSnapshot()
        val entries = knowledgeDao.getAllEntriesSnapshot()
        val links = knowledgeDao.getAllConceptLinksSnapshot()
        val ranked = KnowledgeRagScorer.rankRelevantEntries(query, entries, links, limit = 25)
        if (ranked.isNotEmpty()) {
            ranked.map { it.entry }
        } else {
            knowledgeDao.searchEntries(query.trim())
        }
    }

    fun decodeSources(sourcesJson: String?): List<ScienceSourceDto> =
        ScienceSourceCodec.decode(retrofitProvider.json, sourcesJson)

    private suspend fun retrieveRelevantLocalKnowledge(query: String): List<LocalKnowledgeSnippetDto> {
        val allEntries = knowledgeDao.getAllEntriesSnapshot()
        if (allEntries.isEmpty()) return emptyList()
        val links = knowledgeDao.getAllConceptLinksSnapshot()
        return KnowledgeRagScorer.rankRelevantEntries(query, allEntries, links, limit = 4)
            .map { scored ->
                LocalKnowledgeSnippetDto(
                    title = scored.entry.title,
                    subject = scored.entry.subject,
                    excerpt = scored.entry.content.take(1200),
                    sourceType = "${scored.entry.sourceType}${if (scored.entry.isVerified) " (Verificado)" else ""}"
                )
            }
    }

    private fun buildBoundedHistoryPayload(messages: List<ChatMessageEntity>): List<HistoryMessageDto> {
        val selected = mutableListOf<HistoryMessageDto>()
        var charBudget = 18000
        for (msg in messages.asReversed()) {
            if (selected.size >= 10) break
            val clipped = msg.content.take(3000)
            if (charBudget - clipped.length < 0 && selected.isNotEmpty()) break
            charBudget -= clipped.length
            selected.add(HistoryMessageDto(role = msg.role, content = clipped))
        }
        return selected.reversed()
    }

    private fun buildOfflineRagFallbackReply(
        query: String,
        snippets: List<LocalKnowledgeSnippetDto>
    ): String {
        val header = "Modo Offline (Base de Conhecimento Local Room):\nEncontrei ${snippets.size} registo(s) local(is) relevante(s) para \"$query\":\n"
        val body = snippets.joinToString("\n\n") { snippet ->
            "• ${snippet.title} [${snippet.subject} — ${snippet.sourceType ?: "Base Local"}]:\n${snippet.excerpt}"
        }
        return "$header\n$body\n\nNota: Para raciocínio Gemini aprofundado ou pesquisa científica online, restabelece a ligação à internet."
    }

    private fun recordUsage(promptTokens: Int, candidateTokens: Int, totalTokens: Int) {
        val incrementalCost = (promptTokens * 0.0000001) + (candidateTokens * 0.0000004)
        val prev = _usageStats.value
        _usageStats.value = AiUsageStats(
            sessionRequests = prev.sessionRequests + 1,
            promptTokens = prev.promptTokens + promptTokens,
            candidateTokens = prev.candidateTokens + candidateTokens,
            totalTokens = prev.totalTokens + totalTokens,
            estimatedCostUsd = prev.estimatedCostUsd + incrementalCost
        )
    }

    private fun isNetworkConnected(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
