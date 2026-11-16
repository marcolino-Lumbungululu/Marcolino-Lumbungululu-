package com.nexusai.android.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Memory
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.MicOff
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.PhotoLibrary
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.RecordVoiceOver
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material.icons.rounded.VideoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nexusai.android.data.local.VoiceModeOption
import com.nexusai.android.ui.VisualHudState
import com.nexusai.android.ui.theme.NexusDarkBlue
import com.nexusai.android.ui.theme.NexusDeepBlack
import com.nexusai.android.ui.theme.NexusLuminousCyan
import com.nexusai.android.ui.theme.NexusSoftWhite
import com.nexusai.android.ui.theme.NexusTechBlue
import com.nexusai.android.ui.theme.SuccessGreen
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

enum class HolographicModuleAction {
    MUSICA,
    DOCUMENTOS,
    FOTOGRAFIAS,
    VIDEOS,
    APLICACOES,
    PESQUISA,
    INTELIGENCIA_IA,
    VOZ,
    DEFINICOES,
    MEMORIA
}

data class LateralHolographicNode(
    val action: HolographicModuleAction,
    val label: String,
    val icon: ImageVector
)

private val LeftNodes = listOf(
    LateralHolographicNode(HolographicModuleAction.MUSICA, "Música", Icons.Rounded.MusicNote),
    LateralHolographicNode(HolographicModuleAction.DOCUMENTOS, "Documentos", Icons.Rounded.Description),
    LateralHolographicNode(HolographicModuleAction.FOTOGRAFIAS, "Fotografias", Icons.Rounded.PhotoLibrary),
    LateralHolographicNode(HolographicModuleAction.VIDEOS, "Vídeos", Icons.Rounded.VideoLibrary),
    LateralHolographicNode(HolographicModuleAction.APLICACOES, "Aplicações", Icons.Rounded.Apps)
)

private val RightNodes = listOf(
    LateralHolographicNode(HolographicModuleAction.PESQUISA, "Pesquisa", Icons.Rounded.Search),
    LateralHolographicNode(HolographicModuleAction.INTELIGENCIA_IA, "IA", Icons.Rounded.Psychology),
    LateralHolographicNode(HolographicModuleAction.VOZ, "Voz", Icons.Rounded.RecordVoiceOver),
    LateralHolographicNode(HolographicModuleAction.DEFINICOES, "Definições", Icons.Rounded.Settings),
    LateralHolographicNode(HolographicModuleAction.MEMORIA, "Memória", Icons.Rounded.Memory)
)

