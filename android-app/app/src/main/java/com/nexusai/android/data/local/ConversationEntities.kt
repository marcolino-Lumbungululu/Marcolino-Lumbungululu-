package com.nexusai.android.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "conversation_sessions")
data class ConversationSessionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "chat_messages",
    foreignKeys = [
        ForeignKey(
            entity = ConversationSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sessionId: Long,
    val role: String, // "user" | "assistant" | "error"
    val content: String,
    val thinkingSummary: String? = null,
    val module: String? = null,
    val action: String? = null,
    val isVoiceInput: Boolean = false,
    val sourcesJson: String? = null,
    val intelligenceMode: String? = null,
    val codeVerification: String? = null,
    val usedLocalKnowledge: Boolean = false,
    val usedWebSearch: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

data class ConversationSessionSummary(
    val id: Long,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val messageCount: Int,
    val lastMessagePreview: String?
)
