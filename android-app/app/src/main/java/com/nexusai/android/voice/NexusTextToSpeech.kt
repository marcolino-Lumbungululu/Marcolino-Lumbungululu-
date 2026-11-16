package com.nexusai.android.voice

import android.content.Context
import android.media.MediaPlayer
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Base64
import com.nexusai.android.data.local.VoiceModeOption
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import java.util.Locale
import java.util.UUID

enum class SpeechPlaybackState {
    IDLE,
    SPEAKING,
    STOPPING,
    COMPLETED,
    ERROR
}

class NexusTextToSpeech(private val context: Context) : TextToSpeech.OnInitListener {

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _speechState = MutableStateFlow(SpeechPlaybackState.IDLE)
    val speechState: StateFlow<SpeechPlaybackState> = _speechState.asStateFlow()

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    private val tts: TextToSpeech = TextToSpeech(context.applicationContext, this)
    private var mediaPlayer: MediaPlayer? = null
    private var activeTempAudioFile: File? = null
    private var activeChunksRemaining = 0

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    _speechState.value = SpeechPlaybackState.SPEAKING
                    _isSpeaking.value = true
                }

                override fun onDone(utteranceId: String?) {
                    activeChunksRemaining = (activeChunksRemaining - 1).coerceAtLeast(0)
                    if (activeChunksRemaining == 0) {
                        _speechState.value = SpeechPlaybackState.COMPLETED
                        _isSpeaking.value = false
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    activeChunksRemaining = 0
                    _speechState.value = SpeechPlaybackState.ERROR
                    _isSpeaking.value = false
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    activeChunksRemaining = 0
                    _speechState.value = SpeechPlaybackState.ERROR
                    _isSpeaking.value = false
                }
            })
            _isReady.value = true
        } else {
            _isReady.value = false
            _speechState.value = SpeechPlaybackState.ERROR
        }
    }

    fun speak(
        text: String,
        languageTag: String,
        speechRate: Float,
        volume: Float,
        voiceMode: VoiceModeOption
    ) {
        if (voiceMode == VoiceModeOption.SILENT) {
            stop()
            return
        }

        stop()
        val cleanText = sanitizeForSpeech(text)
        if (!_isReady.value || cleanText.isEmpty()) return

        applyLocale(languageTag)
        tts.setSpeechRate(speechRate.coerceIn(0.5f, 2.0f))

        when (voiceMode) {
            VoiceModeOption.MALE -> tts.setPitch(0.85f)
            VoiceModeOption.FEMALE -> tts.setPitch(1.2f)
            else -> tts.setPitch(1.0f)
        }

        val params = Bundle().apply {
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume.coerceIn(0f, 1f))
        }

        val chunks = splitIntoTtsChunks(cleanText, maxLength = 3500)
        activeChunksRemaining = chunks.size
        _speechState.value = SpeechPlaybackState.SPEAKING
        _isSpeaking.value = true

        chunks.forEachIndexed { index, chunk ->
            val queueMode = if (index == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            val utteranceId = "nexus-${UUID.randomUUID()}"
            tts.speak(chunk, queueMode, params, utteranceId)
        }
    }

    fun playWavBase64(
        base64Audio: String,
        volume: Float,
        onFallback: () -> Unit
    ) {
        stop()
        _speechState.value = SpeechPlaybackState.SPEAKING
        try {
            val bytes = Base64.decode(base64Audio, Base64.DEFAULT)
            val tempFile = File.createTempFile("nexus_tts_", ".wav", context.cacheDir)
            tempFile.writeBytes(bytes)
            activeTempAudioFile = tempFile

            val player = MediaPlayer().apply {
                setDataSource(tempFile.absolutePath)
                val safeVol = volume.coerceIn(0f, 1f)
                setVolume(safeVol, safeVol)
                setOnPreparedListener {
                    _speechState.value = SpeechPlaybackState.SPEAKING
                    _isSpeaking.value = true
                    it.start()
                }
                setOnCompletionListener {
                    stopMediaPlayerOnly()
                    _speechState.value = SpeechPlaybackState.COMPLETED
                    _isSpeaking.value = false
                }
                setOnErrorListener { _, _, _ ->
                    stopMediaPlayerOnly()
                    _speechState.value = SpeechPlaybackState.ERROR
                    _isSpeaking.value = false
                    onFallback()
                    true
                }
                prepareAsync()
            }
            mediaPlayer = player
        } catch (_: Throwable) {
            stopMediaPlayerOnly()
            _speechState.value = SpeechPlaybackState.ERROR
            _isSpeaking.value = false
            onFallback()
        }
    }

    fun stop() {
        _speechState.value = SpeechPlaybackState.STOPPING
        activeChunksRemaining = 0
        _isSpeaking.value = false
        stopMediaPlayerOnly()
        runCatching { tts.stop() }
        _speechState.value = SpeechPlaybackState.IDLE
    }

    fun release() {
        stop()
        runCatching { tts.shutdown() }
    }

    private fun stopMediaPlayerOnly() {
        runCatching {
            mediaPlayer?.let { player ->
                if (player.isPlaying) {
                    player.stop()
                }
                player.release()
            }
        }
        mediaPlayer = null
        runCatching { activeTempAudioFile?.delete() }
        activeTempAudioFile = null
    }

    private fun applyLocale(languageTag: String) {
        val primary = Locale.forLanguageTag(languageTag)
        val candidates = listOf(
            primary,
            Locale("pt", "AO"),
            Locale("pt", "PT"),
            Locale("pt", "BR"),
            Locale("pt"),
            Locale.getDefault()
        )
        for (locale in candidates) {
            val availability = tts.isLanguageAvailable(locale)
            if (availability >= TextToSpeech.LANG_AVAILABLE) {
                tts.language = locale
                return
            }
        }
    }

    private fun sanitizeForSpeech(input: String): String {
        return input
            .replace(Regex("[*_`#>]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun splitIntoTtsChunks(text: String, maxLength: Int): List<String> {
        if (text.length <= maxLength) return listOf(text)
        val chunks = mutableListOf<String>()
        var remaining = text
        while (remaining.length > maxLength) {
            val slice = remaining.substring(0, maxLength)
            val breakAt = listOf(
                slice.lastIndexOf(". "),
                slice.lastIndexOf("! "),
                slice.lastIndexOf("? "),
                slice.lastIndexOf('\n'),
                slice.lastIndexOf(' ')
            ).maxOrNull()?.takeIf { it > maxLength / 2 } ?: maxLength

            chunks.add(remaining.substring(0, breakAt).trim())
            remaining = remaining.substring(breakAt).trim()
        }
        if (remaining.isNotEmpty()) {
            chunks.add(remaining)
        }
        return chunks
    }
}
