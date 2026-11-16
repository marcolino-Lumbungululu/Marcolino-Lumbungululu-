package com.nexusai.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.NetworkCheck
import androidx.compose.material.icons.rounded.Save
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nexusai.android.ai.AiUsageStats
import com.nexusai.android.data.local.IntelligenceMode
import com.nexusai.android.data.local.LearnerDepth
import com.nexusai.android.data.local.NexusSettings
import com.nexusai.android.data.local.SUPPORTED_LANGUAGES
import com.nexusai.android.data.local.ThemeMode
import com.nexusai.android.data.local.VoiceModeOption
import com.nexusai.android.ui.ConnectionDiagnostic
import com.nexusai.android.ui.ConnectionHealthStatus
import com.nexusai.android.ui.gestures.nexusGestureNavigation
import com.nexusai.android.ui.theme.SuccessGreen
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    settings: NexusSettings,
    usageStats: AiUsageStats,
    connectionDiagnostic: ConnectionDiagnostic,
    urlValidationError: String?,
    onSaveAndTestUrl: (String) -> Unit,
    onTestConnection: () -> Unit,
    onUpdateUserName: (String) -> Unit,
    onUpdateLanguage: (String) -> Unit,
    onUpdateAutoSpeak: (Boolean) -> Unit,
    onUpdateTtsRate: (Float) -> Unit,
    onUpdateTtsVolume: (Float) -> Unit,
    onTestVoice: () -> Unit,
    onUpdateIntelligenceMode: (IntelligenceMode) -> Unit,
    onUpdateLearnerDepth: (LearnerDepth) -> Unit,
    onUpdateWebSearchGrounding: (Boolean) -> Unit,
    onUpdateLocalRagEnabled: (Boolean) -> Unit,
    onUpdateCodeVerificationEnabled: (Boolean) -> Unit,
    onUpdateCustomVoiceApiEnabled: (Boolean) -> Unit,
    onUpdateVoiceMode: (VoiceModeOption) -> Unit,
    onUpdateThemeMode: (ThemeMode) -> Unit,
    onOpenKnowledgeBase: () -> Unit,
    onOpenDiagnostics: () -> Unit,
    onBack: () -> Unit
) {
    var urlDraft by remember(settings.cloudRunBaseUrl) { mutableStateOf(settings.cloudRunBaseUrl) }
    var nameDraft by remember(settings.userName) { mutableStateOf(settings.userName) }
    var languageMenuExpanded by remember { mutableStateOf(false) }

    val selectedLanguageLabel = remember(settings.languageTag) {
        SUPPORTED_LANGUAGES.firstOrNull { it.tag == settings.languageTag }?.label
            ?: settings.languageTag
    }

    Scaffold(
        modifier = Modifier.nexusGestureNavigation(onSwipeLeft = onBack),
        topBar = {
            TopAppBar(
                title = { Text("Configurações do NEXUS AI") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Voltar"
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Ligação ao Backend Cloud Run (HTTPS)
            SettingsSectionCard(title = "Servidor Cloud Run (nexus-ai-1182)") {
                OutlinedTextField(
                    value = urlDraft,
                    onValueChange = { urlDraft = it },
                    label = { Text("URL HTTPS Base do Cloud Run") },
                    placeholder = { Text("https://teu-servico.run.app/") },
                    singleLine = true,
                    isError = !urlValidationError.isNullOrBlank(),
                    supportingText = {
                        Text(
                            urlValidationError
                                ?: "Apenas HTTPS é permitido. Nenhuma chave API é guardada no telemóvel."
                        )
                    },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = { onSaveAndTestUrl(urlDraft) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Rounded.Save, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Guardar e Testar")
                    }
                    OutlinedButton(onClick = onTestConnection) {
                        Text("Testar")
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    when (connectionDiagnostic.status) {
                        ConnectionHealthStatus.CHECKING -> {
                            CircularProgressIndicator(
                                modifier = Modifier.height(18.dp).width(18.dp),
                                strokeWidth = 2.dp
                            )
                        }
                        ConnectionHealthStatus.CONNECTED -> {
                            Icon(
                                imageVector = Icons.Rounded.CloudDone,
                                contentDescription = null,
                                tint = SuccessGreen
                            )
                        }
                        else -> {
                            Icon(
                                imageVector = Icons.Rounded.CloudOff,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = connectionDiagnostic.message,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                if (connectionDiagnostic.latencyMs != null || !connectionDiagnostic.apiVersion.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = listOfNotNull(
                            connectionDiagnostic.latencyMs?.let { "Latência: ${it} ms" },
                            connectionDiagnostic.apiVersion?.let { "API: $it" }
                        ).joinToString(" • "),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onOpenDiagnostics,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Rounded.NetworkCheck, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Abrir Ecrã de Diagnóstico (/health)")
                }
            }

            // 2. Motor Científico NexusAIEngine
            SettingsSectionCard(title = "Motor Científico e Professor Nexus") {
                Text(
                    text = "Modo de Inteligência",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    IntelligenceMode.entries.forEach { mode ->
                        FilterChip(
                            selected = settings.intelligenceMode == mode,
                            onClick = { onUpdateIntelligenceMode(mode) },
                            label = { Text(mode.label) }
                        )
                    }
                }
                Text(
                    text = settings.intelligenceMode.description,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Nível de Profundidade das Explicações",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    LearnerDepth.entries.forEach { depth ->
                        FilterChip(
                            selected = settings.learnerDepth == depth,
                            onClick = { onUpdateLearnerDepth(depth) },
                            label = { Text(depth.label) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                SettingsSwitchRow(
                    title = "Pesquisa Científica Web (Grounding)",
                    subtitle = "Consulta fontes web verificadas via Google Search quando necessário.",
                    checked = settings.webSearchGroundingEnabled,
                    onCheckedChange = onUpdateWebSearchGrounding
                )

                Spacer(modifier = Modifier.height(10.dp))

                SettingsSwitchRow(
                    title = "Base de Conhecimento Local (RAG Room)",
                    subtitle = "Usa as tuas notas guardadas localmente e distingue fontes locais vs web.",
                    checked = settings.localRagEnabled,
                    onCheckedChange = onUpdateLocalRagEnabled
                )

                Spacer(modifier = Modifier.height(10.dp))

                SettingsSwitchRow(
                    title = "Verificação Numérica por Código",
                    subtitle = "Valida cálculos matemáticos, físicos e químicos antes de responder.",
                    checked = settings.codeVerificationEnabled,
                    onCheckedChange = onUpdateCodeVerificationEnabled
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onOpenKnowledgeBase,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.AutoMirrored.Rounded.MenuBook, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Gerir Base de Conhecimento Local")
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Consumo na sessão: ${usageStats.sessionRequests} pedido(s) • ${usageStats.totalTokens} tokens (~$${"%.5f".format(usageStats.estimatedCostUsd)})",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // 3. Voz, Leitura (TTS) e Idioma
            SettingsSectionCard(title = "Voz, Idioma e Leitura") {
                ExposedDropdownMenuBox(
                    expanded = languageMenuExpanded,
                    onExpandedChange = { languageMenuExpanded = !languageMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = selectedLanguageLabel,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Idioma de Voz e Respostas") },
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = languageMenuExpanded)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(
                        expanded = languageMenuExpanded,
                        onDismissRequest = { languageMenuExpanded = false }
                    ) {
                        SUPPORTED_LANGUAGES.forEach { option ->
                            DropdownMenuItem(
                                text = { Text(option.label) },
                                onClick = {
                                    onUpdateLanguage(option.tag)
                                    languageMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                SettingsSwitchRow(
                    title = "Leitura automática das respostas",
                    subtitle = "Lê em voz alta ao receber explicações do Gemini.",
                    checked = settings.autoSpeakReplies,
                    onCheckedChange = onUpdateAutoSpeak
                )

                Spacer(modifier = Modifier.height(10.dp))

                SettingsSwitchRow(
                    title = "Voz Personalizada Gemini (/api/ai/tts)",
                    subtitle = "Usa voz neural do servidor com fallback automático para TTS local.",
                    checked = settings.customVoiceApiEnabled,
                    onCheckedChange = onUpdateCustomVoiceApiEnabled
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Voz do NEXUS AI (Seleção Exclusiva)",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    VoiceModeOption.entries.forEach { mode ->
                        FilterChip(
                            selected = settings.voiceMode == mode,
                            onClick = { onUpdateVoiceMode(mode) },
                            label = { Text(mode.label) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Velocidade de leitura: ${"%.2f".format(settings.ttsSpeechRate)}x",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = settings.ttsSpeechRate,
                    onValueChange = onUpdateTtsRate,
                    valueRange = 0.5f..2.0f
                )

                Text(
                    text = "Volume da leitura: ${(settings.ttsVolume * 100).roundToInt()}%",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = settings.ttsVolume,
                    onValueChange = onUpdateTtsVolume,
                    valueRange = 0.0f..1.0f
                )

                OutlinedButton(
                    onClick = onTestVoice,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.AutoMirrored.Rounded.VolumeUp, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Testar Voz e Volume")
                }
            }

            // 4. Personalização & Aparência
            SettingsSectionCard(title = "Perfil e Aparência") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = nameDraft,
                        onValueChange = { nameDraft = it },
                        label = { Text("Como queres ser chamado") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(onClick = { onUpdateUserName(nameDraft) }) {
                        Text("Aplicar")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "Tema da interface",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    ThemeMode.entries.forEach { mode ->
                        FilterChip(
                            selected = settings.themeMode == mode,
                            onClick = { onUpdateThemeMode(mode) },
                            label = { Text(mode.label) }
                        )
                    }
                }
            }

            // 5. Informação de Segurança
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Lock,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.tertiary
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Segurança ativa: tráfego exclusivamente HTTPS, histórico e base RAG guardados apenas no Room do dispositivo e zero chaves Gemini no APK.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsSwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

@Composable
private fun SettingsSectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}
