package com.nexusai.android.data.remote

import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

object UrlValidator {

    sealed interface ValidationResult {
        data class Valid(val normalizedBaseUrl: String) : ValidationResult
        data class Invalid(val errorMessage: String) : ValidationResult
    }

    fun validateHttpsBaseUrl(rawUrl: String): ValidationResult {
        val trimmed = rawUrl.trim()
        if (trimmed.isEmpty()) {
            return ValidationResult.Invalid("A URL do servidor Cloud Run não pode estar vazia.")
        }

        if (trimmed.startsWith("http://", ignoreCase = true)) {
            return ValidationResult.Invalid(
                "Por segurança, apenas ligações HTTPS encriptadas são permitidas (ex.: https://...run.app)."
            )
        }

        val withScheme = if (trimmed.startsWith("https://", ignoreCase = true)) {
            trimmed
        } else {
            "https://$trimmed"
        }

        val parsed = withScheme.toHttpUrlOrNull()
            ?: return ValidationResult.Invalid("URL inválida. Introduz um endereço HTTPS completo do Cloud Run.")

        if (!parsed.isHttps || parsed.host.isBlank()) {
            return ValidationResult.Invalid("URL HTTPS inválida. Verifica o domínio do serviço Cloud Run.")
        }

        val canonical = parsed.newBuilder()
            .query(null)
            .fragment(null)
            .build()
            .toString()

        val normalized = if (canonical.endsWith("/")) canonical else "$canonical/"
        return ValidationResult.Valid(normalized)
    }
}
