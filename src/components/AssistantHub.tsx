import React, { useEffect, useRef, useState } from 'react';
import {
  AppWindow,
  AudioLines,
  Brain,
  Camera,
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  FileText,
  History,
  Image as ImageIcon,
  Layers,
  Mic,
  MicOff,
  Minimize2,
  Music,
  Radio,
  Search,
  Send,
  Settings,
  Sliders,
  Square,
  Touchpad,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useGestureNavigation } from '../hooks/useGestureNavigation.ts';
import { useVoiceAmplitude } from '../hooks/useVoiceAmplitude.ts';
import {
  BOTTOM_CIRCULAR_CONTROLS,
  LEFT_HOLOGRAPHIC_NODES,
  RIGHT_HOLOGRAPHIC_NODES,
  computeWaveformHeights,
  deriveVisualAssistantState,
  type LateralNodeId,
  type VoiceOutputMode,
} from '../modules/nexusVisualState.ts';
import type {
  AssistantStatus,
  ConversationEntry,
  CustomVoiceProfile,
  FileCategory,
  GestureType,
  NavSection,
  UserSettings,
} from '../types/nexus.ts';

interface AssistantHubProps {
  status: AssistantStatus;
  recognizedCommand: string;
  lastResponse: string;
  lastExecutionResult?: string | null;
  isSpeaking: boolean;
  isReadingAloud: boolean;
  isListening: boolean;
  isLiveActive: boolean;
  liveConnected: boolean;
  messages: ConversationEntry[];
  settings: UserSettings;
  customVoiceProfile: CustomVoiceProfile;
  speechSupported: boolean;
  isOnline: boolean;
  onToggleListen: () => void;
  onToggleLive: () => void;
  onStopSpeaking: () => void;
  onSubmitCommand: (text: string) => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onUpdateCustomVoice: (patch: Partial<CustomVoiceProfile>) => void;
  onClearHistory: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onNavigateSection: (section: NavSection, options?: { fileCategory?: 'Todos' | FileCategory; settingsTab?: 'geral' | 'voz' | 'apps'; focusSearch?: boolean }) => void;
  onOpenGestureGuide: () => void;
  onGestureDetected: (gesture: GestureType) => void;
}

const QUICK_COMMANDS = [
  'Quero ouvir música cristã',
  'Abrir o ficheiro Cálculo',
  'Ler o documento Matemática',
  'Ir para ficheiros',
  'Abrir permissões dos aplicativos',
  'Modo estudo',
];

const LATERAL_ICONS: Record<LateralNodeId, React.ReactNode> = {
  musica: <Music className="w-4 h-4" />,
  documentos: <FileText className="w-4 h-4" />,
  fotografias: <ImageIcon className="w-4 h-4" />,
  videos: <Video className="w-4 h-4" />,
  aplicacoes: <AppWindow className="w-4 h-4" />,
  pesquisa: <Search className="w-4 h-4" />,
  ia: <Cpu className="w-4 h-4" />,
  voz: <AudioLines className="w-4 h-4" />,
  definicoes: <Sliders className="w-4 h-4" />,
  memoria: <Database className="w-4 h-4" />,
};

