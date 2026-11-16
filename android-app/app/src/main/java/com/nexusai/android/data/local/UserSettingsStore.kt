package com.nexusai.android.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.nexusai.android.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "nexus_settings")

enum class ThemeMode(val label: String) {
    SYSTEM("Automático (Sistema)"),
    DARK("Escuro"),
    LIGHT("Claro")
}

enum class VoiceModeOption(val label: String) {
    MALE("Voz Masculina"),
    FEMALE("Voz Feminina"),
    CUSTOM("Minha voz personalizada"),
    SILENT("Sem voz")
}

enum class IntelligenceMode(
    val apiValue: String,
    val label: String,
    val shortLabel: String,
    val description: String
) {
    FAST(
        apiValue = "FAST",
        label = "Modo Rápido",
        shortLabel = "Rápido",
        description = "Respostas rápidas e diretas para perguntas do dia a dia"
    ),
    ADVANCED(
        apiValue = "ADVANCED",
        label = "Modo Avançado",
        shortLabel = "Avançado",
        description = "Raciocínio profundo, 8 passos científicos e verificação por código"
    ),
    PROFESSOR(
        apiValue = "PROFESSOR",
        label = "Professor Nexus",
        shortLabel = "Professor",
        description = "Ensino passo a passo, analogias, exemplos, exercícios e demonstrações"
    )
}

enum class LearnerDepth(val apiValue: String, val label: String) {
    INICIANTE("INICIANTE", "Iniciante"),
    INTERMEDIO("INTERMEDIO", "Intermédio"),
    AVANCADO("AVANCADO", "Avançado / Universitário")
}

data class LanguageOption(
    val tag: String,
    val label: String
)

val SUPPORTED_LANGUAGES = listOf(
    LanguageOption("pt-AO", "Português (Angola)"),
    LanguageOption("pt-PT", "Português (Portugal)"),
    LanguageOption("pt-BR", "Português (Brasil)"),
    LanguageOption("en-US", "English (US)")
)

data class NexusSettings(
    val cloudRunBaseUrl: String = BuildConfig.DEFAULT_CLOUD_RUN_URL,
    val userName: String = "Utilizador",
    val languageTag: String = "pt-AO",
    val autoSpeakReplies: Boolean = true,
    val voiceMode: VoiceModeOption = VoiceModeOption.CUSTOM,
    val ttsSpeechRate: Float = 1.0f,
    val ttsVolume: Float = 1.0f,
    val highThinking: Boolean = false,
    val intelligenceMode: IntelligenceMode = IntelligenceMode.ADVANCED,
    val learnerDepth: LearnerDepth = LearnerDepth.INTERMEDIO,
    val webSearchGroundingEnabled: Boolean = true,
    val localRagEnabled: Boolean = true,
    val codeVerificationEnabled: Boolean = true,
    val customVoiceApiEnabled: Boolean = true,
    val themeMode: ThemeMode = ThemeMode.DARK,
    val activeSessionId: Long = -1L
)

class UserSettingsStore(private val context: Context) {

    private object Keys {
        val CLOUD_RUN_URL = stringPreferencesKey("cloud_run_url")
        val USER_NAME = stringPreferencesKey("user_name")
        val LANGUAGE_TAG = stringPreferencesKey("language_tag")
        val AUTO_SPEAK = booleanPreferencesKey("auto_speak_replies")
        val VOICE_MODE = stringPreferencesKey("voice_mode")
        val TTS_RATE = floatPreferencesKey("tts_speech_rate")
        val TTS_VOLUME = floatPreferencesKey("tts_volume")
        val HIGH_THINKING = booleanPreferencesKey("high_thinking")
        val INTELLIGENCE_MODE = stringPreferencesKey("intelligence_mode")
        val LEARNER_DEPTH = stringPreferencesKey("learner_depth")
        val WEB_SEARCH_GROUNDING = booleanPreferencesKey("web_search_grounding")
        val LOCAL_RAG_ENABLED = booleanPreferencesKey("local_rag_enabled")
        val CODE_VERIFICATION = booleanPreferencesKey("code_verification")
        val CUSTOM_VOICE_API = booleanPreferencesKey("custom_voice_api")
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val ACTIVE_SESSION_ID = longPreferencesKey("active_session_id")
    }

