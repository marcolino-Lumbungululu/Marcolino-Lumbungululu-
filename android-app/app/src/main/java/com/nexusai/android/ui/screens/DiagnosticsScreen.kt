package com.nexusai.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Api
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.NetworkCheck
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Speed
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.nexusai.android.data.local.NexusSettings
import com.nexusai.android.ui.ConnectionDiagnostic
import com.nexusai.android.ui.ConnectionHealthStatus
import com.nexusai.android.ui.DiagnosticLogEntry
import com.nexusai.android.ui.gestures.nexusGestureNavigation
import com.nexusai.android.ui.theme.ErrorRedDark
import com.nexusai.android.ui.theme.NexusDarkBlue
import com.nexusai.android.ui.theme.NexusDeepBlack
import com.nexusai.android.ui.theme.NexusLuminousCyan
import com.nexusai.android.ui.theme.NexusSoftWhite
import com.nexusai.android.ui.theme.NexusTechBlue
import com.nexusai.android.ui.theme.SuccessGreen
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagnosticsScreen(
    settings: NexusSettings,
    connectionDiagnostic: ConnectionDiagnostic,
    diagnosticHistory: List<DiagnosticLogEntry>,
    onRunDiagnostic: () -> Unit,
    onOpenSettings: () -> Unit,
    onBack: () -> Unit
) {
    val isChecking = connectionDiagnostic.status == ConnectionHealthStatus.CHECKING
    val statusColor = when (connectionDiagnostic.status) {
        ConnectionHealthStatus.CONNECTED -> SuccessGreen
        ConnectionHealthStatus.CHECKING -> NexusLuminousCyan
        ConnectionHealthStatus.ERROR -> ErrorRedDark
        ConnectionHealthStatus.UNKNOWN -> NexusTechBlue
    }
    val statusHeadline = when (connectionDiagnostic.status) {
        ConnectionHealthStatus.CONNECTED -> "Backend Cloud Run Operacional"
        ConnectionHealthStatus.CHECKING -> "A testar /health…"
        ConnectionHealthStatus.ERROR -> "Falha de Ligação ao Servidor"
        ConnectionHealthStatus.UNKNOWN -> "Diagnóstico Pronto"
    }

    val endpointDisplay = connectionDiagnostic.endpointUrl
        ?: "${settings.cloudRunBaseUrl.trimEnd('/')}/health"

    val formattedTime = remember(connectionDiagnostic.checkedAtMillis) {
        connectionDiagnostic.checkedAtMillis?.let { ts ->
            SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(ts))
        } ?: "—"
    }

    val latencyLabel = connectionDiagnostic.latencyMs?.let { "${it} ms" } ?: "—"
    val latencyQuality = when (val ms = connectionDiagnostic.latencyMs) {
        null -> "Sem medição"
        in 0..149 -> "Excelente"
        in 150..499 -> "Normal"
        else -> "Elevada"
    }

    val serverStatusDisplay = when {
        connectionDiagnostic.status == ConnectionHealthStatus.CHECKING -> "A verificar…"
        !connectionDiagnostic.serverStatus.isNullOrBlank() -> connectionDiagnostic.serverStatus
        connectionDiagnostic.status == ConnectionHealthStatus.ERROR -> "offline"
        else -> "desconhecido"
    }

    val apiVersionDisplay = connectionDiagnostic.apiVersion?.takeIf { it.isNotBlank() } ?: "—"

    Scaffold(
        containerColor = NexusDeepBlack,
        modifier = Modifier.nexusGestureNavigation(onSwipeLeft = onBack),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NexusDeepBlack,
                    titleContentColor = NexusSoftWhite,
                    navigationIconContentColor = NexusLuminousCyan,
                    actionIconContentColor = NexusLuminousCyan
                ),
                title = {
                    Column {
                        Text(
                            text = "Diagnóstico do Servidor",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Verificação Cloud Run • GET /health",
                            style = MaterialTheme.typography.labelSmall,
                            color = NexusLuminousCyan.copy(alpha = 0.8f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Voltar"
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = onRunDiagnostic,
                        enabled = !isChecking
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Refresh,
                            contentDescription = "Executar diagnóstico"
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. Cartão Principal de Estado da Ligação
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = NexusDarkBlue),
                border = BorderStroke(1.dp, statusColor.copy(alpha = 0.55f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = statusColor.copy(alpha = 0.16f),
                            border = BorderStroke(1.dp, statusColor.copy(alpha = 0.5f)),
                            modifier = Modifier.size(46.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (isChecking) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        color = NexusLuminousCyan,
                                        strokeWidth = 2.5.dp
                                    )
                                } else {
                                    Icon(
                                        imageVector = when (connectionDiagnostic.status) {
                                            ConnectionHealthStatus.CONNECTED -> Icons.Rounded.CloudDone
                                            ConnectionHealthStatus.ERROR -> Icons.Rounded.CloudOff
                                            else -> Icons.Rounded.NetworkCheck
                                        },
                                        contentDescription = null,
                                        tint = statusColor,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = statusHeadline,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = NexusSoftWhite
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = connectionDiagnostic.message,
                                style = MaterialTheme.typography.bodySmall,
                                color = NexusSoftWhite.copy(alpha = 0.8f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = NexusDeepBlack.copy(alpha = 0.7f),
                        border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.25f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "ENDPOINT VERIFICADO",
                                style = MaterialTheme.typography.labelSmall,
                                color = NexusLuminousCyan
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = endpointDisplay,
                                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                                color = NexusSoftWhite,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Última verificação: $formattedTime",
                                style = MaterialTheme.typography.labelSmall,
                                color = NexusSoftWhite.copy(alpha = 0.65f)
                            )
                        }
                    }
                }
            }

            // 2. Métricas Principais: Estado do Servidor, Latência e Versão da API
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                DiagnosticMetricCard(
                    title = "Estado",
                    value = serverStatusDisplay,
                    subtitle = if (connectionDiagnostic.status == ConnectionHealthStatus.CONNECTED) "ok: true" else "health",
                    icon = Icons.Rounded.Dns,
                    accentColor = statusColor,
                    modifier = Modifier.weight(1f)
                )
                DiagnosticMetricCard(
                    title = "Latência",
                    value = latencyLabel,
                    subtitle = latencyQuality,
                    icon = Icons.Rounded.Speed,
                    accentColor = NexusLuminousCyan,
                    modifier = Modifier.weight(1f)
                )
                DiagnosticMetricCard(
                    title = "Versão API",
                    value = apiVersionDisplay,
                    subtitle = "Gemini / Backend",
                    icon = Icons.Rounded.Api,
                    accentColor = NexusTechBlue,
                    modifier = Modifier.weight(1f)
                )
            }

            // 3. Detalhes Técnicos do Payload /health
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = NexusDarkBlue),
                border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Detalhes Técnicos do Servidor",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = NexusLuminousCyan
                    )

                    DiagnosticDetailRow(
                        label = "Serviço",
                        value = connectionDiagnostic.serviceName ?: "nexus-ai"
                    )
                    DiagnosticDetailRow(
                        label = "Estado (/health)",
                        value = serverStatusDisplay
                    )
                    DiagnosticDetailRow(
                        label = "Latência de ida e volta",
                        value = latencyLabel
                    )
                    DiagnosticDetailRow(
                        label = "Versão da API",
                        value = apiVersionDisplay
                    )
                    DiagnosticDetailRow(
                        label = "Porta do Contentor",
                        value = connectionDiagnostic.port?.toString() ?: "—"
                    )
                    DiagnosticDetailRow(
                        label = "Tempo de Atividade (Uptime)",
                        value = formatUptime(connectionDiagnostic.uptimeSeconds)
                    )
                }
            }

            // 4. Botões de Ação
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = onRunDiagnostic,
                    enabled = !isChecking,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = NexusTechBlue,
                        contentColor = NexusDeepBlack
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Rounded.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isChecking) "A testar…" else "Testar /health",
                        fontWeight = FontWeight.Bold
                    )
                }

                OutlinedButton(
                    onClick = onOpenSettings,
                    border = BorderStroke(1.dp, NexusLuminousCyan.copy(alpha = 0.6f))
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Settings,
                        contentDescription = null,
                        tint = NexusLuminousCyan
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("URL", color = NexusLuminousCyan)
                }
            }

            // 5. Histórico de Verificações Recentes
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = NexusDarkBlue),
                border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.25f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Registo de Verificações (${diagnosticHistory.size})",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = NexusSoftWhite
                    )

                    if (diagnosticHistory.isEmpty()) {
                        Text(
                            text = "Nenhuma verificação registada ainda. Toca em \"Testar /health\" para iniciar.",
                            style = MaterialTheme.typography.bodySmall,
                            color = NexusSoftWhite.copy(alpha = 0.65f)
                        )
                    } else {
                        diagnosticHistory.forEach { entry ->
                            DiagnosticHistoryRow(entry)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DiagnosticMetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = NexusDarkBlue),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.35f)),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = NexusSoftWhite.copy(alpha = 0.72f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = NexusSoftWhite,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = accentColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun DiagnosticDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = NexusSoftWhite.copy(alpha = 0.7f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
            fontWeight = FontWeight.SemiBold,
            color = NexusSoftWhite
        )
    }
}

