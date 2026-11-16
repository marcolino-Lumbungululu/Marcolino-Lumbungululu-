import React from 'react';
import {
  Bell,
  Camera,
  FolderCheck,
  LogIn,
  LogOut,
  Mic,
  Moon,
  ShieldCheck,
  Sun,
  Touchpad,
  Trash2,
} from 'lucide-react';
import type {
  CustomVoiceProfile,
  InstalledAppPermission,
  PermissionState,
  UserSettings,
} from '../types/nexus.ts';
import { AppPermissionsPanel } from './AppPermissionsPanel.tsx';
import { CustomVoiceStudio } from './CustomVoiceStudio.tsx';

interface SettingsAndPrivacyProps {
  settings: UserSettings;
  permissions: PermissionState;
  appPermissions: InstalledAppPermission[];
  customVoiceProfile: CustomVoiceProfile;
  initialTab?: 'geral' | 'voz' | 'apps';
  availableVoices: SpeechSynthesisVoice[];
  userEmail: string | null;
  appLaunchNotice: string | null;
  isOnline: boolean;
  isSpeaking: boolean;
  voiceEngineNotice: string | null;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onUpdateCustomVoice: (patch: Partial<CustomVoiceProfile>) => void;
  onDeleteCustomVoice: () => void;
  onTestCustomVoice: (text: string) => void;
  onStopSpeaking: () => void;
  onUpdateAppPermission: (updated: InstalledAppPermission) => void;
  onBulkUpdateApps: (mode: 'allow_safe' | 'protect_finance' | 'block_all') => void;
  onTestLaunchApp: (app: InstalledAppPermission) => void;
  onRequestMicrophone: () => void;
  onRequestCamera: () => void;
  onClearHistory: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenGestureGuide: () => void;
}

