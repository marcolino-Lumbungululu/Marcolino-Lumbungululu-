package com.nexusai.android.ui

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nexusai.android.ai.AiAttachment
import com.nexusai.android.ai.AiUsageStats
import com.nexusai.android.ai.KnowledgeRagScorer
import com.nexusai.android.ai.KnowledgeSaveResult
import com.nexusai.android.ai.NexusAIEngine
import com.nexusai.android.ai.VoicePedagogicalCommand
import com.nexusai.android.data.local.ChatMessageEntity
import com.nexusai.android.data.local.ConversationSessionSummary
import com.nexusai.android.data.local.IntelligenceMode
import com.nexusai.android.data.local.KnowledgeEntryEntity
import com.nexusai.android.data.local.LearnerDepth
import com.nexusai.android.data.local.NexusSettings
import com.nexusai.android.data.local.ThemeMode
import com.nexusai.android.data.local.VoiceModeOption
import com.nexusai.android.data.remote.ScienceSourceDto
import com.nexusai.android.data.remote.UrlValidator
import com.nexusai.android.data.repository.NetworkResult
import com.nexusai.android.data.repository.NexusRepository
import com.nexusai.android.voice.NexusSpeechRecognizer
import com.nexusai.android.voice.NexusTextToSpeech
import com.nexusai.android.voice.SpeechRecognitionState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class ConnectionHealthStatus {
    UNKNOWN,
    CHECKING,
    CONNECTED,
    ERROR
}

enum class VisualHudState(val label: String) {
    DISPONIVEL("NEXUS AI DISPONÍVEL"),
    A_OUVIR("ESTOU A OUVIR"),
    A_PROCESSAR("A RACIOCINAR"),
    A_RESPONDER("A FALAR"),
    A_EXECUTAR("A EXECUTAR OPERAÇÃO")
}

data class ConnectionDiagnostic(
    val status: ConnectionHealthStatus = ConnectionHealthStatus.UNKNOWN,
    val message: String = "Ligação ainda não testada",
    val serverStatus: String? = null,
    val serviceName: String? = null,
    val apiVersion: String? = null,
    val latencyMs: Long? = null,
    val uptimeSeconds: Long? = null,
    val port: Int? = null,
    val endpointUrl: String? = null,
    val checkedAtMillis: Long? = null
)

data class DiagnosticLogEntry(
    val id: Long,
    val status: ConnectionHealthStatus,
    val serverStatus: String?,
    val latencyMs: Long?,
    val apiVersion: String?,
    val endpointUrl: String,
    val detailMessage: String,
    val checkedAtMillis: Long
)

