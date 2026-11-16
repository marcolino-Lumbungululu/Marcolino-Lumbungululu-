package com.nexusai.android.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SpeechRecognitionState(
    val isAvailable: Boolean = true,
    val isListening: Boolean = false,
    val partialText: String = "",
    val rmsDb: Float = 0f,
    val errorMessage: String? = null
)

class NexusSpeechRecognizer(private val context: Context) {

    private val _state = MutableStateFlow(
        SpeechRecognitionState(isAvailable = SpeechRecognizer.isRecognitionAvailable(context))
    )
    val state: StateFlow<SpeechRecognitionState> = _state.asStateFlow()

    private var speechRecognizer: SpeechRecognizer? = null
    private var onFinalResultCallback: ((String) -> Unit)? = null

    fun startListening(languageTag: String, onFinalResult: (String) -> Unit) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _state.update {
                it.copy(
                    isAvailable = false,
                    isListening = false,
                    errorMessage = "O reconhecimento de voz não está disponível neste dispositivo Android."
                )
            }
            return
        }

        stopListening()
        onFinalResultCallback = onFinalResult

        val recognizer = SpeechRecognizer.createSpeechRecognizer(context).also {
            speechRecognizer = it
        }

        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                _state.update {
                    it.copy(isListening = true, partialText = "", errorMessage = null)
                }
            }

            override fun onBeginningOfSpeech() = Unit

            override fun onRmsChanged(rmsdB: Float) {
                val normalized = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)
                _state.update { it.copy(rmsDb = normalized) }
            }

            override fun onBufferReceived(buffer: ByteArray?) = Unit

            override fun onEndOfSpeech() {
                _state.update { it.copy(isListening = false, rmsDb = 0f) }
            }

            override fun onError(error: Int) {
                val message = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Erro na captação de áudio do microfone."
                    SpeechRecognizer.ERROR_CLIENT -> null
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                        "Permissão de microfone necessária para ouvir comandos."
                    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                        "Sem ligação para reconhecimento de voz online."
                    SpeechRecognizer.ERROR_NO_MATCH ->
                        "Não foi possível compreender a fala. Tenta falar novamente."
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY ->
                        "O microfone está ocupado. Tenta novamente dentro de instantes."
                    SpeechRecognizer.ERROR_SERVER ->
                        "Erro no serviço de reconhecimento de voz do Android."
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                        "Nenhuma fala detetada."
                    SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED,
                    SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ->
                        "Idioma de voz selecionado indisponível neste dispositivo; a usar Português."
                    else -> "Não foi possível concluir a captação de voz."
                }
                _state.update {
                    it.copy(isListening = false, rmsDb = 0f, errorMessage = message)
                }
            }

            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val transcript = matches?.firstOrNull()?.trim().orEmpty()
                _state.update {
                    it.copy(isListening = false, partialText = transcript, rmsDb = 0f, errorMessage = null)
                }
                if (transcript.isNotEmpty()) {
                    onFinalResultCallback?.invoke(transcript)
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val partial = partialResults
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.trim()
                    .orEmpty()
                if (partial.isNotEmpty()) {
                    _state.update { it.copy(partialText = partial) }
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })

        val effectiveLanguage = normalizeSpeechLocale(languageTag)
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, effectiveLanguage)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, effectiveLanguage)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }

        _state.update { it.copy(isListening = true, partialText = "", errorMessage = null) }
        recognizer.startListening(intent)
    }

    fun stopListening() {
        runCatching {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        }
        speechRecognizer = null
        _state.update { it.copy(isListening = false, rmsDb = 0f) }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    fun release() {
        stopListening()
        onFinalResultCallback = null
    }

    private fun normalizeSpeechLocale(tag: String): String {
        return when {
            tag.equals("pt-AO", ignoreCase = true) -> "pt-AO"
            tag.equals("pt-PT", ignoreCase = true) -> "pt-PT"
            tag.equals("pt-BR", ignoreCase = true) -> "pt-BR"
            else -> tag.ifBlank { "pt-PT" }
        }
    }
}