export const SettingsAndPrivacy: React.FC<SettingsAndPrivacyProps> = ({
  settings,
  permissions,
  appPermissions,
  customVoiceProfile,
  initialTab = 'geral',
  availableVoices,
  userEmail,
  appLaunchNotice,
  isOnline,
  isSpeaking,
  voiceEngineNotice,
  onUpdateSettings,
  onUpdateCustomVoice,
  onDeleteCustomVoice,
  onTestCustomVoice,
  onStopSpeaking,
  onUpdateAppPermission,
  onBulkUpdateApps,
  onTestLaunchApp,
  onRequestMicrophone,
  onRequestCamera,
  onClearHistory,
  onSignIn,
  onSignOut,
  onOpenGestureGuide,
}) => {
  const [subTab, setSubTab] = React.useState<'geral' | 'voz' | 'apps'>(initialTab);

  React.useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('geral')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'geral'
                ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Geral, Voz e Privacidade
          </button>
          <button
            type="button"
            onClick={() => setSubTab('voz')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'voz'
                ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Criar a Minha Voz
          </button>
          <button
            type="button"
            onClick={() => setSubTab('apps')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'apps'
                ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Permissões dos Aplicativos ({appPermissions.length})
          </button>
        </div>

        {appLaunchNotice && (
          <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded-xl">
            {appLaunchNotice}
          </p>
        )}
      </div>

      {subTab === 'apps' ? (
        <AppPermissionsPanel
          apps={appPermissions}
          onUpdateAppPermission={onUpdateAppPermission}
          onBulkUpdateApps={onBulkUpdateApps}
          onTestLaunchApp={onTestLaunchApp}
        />
      ) : subTab === 'voz' ? (
        <CustomVoiceStudio
          profile={customVoiceProfile}
          settings={settings}
          availableVoices={availableVoices}
          isOnline={isOnline}
          isSpeaking={isSpeaking}
          engineNotice={voiceEngineNotice}
          onUpdateProfile={onUpdateCustomVoice}
          onDeleteProfile={onDeleteCustomVoice}
          onTestSpeak={onTestCustomVoice}
          onStopSpeaking={onStopSpeaking}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Personalization */}
      <section
        aria-label="Personalização do Assistente"
        className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Personalização e Voz
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adapta o tratamento, voz sintetizada, idioma e comportamento do NEXUS AI
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="setting-user-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nome pelo qual devo chamar-te
            </label>
            <input
              id="setting-user-name"
              type="text"
              value={settings.assistantUserName}
              onChange={(e) => onUpdateSettings({ assistantUserName: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="setting-language"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Idioma principal
            </label>
            <select
              id="setting-language"
              value={settings.language}
              onChange={(e) =>
                onUpdateSettings({ language: e.target.value as UserSettings['language'] })
              }
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            >
              <option value="pt-AO">Português (Angola)</option>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-voice-gender"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Preferência de voz
            </label>
            <select
              id="setting-voice-gender"
              value={settings.voiceGender}
              onChange={(e) =>
                onUpdateSettings({
                  voiceGender: e.target.value === 'masculina' ? 'masculina' : 'feminina',
                })
              }
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            >
              <option value="feminina">Voz Feminina</option>
              <option value="masculina">Voz Masculina</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-voice-uri"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Voz do sistema disponível
            </label>
            <select
              id="setting-voice-uri"
              value={settings.voiceUri ?? ''}
              onChange={(e) =>
                onUpdateSettings({ voiceUri: e.target.value || null })
              }
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Seleção automática ({settings.language})</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="setting-speech-rate" className="font-medium text-slate-700 dark:text-slate-300">
                Velocidade da fala
              </label>
              <span className="font-mono tabular-nums text-slate-500">
                {settings.speechRate.toFixed(1)}x
              </span>
            </div>
            <input
              id="setting-speech-rate"
              type="range"
              min={0.7}
              max={1.5}
              step={0.1}
              value={settings.speechRate}
              onChange={(e) => onUpdateSettings({ speechRate: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="setting-response-vol" className="font-medium text-slate-700 dark:text-slate-300">
                Volume das respostas
              </label>
              <span className="font-mono tabular-nums text-slate-500">
                {Math.round(settings.responseVolume * 100)}%
              </span>
            </div>
            <input
              id="setting-response-vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.responseVolume}
              onChange={(e) => onUpdateSettings({ responseVolume: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Custom Voice Quick Status Card */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Motor de Voz Personalizada (Gemini TTS)
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customVoiceProfile.enabled && customVoiceProfile.voiceId
                ? `Ativa · ID ${customVoiceProfile.voiceId} (${customVoiceProfile.geminiVoiceName})`
                : customVoiceProfile.voiceId
                ? `Configurada (${customVoiceProfile.voiceId}) — atualmente desativada`
                : 'Ainda não configurada. Grava amostras da tua voz para criar o teu perfil.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubTab('voz')}
            className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            Abrir “Criar a Minha Voz”
          </button>
        </div>

        {/* Wake Word + Toggles */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Palavra de ativação
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Só processa comandos após reconhecer a palavra configurada
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="setting-wake-word" className="sr-only">
                Palavra de ativação
              </label>
              <input
                id="setting-wake-word"
                type="text"
                value={settings.wakeWord}
                onChange={(e) => onUpdateSettings({ wakeWord: e.target.value })}
                className="w-28 h-9 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => onUpdateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
                aria-pressed={settings.wakeWordEnabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  settings.wakeWordEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {settings.wakeWordEnabled ? 'Ativa' : 'Desativada'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Modo Silencioso</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apresenta apenas respostas escritas sem síntese de voz
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ silentMode: !settings.silentMode })}
              aria-pressed={settings.silentMode}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                settings.silentMode
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {settings.silentMode ? 'Silencioso Ativo' : 'Voz Ativa'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Tema da Interface</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alternar entre aparência escura futurista ou tema claro
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
            >
              {settings.theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tema Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tema Claro</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Navegação por Gestos
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deslizar para cima (expandir), esquerda (voltar) e duplo toque no microfone
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ gesturesEnabled: settings.gesturesEnabled === false })
                }
                aria-pressed={settings.gesturesEnabled !== false}
                className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  settings.gesturesEnabled !== false
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {settings.gesturesEnabled !== false ? 'Gestos Ativos' : 'Desativados'}
              </button>
              <button
                type="button"
                onClick={onOpenGestureGuide}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
              >
                <Touchpad className="w-3.5 h-3.5 text-blue-500" />
                <span>Guia e Teste</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Permissions, Account Sync & Privacy */}
      <section
        aria-label="Permissões e Privacidade"
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Segurança, Permissões e Conta
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controlo transparente de acesso e sincronização na nuvem
            </p>
          </div>
        </div>

        {/* Account Sync Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sincronização Persistente (Cloud SQL)
          </p>
          {userEmail ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {userEmail}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Preferências e histórico sincronizados
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Inicia sessão com Google para guardar o histórico, listas de música, progresso de leitura e automações na base de dados.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar com Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Permissions List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Permissões Solicitadas Sob Demanda
          </h3>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Microfone</p>
                <p className="text-xs text-slate-500">Estado: {permissions.microphone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestMicrophone}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Verificar
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-violet-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Câmara</p>
                <p className="text-xs text-slate-500">Estado: {permissions.camera}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestCamera}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Verificar
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <FolderCheck className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Ficheiros Autorizados
                </p>
                <p className="text-xs text-slate-500">Acesso explícito por seleção</p>
              </div>
            </div>
            <span className="text-xs text-slate-500">{permissions.localFiles}</span>
          </div>

          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Controlos Multimédia
                </p>
                <p className="text-xs text-slate-500">Media Session API ativa</p>
              </div>
            </div>
            <span className="text-xs text-slate-500">Ativo</span>
          </div>
        </div>

        {/* Privacy Guarantees + Clear Data */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O NEXUS AI nunca grava áudio secretamente em segundo plano, nunca elimina ficheiros sem confirmação e não envia documentos pessoais para fora sem pedido explícito.
          </p>
          <button
            type="button"
            onClick={onClearHistory}
            className="w-full h-10 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Apagar Todo o Histórico de Conversas</span>
          </button>
        </div>
      </section>
        </div>
      )}
    </div>
  );
};