@OptIn(ExperimentalCoroutinesApi::class)
class NexusViewModel(
    private val repository: NexusRepository,
    private val aiEngine: NexusAIEngine,
    private val speechRecognizer: NexusSpeechRecognizer,
    private val textToSpeech: NexusTextToSpeech
) : ViewModel() {

    val settings: StateFlow<NexusSettings> = repository.settingsFlow
        .stateIn(viewModelScope, SharingStarted.Eagerly, NexusSettings())

    val sessions: StateFlow<List<ConversationSessionSummary>> = repository.sessionsFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val messages: StateFlow<List<ChatMessageEntity>> = settings
        .map { it.activeSessionId }
        .flatMapLatest { sessionId ->
            if (sessionId > 0) repository.observeMessages(sessionId) else flowOf(emptyList())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val knowledgeEntries: StateFlow<List<KnowledgeEntryEntity>> = aiEngine.knowledgeEntriesFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val usageStats: StateFlow<AiUsageStats> = aiEngine.usageStats
    val speechState: StateFlow<SpeechRecognitionState> = speechRecognizer.state
    val isSpeaking: StateFlow<Boolean> = textToSpeech.isSpeaking

    private val _inputText = MutableStateFlow("")
    val inputText: StateFlow<String> = _inputText.asStateFlow()

    private val _pendingAttachments = MutableStateFlow<List<AiAttachment>>(emptyList())
    val pendingAttachments: StateFlow<List<AiAttachment>> = _pendingAttachments.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    private val _isExecutingCommand = MutableStateFlow(false)
    val isExecutingCommand: StateFlow<Boolean> = _isExecutingCommand.asStateFlow()

    private val _lastExecutedOperation = MutableStateFlow<String?>(null)
    val lastExecutedOperation: StateFlow<String?> = _lastExecutedOperation.asStateFlow()

    private val _bannerError = MutableStateFlow<String?>(null)
    val bannerError: StateFlow<String?> = _bannerError.asStateFlow()

    private val _statusFeedback = MutableStateFlow<String?>(null)
    val statusFeedback: StateFlow<String?> = _statusFeedback.asStateFlow()

    private val _connectionDiagnostic = MutableStateFlow(ConnectionDiagnostic())
    val connectionDiagnostic: StateFlow<ConnectionDiagnostic> = _connectionDiagnostic.asStateFlow()

    private val _diagnosticHistory = MutableStateFlow<List<DiagnosticLogEntry>>(emptyList())
    val diagnosticHistory: StateFlow<List<DiagnosticLogEntry>> = _diagnosticHistory.asStateFlow()

    private val _urlValidationError = MutableStateFlow<String?>(null)
    val urlValidationError: StateFlow<String?> = _urlValidationError.asStateFlow()

    private var activeQueryJob: Job? = null

    init {
        viewModelScope.launch {
            repository.ensureActiveSession()
            testCloudRunConnection()
        }
    }

    fun onInputChanged(value: String) {
        _inputText.value = value
    }

    fun dismissBannerError() {
        _bannerError.value = null
        speechRecognizer.clearError()
    }

    fun clearStatusFeedback() {
        _statusFeedback.value = null
    }

    fun cancelActiveQuery() {
        aiEngine.cancelActiveRequest()
        activeQueryJob?.cancel()
        activeQueryJob = null
        _isProcessing.value = false
        _statusFeedback.value = "Pedido interrompido pelo utilizador."
    }

    fun attachDocumentUri(uri: Uri, contentResolver: ContentResolver) {
        viewModelScope.launch {
            val loaded = withContext(Dispatchers.IO) {
                runCatching {
                    val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
                    var fileName = "anexo"
                    contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) {
                            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            if (idx >= 0) fileName = cursor.getString(idx) ?: "anexo"
                        }
                    }
                    val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalStateException("Não foi possível ler o ficheiro selecionado.")
                    if (bytes.size > 3 * 1024 * 1024) {
                        throw IllegalArgumentException("O ficheiro excede o limite de 3 MB para análise direta.")
                    }
                    val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    AiAttachment(
                        fileName = fileName,
                        mimeType = mimeType,
                        dataBase64 = b64,
                        sizeBytes = bytes.size
                    )
                }
            }
            loaded.onSuccess { attachment ->
                _pendingAttachments.value = (_pendingAttachments.value + attachment).take(3)
                _statusFeedback.value = "Anexado: ${attachment.fileName}"
            }.onFailure { err ->
                _bannerError.value = err.message ?: "Erro ao anexar ficheiro."
            }
        }
    }

    fun removeAttachment(index: Int) {
        val current = _pendingAttachments.value.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            _pendingAttachments.value = current
        }
    }

    fun sendTextMessage(customText: String? = null, isVoiceInput: Boolean = false) {
        val rawPrompt = (customText ?: _inputText.value).trim()
        val attachmentsSnapshot = _pendingAttachments.value
        if ((rawPrompt.isEmpty() && attachmentsSnapshot.isEmpty()) || _isProcessing.value) return

        val voiceCmd = if (attachmentsSnapshot.isEmpty() && rawPrompt.isNotEmpty()) {
            KnowledgeRagScorer.detectVoicePedagogicalCommand(rawPrompt)
        } else {
            null
        }

        if (voiceCmd != null) {
            if (customText == null) _inputText.value = ""
            when (voiceCmd) {
                VoicePedagogicalCommand.STOP_SPEAKING -> {
                    stopSpeaking()
                    _statusFeedback.value = "Leitura interrompida."
                    return
                }
                VoicePedagogicalCommand.SWITCH_MODE_FAST -> {
                    updateIntelligenceMode(IntelligenceMode.FAST)
                    _statusFeedback.value = "Modo Rápido ativado."
                    speakMessage("Modo Rápido ativado.")
                    return
                }
                VoicePedagogicalCommand.SWITCH_MODE_ADVANCED -> {
                    updateIntelligenceMode(IntelligenceMode.ADVANCED)
                    _statusFeedback.value = "Modo Avançado ativado."
                    speakMessage("Modo Avançado ativado.")
                    return
                }
                VoicePedagogicalCommand.SWITCH_MODE_PROFESSOR -> {
                    updateIntelligenceMode(IntelligenceMode.PROFESSOR)
                    _statusFeedback.value = "Modo Professor Nexus ativado."
                    speakMessage("Modo Professor Nexus ativado. Estou pronto para ensinar passo a passo.")
                    return
                }
                VoicePedagogicalCommand.CONTINUE_EXPLANATION -> {
                    dispatchToEngine("Continua a explicação anterior passo a passo, desenvolvendo o raciocínio.", isVoiceInput, attachmentsSnapshot)
                    return
                }
                VoicePedagogicalCommand.MORE_EXAMPLES -> {
                    dispatchToEngine("Apresenta mais exemplos práticos e do quotidiano sobre o conceito anterior.", isVoiceInput, attachmentsSnapshot)
                    return
                }
                VoicePedagogicalCommand.SIMPLER_EXPLANATION -> {
                    dispatchToEngine("Explica o conceito anterior de forma mais simples, acessível e com analogias fáceis.", isVoiceInput, attachmentsSnapshot)
                    return
                }
                VoicePedagogicalCommand.DEEPER_EXPLANATION -> {
                    dispatchToEngine("Aprofunda a explicação anterior com maior rigor científico, fórmulas e detalhes avançados.", isVoiceInput, attachmentsSnapshot)
                    return
                }
            }
        }

        if (customText == null) {
            _inputText.value = ""
        }
        dispatchToEngine(rawPrompt, isVoiceInput, attachmentsSnapshot)
    }

    fun continueExplanation() = sendTextMessage("Continua a explicação anterior passo a passo.", isVoiceInput = false)
    fun requestMoreExamples() = sendTextMessage("Apresenta mais exemplos práticos sobre o tema anterior.", isVoiceInput = false)
    fun simplifyExplanation() = sendTextMessage("Explica o conceito anterior de forma mais simples.", isVoiceInput = false)
    fun deepenExplanation() = sendTextMessage("Aprofunda a explicação anterior com rigor científico e demonstração.", isVoiceInput = false)

    private fun dispatchToEngine(
        prompt: String,
        isVoiceInput: Boolean,
        attachments: List<AiAttachment>
    ) {
        _bannerError.value = null
        activeQueryJob = viewModelScope.launch {
            val sessionId = repository.ensureActiveSession()
            _isProcessing.value = true

            try {
                when (val result = aiEngine.ask(sessionId, prompt, isVoiceInput, attachments)) {
                    is NetworkResult.Success -> {
                        _pendingAttachments.value = emptyList()
                        _connectionDiagnostic.value = _connectionDiagnostic.value.copy(
                            status = ConnectionHealthStatus.CONNECTED,
                            message = "Cloud Run operacional",
                            serverStatus = _connectionDiagnostic.value.serverStatus ?: "operational"
                        )
                        _isProcessing.value = false
                        _lastExecutedOperation.value = result.data.operationLabel ?: "Resposta gerada"
                        _isExecutingCommand.value = true
                        delay(850)
                        _isExecutingCommand.value = false

                        aiEngine.speakResponse(result.data.message.content, settings.value)
                    }
                    is NetworkResult.Failure -> {
                        _isProcessing.value = false
                        _bannerError.value = result.message
                        _connectionDiagnostic.value = _connectionDiagnostic.value.copy(
                            status = ConnectionHealthStatus.ERROR,
                            message = result.message
                        )
                    }
                }
            } catch (_: CancellationException) {
                _isProcessing.value = false
            } finally {
                activeQueryJob = null
            }
        }
    }

    fun decodeMessageSources(sourcesJson: String?): List<ScienceSourceDto> =
        aiEngine.decodeSources(sourcesJson)

    fun saveAssistantReplyToKnowledge(message: ChatMessageEntity) {
        viewModelScope.launch {
            val derivedTitle = message.content.lineSequence()
                .firstOrNull { it.trim().isNotEmpty() }
                ?.replace(Regex("[#*]"), "")
                ?.trim()
                ?.take(60)
                ?: "Nota Científica NEXUS"
            val result = aiEngine.saveKnowledgeEntry(
                title = derivedTitle,
                subject = "Ciências e Conhecimento",
                content = message.content,
                sourceType = if (message.intelligenceMode == IntelligenceMode.PROFESSOR.apiValue) {
                    "Resumo Professor Nexus"
                } else {
                    "Explicação Verificada"
                },
                tags = listOfNotNull(message.intelligenceMode, message.module).joinToString(", "),
                isVerified = true
            )
            _statusFeedback.value = when (result) {
                is KnowledgeSaveResult.Saved -> "Guardado na Base de Conhecimento Local."
                is KnowledgeSaveResult.DuplicateDetected -> "Conteúdo já existente na Base Local (sem duplicação)."
                is KnowledgeSaveResult.Updated -> "Registo da Base Local atualizado."
            }
        }
    }

    fun saveKnowledgeEntry(
        title: String,
        subject: String,
        content: String,
        tags: String,
        isVerified: Boolean,
        updateExistingId: Long? = null
    ) {
        if (title.isBlank() || content.isBlank()) {
            _statusFeedback.value = "Título e conteúdo são obrigatórios."
            return
        }
        viewModelScope.launch {
            val result = aiEngine.saveKnowledgeEntry(
                title = title,
                subject = subject,
                content = content,
                sourceType = "Nota do Utilizador",
                tags = tags,
                isVerified = isVerified,
                updateExistingId = updateExistingId
            )
            _statusFeedback.value = when (result) {
                is KnowledgeSaveResult.Saved -> "Conhecimento adicionado à Base Local."
                is KnowledgeSaveResult.DuplicateDetected -> "Já existe um registo idêntico (${result.existing.title})."
                is KnowledgeSaveResult.Updated -> "Registo atualizado com sucesso."
            }
        }
    }

    fun linkKnowledgeConcepts(sourceId: Long, targetId: Long, relationLabel: String) {
        viewModelScope.launch {
            aiEngine.linkConcepts(sourceId, targetId, relationLabel)
            _statusFeedback.value = "Conceitos ligados na Base de Conhecimento."
        }
    }

    fun deleteKnowledgeEntry(entryId: Long) {
        viewModelScope.launch {
            aiEngine.deleteKnowledgeEntry(entryId)
            _statusFeedback.value = "Registo removido da Base Local."
        }
    }

    fun startVoiceRecognition() {
        if (_isProcessing.value) return
        if (speechState.value.isListening) {
            speechRecognizer.stopListening()
            return
        }
        textToSpeech.stop()
        _bannerError.value = null

        speechRecognizer.startListening(settings.value.languageTag) { recognizedText ->
            _inputText.value = ""
            sendTextMessage(customText = recognizedText, isVoiceInput = true)
        }
    }

    fun stopVoiceRecognition() {
        speechRecognizer.stopListening()
    }

    fun toggleAutoSpeak() {
        val nextValue = !settings.value.autoSpeakReplies
        viewModelScope.launch {
            repository.updateAutoSpeak(nextValue)
            if (!nextValue) {
                textToSpeech.stop()
            }
        }
    }

    fun updateVoiceMode(mode: VoiceModeOption) {
        viewModelScope.launch {
            repository.updateVoiceMode(mode)
            if (mode == VoiceModeOption.SILENT) {
                textToSpeech.stop()
            }
        }
    }

    fun updateIntelligenceMode(mode: IntelligenceMode) {
        viewModelScope.launch {
            repository.updateIntelligenceMode(mode)
        }
    }

    fun updateLearnerDepth(depth: LearnerDepth) {
        viewModelScope.launch {
            repository.updateLearnerDepth(depth)
        }
    }

    fun updateWebSearchGrounding(enabled: Boolean) {
        viewModelScope.launch {
            repository.updateWebSearchGrounding(enabled)
        }
    }

    fun updateLocalRagEnabled(enabled: Boolean) {
        viewModelScope.launch {
            repository.updateLocalRagEnabled(enabled)
        }
    }

    fun updateCodeVerificationEnabled(enabled: Boolean) {
        viewModelScope.launch {
            repository.updateCodeVerificationEnabled(enabled)
        }
    }

    fun updateCustomVoiceApiEnabled(enabled: Boolean) {
        viewModelScope.launch {
            repository.updateCustomVoiceApiEnabled(enabled)
        }
    }

    fun speakMessage(text: String) {
        val current = settings.value
        aiEngine.speakResponse(text, current.copy(autoSpeakReplies = true, voiceMode = if (current.voiceMode == VoiceModeOption.SILENT) VoiceModeOption.ALTERNATIVE else current.voiceMode))
    }

    fun stopSpeaking() {
        textToSpeech.stop()
    }

    fun testVoiceSample() {
        val current = settings.value
        val sample = when {
            current.languageTag.startsWith("en") ->
                "Hello ${current.userName}. NEXUS AI scientific voice output is active and ready."
            current.languageTag == "pt-BR" ->
                "Olá ${current.userName}. A voz científica do NEXUS AI está configurada e pronta para responder."
            else ->
                "Olá ${current.userName}. A leitura por voz do NEXUS AI está ativa e pronta a ensinar."
        }
        textToSpeech.speak(
            text = sample,
            languageTag = current.languageTag,
            speechRate = current.ttsSpeechRate,
            volume = current.ttsVolume
        )
    }

    fun startNewConversation() {
        textToSpeech.stop()
        viewModelScope.launch {
            repository.createNewSession()
        }
    }

    fun selectConversation(sessionId: Long) {
        textToSpeech.stop()
        viewModelScope.launch {
            repository.selectSession(sessionId)
        }
    }

    fun deleteSelectedConversations(sessionIds: List<Long>) {
        if (sessionIds.isEmpty()) return
        viewModelScope.launch {
            repository.deleteSessions(sessionIds)
        }
    }

    fun saveAndTestCloudRunUrl(rawUrl: String) {
        viewModelScope.launch {
            when (val validation = repository.saveCloudRunUrl(rawUrl)) {
                is UrlValidator.ValidationResult.Valid -> {
                    _urlValidationError.value = null
                    testCloudRunConnection(validation.normalizedBaseUrl)
                }
                is UrlValidator.ValidationResult.Invalid -> {
                    _urlValidationError.value = validation.errorMessage
                }
            }
        }
    }

    fun testCloudRunConnection(overrideUrl: String? = null) {
        viewModelScope.launch {
            val targetBase = overrideUrl ?: settings.value.cloudRunBaseUrl
            val normalizedPreview = when (val validation = UrlValidator.validateHttpsBaseUrl(targetBase)) {
                is UrlValidator.ValidationResult.Valid -> "${validation.normalizedBaseUrl}health"
                is UrlValidator.ValidationResult.Invalid -> targetBase
            }
            val previous = _connectionDiagnostic.value
            _connectionDiagnostic.value = previous.copy(
                status = ConnectionHealthStatus.CHECKING,
                message = "A verificar /health no Cloud Run…",
                endpointUrl = normalizedPreview
            )
            val checkedAt = System.currentTimeMillis()
            when (val res = repository.checkEndpointHealthDiagnostic(overrideUrl)) {
                is NetworkResult.Success -> {
                    val data = res.data
                    val health = data.health
                    val apiVersionLabel = health.apiVersion?.takeIf { it.isNotBlank() } ?: "v1beta"
                    val summaryMessage =
                        "Ligado (${health.service.ifBlank { "nexus-ai" }} • ${health.status.ifBlank { "operational" }} • ${data.latencyMs} ms)"
                    _connectionDiagnostic.value = ConnectionDiagnostic(
                        status = ConnectionHealthStatus.CONNECTED,
                        message = summaryMessage,
                        serverStatus = health.status.ifBlank { "operational" },
                        serviceName = health.service.ifBlank { "nexus-ai" },
                        apiVersion = apiVersionLabel,
                        latencyMs = data.latencyMs,
                        uptimeSeconds = health.uptimeSeconds,
                        port = health.port,
                        endpointUrl = data.endpointUrl,
                        checkedAtMillis = data.checkedAtMillis
                    )
                    _diagnosticHistory.value = (
                        listOf(
                            DiagnosticLogEntry(
                                id = data.checkedAtMillis,
                                status = ConnectionHealthStatus.CONNECTED,
                                serverStatus = health.status.ifBlank { "operational" },
                                latencyMs = data.latencyMs,
                                apiVersion = apiVersionLabel,
                                endpointUrl = data.endpointUrl,
                                detailMessage = "HTTP 200 OK • ${data.latencyMs} ms",
                                checkedAtMillis = data.checkedAtMillis
                            )
                        ) + _diagnosticHistory.value
                    ).take(15)
                }
                is NetworkResult.Failure -> {
                    _connectionDiagnostic.value = ConnectionDiagnostic(
                        status = ConnectionHealthStatus.ERROR,
                        message = res.message,
                        serverStatus = "offline",
                        serviceName = previous.serviceName,
                        apiVersion = previous.apiVersion,
                        latencyMs = null,
                        uptimeSeconds = null,
                        port = null,
                        endpointUrl = normalizedPreview,
                        checkedAtMillis = checkedAt
                    )
                    _diagnosticHistory.value = (
                        listOf(
                            DiagnosticLogEntry(
                                id = checkedAt,
                                status = ConnectionHealthStatus.ERROR,
                                serverStatus = "erro",
                                latencyMs = null,
                                apiVersion = null,
                                endpointUrl = normalizedPreview,
                                detailMessage = res.message,
                                checkedAtMillis = checkedAt
                            )
                        ) + _diagnosticHistory.value
                    ).take(15)
                }
            }
        }
    }

    fun updateUserName(name: String) {
        viewModelScope.launch { repository.updateUserName(name) }
    }

    fun updateLanguageTag(tag: String) {
        viewModelScope.launch { repository.updateLanguageTag(tag) }
    }

    fun updateAutoSpeak(enabled: Boolean) {
        viewModelScope.launch {
            repository.updateAutoSpeak(enabled)
            if (!enabled) textToSpeech.stop()
        }
    }

    fun updateTtsRate(rate: Float) {
        viewModelScope.launch { repository.updateTtsRate(rate) }
    }

    fun updateTtsVolume(volume: Float) {
        viewModelScope.launch { repository.updateTtsVolume(volume) }
    }

    fun updateHighThinking(enabled: Boolean) {
        viewModelScope.launch { repository.updateHighThinking(enabled) }
    }

    fun updateThemeMode(mode: ThemeMode) {
        viewModelScope.launch { repository.updateThemeMode(mode) }
    }

    class Factory(
        private val repository: NexusRepository,
        private val aiEngine: NexusAIEngine,
        private val speechRecognizer: NexusSpeechRecognizer,
        private val textToSpeech: NexusTextToSpeech
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return NexusViewModel(repository, aiEngine, speechRecognizer, textToSpeech) as T
        }
    }
}