@Composable
fun HolographicNexusCore(
    visualState: VisualHudState,
    voiceMode: VoiceModeOption,
    rmsDb: Float,
    isListening: Boolean,
    isSpeaking: Boolean,
    highThinking: Boolean,
    recognizedCommand: String,
    latestAssistantReply: String,
    lastExecutedOperation: String?,
    onMicClick: () -> Unit,
    onLateralNodeClick: (HolographicModuleAction) -> Unit,
    onBottomMicClick: () -> Unit,
    onBottomVoiceModeClick: () -> Unit,
    onBottomHistoryClick: () -> Unit,
    onBottomSettingsClick: () -> Unit,
    onBottomStopClick: () -> Unit,
    onBottomExtrasClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "nexus_holo_transition")
    val slowAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 24000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "slow_ring"
    )
    val fastAngle by infiniteTransition.animateFloat(
        initialValue = 360f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 5000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "fast_ring"
    )
    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave_phase"
    )

    val targetMicScale = when (visualState) {
        VisualHudState.A_OUVIR -> 1.05f + (rmsDb.coerceIn(0f, 1f) * 0.1f)
        VisualHudState.A_RESPONDER -> 1.04f + 0.04f * sin(wavePhase)
        VisualHudState.A_PROCESSAR -> 1.02f
        else -> 1f
    }
    val micScale by animateFloatAsState(targetValue = targetMicScale, label = "mic_scale")

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        NexusDarkBlue,
                        NexusDeepBlack,
                        NexusDeepBlack
                    )
                )
            )
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        val compactScreen = maxWidth < 360.dp || maxHeight < 620.dp
        val ringContainerSize: Dp = if (compactScreen) 186.dp else 224.dp
        val micButtonSize: Dp = if (compactScreen) 104.dp else 124.dp

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Estado visual + Indicador discreto de Voz Personalizada
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = NexusDarkBlue.copy(alpha = 0.82f),
                    border = BorderStroke(
                        1.dp,
                        when (visualState) {
                            VisualHudState.A_EXECUTAR -> SuccessGreen.copy(alpha = 0.75f)
                            VisualHudState.A_OUVIR, VisualHudState.A_RESPONDER -> NexusLuminousCyan
                            else -> NexusTechBlue.copy(alpha = 0.5f)
                        }
                    )
                ) {
                    Text(
                        text = visualState.label,
                        color = if (visualState == VisualHudState.A_EXECUTAR) SuccessGreen else NexusLuminousCyan,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.2.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                    )
                }

                if (voiceMode == VoiceModeOption.ORIGINAL) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "VOZ PERSONALIZADA ATIVA",
                        color = NexusLuminousCyan.copy(alpha = 0.85f),
                        style = MaterialTheme.typography.labelSmall,
                        letterSpacing = 1.1.sp
                    )
                } else if (voiceMode == VoiceModeOption.SILENT) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "MODO SILENCIOSO",
                        color = NexusSoftWhite.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.labelSmall,
                        letterSpacing = 1.0.sp
                    )
                }
            }

            // Palco central: 5 nós laterais à esquerda · Núcleo holográfico central · 5 nós laterais à direita
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Esquerda (5 módulos funcionais)
                Column(
                    verticalArrangement = Arrangement.spacedBy(if (compactScreen) 6.dp else 10.dp),
                    horizontalAlignment = Alignment.Start
                ) {
                    LeftNodes.forEach { node ->
                        LateralHolographicIconButton(
                            node = node,
                            highlighted = false,
                            compact = compactScreen,
                            onClick = { onLateralNodeClick(node.action) }
                        )
                    }
                }

                // Centro: Microfone luminoso tridimensional + anéis holográficos + ondas sonoras
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier.size(ringContainerSize),
                        contentAlignment = Alignment.Center
                    ) {
                        HolographicRingsCanvas(
                            visualState = visualState,
                            slowAngle = slowAngle,
                            fastAngle = fastAngle,
                            rmsDb = rmsDb,
                            modifier = Modifier.fillMaxSize()
                        )

                        // Microfone Central Interativo
                        Box(
                            modifier = Modifier
                                .size(micButtonSize)
                                .scale(micScale)
                                .clip(CircleShape)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            when (visualState) {
                                                VisualHudState.A_OUVIR -> NexusLuminousCyan.copy(alpha = 0.35f)
                                                VisualHudState.A_PROCESSAR -> NexusTechBlue.copy(alpha = 0.3f)
                                                VisualHudState.A_EXECUTAR -> SuccessGreen.copy(alpha = 0.28f)
                                                else -> NexusDarkBlue
                                            },
                                            NexusDeepBlack
                                        )
                                    )
                                )
                                .border(
                                    width = if (isListening || isSpeaking) 2.dp else 1.5.dp,
                                    color = if (visualState == VisualHudState.A_EXECUTAR) {
                                        SuccessGreen
                                    } else {
                                        NexusLuminousCyan.copy(alpha = 0.85f)
                                    },
                                    shape = CircleShape
                                )
                                .clickable(onClick = onMicClick)
                                .semantics {
                                    contentDescription = if (isListening) {
                                        "Parar microfone"
                                    } else {
                                        "Ativar microfone de comando"
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = when {
                                        visualState == VisualHudState.A_EXECUTAR -> Icons.Rounded.CheckCircle
                                        isListening -> Icons.Rounded.MicOff
                                        else -> Icons.Rounded.Mic
                                    },
                                    contentDescription = null,
                                    tint = if (visualState == VisualHudState.A_EXECUTAR) {
                                        SuccessGreen
                                    } else {
                                        NexusLuminousCyan
                                    },
                                    modifier = Modifier.size(if (compactScreen) 42.dp else 52.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = if (isListening) "PARAR" else "FALAR",
                                    color = NexusSoftWhite.copy(alpha = 0.85f),
                                    fontSize = 10.sp,
                                    letterSpacing = 1.6.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // Ondas sonoras animadas na parte inferior do microfone
                    ReactiveSoundWaveCanvas(
                        visualState = visualState,
                        rmsDb = rmsDb,
                        phase = wavePhase,
                        modifier = Modifier
                            .fillMaxWidth(0.86f)
                            .height(if (compactScreen) 28.dp else 36.dp)
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Leitura sintética do comando ou resposta ativa (sem caixas de chatbot)
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = NexusDarkBlue.copy(alpha = 0.62f),
                        border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.25f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                            if (recognizedCommand.isNotBlank()) {
                                Text(
                                    text = "Comando: \"$recognizedCommand\"",
                                    color = NexusLuminousCyan,
                                    style = MaterialTheme.typography.labelSmall,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                            }
                            Text(
                                text = when {
                                    visualState == VisualHudState.A_EXECUTAR && !lastExecutedOperation.isNullOrBlank() ->
                                        "Operação: $lastExecutedOperation"
                                    else -> latestAssistantReply
                                },
                                color = NexusSoftWhite,
                                style = MaterialTheme.typography.bodySmall,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                // Direita (5 módulos funcionais)
                Column(
                    verticalArrangement = Arrangement.spacedBy(if (compactScreen) 6.dp else 10.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    RightNodes.forEach { node ->
                        val highlighted = (node.action == HolographicModuleAction.INTELIGENCIA_IA && highThinking) ||
                            (node.action == HolographicModuleAction.VOZ && voiceMode == VoiceModeOption.ORIGINAL)
                        LateralHolographicIconButton(
                            node = node,
                            highlighted = highlighted,
                            compact = compactScreen,
                            onClick = { onLateralNodeClick(node.action) }
                        )
                    }
                }
            }

            // Painel de Controlo Inferior (6 botões circulares luminosos)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                BottomCircularControl(
                    icon = if (isListening) Icons.Rounded.MicOff else Icons.Rounded.Mic,
                    contentDescription = "Ativar ou desativar microfone",
                    active = isListening,
                    onClick = onBottomMicClick
                )
                BottomCircularControl(
                    icon = Icons.Rounded.GraphicEq,
                    contentDescription = "Selecionar modo de voz personalizada",
                    active = voiceMode == VoiceModeOption.ORIGINAL,
                    onClick = onBottomVoiceModeClick
                )
                BottomCircularControl(
                    icon = Icons.Rounded.History,
                    contentDescription = "Abrir histórico e memória",
                    active = false,
                    onClick = onBottomHistoryClick
                )
                BottomCircularControl(
                    icon = Icons.Rounded.Settings,
                    contentDescription = "Abrir configurações",
                    active = false,
                    onClick = onBottomSettingsClick
                )
                BottomCircularControl(
                    icon = Icons.Rounded.Stop,
                    contentDescription = "Interromper resposta",
                    active = isSpeaking,
                    onClick = onBottomStopClick
                )
                BottomCircularControl(
                    icon = Icons.Rounded.Explore,
                    contentDescription = "Aceder às funcionalidades adicionais",
                    active = false,
                    onClick = onBottomExtrasClick
                )
            }
        }
    }
}

@Composable
private fun LateralHolographicIconButton(
    node: LateralHolographicNode,
    highlighted: Boolean,
    compact: Boolean,
    onClick: () -> Unit
) {
    val size = if (compact) 46.dp else 54.dp
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(2.dp)
    ) {
        Box(
            modifier = Modifier
                .size(size)
                .clip(CircleShape)
                .background(
                    if (highlighted) {
                        NexusTechBlue.copy(alpha = 0.22f)
                    } else {
                        NexusDarkBlue.copy(alpha = 0.65f)
                    }
                )
                .border(
                    width = 1.dp,
                    color = if (highlighted) NexusLuminousCyan else NexusTechBlue.copy(alpha = 0.48f),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = node.icon,
                contentDescription = node.label,
                tint = if (highlighted) NexusLuminousCyan else NexusSoftWhite.copy(alpha = 0.9f),
                modifier = Modifier.size(if (compact) 18.dp else 21.dp)
            )
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = node.label,
            color = NexusSoftWhite.copy(alpha = 0.78f),
            fontSize = 9.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun BottomCircularControl(
    icon: ImageVector,
    contentDescription: String,
    active: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(
                if (active) NexusLuminousCyan.copy(alpha = 0.2f) else NexusDarkBlue.copy(alpha = 0.78f)
            )
            .border(
                width = if (active) 1.5.dp else 1.dp,
                color = if (active) NexusLuminousCyan else NexusTechBlue.copy(alpha = 0.45f),
                shape = CircleShape
            )
            .clickable(onClick = onClick)
            .semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (active) NexusLuminousCyan else NexusSoftWhite,
            modifier = Modifier.size(20.dp)
        )
    }
}

@Composable
private fun HolographicRingsCanvas(
    visualState: VisualHudState,
    slowAngle: Float,
    fastAngle: Float,
    rmsDb: Float,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val outerRadius = (size.minDimension / 2f) * 0.94f
        val middleRadius = outerRadius * 0.80f
        val innerRadius = outerRadius * 0.66f

        val ringColor = if (visualState == VisualHudState.A_EXECUTAR) SuccessGreen else NexusLuminousCyan
        val accentBlue = NexusTechBlue

        val activeAngle = when (visualState) {
            VisualHudState.A_PROCESSAR -> fastAngle * -1f
            VisualHudState.A_OUVIR, VisualHudState.A_RESPONDER -> slowAngle * 2f
            else -> slowAngle
        }

        // Anel externo concêntrico segmentado
        rotate(degrees = activeAngle, pivot = center) {
            drawCircle(
                color = accentBlue.copy(alpha = 0.28f),
                radius = outerRadius,
                center = center,
                style = Stroke(width = 1.5f)
            )
            drawArc(
                color = ringColor.copy(alpha = 0.78f),
                startAngle = 0f,
                sweepAngle = 72f,
                useCenter = false,
                topLeft = Offset(center.x - outerRadius, center.y - outerRadius),
                size = Size(outerRadius * 2f, outerRadius * 2f),
                style = Stroke(width = 3.2f, cap = StrokeCap.Round)
            )
            drawArc(
                color = ringColor.copy(alpha = 0.65f),
                startAngle = 180f,
                sweepAngle = 72f,
                useCenter = false,
                topLeft = Offset(center.x - outerRadius, center.y - outerRadius),
                size = Size(outerRadius * 2f, outerRadius * 2f),
                style = Stroke(width = 2.5f, cap = StrokeCap.Round)
            )
        }

        // Anel intermédio em rotação inversa
        rotate(degrees = fastAngle, pivot = center) {
            drawCircle(
                color = ringColor.copy(alpha = 0.22f + (rmsDb.coerceIn(0f, 1f) * 0.22f)),
                radius = middleRadius,
                center = center,
                style = Stroke(width = 1.8f)
            )
            drawArc(
                color = accentBlue.copy(alpha = 0.75f),
                startAngle = 45f,
                sweepAngle = 110f,
                useCenter = false,
                topLeft = Offset(center.x - middleRadius, center.y - middleRadius),
                size = Size(middleRadius * 2f, middleRadius * 2f),
                style = Stroke(width = 2.4f, cap = StrokeCap.Round)
            )
        }

        // Anel interior
        drawCircle(
            color = ringColor.copy(alpha = 0.4f),
            radius = innerRadius,
            center = center,
            style = Stroke(width = 1.2f)
        )

        // Partículas orbitais durante Estado 3 (A processar)
        if (visualState == VisualHudState.A_PROCESSAR) {
            for (i in 0 until 6) {
                val rad = ((fastAngle + i * 60f) * PI / 180.0).toFloat()
                val px = center.x + cos(rad) * middleRadius
                val py = center.y + sin(rad) * middleRadius
                drawCircle(
                    color = if (i % 2 == 0) NexusLuminousCyan else NexusSoftWhite,
                    radius = if (i % 2 == 0) 4.5f else 3f,
                    center = Offset(px, py)
                )
            }
        }
    }
}

