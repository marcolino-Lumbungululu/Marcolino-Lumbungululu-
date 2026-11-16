# NEXUS AI — Aplicação Android Nativa (Kotlin + Jetpack Compose + Material 3)

Cliente móvel nativo do servidor **NEXUS AI (`nexus-ai-1182`)** alojado no Google Cloud Run.

## Arquitetura
- **UI**: Jetpack Compose + Material Design 3 (suporte automático para Modo Claro, Escuro e Sistema).
- **Padrão**: MVVM (`NexusViewModel`) + `StateFlow` + Navigation Compose (`Main`, `History`, `Settings`).
- **Rede (HTTPS apenas)**: Retrofit 2 + OkHttp 4 + Kotlinx Serialization (`usesCleartextTraffic="false"`), com timeouts configurados e tratamento de erros em português.
- **Endpoints utilizados do backend existente (`server.ts`)**:
  - `GET /api/health` — verificação de disponibilidade do servidor Cloud Run.
  - `POST /api/ai/interpret` — interpretação e respostas Gemini com histórico recente e idioma (`pt-AO`, `pt-PT`, `pt-BR`, `en-US`).
  - `POST /api/ai/document` — análise de documentos via Gemini.
- **Voz nativa Android**:
  - `SpeechRecognizer` com transcrição parcial, animação por nível de som e tratamento de permissão `RECORD_AUDIO`.
  - `TextToSpeech` com suporte para respostas longas (divisão automática em blocos), seleção de idioma, velocidade de leitura (`0.5x`–`2.0x`), volume (`0%`–`100%`) e botão para parar/ativar leitura.
- **Persistência local**:
  - **Room (SQLite)** para guardar sessões e mensagens entre reinicializações e permitir eliminar conversas selecionadas.
  - **DataStore Preferences** para URL HTTPS do Cloud Run, nome do utilizador, idioma, velocidade/volume de TTS e tema.

## Como compilar APK e AAB no Android Studio
1. Abre a pasta `android-app` no **Android Studio** (**File → Open → android-app**).
2. Aguarda a sincronização do Gradle (`Gradle Sync`).
3. Para testar os testes unitários locais:
   ```bash
   ./gradlew testDebugUnitTest
   ```
4. Para gerar **APK**:
   - Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)** ou:
   ```bash
   ./gradlew assembleRelease
   ```
5. Para gerar **AAB (Google Play)**:
   - Menu **Build → Generate Signed Bundle / APK → Android App Bundle** ou:
   ```bash
   ./gradlew bundleRelease
   ```

## Configurar a URL do Cloud Run
Na primeira abertura da app, vai a **Configurações (ícone de engrenagem)**, introduz a URL HTTPS completa do serviço **NEXUS AI** no Google Cloud Run (ex.: `https://nexus-ai-1182-....run.app/`) e toca em **Guardar e Testar**.
