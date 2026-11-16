package com.nexusai.android.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.AddComment
import androidx.compose.material.icons.rounded.AttachFile
import androidx.compose.material.icons.rounded.BookmarkAdd
import androidx.compose.material.icons.rounded.Cancel
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Code
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Speed
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.nexusai.android.R
import com.nexusai.android.ai.AiAttachment
import com.nexusai.android.data.local.ChatMessageEntity
import com.nexusai.android.data.local.IntelligenceMode
import com.nexusai.android.data.local.NexusSettings
import com.nexusai.android.data.local.VoiceModeOption
import com.nexusai.android.data.remote.ScienceSourceDto
import com.nexusai.android.ui.ConnectionDiagnostic
import com.nexusai.android.ui.ConnectionHealthStatus
import com.nexusai.android.ui.VisualHudState
import com.nexusai.android.ui.components.HolographicModuleAction
import com.nexusai.android.ui.components.HolographicNexusCore
import com.nexusai.android.ui.gestures.nexusGestureNavigation
import com.nexusai.android.ui.theme.NexusDarkBlue
import com.nexusai.android.ui.theme.NexusDeepBlack
import com.nexusai.android.ui.theme.NexusLuminousCyan
import com.nexusai.android.ui.theme.NexusSoftWhite
import com.nexusai.android.ui.theme.NexusTechBlue
import com.nexusai.android.ui.theme.SuccessGreen
import com.nexusai.android.voice.SpeechRecognitionState
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAssistantScreen(
    settings: NexusSettings,
    messages: List<ChatMessageEntity>,
    inputText: String,
    pendingAttachments: List<AiAttachment>,
    isProcessing: Boolean,
    isExecutingCommand: Boolean,
    lastExecutedOperation: String?,
    isSpeaking: Boolean,
    speechState: SpeechRecognitionState,
    bannerError: String?,
    statusFeedback: String?,
    connectionDiagnostic: ConnectionDiagnostic,
    decodeSources: (String?) -> List<ScienceSourceDto>,
    onInputChange: (String) -> Unit,
    onSendText: () -> Unit,
    onCancelRequest: () -> Unit,
    onAttachDocumentUri: (Uri) -> Unit,
    onRemoveAttachment: (Int) -> Unit,
    onQuickPrompt: (String) -> Unit,
    onContinueExplanation: () -> Unit,
    onSimplifyExplanation: () -> Unit,
    onRequestMoreExamples: () -> Unit,
    onDeepenExplanation: () -> Unit,
    onSaveMessageToKnowledge: (ChatMessageEntity) -> Unit,
    onMicClick: () -> Unit,
    onUpdateVoiceMode: (VoiceModeOption) -> Unit,
    onUpdateIntelligenceMode: (IntelligenceMode) -> Unit,
    onSpeakMessage: (String) -> Unit,
    onStopSpeaking: () -> Unit,
    onNewConversation: () -> Unit,
    onDismissError: () -> Unit,
    onClearStatusFeedback: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenKnowledgeBase: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenDiagnostics: () -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    var showMemorySheet by remember { mutableStateOf(false) }
    var showVoiceModeDialog by remember { mutableStateOf(false) }
    var showExtrasDialog by remember { mutableStateOf(false) }

    val visualState = when {
        isExecutingCommand -> VisualHudState.A_EXECUTAR
        isProcessing -> VisualHudState.A_PROCESSAR
        isSpeaking -> VisualHudState.A_RESPONDER
        speechState.isListening -> VisualHudState.A_OUVIR
        else -> VisualHudState.DISPONIVEL
    }

    val documentPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            onAttachDocumentUri(uri)
        }
    }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            onMicClick()
        } else {
            scope.launch {
                snackbarHostState.showSnackbar(
                    "Permissão de microfone recusada. Ativa-a nas definições do Android."
                )
            }
        }
    }

    val handleMicButton = {
        if (speechState.isListening) {
            onMicClick()
        } else {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
            if (granted) {
                onMicClick()
            } else {
                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    LaunchedEffect(messages.size, showMemorySheet) {
        if (showMemorySheet && messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    LaunchedEffect(speechState.errorMessage) {
        val err = speechState.errorMessage
        if (!err.isNullOrBlank()) {
            snackbarHostState.showSnackbar(err)
        }
    }

    LaunchedEffect(statusFeedback) {
        val feedback = statusFeedback
        if (!feedback.isNullOrBlank()) {
            snackbarHostState.showSnackbar(feedback)
            onClearStatusFeedback()
        }
    }

    val latestAssistantReply = remember(messages, settings.userName) {
        messages.lastOrNull { it.role == "assistant" }?.content
            ?: "Olá, ${settings.userName}. Toca no microfone central, escolhe o modo (Rápido / Avançado / Professor) ou escreve uma questão científica."
    }

    val recognizedDisplay = remember(speechState.partialText, messages) {
        speechState.partialText.ifBlank {
            messages.lastOrNull { it.role == "user" }?.content ?: ""
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = NexusDeepBlack,
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = NexusDeepBlack
                ),
                navigationIcon = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(start = 12.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_nexus_logo),
                            contentDescription = "Logótipo NEXUS AI",
                            modifier = Modifier.size(32.dp)
                        )
                    }
                },
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "NEXUS AI",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = NexusSoftWhite
                        )
                        ConnectionStatusPill(
                            diagnostic = connectionDiagnostic,
                            onClick = onOpenDiagnostics
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onOpenKnowledgeBase) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.MenuBook,
                            contentDescription = "Base de Conhecimento Local",
                            tint = NexusLuminousCyan
                        )
                    }
                    IconButton(onClick = onNewConversation) {
                        Icon(
                            imageVector = Icons.Rounded.AddComment,
                            contentDescription = "Nova conversa",
                            tint = NexusLuminousCyan
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(NexusDeepBlack)
                .padding(innerPadding)
                .imePadding()
                .nexusGestureNavigation(
                    onSwipeUp = { showMemorySheet = true },
                    onSwipeDown = {
                        when {
                            showMemorySheet -> showMemorySheet = false
                            isSpeaking -> onStopSpeaking()
                        }
                    },
                    onSwipeRight = onOpenHistory,
                    onSwipeLeft = onOpenSettings,
                    onDoubleTap = handleMicButton
                )
        ) {
            if (isProcessing) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LinearProgressIndicator(
                        modifier = Modifier.weight(1f),
                        color = NexusLuminousCyan,
                        trackColor = NexusDarkBlue
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    TextButton(
                        onClick = onCancelRequest,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Cancel,
                            contentDescription = "Cancelar pedido",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Cancelar", color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            AnimatedVisibility(visible = !bannerError.isNullOrBlank()) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = bannerError.orEmpty(),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = onDismissError) {
                            Text("Fechar")
                        }
                    }
                }
            }

            // Faixa discreta de seleção dos 3 modos de inteligência (Rápido / Avançado / Professor)
            IntelligenceModeSelectorBar(
                activeMode = settings.intelligenceMode,
                onSelectMode = { mode ->
                    onUpdateIntelligenceMode(mode)
                    scope.launch {
                        snackbarHostState.showSnackbar("${mode.label}: ${mode.description}")
                    }
                }
            )

            // Núcleo Holográfico Futurista (Ecrã Principal preservado)
            HolographicNexusCore(
                visualState = visualState,
                voiceMode = settings.voiceMode,
                rmsDb = speechState.rmsDb,
                isListening = speechState.isListening,
                isSpeaking = isSpeaking,
                highThinking = settings.intelligenceMode != IntelligenceMode.FAST,
                recognizedCommand = recognizedDisplay,
                latestAssistantReply = latestAssistantReply,
                lastExecutedOperation = lastExecutedOperation,
                onMicClick = handleMicButton,
                onLateralNodeClick = { action ->
                    when (action) {
                        HolographicModuleAction.MUSICA ->
                            onQuickPrompt("Toca música cristã ou abre as minhas músicas")
                        HolographicModuleAction.DOCUMENTOS ->
                            onOpenKnowledgeBase()
                        HolographicModuleAction.FOTOGRAFIAS ->
                            documentPickerLauncher.launch(arrayOf("image/*", "application/pdf", "text/*"))
                        HolographicModuleAction.VIDEOS ->
                            onQuickPrompt("Mostrar os vídeos disponíveis")
                        HolographicModuleAction.APLICACOES ->
                            onQuickPrompt("Listar aplicações e permissões configuradas")
                        HolographicModuleAction.PESQUISA ->
                            showMemorySheet = true
                        HolographicModuleAction.INTELIGENCIA_IA -> {
                            val nextMode = when (settings.intelligenceMode) {
                                IntelligenceMode.FAST -> IntelligenceMode.ADVANCED
                                IntelligenceMode.ADVANCED -> IntelligenceMode.PROFESSOR
                                IntelligenceMode.PROFESSOR -> IntelligenceMode.FAST
                            }
                            onUpdateIntelligenceMode(nextMode)
                            scope.launch {
                                snackbarHostState.showSnackbar("${nextMode.label} ativado.")
                            }
                        }
                        HolographicModuleAction.VOZ ->
                            showVoiceModeDialog = true
                        HolographicModuleAction.DEFINICOES ->
                            onOpenSettings()
                        HolographicModuleAction.MEMORIA ->
                            showMemorySheet = true
                    }
                },
                onBottomMicClick = handleMicButton,
                onBottomVoiceModeClick = { showVoiceModeDialog = true },
                onBottomHistoryClick = { showMemorySheet = true },
                onBottomSettingsClick = onOpenSettings,
                onBottomStopClick = {
                    if (isProcessing) onCancelRequest()
                    if (speechState.isListening) onMicClick()
                    onStopSpeaking()
                },
                onBottomExtrasClick = { showExtrasDialog = true },
                modifier = Modifier.weight(1f)
            )

            // Pré-visualização de anexos científicos (imagens/documentos)
            if (pendingAttachments.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pendingAttachments.forEachIndexed { index, attachment ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = NexusDarkBlue,
                            border = BorderStroke(1.dp, NexusLuminousCyan.copy(alpha = 0.55f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = attachment.fileName,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = NexusSoftWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.widthIn(max = 150.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Rounded.Close,
                                    contentDescription = "Remover anexo",
                                    tint = NexusLuminousCyan,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable { onRemoveAttachment(index) }
                                )
                            }
                        }
                    }
                }
            }

            // Campo compacto de comando por texto + anexo científico
            Surface(
                color = NexusDarkBlue.copy(alpha = 0.85f),
                border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.25f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            documentPickerLauncher.launch(arrayOf("image/*", "application/pdf", "text/*"))
                        },
                        enabled = !isProcessing,
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.AttachFile,
                            contentDescription = "Anexar imagem científica ou documento",
                            tint = NexusLuminousCyan
                        )
                    }

                    OutlinedTextField(
                        value = inputText,
                        onValueChange = onInputChange,
                        modifier = Modifier.weight(1f),
                        placeholder = {
                            Text(
                                text = when (settings.intelligenceMode) {
                                    IntelligenceMode.FAST -> "Pergunta rápida ao NEXUS AI…"
                                    IntelligenceMode.PROFESSOR -> "O que queres aprender hoje?"
                                    IntelligenceMode.ADVANCED -> "Questão científica ou problema…"
                                },
                                color = NexusSoftWhite.copy(alpha = 0.55f)
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(18.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NexusLuminousCyan,
                            unfocusedBorderColor = NexusTechBlue.copy(alpha = 0.35f),
                            focusedTextColor = NexusSoftWhite,
                            unfocusedTextColor = NexusSoftWhite
                        ),
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Sentences,
                            imeAction = ImeAction.Send
                        ),
                        keyboardActions = KeyboardActions(
                            onSend = { onSendText() }
                        )
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    FilledIconButton(
                        onClick = onSendText,
                        enabled = (inputText.isNotBlank() || pendingAttachments.isNotEmpty()) && !isProcessing,
                        modifier = Modifier.size(46.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = NexusTechBlue,
                            contentColor = NexusDeepBlack
                        )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.Send,
                            contentDescription = "Enviar mensagem"
                        )
                    }
                }
            }
        }
    }

    // Painel expansível de Memória, Respostas Completas, Fontes e Professor Nexus
    if (showMemorySheet) {
        Surface(
            color = NexusDeepBlack.copy(alpha = 0.97f),
            modifier = Modifier.fillMaxSize()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Memória e Raciocínio",
                            style = MaterialTheme.typography.titleLarge,
                            color = NexusSoftWhite
                        )
                        Text(
                            text = "${messages.size} registo(s) · ${settings.intelligenceMode.label}",
                            style = MaterialTheme.typography.labelMedium,
                            color = NexusLuminousCyan.copy(alpha = 0.85f)
                        )
                    }
                    Row {
                        TextButton(onClick = {
                            showMemorySheet = false
                            onOpenKnowledgeBase()
                        }) {
                            Text("Base RAG", color = NexusLuminousCyan)
                        }
                        TextButton(onClick = onOpenHistory) {
                            Text("Sessões", color = NexusLuminousCyan)
                        }
                        IconButton(onClick = { showMemorySheet = false }) {
                            Icon(
                                imageVector = Icons.Rounded.Close,
                                contentDescription = "Recolher memória",
                                tint = NexusSoftWhite
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                if (messages.isEmpty()) {
                    Box(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Sem mensagens nesta sessão. Faz uma pergunta científica ou toca no microfone central.",
                            color = NexusSoftWhite.copy(alpha = 0.7f)
                        )
                    }
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                        contentPadding = PaddingValues(vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(messages, key = { it.id }) { msg ->
                            val decodedSources = remember(msg.sourcesJson) {
                                decodeSources(msg.sourcesJson)
                            }
                            MemoryMessageItem(
                                message = msg,
                                sources = decodedSources,
                                onSpeak = { onSpeakMessage(msg.content) },
                                onCopy = {
                                    clipboard.setText(AnnotatedString(msg.content))
                                    scope.launch {
                                        snackbarHostState.showSnackbar("Resposta copiada.")
                                    }
                                },
                                onSaveToKnowledge = { onSaveMessageToKnowledge(msg) },
                                onContinue = onContinueExplanation,
                                onSimplify = onSimplifyExplanation,
                                onMoreExamples = onRequestMoreExamples,
                                onDeepen = onDeepenExplanation
                            )
                        }
                    }
                }
            }
        }
    }

    // Diálogo de seleção da Voz Personalizada
    if (showVoiceModeDialog) {
        AlertDialog(
            onDismissRequest = { showVoiceModeDialog = false },
            containerColor = NexusDarkBlue,
            titleContentColor = NexusSoftWhite,
            textContentColor = NexusSoftWhite,
            title = { Text("Modo de Voz do NEXUS AI") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    VoiceModeOption.entries.forEach { option ->
                        val selected = settings.voiceMode == option
                        Surface(
                            onClick = {
                                onUpdateVoiceMode(option)
                                showVoiceModeDialog = false
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = if (selected) NexusTechBlue.copy(alpha = 0.25f) else NexusDeepBlack,
                            border = BorderStroke(
                                1.dp,
                                if (selected) NexusLuminousCyan else NexusTechBlue.copy(alpha = 0.35f)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = option.label,
                                color = if (selected) NexusLuminousCyan else NexusSoftWhite,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    showVoiceModeDialog = false
                    onOpenSettings()
                }) {
                    Text("Configurações de Voz", color = NexusLuminousCyan)
                }
            },
            dismissButton = {
                TextButton(onClick = { showVoiceModeDialog = false }) {
                    Text("Fechar", color = NexusSoftWhite)
                }
            }
        )
    }

    // Diálogo de Funcionalidades Adicionais
    if (showExtrasDialog) {
        AlertDialog(
            onDismissRequest = { showExtrasDialog = false },
            containerColor = NexusDarkBlue,
            titleContentColor = NexusSoftWhite,
            textContentColor = NexusSoftWhite,
            title = { Text("Funcionalidades Adicionais") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    TextButton(onClick = {
                        showExtrasDialog = false
                        onNewConversation()
                    }) {
                        Text("Nova Conversa", color = NexusLuminousCyan)
                    }
                    TextButton(onClick = {
                        showExtrasDialog = false
                        onOpenKnowledgeBase()
                    }) {
                        Text("Base de Conhecimento Local (RAG)", color = NexusLuminousCyan)
                    }
                    TextButton(onClick = {
                        showExtrasDialog = false
                        onUpdateIntelligenceMode(IntelligenceMode.PROFESSOR)
                        onQuickPrompt("Cria um plano de estudo estruturado sobre física e matemática básica.")
                    }) {
                        Text("Ativar Professor Nexus: Plano de Estudo", color = NexusSoftWhite)
                    }
                    TextButton(onClick = {
                        showExtrasDialog = false
                        onOpenHistory()
                    }) {
                        Text("Gestão de Sessões Guardadas", color = NexusSoftWhite)
                    }
                    TextButton(onClick = {
                        showExtrasDialog = false
                        onOpenDiagnostics()
                    }) {
                        Text("Diagnóstico do Servidor (/health)", color = NexusLuminousCyan)
                    }
                    TextButton(onClick = {
                        showExtrasDialog = false
                        onOpenSettings()
                    }) {
                        Text("Configurações e Ligação Cloud Run", color = NexusSoftWhite)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showExtrasDialog = false }) {
                    Text("Fechar", color = NexusLuminousCyan)
                }
            }
        )
    }
}

