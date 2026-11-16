package com.nexusai.android

import android.app.Application
import com.nexusai.android.ai.NexusAIEngine
import com.nexusai.android.data.local.NexusDatabase
import com.nexusai.android.data.local.UserSettingsStore
import com.nexusai.android.data.remote.DynamicRetrofitProvider
import com.nexusai.android.data.repository.NexusRepository
import com.nexusai.android.voice.NexusSpeechRecognizer
import com.nexusai.android.voice.NexusTextToSpeech

class NexusApplication : Application() {

    lateinit var repository: NexusRepository
        private set

    lateinit var aiEngine: NexusAIEngine
        private set

    lateinit var speechRecognizer: NexusSpeechRecognizer
        private set

    lateinit var textToSpeech: NexusTextToSpeech
        private set

    override fun onCreate() {
        super.onCreate()
        val database = NexusDatabase.getInstance(this)
        val settingsStore = UserSettingsStore(this)
        val retrofitProvider = DynamicRetrofitProvider()

        speechRecognizer = NexusSpeechRecognizer(this)
        textToSpeech = NexusTextToSpeech(this)

        repository = NexusRepository(
            context = this,
            dao = database.nexusDao(),
            settingsStore = settingsStore,
            retrofitProvider = retrofitProvider
        )
        aiEngine = NexusAIEngine(
            context = this,
            chatDao = database.nexusDao(),
            knowledgeDao = database.knowledgeDao(),
            settingsStore = settingsStore,
            retrofitProvider = retrofitProvider,
            textToSpeech = textToSpeech
        )
    }

    override fun onTerminate() {
        speechRecognizer.release()
        textToSpeech.release()
        super.onTerminate()
    }
}
