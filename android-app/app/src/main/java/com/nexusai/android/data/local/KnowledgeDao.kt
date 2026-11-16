package com.nexusai.android.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface KnowledgeDao {

    @Query("SELECT * FROM knowledge_entries ORDER BY updatedAt DESC, id DESC")
    fun observeAllEntries(): Flow<List<KnowledgeEntryEntity>>

    @Query("SELECT * FROM knowledge_entries ORDER BY updatedAt DESC, id DESC")
    suspend fun getAllEntriesSnapshot(): List<KnowledgeEntryEntity>

    @Query("SELECT * FROM knowledge_entries WHERE id = :entryId LIMIT 1")
    suspend fun getEntryById(entryId: Long): KnowledgeEntryEntity?

    @Query("SELECT * FROM knowledge_entries WHERE contentHash = :contentHash LIMIT 1")
    suspend fun findByContentHash(contentHash: String): KnowledgeEntryEntity?

    @Query(
        """
        SELECT * FROM knowledge_entries
        WHERE title LIKE '%' || :query || '%'
           OR subject LIKE '%' || :query || '%'
           OR content LIKE '%' || :query || '%'
           OR tags LIKE '%' || :query || '%'
        ORDER BY updatedAt DESC
        """
    )
    suspend fun searchEntries(query: String): List<KnowledgeEntryEntity>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertEntry(entry: KnowledgeEntryEntity): Long

    @Update
    suspend fun updateEntry(entry: KnowledgeEntryEntity)

    @Query("DELETE FROM knowledge_entries WHERE id = :entryId")
    suspend fun deleteEntryById(entryId: Long)

    @Query(
        """
        SELECT * FROM knowledge_concept_links
        WHERE sourceEntryId = :entryId OR targetEntryId = :entryId
        ORDER BY createdAt DESC
        """
    )
    fun observeConceptLinksForEntry(entryId: Long): Flow<List<KnowledgeConceptLinkEntity>>

    @Query("SELECT * FROM knowledge_concept_links ORDER BY createdAt DESC")
    suspend fun getAllConceptLinksSnapshot(): List<KnowledgeConceptLinkEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConceptLink(link: KnowledgeConceptLinkEntity): Long

    @Query("DELETE FROM knowledge_concept_links WHERE id = :linkId")
    suspend fun deleteConceptLink(linkId: Long)
}
