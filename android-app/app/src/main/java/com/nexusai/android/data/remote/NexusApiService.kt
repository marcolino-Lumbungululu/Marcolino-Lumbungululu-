package com.nexusai.android.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface NexusApiService {

    @GET("health")
    suspend fun checkRootHealth(): HealthResponse

    @GET("api/health")
    suspend fun checkHealth(): HealthResponse

    @POST("api/ai/interpret")
    suspend fun interpret(@Body request: InterpretRequest): InterpretResponse

    @POST("api/ai/science")
    suspend fun askScienceEngine(@Body request: ScienceChatRequest): ScienceChatResponse

    @POST("api/ai/document")
    suspend fun analyzeDocument(@Body request: DocumentAnalyzeRequest): DocumentAnalyzeResponse

    @POST("api/ai/tts")
    suspend fun synthesizeCustomVoice(@Body request: TtsSynthesizeRequest): TtsSynthesizeResponse
}