    val settingsFlow: Flow<NexusSettings> = context.dataStore.data.map { prefs ->
        val themeName = prefs[Keys.THEME_MODE] ?: ThemeMode.DARK.name
        val parsedTheme = ThemeMode.entries.firstOrNull { it.name == themeName } ?: ThemeMode.DARK
        val voiceModeName = prefs[Keys.VOICE_MODE] ?: VoiceModeOption.CUSTOM.name
        val parsedVoiceMode = when (voiceModeName) {
            "ORIGINAL" -> VoiceModeOption.CUSTOM
            "ALTERNATIVE" -> VoiceModeOption.MALE
            else -> VoiceModeOption.entries.firstOrNull { it.name == voiceModeName } ?: VoiceModeOption.CUSTOM
        }
        val autoSpeak = prefs[Keys.AUTO_SPEAK] ?: (parsedVoiceMode != VoiceModeOption.SILENT)
        val highThinking = prefs[Keys.HIGH_THINKING] ?: false
        val modeName = prefs[Keys.INTELLIGENCE_MODE] ?: IntelligenceMode.ADVANCED.name
        val parsedMode = IntelligenceMode.entries.firstOrNull { it.name == modeName }
            ?: IntelligenceMode.ADVANCED
        val depthName = prefs[Keys.LEARNER_DEPTH] ?: LearnerDepth.INTERMEDIO.name
        val parsedDepth = LearnerDepth.entries.firstOrNull { it.name == depthName }
            ?: LearnerDepth.INTERMEDIO

        NexusSettings(
            cloudRunBaseUrl = prefs[Keys.CLOUD_RUN_URL] ?: BuildConfig.DEFAULT_CLOUD_RUN_URL,
            userName = prefs[Keys.USER_NAME] ?: "Utilizador",
            languageTag = prefs[Keys.LANGUAGE_TAG] ?: "pt-AO",
            autoSpeakReplies = autoSpeak,
            voiceMode = parsedVoiceMode,
            ttsSpeechRate = (prefs[Keys.TTS_RATE] ?: 1.0f).coerceIn(0.5f, 2.0f),
            ttsVolume = (prefs[Keys.TTS_VOLUME] ?: 1.0f).coerceIn(0.0f, 1.0f),
            highThinking = highThinking,
            intelligenceMode = parsedMode,
            learnerDepth = parsedDepth,
            webSearchGroundingEnabled = prefs[Keys.WEB_SEARCH_GROUNDING] ?: true,
            localRagEnabled = prefs[Keys.LOCAL_RAG_ENABLED] ?: true,
            codeVerificationEnabled = prefs[Keys.CODE_VERIFICATION] ?: true,
            customVoiceApiEnabled = prefs[Keys.CUSTOM_VOICE_API] ?: true,
            themeMode = parsedTheme,
            activeSessionId = prefs[Keys.ACTIVE_SESSION_ID] ?: -1L
        )
    }

    suspend fun updateCloudRunUrl(url: String) {
        context.dataStore.edit { it[Keys.CLOUD_RUN_URL] = url }
    }

    suspend fun updateUserName(name: String) {
        context.dataStore.edit { it[Keys.USER_NAME] = name.trim().ifEmpty { "Utilizador" } }
    }

    suspend fun updateLanguageTag(tag: String) {
        context.dataStore.edit { it[Keys.LANGUAGE_TAG] = tag }
    }

    suspend fun updateAutoSpeak(enabled: Boolean) {
        context.dataStore.edit {
            it[Keys.AUTO_SPEAK] = enabled
            if (!enabled) {
                it[Keys.VOICE_MODE] = VoiceModeOption.SILENT.name
            } else if (it[Keys.VOICE_MODE] == VoiceModeOption.SILENT.name) {
                it[Keys.VOICE_MODE] = VoiceModeOption.ORIGINAL.name
            }
        }
    }

    suspend fun updateVoiceMode(mode: VoiceModeOption) {
        context.dataStore.edit {
            it[Keys.VOICE_MODE] = mode.name
            it[Keys.AUTO_SPEAK] = mode != VoiceModeOption.SILENT
        }
    }

    suspend fun updateTtsRate(rate: Float) {
        context.dataStore.edit { it[Keys.TTS_RATE] = rate.coerceIn(0.5f, 2.0f) }
    }

    suspend fun updateTtsVolume(volume: Float) {
        context.dataStore.edit { it[Keys.TTS_VOLUME] = volume.coerceIn(0.0f, 1.0f) }
    }

    suspend fun updateHighThinking(enabled: Boolean) {
        context.dataStore.edit {
            it[Keys.HIGH_THINKING] = enabled
            it[Keys.INTELLIGENCE_MODE] = if (enabled) {
                IntelligenceMode.ADVANCED.name
            } else {
                IntelligenceMode.FAST.name
            }
        }
    }

    suspend fun updateIntelligenceMode(mode: IntelligenceMode) {
        context.dataStore.edit {
            it[Keys.INTELLIGENCE_MODE] = mode.name
            it[Keys.HIGH_THINKING] = mode != IntelligenceMode.FAST
        }
    }

    suspend fun updateLearnerDepth(depth: LearnerDepth) {
        context.dataStore.edit { it[Keys.LEARNER_DEPTH] = depth.name }
    }

    suspend fun updateWebSearchGrounding(enabled: Boolean) {
        context.dataStore.edit { it[Keys.WEB_SEARCH_GROUNDING] = enabled }
    }

    suspend fun updateLocalRagEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.LOCAL_RAG_ENABLED] = enabled }
    }

    suspend fun updateCodeVerificationEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.CODE_VERIFICATION] = enabled }
    }

    suspend fun updateCustomVoiceApiEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.CUSTOM_VOICE_API] = enabled }
    }

    suspend fun updateThemeMode(mode: ThemeMode) {
        context.dataStore.edit { it[Keys.THEME_MODE] = mode.name }
    }

    suspend fun updateActiveSessionId(sessionId: Long) {
        context.dataStore.edit { it[Keys.ACTIVE_SESSION_ID] = sessionId }
    }
}
