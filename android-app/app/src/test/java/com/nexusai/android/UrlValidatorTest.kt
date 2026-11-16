package com.nexusai.android

import com.nexusai.android.data.remote.UrlValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlValidatorTest {

    @Test
    fun `rejects empty cloud run url`() {
        val result = UrlValidator.validateHttpsBaseUrl("   ")
        assertTrue(result is UrlValidator.ValidationResult.Invalid)
    }

    @Test
    fun `rejects insecure http url`() {
        val result = UrlValidator.validateHttpsBaseUrl("http://nexus-ai-1182.run.app")
        assertTrue(result is UrlValidator.ValidationResult.Invalid)
    }

    @Test
    fun `normalizes valid https url with trailing slash`() {
        val result = UrlValidator.validateHttpsBaseUrl("https://nexus-ai-1182-europe-west2.run.app")
        assertTrue(result is UrlValidator.ValidationResult.Valid)
        assertEquals(
            "https://nexus-ai-1182-europe-west2.run.app/",
            (result as UrlValidator.ValidationResult.Valid).normalizedBaseUrl
        )
    }

    @Test
    fun `prepends https when omitted for valid hostname`() {
        val result = UrlValidator.validateHttpsBaseUrl("nexus-ai-1182.europe-west2.run.app")
        assertTrue(result is UrlValidator.ValidationResult.Valid)
        assertEquals(
            "https://nexus-ai-1182.europe-west2.run.app/",
            (result as UrlValidator.ValidationResult.Valid).normalizedBaseUrl
        )
    }
}
