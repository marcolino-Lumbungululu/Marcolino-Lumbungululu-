package com.nexusai.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.nexusai.android.data.local.IntelligenceMode
import com.nexusai.android.ui.NexusViewModel
import com.nexusai.android.ui.screens.DiagnosticsScreen
import com.nexusai.android.ui.screens.HistoryScreen
import com.nexusai.android.ui.screens.KnowledgeBaseScreen
import com.nexusai.android.ui.screens.MainAssistantScreen
import com.nexusai.android.ui.screens.SettingsScreen
import com.nexusai.android.ui.theme.NexusTheme

private object Routes {
    const val MAIN = "main"
    const val HISTORY = "history"
    const val KNOWLEDGE = "knowledge"
    const val SETTINGS = "settings"
    const val DIAGNOSTICS = "diagnostics"
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as NexusApplication
        val factory = NexusViewModel.Factory(
            repository = app.repository,
            aiEngine = app.aiEngine,
            speechRecognizer = app.speechRecognizer,
            textToSpeech = app.textToSpeech
        )

        setContent {
            val viewModel: NexusViewModel = viewModel(factory = factory)
            val settings by viewModel.settings.collectAsStateWithLifecycle()
            val messages by viewModel.messages.collectAsStateWithLifecycle()
            val sessions by viewModel.sessions.collectAsStateWithLifecycle()
            val knowledgeEntries by viewModel.knowledgeEntries.collectAsStateWithLifecycle()
            val usageStats by viewModel.usageStats.collectAsStateWithLifecycle()
            val inputText by viewModel.inputText.collectAsStateWithLifecycle()
            val pendingAttachments by viewModel.pendingAttachments.collectAsStateWithLifecycle()
            val isProcessing by viewModel.isProcessing.collectAsStateWithLifecycle()
            val isExecutingCommand by viewModel.isExecutingCommand.collectAsStateWithLifecycle()
            val lastExecutedOperation by viewModel.lastExecutedOperation.collectAsStateWithLifecycle()
            val isSpeaking by viewModel.isSpeaking.collectAsStateWithLifecycle()
            val speechState by viewModel.speechState.collectAsStateWithLifecycle()
            val bannerError by viewModel.bannerError.collectAsStateWithLifecycle()
            val statusFeedback by viewModel.statusFeedback.collectAsStateWithLifecycle()
            val connectionDiagnostic by viewModel.connectionDiagnostic.collectAsStateWithLifecycle()
            val diagnosticHistory by viewModel.diagnosticHistory.collectAsStateWithLifecycle()
            val urlValidationError by viewModel.urlValidationError.collectAsStateWithLifecycle()

            NexusTheme(themeMode = settings.themeMode) {
                val navController = rememberNavController()

                NavHost(
                    navController = navController,
                    startDestination = Routes.MAIN
                ) {
                    composable(Routes.MAIN) {
                        MainAssistantScreen(
                            settings = settings,
                            messages = messages,
                            inputText = inputText,
                            pendingAttachments = pendingAttachments,
                            isProcessing = isProcessing,
                            isExecutingCommand = isExecutingCommand,
                            lastExecutedOperation = lastExecutedOperation,
                            isSpeaking = isSpeaking,
                            speechState = speechState,
                            bannerError = bannerError,
                            statusFeedback = statusFeedback,
                            connectionDiagnostic = connectionDiagnostic,
                            decodeSources = viewModel::decodeMessageSources,
                            onInputChange = viewModel::onInputChanged,
                            onSendText = { viewModel.sendTextMessage() },
                            onCancelRequest = viewModel::cancelActiveQuery,
                            onAttachDocumentUri = { uri ->
                                viewModel.attachDocumentUri(uri, contentResolver)
                            },
                            onRemoveAttachment = viewModel::removeAttachment,
                            onQuickPrompt = { viewModel.sendTextMessage(customText = it) },
                            onContinueExplanation = viewModel::continueExplanation,
                            onSimplifyExplanation = viewModel::simplifyExplanation,
                            onRequestMoreExamples = viewModel::requestMoreExamples,
                            onDeepenExplanation = viewModel::deepenExplanation,
                            onSaveMessageToKnowledge = viewModel::saveAssistantReplyToKnowledge,
                            onMicClick = viewModel::startVoiceRecognition,
                            onUpdateVoiceMode = viewModel::updateVoiceMode,
                            onUpdateIntelligenceMode = viewModel::updateIntelligenceMode,
                            onSpeakMessage = viewModel::speakMessage,
                            onStopSpeaking = viewModel::stopSpeaking,
                            onNewConversation = viewModel::startNewConversation,
                            onDismissError = viewModel::dismissBannerError,
                            onClearStatusFeedback = viewModel::clearStatusFeedback,
                            onOpenHistory = { navController.navigate(Routes.HISTORY) },
                            onOpenKnowledgeBase = { navController.navigate(Routes.KNOWLEDGE) },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                            onOpenDiagnostics = { navController.navigate(Routes.DIAGNOSTICS) }
                        )
                    }

                    composable(Routes.HISTORY) {
                        HistoryScreen(
                            sessions = sessions,
                            activeSessionId = settings.activeSessionId,
                            onSelectSession = { id ->
                                viewModel.selectConversation(id)
                                navController.popBackStack()
                            },
                            onNewSession = {
                                viewModel.startNewConversation()
                                navController.popBackStack()
                            },
                            onDeleteSessions = viewModel::deleteSelectedConversations,
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Routes.KNOWLEDGE) {
                        KnowledgeBaseScreen(
                            entries = knowledgeEntries,
                            onSaveEntry = viewModel::saveKnowledgeEntry,
                            onLinkConcepts = viewModel::linkKnowledgeConcepts,
                            onDeleteEntry = viewModel::deleteKnowledgeEntry,
                            onStudyWithProfessor = { entry ->
                                viewModel.updateIntelligenceMode(IntelligenceMode.PROFESSOR)
                                navController.popBackStack()
                                viewModel.sendTextMessage(
                                    customText = "Professor Nexus, ensina-me passo a passo e propõe um exercício sobre: ${entry.title} (${entry.subject})."
                                )
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Routes.SETTINGS) {
                        SettingsScreen(
                            settings = settings,
                            usageStats = usageStats,
                            connectionDiagnostic = connectionDiagnostic,
                            urlValidationError = urlValidationError,
                            onSaveAndTestUrl = viewModel::saveAndTestCloudRunUrl,
                            onTestConnection = { viewModel.testCloudRunConnection() },
                            onUpdateUserName = viewModel::updateUserName,
                            onUpdateLanguage = viewModel::updateLanguageTag,
                            onUpdateAutoSpeak = viewModel::updateAutoSpeak,
                            onUpdateTtsRate = viewModel::updateTtsRate,
                            onUpdateTtsVolume = viewModel::updateTtsVolume,
                            onTestVoice = viewModel::testVoiceSample,
                            onUpdateIntelligenceMode = viewModel::updateIntelligenceMode,
                            onUpdateLearnerDepth = viewModel::updateLearnerDepth,
                            onUpdateWebSearchGrounding = viewModel::updateWebSearchGrounding,
                            onUpdateLocalRagEnabled = viewModel::updateLocalRagEnabled,
                            onUpdateCodeVerificationEnabled = viewModel::updateCodeVerificationEnabled,
                            onUpdateCustomVoiceApiEnabled = viewModel::updateCustomVoiceApiEnabled,
                            onUpdateVoiceMode = viewModel::updateVoiceMode,
                            onUpdateThemeMode = viewModel::updateThemeMode,
                            onOpenKnowledgeBase = { navController.navigate(Routes.KNOWLEDGE) },
                            onOpenDiagnostics = { navController.navigate(Routes.DIAGNOSTICS) },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Routes.DIAGNOSTICS) {
                        DiagnosticsScreen(
                            settings = settings,
                            connectionDiagnostic = connectionDiagnostic,
                            diagnosticHistory = diagnosticHistory,
                            onRunDiagnostic = { viewModel.testCloudRunConnection() },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                            onBack = { navController.popBackStack() }
                        )
                    }
                }
            }
        }
    }
}
