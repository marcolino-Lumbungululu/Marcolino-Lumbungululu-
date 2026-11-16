package com.nexusai.android.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "knowledge_entries",
    indices = [
        Index(value = ["contentHash"], unique = true),
        Index(value = ["subject"])
    ]
)
data class KnowledgeEntryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val subject: String,
    val content: String,
    val summary: String,
    val sourceType: String = "Nota do Utilizador",
    val tags: String = "",
    val contentHash: String,
    val isVerified: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "knowledge_concept_links",
    foreignKeys = [
        ForeignKey(
            entity = KnowledgeEntryEntity::class,
            parentColumns = ["id"],
            childColumns = ["sourceEntryId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = KnowledgeEntryEntity::class,
            parentColumns = ["id"],
            childColumns = ["targetEntryId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index("sourceEntryId"),
        Index("targetEntryId")
    ]
)
data class KnowledgeConceptLinkEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sourceEntryId: Long,
    val targetEntryId: Long,
    val relationLabel: String = "relacionado com",
    val createdAt: Long = System.currentTimeMillis()
)