export const AssistantHub: React.FC<AssistantHubProps> = ({
  status,
  recognizedCommand,
  lastResponse,
  lastExecutionResult,
  isSpeaking,
  isReadingAloud,
  isListening,
  isLiveActive,
  liveConnected,
  messages,
  settings,
  customVoiceProfile,
  speechSupported,
  isOnline,
  onToggleListen,
  onToggleLive,
  onStopSpeaking,
  onSubmitCommand,
  onUpdateSettings,
  onUpdateCustomVoice,
  onClearHistory,
  isExpanded,
  onToggleExpanded,
  onNavigateSection,
  onOpenGestureGuide,
  onGestureDetected,
}) => {
  const [inputText, setInputText] = useState('');
  const [showVoiceModeMenu, setShowVoiceModeMenu] = useState(false);
  const [showExtrasMenu, setShowExtrasMenu] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);

  const gesturesEnabled = settings.gesturesEnabled !== false;
  const voiceCardGestures = useGestureNavigation({
    enabled: gesturesEnabled && !isExpanded,
    sensitivity: settings.gestureSensitivity ?? 'normal',
    allowHorizontal: false,
    allowVertical: true,
    enableDoubleTap: true,
    enableLongPress: true,
    onGesture: onGestureDetected,
  });

  const visual = deriveVisualAssistantState({
    status,
    isListening,
    isSpeaking,
    isReadingAloud,
    isLiveActive,
    liveConnected,
    settings,
    customVoiceProfile,
  });

  const { amplitude, tick } = useVoiceAmplitude(visual.state);
  const waveHeights = computeWaveformHeights({
    state: visual.state,
    amplitude,
    tick,
    minPx: 6,
    maxPx: 42,
  });

  useEffect(() => {
    if (isExpanded) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isExpanded, messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText('');
    onSubmitCommand(trimmed);
  };

  const handleLateralAction = (id: LateralNodeId) => {
    setShowVoiceModeMenu(false);
    setShowExtrasMenu(false);
    switch (id) {
      case 'musica':
        onNavigateSection('musica');
        break;
      case 'documentos':
        onNavigateSection('ficheiros', { fileCategory: 'PDF' });
        break;
      case 'fotografias':
        onNavigateSection('ficheiros', { fileCategory: 'Fotografias' });
        break;
      case 'videos':
        onNavigateSection('ficheiros', { fileCategory: 'Vídeos' });
        break;
      case 'aplicacoes':
        onNavigateSection('definicoes', { settingsTab: 'apps' });
        break;
      case 'pesquisa':
        onNavigateSection('ficheiros', { fileCategory: 'Todos', focusSearch: true });
        break;
      case 'ia':
        onUpdateSettings({ highThinking: !settings.highThinking });
        break;
      case 'voz':
        onNavigateSection('definicoes', { settingsTab: 'voz' });
        break;
      case 'definicoes':
        onNavigateSection('definicoes', { settingsTab: 'geral' });
        break;
      case 'memoria':
        onToggleExpanded();
        break;
    }
  };

  const handleSelectVoiceMode = (mode: VoiceOutputMode) => {
    if (mode === 'silencioso') {
      onUpdateSettings({ silentMode: true });
      onStopSpeaking();
    } else if (mode === 'original') {
      if (customVoiceProfile.consentGranted && customVoiceProfile.voiceId) {
        onUpdateSettings({ silentMode: false });
        onUpdateCustomVoice({ enabled: true });
      } else {
        onUpdateSettings({ silentMode: false });
        setShowVoiceModeMenu(false);
        onNavigateSection('definicoes', { settingsTab: 'voz' });
        return;
      }
    } else {
      onUpdateSettings({ silentMode: false });
      onUpdateCustomVoice({ enabled: false });
    }
    setShowVoiceModeMenu(false);
  };

  const handleBottomAction = (id: (typeof BOTTOM_CIRCULAR_CONTROLS)[number]['id']) => {
    if (id === 'mic') {
      setShowVoiceModeMenu(false);
      setShowExtrasMenu(false);
      onToggleListen();
    } else if (id === 'custom_voice') {
      setShowExtrasMenu(false);
      setShowVoiceModeMenu((prev) => !prev);
    } else if (id === 'history') {
      setShowVoiceModeMenu(false);
      setShowExtrasMenu(false);
      onToggleExpanded();
    } else if (id === 'settings') {
      setShowVoiceModeMenu(false);
      setShowExtrasMenu(false);
      onNavigateSection('definicoes', { settingsTab: 'geral' });
    } else if (id === 'stop') {
      setShowVoiceModeMenu(false);
      setShowExtrasMenu(false);
      if (isLiveActive) onToggleLive();
      onStopSpeaking();
    } else if (id === 'extras') {
      setShowVoiceModeMenu(false);
      setShowExtrasMenu((prev) => !prev);
    }
  };

  const isBusy = visual.state === 'a_processar' || visual.state === 'a_executar';
  const isListeningVisual = visual.state === 'a_ouvir';
  const isRespondingVisual = visual.state === 'a_responder';

  return (
    <div
      data-testid="assistant-hub-layout"
      data-expanded={isExpanded ? 'true' : 'false'}
      className="w-full"
    >
      {/* Expanded Memory & Conversation History Drawer View */}
      {isExpanded ? (
        <section
          aria-label="Histórico de Conversas e Comandos"
          className="rounded-3xl border border-slate-200 dark:border-[#00BFFF]/25 bg-white dark:bg-[#071827]/90 shadow-2xl shadow-black/40 flex flex-col h-[76vh] min-h-[540px] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 dark:border-[#00BFFF]/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#EAFBFF]">
                Memória e Histórico de Contexto
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9BE8FF]/75">
                {messages.length} {messages.length === 1 ? 'registo' : 'registos'} · Idioma{' '}
                {settings.language} ·{' '}
                {!isOnline || settings.offlineMode
                  ? 'Motor Neural Local Offline'
                  : 'Gemini 4 Hydrogen'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleListen}
                aria-label={isListening ? 'Parar captação de voz' : 'Falar comando'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#00BFFF]/20 text-[#00F5FF] border border-[#00F5FF]/40 hover:bg-[#00BFFF]/30'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Parar Voz' : 'Voz'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleExpanded}
                aria-label="Recolher painel de conversa"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-[#EAFBFF] border border-slate-200 dark:border-[#00BFFF]/25 hover:bg-slate-100 dark:hover:bg-[#00BFFF]/15 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#00F5FF]" />
                <span>Recolher</span>
              </button>

              <button
                type="button"
                onClick={onClearHistory}
                disabled={messages.length === 0}
                aria-label="Limpar histórico de conversas"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-[#9BE8FF]/80 hover:bg-slate-100 dark:hover:bg-[#00BFFF]/10 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar Histórico</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm font-medium text-slate-700 dark:text-[#EAFBFF]">
                  Sem registos recentes na memória desta sessão
                </p>
                <p className="text-xs text-slate-500 dark:text-[#9BE8FF]/70 mt-1 max-w-md">
                  Toca em Recolher para regressar ao Núcleo Holográfico ou escreve um comando abaixo.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#00BFFF]/20 text-slate-900 dark:text-[#EAFBFF] border border-[#00F5FF]/40'
                        : 'bg-slate-100 dark:bg-[#02060B]/85 text-slate-900 dark:text-[#EAFBFF] border border-slate-200 dark:border-[#00BFFF]/25'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    {msg.thinkingSummary && (
                      <p className="mt-2 pt-2 border-t border-slate-200/40 dark:border-[#00BFFF]/20 text-xs text-cyan-700 dark:text-[#00F5FF]/85">
                        Raciocínio: {msg.thinkingSummary}
                      </p>
                    )}
                    {msg.executionResult && (
                      <p className="mt-1.5 text-xs opacity-80 font-mono">
                        Ação executada: {msg.executionResult}
                      </p>
                    )}
                  </div>
                  <span className="mt-1 text-[11px] text-slate-500 dark:text-[#9BE8FF]/65 tabular-nums">
                    {msg.role === 'user' ? settings.assistantUserName : 'NEXUS AI'} ·{' '}
                    {new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {msg.mode === 'offline' ? 'Offline' : msg.mode === 'live' ? 'Live' : 'Online'}
                  </span>
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-[#00BFFF]/20 space-y-3 bg-slate-50 dark:bg-[#02060B]/80">
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => onSubmitCommand(cmd)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#071827] hover:border-[#00F5FF]/60 text-slate-700 dark:text-[#EAFBFF] border border-slate-200 dark:border-[#00BFFF]/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <label htmlFor="nexus-command-input" className="sr-only">
                Escrever comando ou pergunta para o NEXUS AI
              </label>
              <input
                ref={commandInputRef}
                id="nexus-command-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escreve um comando natural (ex.: Toca música cristã)..."
                className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-[#071827] border border-slate-300 dark:border-[#00BFFF]/30 text-sm text-slate-900 dark:text-[#EAFBFF] placeholder:text-slate-500 dark:placeholder:text-[#9BE8FF]/50 focus:outline-none focus:border-[#00F5FF]"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isBusy}
                aria-label="Enviar comando"
                className="h-11 px-4 rounded-xl bg-[#00BFFF] hover:bg-[#00F5FF] text-[#02060B] font-semibold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
              >
                <Send className="w-4 h-4" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </section>
      ) : (
        /* Primary Futuristic Holographic Core HUD */
        <section
          aria-label="Centro de Controlo por Voz"
          {...voiceCardGestures}
          className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#00BFFF]/25 bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-[#071827] dark:via-[#02060B] dark:to-[#02060B] px-4 py-5 sm:px-8 sm:py-6 shadow-2xl shadow-black/50"
        >
          {/* Subtle Atmospheric Radial Glow (Cyan / Deep Blue) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-85 dark:opacity-100"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, rgba(0, 191, 255, 0.16) 0%, rgba(7, 24, 39, 0.35) 38%, rgba(2, 6, 11, 0) 74%)',
            }}
          />

          {/* Top HUD Utility Row */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-[#00BFFF]/15">
            <div className="flex flex-wrap items-center gap-3">
              <span
                data-testid="assistant-status"
                className={`font-mono text-xs font-semibold tracking-wider px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                  visual.state === 'a_ouvir'
                    ? 'border-[#00F5FF]/70 bg-[#00F5FF]/15 text-cyan-800 dark:text-[#00F5FF]'
                    : visual.state === 'a_processar'
                    ? 'border-[#00BFFF]/70 bg-[#00BFFF]/15 text-sky-800 dark:text-[#00BFFF]'
                    : visual.state === 'a_responder'
                    ? 'border-[#00F5FF]/60 bg-[#071827]/90 text-[#00F5FF]'
                    : visual.state === 'a_executar'
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-[#00BFFF]/30 bg-white/80 dark:bg-[#071827]/80 text-slate-800 dark:text-[#EAFBFF]'
                }`}
              >
                {visual.label}
              </span>

              {visual.isCustomVoiceActive && (
                <span
                  data-testid="custom-voice-indicator"
                  className="font-mono text-[11px] font-medium tracking-wide text-cyan-700 dark:text-[#00F5FF]/90 whitespace-nowrap"
                >
                  VOZ PERSONALIZADA ATIVA
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ offlineMode: !settings.offlineMode })}
                aria-pressed={settings.offlineMode}
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !isOnline || settings.offlineMode
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-300 dark:border-[#00BFFF]/30 bg-white/70 dark:bg-[#071827]/70 text-slate-700 dark:text-[#EAFBFF] hover:border-[#00F5FF]/60'
                }`}
              >
                {!isOnline || settings.offlineMode ? (
                  <WifiOff className="w-3.5 h-3.5" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-[#00F5FF]" />
                )}
                <span>
                  {!isOnline ? 'Offline' : settings.offlineMode ? 'Modo Offline' : 'Online'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ highThinking: !settings.highThinking })}
                aria-pressed={settings.highThinking}
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  settings.highThinking
                    ? 'border-[#00F5FF]/70 bg-[#00BFFF]/20 text-sky-900 dark:text-[#00F5FF]'
                    : 'border-slate-300 dark:border-[#00BFFF]/25 bg-white/70 dark:bg-[#071827]/70 text-slate-700 dark:text-[#EAFBFF]/80 hover:border-[#00F5FF]/50'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Raciocínio Alto</span>
              </button>
            </div>
          </div>

          {/* Core Holographic Stage: Left 5 Nodes · Center Interactive Mic · Right 5 Nodes */}
          <div className="relative z-10 mt-5 grid grid-cols-1 lg:grid-cols-12 items-center gap-5">
            {/* Left Lateral Holographic Elements (5 Functional Nodes) */}
            <div
              data-testid="holographic-lateral-left"
              className="lg:col-span-3 order-2 lg:order-1 flex flex-wrap justify-center lg:grid lg:grid-cols-1 gap-2 sm:gap-2.5"
            >
              {LEFT_HOLOGRAPHIC_NODES.map((node, idx) => {
                const horizontalOffset =
                  idx === 0 || idx === 4
                    ? 'lg:translate-x-4'
                    : idx === 1 || idx === 3
                    ? 'lg:translate-x-1'
                    : 'lg:translate-x-0';
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleLateralAction(node.id)}
                    aria-label={node.label}
                    className={`group min-h-[44px] min-w-[96px] sm:min-w-[108px] lg:min-w-0 ${horizontalOffset} flex flex-row items-center justify-center lg:justify-between gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-2xl border border-slate-300/80 dark:border-[#00BFFF]/30 bg-white/75 dark:bg-[#071827]/55 hover:border-[#00F5FF] hover:bg-[#00BFFF]/10 dark:hover:bg-[#00BFFF]/15 text-slate-800 dark:text-[#EAFBFF] transition-all duration-200 cursor-pointer backdrop-blur-sm`}
                  >
                    <span className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl border border-[#00F5FF]/40 bg-[#00BFFF]/10 flex items-center justify-center text-sky-700 dark:text-[#00F5FF] group-hover:scale-105 transition-transform shrink-0">
                      {LATERAL_ICONS[node.id]}
                    </span>
                    <span className="text-[11px] lg:text-xs font-medium tracking-wide whitespace-nowrap">
                      {node.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Central Holographic Microphone + Concentric Rings + Reactive Soundwave */}
            <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center justify-center py-1 sm:py-2">
              <div className="relative w-52 h-52 sm:w-72 sm:h-72 flex items-center justify-center">
                {/* Concentric Holographic Rings SVG */}
                <svg
                  viewBox="0 0 320 320"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 w-full h-full"
                >
                  <defs>
                    <radialGradient id="nexusCoreGlow" cx="50%" cy="50%" r="50%">
                      <stop
                        offset="0%"
                        stopColor={visual.state === 'a_executar' ? '#10B981' : '#00F5FF'}
                        stopOpacity={isListeningVisual || isRespondingVisual ? '0.32' : '0.16'}
                      />
                      <stop offset="62%" stopColor="#00BFFF" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#02060B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Soft central radial illumination */}
                  <circle cx="160" cy="160" r="150" fill="url(#nexusCoreGlow)" />

                  {/* Outer slow segmented holographic ring */}
                  <g
                    className={
                      visual.state === 'a_processar'
                        ? 'animate-nexus-ring-fast origin-center'
                        : 'animate-nexus-ring-slow origin-center'
                    }
                    style={{ transformOrigin: '160px 160px' }}
                  >
                    <circle
                      cx="160"
                      cy="160"
                      r="146"
                      fill="none"
                      stroke="#00BFFF"
                      strokeOpacity="0.28"
                      strokeWidth="1"
                      strokeDasharray="18 10 4 10"
                    />
                    <path
                      d="M 160 14 A 146 146 0 0 1 286 87"
                      fill="none"
                      stroke="#00F5FF"
                      strokeOpacity="0.72"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 160 306 A 146 146 0 0 1 34 233"
                      fill="none"
                      stroke="#00F5FF"
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Middle reverse-rotating technical arc */}
                  <g
                    className={
                      isListeningVisual || isRespondingVisual
                        ? 'animate-nexus-ring-medium origin-center'
                        : 'animate-nexus-ring-reverse origin-center'
                    }
                    style={{ transformOrigin: '160px 160px' }}
                  >
                    <circle
                      cx="160"
                      cy="160"
                      r="122"
                      fill="none"
                      stroke="#00F5FF"
                      strokeOpacity="0.34"
                      strokeWidth="1.2"
                      strokeDasharray="48 16 10 16"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r="104"
                      fill="none"
                      stroke="#00BFFF"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                      strokeDasharray="3 7"
                    />
                  </g>

                  {/* Processing orbital particles (Estado 3: A processar) */}
                  {visual.state === 'a_processar' && (
                    <g
                      className="animate-nexus-ring-fast origin-center"
                      style={{ transformOrigin: '160px 160px' }}
                    >
                      <circle cx="160" cy="38" r="4.5" fill="#00F5FF" />
                      <circle cx="282" cy="160" r="3.5" fill="#00BFFF" />
                      <circle cx="160" cy="282" r="4" fill="#00F5FF" />
                      <circle cx="38" cy="160" r="3.5" fill="#EAFBFF" />
                    </g>
                  )}

                  {/* Confirmation Halo (Estado 5: A executar) */}
                  {visual.state === 'a_executar' && (
                    <circle
                      cx="160"
                      cy="160"
                      r="94"
                      fill="none"
                      stroke="#10B981"
                      strokeOpacity="0.8"
                      strokeWidth="2.5"
                    />
                  )}
                </svg>

                {/* Central 3D Luminous Microphone Button */}
                <button
                  type="button"
                  onClick={onToggleListen}
                  aria-label={
                    isListening ? 'Parar captação de voz' : 'Ativar microfone de comando'
                  }
                  className={`relative z-10 w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center transition-transform duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F5FF] cursor-pointer ${
                    isListeningVisual
                      ? 'bg-gradient-to-b from-[#00F5FF]/35 via-[#00BFFF]/25 to-[#071827] border-2 border-[#00F5FF] shadow-[0_0_55px_rgba(0,245,255,0.55)] text-[#EAFBFF]'
                      : visual.state === 'a_processar'
                      ? 'bg-gradient-to-b from-[#00BFFF]/30 via-[#071827] to-[#02060B] border-2 border-[#00BFFF] shadow-[0_0_45px_rgba(0,191,255,0.45)] text-[#00F5FF]'
                      : isRespondingVisual
                      ? 'bg-gradient-to-b from-[#00F5FF]/25 via-[#071827] to-[#02060B] border-2 border-[#00F5FF]/85 shadow-[0_0_48px_rgba(0,245,255,0.45)] text-[#EAFBFF] animate-nexus-core-pulse'
                      : visual.state === 'a_executar'
                      ? 'bg-gradient-to-b from-emerald-500/25 via-[#071827] to-[#02060B] border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.45)] text-emerald-200'
                      : 'bg-gradient-to-b from-[#071827] via-[#04101B] to-[#02060B] border border-[#00F5FF]/65 hover:border-[#00F5FF] shadow-[0_0_38px_rgba(0,191,255,0.28)] text-[#00F5FF]'
                  }`}
                >
                  {/* Inner 3D Metallic Rim */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-2.5 rounded-full border border-[#EAFBFF]/15"
                  />
                  {visual.state === 'a_executar' ? (
                    <CheckCircle2 className="w-11 h-11 sm:w-14 sm:h-14 drop-shadow-[0_0_14px_rgba(16,185,129,0.85)]" />
                  ) : isListening ? (
                    <MicOff className="w-11 h-11 sm:w-14 sm:h-14 drop-shadow-[0_0_16px_rgba(0,245,255,0.9)]" />
                  ) : (
                    <Mic className="w-11 h-11 sm:w-14 sm:h-14 drop-shadow-[0_0_16px_rgba(0,245,255,0.85)]" />
                  )}
                  <span className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#EAFBFF]/80">
                    {isListening ? 'Parar' : 'Falar'}
                  </span>
                </button>
              </div>

              {/* Animated Reactive Soundwaves Underneath Microphone */}
              <div
                aria-hidden="true"
                data-testid="holographic-soundwave"
                className="mt-1 flex items-center justify-center gap-1.5 h-11 px-4"
              >
                {waveHeights.map((heightPx, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${heightPx}px` }}
                    className={`w-1 rounded-full transition-[height] duration-75 ${
                      visual.state === 'a_executar'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                        : visual.isWaveActive
                        ? 'bg-gradient-to-t from-[#00BFFF] to-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.75)]'
                        : 'bg-[#00BFFF]/45'
                    }`}
                  />
                ))}
              </div>

              {/* Concise Visual State & Live Readout (No chat-bubble clutter) */}
              <p className="mt-2 text-xs font-medium tracking-wide text-slate-600 dark:text-[#9BE8FF]/80 text-center">
                {visual.subtitle}
                {!speechSupported &&
                  visual.state === 'disponivel' &&
                  ' · Usa a Conversa Live ou o campo de comando'}
              </p>

              <div className="mt-4 w-full max-w-lg rounded-2xl border border-slate-300/80 dark:border-[#00BFFF]/25 bg-white/80 dark:bg-[#071827]/65 backdrop-blur-md px-4 py-3 text-left space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-[#00F5FF]/75">
                  <span className="truncate">
                    {recognizedCommand
                      ? `Comando: "${recognizedCommand}"`
                      : `Olá, ${settings.assistantUserName}. Toca no microfone para falar.`}
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0">
                    {settings.silentMode ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#00F5FF]" />
                    )}
                    <span>
                      {settings.silentMode
                        ? 'Silencioso'
                        : `${Math.round(settings.responseVolume * 100)}%`}
                    </span>
                  </span>
                </div>

                <p className="text-sm text-slate-900 dark:text-[#EAFBFF] leading-relaxed line-clamp-3">
                  {lastExecutionResult && visual.state === 'a_executar'
                    ? lastExecutionResult
                    : lastResponse}
                </p>
              </div>
            </div>

            {/* Right Lateral Holographic Elements (5 Functional Nodes) */}
            <div
              data-testid="holographic-lateral-right"
              className="lg:col-span-3 order-3 flex flex-wrap justify-center lg:grid lg:grid-cols-1 gap-2 sm:gap-2.5"
            >
              {RIGHT_HOLOGRAPHIC_NODES.map((node, idx) => {
                const horizontalOffset =
                  idx === 0 || idx === 4
                    ? 'lg:-translate-x-4'
                    : idx === 1 || idx === 3
                    ? 'lg:-translate-x-1'
                    : 'lg:translate-x-0';
                const isNodeHighlighted =
                  (node.id === 'ia' && settings.highThinking) ||
                  (node.id === 'voz' && visual.isCustomVoiceActive);
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleLateralAction(node.id)}
                    aria-label={node.label}
                    className={`group min-h-[44px] min-w-[96px] sm:min-w-[108px] lg:min-w-0 ${horizontalOffset} flex flex-row lg:flex-row-reverse items-center justify-center lg:justify-between gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-sm ${
                      isNodeHighlighted
                        ? 'border-[#00F5FF]/70 bg-[#00BFFF]/15 text-sky-900 dark:text-[#00F5FF]'
                        : 'border-slate-300/80 dark:border-[#00BFFF]/30 bg-white/75 dark:bg-[#071827]/55 hover:border-[#00F5FF] hover:bg-[#00BFFF]/10 dark:hover:bg-[#00BFFF]/15 text-slate-800 dark:text-[#EAFBFF]'
                    }`}
                  >
                    <span className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl border border-[#00F5FF]/40 bg-[#00BFFF]/10 flex items-center justify-center text-sky-700 dark:text-[#00F5FF] group-hover:scale-105 transition-transform shrink-0">
                      {LATERAL_ICONS[node.id]}
                    </span>
                    <span className="text-[11px] lg:text-xs font-medium tracking-wide whitespace-nowrap">
                      {node.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleek Holographic Command Input */}
          <form
            onSubmit={handleSubmit}
            className="relative z-10 mt-5 max-w-2xl mx-auto flex items-center gap-2"
          >
            <label htmlFor="nexus-command-input" className="sr-only">
              Escrever comando ou pergunta para o NEXUS AI
            </label>
            <input
              ref={commandInputRef}
              id="nexus-command-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escreve um comando natural (ex.: Toca música cristã)..."
              className="flex-1 h-11 px-4 rounded-xl bg-white/90 dark:bg-[#071827]/85 border border-slate-300 dark:border-[#00BFFF]/35 text-sm text-slate-900 dark:text-[#EAFBFF] placeholder:text-slate-500 dark:placeholder:text-[#9BE8FF]/55 focus:outline-none focus:border-[#00F5FF]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isBusy}
              aria-label="Enviar comando"
              className="h-11 px-4 rounded-xl bg-[#00BFFF] hover:bg-[#00F5FF] disabled:opacity-45 text-[#02060B] text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </button>
          </form>

          {/* Popover: Custom Voice Mode Selector (Original / Alternativa / Silencioso) */}
          {showVoiceModeMenu && (
            <div
              role="region"
              aria-label="Selecionar modo de voz"
              className="relative z-20 mt-4 max-w-xl mx-auto rounded-2xl border border-[#00F5FF]/45 bg-white dark:bg-[#071827]/95 p-3.5 shadow-2xl space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-[#EAFBFF]">
                  Modo de Saída Vocal do NEXUS AI
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowVoiceModeMenu(false);
                    onNavigateSection('definicoes', { settingsTab: 'voz' });
                  }}
                  className="text-xs font-medium text-sky-700 dark:text-[#00F5FF] hover:underline cursor-pointer"
                >
                  Configurar "Criar a minha voz" →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'original', title: 'Voz Original' },
                    { id: 'alternativa', title: 'Voz Alternativa' },
                    { id: 'silencioso', title: 'Modo Silencioso' },
                  ] as Array<{ id: VoiceOutputMode; title: string }>
                ).map((opt) => {
                  const selected = visual.voiceMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectVoiceMode(opt.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#00F5FF] bg-[#00BFFF]/20 text-sky-900 dark:text-[#00F5FF]'
                          : 'border-slate-300 dark:border-[#00BFFF]/25 text-slate-700 dark:text-[#EAFBFF]/80 hover:border-[#00F5FF]/50'
                      }`}
                    >
                      {opt.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popover: Additional Functions Menu */}
          {showExtrasMenu && (
            <div
              role="region"
              aria-label="Funcionalidades adicionais"
              className="relative z-20 mt-4 max-w-xl mx-auto rounded-2xl border border-[#00F5FF]/45 bg-white dark:bg-[#071827]/95 p-3.5 shadow-2xl"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={!isOnline || settings.offlineMode}
                  onClick={() => {
                    setShowExtrasMenu(false);
                    onToggleLive();
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-[#00BFFF]/30 text-slate-800 dark:text-[#EAFBFF] hover:border-[#00F5FF] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-[#00F5FF]" />
                  <span>{isLiveActive ? 'Terminar Live' : 'Conversa Live'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtrasMenu(false);
                    onNavigateSection('automacoes');
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-[#00BFFF]/30 text-slate-800 dark:text-[#EAFBFF] hover:border-[#00F5FF] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-[#00F5FF]" />
                  <span>Automações</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtrasMenu(false);
                    onNavigateSection('automacoes');
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-[#00BFFF]/30 text-slate-800 dark:text-[#EAFBFF] hover:border-[#00F5FF] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#00F5FF]" />
                  <span>Câmara</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtrasMenu(false);
                    onOpenGestureGuide();
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-[#00BFFF]/30 text-slate-800 dark:text-[#EAFBFF] hover:border-[#00F5FF] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Touchpad className="w-3.5 h-3.5 text-[#00F5FF]" />
                  <span>Gestos</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom 6 Circular Holographic Controls */}
          <div
            data-testid="holographic-bottom-controls"
            className="relative z-10 mt-6 pt-4 border-t border-slate-200/80 dark:border-[#00BFFF]/15 flex flex-wrap items-center justify-center gap-3 sm:gap-5"
          >
            {BOTTOM_CIRCULAR_CONTROLS.map((ctrl) => {
              const active =
                (ctrl.id === 'mic' && isListening) ||
                (ctrl.id === 'custom_voice' && (visual.isCustomVoiceActive || showVoiceModeMenu)) ||
                (ctrl.id === 'stop' && (isSpeaking || isLiveActive)) ||
                (ctrl.id === 'extras' && showExtrasMenu);

              const icon =
                ctrl.id === 'mic' ? (
                  isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )
                ) : ctrl.id === 'custom_voice' ? (
                  <AudioLines className="w-4 h-4" />
                ) : ctrl.id === 'history' ? (
                  <History className="w-4 h-4" />
                ) : ctrl.id === 'settings' ? (
                  <Settings className="w-4 h-4" />
                ) : ctrl.id === 'stop' ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Compass className="w-4 h-4" />
                );

              return (
                <button
                  key={ctrl.id}
                  type="button"
                  onClick={() => handleBottomAction(ctrl.id)}
                  aria-label={ctrl.label}
                  title={ctrl.label}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 ${
                      active
                        ? 'border-[#00F5FF] bg-[#00F5FF]/20 text-sky-900 dark:text-[#00F5FF] shadow-[0_0_20px_rgba(0,245,255,0.4)]'
                        : 'border-slate-300 dark:border-[#00BFFF]/35 bg-white/80 dark:bg-[#071827]/80 text-slate-700 dark:text-[#EAFBFF] group-hover:border-[#00F5FF] group-hover:text-[#00F5FF]'
                    }`}
                  >
                    {icon}
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-[#9BE8FF]/80 whitespace-nowrap">
                    {ctrl.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