@Composable
private fun IntelligenceModeSelectorBar(
    activeMode: IntelligenceMode,
    onSelectMode: (IntelligenceMode) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
    ) {
        IntelligenceMode.entries.forEach { mode ->
            val selected = mode == activeMode
            val icon = when (mode) {
                IntelligenceMode.FAST -> Icons.Rounded.Speed
                IntelligenceMode.ADVANCED -> Icons.Rounded.Psychology
                IntelligenceMode.PROFESSOR -> Icons.Rounded.School
            }
            Surface(
                onClick = { onSelectMode(mode) },
                shape = RoundedCornerShape(12.dp),
                color = if (selected) NexusTechBlue.copy(alpha = 0.24f) else NexusDarkBlue.copy(alpha = 0.65f),
                border = BorderStroke(
                    1.dp,
                    if (selected) NexusLuminousCyan else NexusTechBlue.copy(alpha = 0.28f)
                )
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (selected) NexusLuminousCyan else NexusSoftWhite.copy(alpha = 0.7f),
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(
                        text = mode.shortLabel,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (selected) NexusLuminousCyan else NexusSoftWhite.copy(alpha = 0.85f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ConnectionStatusPill(
    diagnostic: ConnectionDiagnostic,
    onClick: () -> Unit
) {
    val dotColor = when (diagnostic.status) {
        ConnectionHealthStatus.CONNECTED -> SuccessGreen
        ConnectionHealthStatus.CHECKING -> NexusLuminousCyan
        ConnectionHealthStatus.ERROR -> MaterialTheme.colorScheme.error
        ConnectionHealthStatus.UNKNOWN -> NexusSoftWhite.copy(alpha = 0.5f)
    }
    val label = when (diagnostic.status) {
        ConnectionHealthStatus.CONNECTED -> {
            val latencyPart = diagnostic.latencyMs?.let { " · ${it} ms" } ?: ""
            "Cloud Run ligado$latencyPart"
        }
        ConnectionHealthStatus.CHECKING -> "A ligar…"
        ConnectionHealthStatus.ERROR -> "Sem ligação ao servidor"
        ConnectionHealthStatus.UNKNOWN -> "Modo pronto"
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Spacer(modifier = Modifier.width(5.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = NexusSoftWhite.copy(alpha = 0.72f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MemoryMessageItem(
    message: ChatMessageEntity,
    sources: List<ScienceSourceDto>,
    onSpeak: () -> Unit,
    onCopy: () -> Unit,
    onSaveToKnowledge: () -> Unit,
    onContinue: () -> Unit,
    onSimplify: () -> Unit,
    onMoreExamples: () -> Unit,
    onDeepen: () -> Unit
) {
    val uriHandler = LocalUriHandler.current
    val isUser = message.role == "user"
    var showThinking by remember { mutableStateOf(false) }
    var showCodeVerification by remember { mutableStateOf(false) }
    val timeLabel = remember(message.timestamp) {
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(message.timestamp))
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 350.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(
                1.dp,
                if (isUser) NexusLuminousCyan.copy(alpha = 0.45f) else NexusTechBlue.copy(alpha = 0.3f)
            ),
            colors = CardDefaults.cardColors(
                containerColor = if (isUser) NexusDarkBlue else Color(0xFF061320)
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUser) "Tu" else "NEXUS AI",
                        style = MaterialTheme.typography.labelMedium,
                        color = NexusLuminousCyan
                    )
                    Text(
                        text = timeLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = NexusSoftWhite.copy(alpha = 0.6f)
                    )
                }

                if (!isUser && (message.usedLocalKnowledge || message.usedWebSearch || !message.intelligenceMode.isNullOrBlank())) {
                    Spacer(modifier = Modifier.height(6.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        message.intelligenceMode?.let { mode ->
                            OriginTagChip(label = mode, color = NexusLuminousCyan)
                        }
                        if (message.usedLocalKnowledge) {
                            OriginTagChip(label = "Base Local (Room)", color = SuccessGreen)
                        }
                        if (message.usedWebSearch) {
                            OriginTagChip(label = "Pesquisa Web", color = NexusTechBlue)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = message.content,
                    style = MaterialTheme.typography.bodyMedium,
                    color = NexusSoftWhite
                )

                if (!isUser) {
                    if (!message.thinkingSummary.isNullOrBlank()) {
                        TextButton(
                            onClick = { showThinking = !showThinking },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Psychology,
                                contentDescription = null,
                                tint = NexusLuminousCyan,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (showThinking) "Ocultar raciocínio" else "Ver raciocínio",
                                color = NexusLuminousCyan
                            )
                        }
                        AnimatedVisibility(visible = showThinking) {
                            Text(
                                text = message.thinkingSummary,
                                style = MaterialTheme.typography.bodySmall,
                                color = NexusSoftWhite.copy(alpha = 0.78f)
                            )
                        }
                    }

                    if (!message.codeVerification.isNullOrBlank()) {
                        TextButton(
                            onClick = { showCodeVerification = !showCodeVerification },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Code,
                                contentDescription = null,
                                tint = SuccessGreen,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (showCodeVerification) "Ocultar verificação por código" else "Ver cálculo verificado",
                                color = SuccessGreen
                            )
                        }
                        AnimatedVisibility(visible = showCodeVerification) {
                            Text(
                                text = message.codeVerification,
                                style = MaterialTheme.typography.bodySmall,
                                color = SuccessGreen.copy(alpha = 0.9f)
                            )
                        }
                    }

                    if (sources.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Fontes verificadas:",
                            style = MaterialTheme.typography.labelSmall,
                            color = NexusLuminousCyan
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            sources.take(4).forEach { source ->
                                AssistChip(
                                    onClick = {
                                        runCatching { uriHandler.openUri(source.uri) }
                                    },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Rounded.Public,
                                            contentDescription = null,
                                            tint = NexusLuminousCyan,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    },
                                    label = {
                                        Text(
                                            text = source.title,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.widthIn(max = 170.dp)
                                        )
                                    },
                                    colors = AssistChipDefaults.assistChipColors(
                                        labelColor = NexusSoftWhite
                                    )
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Ações pedagógicas e de continuidade
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        PedagogicalQuickPill("Continuar", onContinue)
                        PedagogicalQuickPill("Mais simples", onSimplify)
                        PedagogicalQuickPill("Exemplos", onMoreExamples)
                        PedagogicalQuickPill("Aprofundar", onDeepen)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        IconButton(onClick = onSaveToKnowledge, modifier = Modifier.size(32.dp)) {
                            Icon(
                                imageVector = Icons.Rounded.BookmarkAdd,
                                contentDescription = "Guardar na Base Local",
                                tint = SuccessGreen,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        IconButton(onClick = onSpeak, modifier = Modifier.size(32.dp)) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Rounded.VolumeUp,
                                contentDescription = "Ouvir resposta",
                                tint = NexusLuminousCyan,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        IconButton(onClick = onCopy, modifier = Modifier.size(32.dp)) {
                            Icon(
                                imageVector = Icons.Rounded.ContentCopy,
                                contentDescription = "Copiar resposta",
                                tint = NexusSoftWhite,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OriginTagChip(label: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.14f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.4f))
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
        )
    }
}

@Composable
private fun PedagogicalQuickPill(label: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = NexusDarkBlue.copy(alpha = 0.7f),
        border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.35f))
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = NexusLuminousCyan,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

