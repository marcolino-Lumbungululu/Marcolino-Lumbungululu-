package com.nexusai.android.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        ConversationSessionEntity::class,
        ChatMessageEntity::class,
        KnowledgeEntryEntity::class,
        KnowledgeConceptLinkEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class NexusDatabase : RoomDatabase() {
    abstract fun nexusDao(): NexusDao
    abstract fun knowledgeDao(): KnowledgeDao

    companion object {
        @Volatile
        private var INSTANCE: NexusDatabase? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE chat_messages ADD COLUMN sourcesJson TEXT")
                db.execSQL("ALTER TABLE chat_messages ADD COLUMN intelligenceMode TEXT")
                db.execSQL("ALTER TABLE chat_messages ADD COLUMN codeVerification TEXT")
                db.execSQL("ALTER TABLE chat_messages ADD COLUMN usedLocalKnowledge INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE chat_messages ADD COLUMN usedWebSearch INTEGER NOT NULL DEFAULT 0")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS knowledge_entries (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        title TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        content TEXT NOT NULL,
                        summary TEXT NOT NULL,
                        sourceType TEXT NOT NULL,
                        tags TEXT NOT NULL,
                        contentHash TEXT NOT NULL,
                        isVerified INTEGER NOT NULL DEFAULT 1,
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE UNIQUE INDEX IF NOT EXISTS index_knowledge_entries_contentHash ON knowledge_entries (contentHash)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_knowledge_entries_subject ON knowledge_entries (subject)"
                )

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS knowledge_concept_links (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        sourceEntryId INTEGER NOT NULL,
                        targetEntryId INTEGER NOT NULL,
                        relationLabel TEXT NOT NULL,
                        createdAt INTEGER NOT NULL,
                        FOREIGN KEY(sourceEntryId) REFERENCES knowledge_entries(id) ON DELETE CASCADE,
                        FOREIGN KEY(targetEntryId) REFERENCES knowledge_entries(id) ON DELETE CASCADE
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_knowledge_concept_links_sourceEntryId ON knowledge_concept_links (sourceEntryId)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_knowledge_concept_links_targetEntryId ON knowledge_concept_links (targetEntryId)"
                )
            }
        }

        fun getInstance(context: Context): NexusDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    NexusDatabase::class.java,
                    "nexus_ai_local.db"
                )
                    .addMigrations(MIGRATION_1_2)
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