@Composable
private fun DiagnosticHistoryRow(entry: DiagnosticLogEntry) {
    val dotColor = if (entry.status == ConnectionHealthStatus.CONNECTED) SuccessGreen else ErrorRedDark
    val timeText = remember(entry.checkedAtMillis) {
        SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(entry.checkedAtMillis))
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = NexusDeepBlack.copy(alpha = 0.65f),
        border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(dotColor)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entry.detailMessage,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = NexusSoftWhite,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = listOfNotNull(
                        timeText,
                        entry.serverStatus?.let { "Estado: $it" },
                        entry.apiVersion?.let { "API: $it" }
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.labelSmall,
                    color = NexusSoftWhite.copy(alpha = 0.65f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (entry.latencyMs != null) {
                Text(
                    text = "${entry.latencyMs} ms",
                    style = MaterialTheme.typography.labelMedium.copy(fontFamily = FontFamily.Monospace),
                    fontWeight = FontWeight.Bold,
                    color = NexusLuminousCyan
                )
            }
        }
    }
}

private fun formatUptime(uptimeSeconds: Long?): String {
    if (uptimeSeconds == null || uptimeSeconds < 0) return "—"
    val hours = uptimeSeconds / 3600
    val minutes = (uptimeSeconds % 3600) / 60
    val seconds = uptimeSeconds % 60
    return when {
        hours > 0 -> "${hours}h ${minutes}m ${seconds}s"
        minutes > 0 -> "${minutes}m ${seconds}s"
        else -> "${seconds}s"
    }
}
