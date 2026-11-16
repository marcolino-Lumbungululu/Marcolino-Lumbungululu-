package com.nexusai.android.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface NexusDao {

    @Query(
        """
        SELECT s.id, s.title, s.createdAt, s.updatedAt,
               COUNT(m.id) AS messageCount,
               (SELECT content FROM chat_messages WHERE sessionId = s.id ORDER BY timestamp DESC, id DESC LIMIT 1) AS lastMessagePreview
        FROM conversation_sessions s
        LEFT JOIN chat_messages m ON m.sessionId = s.id
        GROUP BY s.id
        ORDER BY s.updatedAt DESC
        """
    )
    fun observeSessions(): Flow<List<ConversationSessionSummary>>

    @Query("SELECT * FROM conversation_sessions ORDER BY updatedAt DESC LIMIT 1")
    suspend fun getLatestSession(): ConversationSessionEntity?

    @Query("SELECT * FROM conversation_sessions WHERE id = :sessionId LIMIT 1")
    suspend fun getSessionById(sessionId: Long): ConversationSessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: ConversationSessionEntity): Long

    @Query("UPDATE conversation_sessions SET title = :title, updatedAt = :updatedAt WHERE id = :sessionId")
    suspend fun updateSessionMetadata(sessionId: Long, title: String, updatedAt: Long)

    @Query("UPDATE conversation_sessions SET updatedAt = :updatedAt WHERE id = :sessionId")
    suspend fun touchSession(sessionId: Long, updatedAt: Long)

    @Query("DELETE FROM conversation_sessions WHERE id IN (:sessionIds)")
    suspend fun deleteSessionsByIds(sessionIds: List<Long>)

    @Query("SELECT * FROM chat_messages WHERE sessionId = :sessionId ORDER BY timestamp ASC, id ASC")
    fun observeMessagesForSession(sessionId: Long): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages WHERE sessionId = :sessionId AND role IN ('user', 'assistant') ORDER BY timestamp ASC, id ASC")
    suspend fun getConversationMessagesSnapshot(sessionId: Long): List<ChatMessageEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: ChatMessageEntity): Long

    @Query("DELETE FROM chat_messages WHERE id = :messageId")
    suspend fun deleteMessageById(messageId: Long)
}
