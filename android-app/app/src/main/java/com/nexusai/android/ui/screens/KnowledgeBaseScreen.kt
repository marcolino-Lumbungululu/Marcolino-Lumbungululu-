package com.nexusai.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.nexusai.android.data.local.KnowledgeEntryEntity
import com.nexusai.android.ui.gestures.nexusGestureNavigation
import com.nexusai.android.ui.theme.NexusDarkBlue
import com.nexusai.android.ui.theme.NexusDeepBlack
import com.nexusai.android.ui.theme.NexusLuminousCyan
import com.nexusai.android.ui.theme.NexusSoftWhite
import com.nexusai.android.ui.theme.NexusTechBlue
import com.nexusai.android.ui.theme.SuccessGreen

private val SUBJECT_CATEGORIES = listOf(
    "Todas",
    "Matemática",
    "Física",
    "Química",
    "Biologia",
    "Astronomia",
    "Medicina",
    "Engenharia",
    "Informática",
    "Ciências e Conhecimento"
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun KnowledgeBaseScreen(
    entries: List<KnowledgeEntryEntity>,
    onSaveEntry: (title: String, subject: String, content: String, tags: String, isVerified: Boolean, updateId: Long?) -> Unit,
    onLinkConcepts: (sourceId: Long, targetId: Long, relationLabel: String) -> Unit,
    onDeleteEntry: (Long) -> Unit,
    onStudyWithProfessor: (KnowledgeEntryEntity) -> Unit,
    onBack: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedSubject by remember { mutableStateOf("Todas") }
    var showEditorDialog by remember { mutableStateOf(false) }
    var editingEntry by remember { mutableStateOf<KnowledgeEntryEntity?>(null) }
    var linkSourceEntry by remember { mutableStateOf<KnowledgeEntryEntity?>(null) }

    val filteredEntries = remember(entries, searchQuery, selectedSubject) {
        val q = searchQuery.trim().lowercase()
        entries.filter { entry ->
            val matchesSubject = selectedSubject == "Todas" ||
                entry.subject.equals(selectedSubject, ignoreCase = true)
            val matchesQuery = q.isEmpty() ||
                entry.title.lowercase().contains(q) ||
                entry.subject.lowercase().contains(q) ||
                entry.content.lowercase().contains(q) ||
                entry.tags.lowercase().contains(q)
            matchesSubject && matchesQuery
        }
    }

    Scaffold(
        containerColor = NexusDeepBlack,
        modifier = Modifier.nexusGestureNavigation(onSwipeLeft = onBack),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NexusDeepBlack,
                    titleContentColor = NexusSoftWhite
                ),
                title = {
                    Column {
                        Text("Base de Conhecimento Local", fontWeight = FontWeight.SemiBold)
                        Text(
                            text = "${entries.size} registo(s) RAG indexado(s) no Room",
                            style = MaterialTheme.typography.labelSmall,
                            color = NexusLuminousCyan
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Voltar",
                            tint = NexusLuminousCyan
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    editingEntry = null
                    showEditorDialog = true
                },
                containerColor = NexusLuminousCyan,
                contentColor = NexusDeepBlack
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Adicionar conhecimento")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 14.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                leadingIcon = {
                    Icon(Icons.Rounded.Search, contentDescription = null, tint = NexusLuminousCyan)
                },
                placeholder = {
                    Text(
                        "Pesquisar teoremas, fórmulas, notas ou tags…",
                        color = NexusSoftWhite.copy(alpha = 0.55f)
                    )
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NexusLuminousCyan,
                    unfocusedBorderColor = NexusTechBlue.copy(alpha = 0.35f),
                    focusedTextColor = NexusSoftWhite,
                    unfocusedTextColor = NexusSoftWhite
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 2.dp)
            ) {
                items(SUBJECT_CATEGORIES) { subject ->
                    FilterChip(
                        selected = selectedSubject == subject,
                        onClick = { selectedSubject = subject },
                        label = { Text(subject) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (filteredEntries.isEmpty()) {
                Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Storage,
                            contentDescription = null,
                            tint = NexusLuminousCyan.copy(alpha = 0.65f),
                            modifier = Modifier.size(44.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = if (entries.isEmpty()) {
                                "A tua Base de Conhecimento Local está vazia.\nAdiciona notas científicas ou guarda respostas do Professor Nexus para consulta RAG e modo offline."
                            } else {
                                "Nenhum registo corresponde à pesquisa atual."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = NexusSoftWhite.copy(alpha = 0.72f)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredEntries, key = { it.id }) { entry ->
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, NexusTechBlue.copy(alpha = 0.35f)),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF061320))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = NexusTechBlue.copy(alpha = 0.2f)
                                    ) {
                                        Text(
                                            text = entry.subject,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = NexusLuminousCyan,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                        )
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (entry.isVerified) {
                                            Icon(
                                                imageVector = Icons.Rounded.Verified,
                                                contentDescription = "Verificado",
                                                tint = SuccessGreen,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                        }
                                        Text(
                                            text = entry.sourceType,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = NexusSoftWhite.copy(alpha = 0.65f)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = entry.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = NexusSoftWhite
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = entry.content,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = NexusSoftWhite.copy(alpha = 0.85f),
                                    maxLines = 4,
                                    overflow = TextOverflow.Ellipsis
                                )

                                if (entry.tags.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Tags: ${entry.tags}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = NexusLuminousCyan.copy(alpha = 0.78f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = { onStudyWithProfessor(entry) },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Icon(
                                            Icons.Rounded.School,
                                            contentDescription = null,
                                            tint = NexusLuminousCyan,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Estudar", color = NexusLuminousCyan)
                                    }
                                    if (entries.size > 1) {
                                        OutlinedButton(
                                            onClick = { linkSourceEntry = entry },
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                        ) {
                                            Icon(
                                                Icons.Rounded.Link,
                                                contentDescription = null,
                                                tint = NexusSoftWhite,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Ligar", color = NexusSoftWhite)
                                        }
                                    }
                                    IconButton(
                                        onClick = {
                                            editingEntry = entry
                                            showEditorDialog = true
                                        }
                                    ) {
                                        Icon(
                                            Icons.Rounded.Edit,
                                            contentDescription = "Editar",
                                            tint = NexusSoftWhite
                                        )
                                    }
                                    IconButton(onClick = { onDeleteEntry(entry.id) }) {
                                        Icon(
                                            Icons.Rounded.DeleteOutline,
                                            contentDescription = "Eliminar",
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showEditorDialog) {
        KnowledgeEntryEditorDialog(
            initial = editingEntry,
            onDismiss = { showEditorDialog = false },
            onConfirm = { title, subject, content, tags, isVerified ->
                onSaveEntry(title, subject, content, tags, isVerified, editingEntry?.id)
                showEditorDialog = false
            }
        )
    }

    val sourceForLink = linkSourceEntry
    if (sourceForLink != null) {
        ConceptLinkDialog(
            sourceEntry = sourceForLink,
            candidates = entries.filter { it.id != sourceForLink.id },
            onDismiss = { linkSourceEntry = null },
            onConfirm = { targetId, relation ->
                onLinkConcepts(sourceForLink.id, targetId, relation)
                linkSourceEntry = null
            }
        )
    }
}

@Composable
private fun KnowledgeEntryEditorDialog(
    initial: KnowledgeEntryEntity?,
    onDismiss: () -> Unit,
    onConfirm: (title: String, subject: String, content: String, tags: String, isVerified: Boolean) -> Unit
) {
    var title by remember(initial) { mutableStateOf(initial?.title.orEmpty()) }
    var subject by remember(initial) { mutableStateOf(initial?.subject ?: "Física") }
    var content by remember(initial) { mutableStateOf(initial?.content.orEmpty()) }
    var tags by remember(initial) { mutableStateOf(initial?.tags.orEmpty()) }
    var isVerified by remember(initial) { mutableStateOf(initial?.isVerified ?: true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NexusDarkBlue,
        titleContentColor = NexusSoftWhite,
        textContentColor = NexusSoftWhite,
        title = { Text(if (initial == null) "Novo Conhecimento Local" else "Atualizar Conhecimento") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Título / Conceito") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Área (ex: Física, Matemática, Biologia)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    label = { Text("Conteúdo, fórmula ou resumo") },
                    minLines = 3,
                    maxLines = 6,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = tags,
                    onValueChange = { tags = it },
                    label = { Text("Tags separadas por vírgula") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Conteúdo verificado", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = isVerified, onCheckedChange = { isVerified = it })
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(title, subject, content, tags, isVerified) },
                enabled = title.isNotBlank() && content.isNotBlank(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = NexusLuminousCyan,
                    contentColor = NexusDeepBlack
                )
            ) {
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = NexusSoftWhite)
            }
        }
    )
}

@Composable
private fun ConceptLinkDialog(
    sourceEntry: KnowledgeEntryEntity,
    candidates: List<KnowledgeEntryEntity>,
    onDismiss: () -> Unit,
    onConfirm: (targetId: Long, relationLabel: String) -> Unit
) {
    var selectedTargetId by remember(candidates) { mutableStateOf(candidates.firstOrNull()?.id ?: -1L) }
    var relationLabel by remember { mutableStateOf("fundamenta") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NexusDarkBlue,
        titleContentColor = NexusSoftWhite,
        textContentColor = NexusSoftWhite,
        title = { Text("Ligar Conceito") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Origem: ${sourceEntry.title}",
                    style = MaterialTheme.typography.labelLarge,
                    color = NexusLuminousCyan
                )
                OutlinedTextField(
                    value = relationLabel,
                    onValueChange = { relationLabel = it },
                    label = { Text("Relação (ex: fundamenta, deriva de)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Text("Seleciona o conceito de destino:", style = MaterialTheme.typography.labelMedium)
                candidates.take(6).forEach { target ->
                    val selected = selectedTargetId == target.id
                    Surface(
                        onClick = { selectedTargetId = target.id },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selected) NexusTechBlue.copy(alpha = 0.25f) else NexusDeepBlack,
                        border = BorderStroke(1.dp, if (selected) NexusLuminousCyan else NexusTechBlue.copy(alpha = 0.3f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "${target.title} (${target.subject})",
                            color = NexusSoftWhite,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { if (selectedTargetId > 0) onConfirm(selectedTargetId, relationLabel) },
                enabled = selectedTargetId > 0
            ) {
                Text("Ligar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Fechar", color = NexusSoftWhite)
            }
        }
    )
}