@Composable
private fun ReactiveSoundWaveCanvas(
    visualState: VisualHudState,
    rmsDb: Float,
    phase: Float,
    modifier: Modifier = Modifier
) {
    val barWeights = listOf(0.25f, 0.45f, 0.7f, 0.55f, 0.9f, 0.65f, 1f, 0.75f, 0.95f, 0.7f, 0.88f, 0.52f, 0.68f, 0.42f, 0.25f)
    Canvas(modifier = modifier) {
        val count = barWeights.size
        val spacing = size.width / (count + 1)
        val isActive = visualState == VisualHudState.A_OUVIR ||
            visualState == VisualHudState.A_RESPONDER ||
            visualState == VisualHudState.A_PROCESSAR

        val barColor = if (visualState == VisualHudState.A_EXECUTAR) SuccessGreen else NexusLuminousCyan

        barWeights.forEachIndexed { idx, weight ->
            val dynamicFactor = if (isActive) {
                val baseAmp = if (visualState == VisualHudState.A_OUVIR) {
                    rmsDb.coerceIn(0.32f, 1f)
                } else {
                    0.7f
                }
                (0.45f + 0.55f * sin(phase + idx * 0.6f)) * baseAmp * weight
            } else {
                0.2f * weight
            }
            val barH = (size.height * dynamicFactor.coerceIn(0.14f, 0.95f))
            val x = spacing * (idx + 1)
            val topY = (size.height - barH) / 2f
            drawLine(
                color = if (isActive) barColor else NexusTechBlue.copy(alpha = 0.45f),
                start = Offset(x, topY),
                end = Offset(x, topY + barH),
                strokeWidth = 4.5f,
                cap = StrokeCap.Round
            )
        }
    }
}
