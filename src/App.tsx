import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cpu,
  FileText,
  Layers,
  LogIn,
  Mic,
  Music,
  Settings,
  Touchpad,
  User as UserIcon,
  WifiOff,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import type {
  AssistantStatus,
  AutomationRoutine,
  ConversationEntry,
  CustomVoiceProfile,
  DeviceFile,
  FileCategory,
  GestureType,
  InstalledAppPermission,
  MediaTrack,
  NavSection,
  ParsedIntent,
  PermissionState,
  Playlist,
  UserSettings,
} from './types/nexus.ts';
import { DEFAULT_APP_PERMISSIONS } from './modules/installedAppsCatalog.ts';
import {
  evaluateAppLaunchPermission,
  findAppByVoiceQuery,
} from './modules/appPermissionsLogic.ts';
import {
  COVER_FOCUS,
  DEFAULT_CUSTOM_VOICE_PROFILE,
  DEFAULT_SETTINGS,
  NEXUS_EMBLEM_URL,
  SEED_AUTOMATIONS,
  SEED_FILES,
  SEED_PLAYLISTS,
  SEED_TRACKS,
} from './modules/seedData.ts';
import {
  normalizePortuguese,
  parseOfflineCommand,
  stripWakeWord,
} from './modules/commandParser.ts';
import { computeTrackSignature } from './modules/musicLogic.ts';
import {
  categorizeFileByNameAndMime,
  filterFilesByFolderQuery,
  findFileByVoiceQuery,
} from './modules/fileLogic.ts';
import {
  loadOfflineWorkspaceSnapshot,
  saveOfflineWorkspaceSnapshot,
} from './modules/offlineStorage.ts';
import { AudioPlayerEngine, RepeatMode } from './modules/audioPlayerEngine.ts';
import {
  createSpeechRecognizer,
  float32ToPcm16Base64,
  getAvailablePortugueseVoices,
  isSpeechRecognitionSupported,
  pcm16Base64ToFloat32,
  speakWithCustomOrLocalEngine,
  stopSpeaking,
} from './modules/voiceEngine.ts';
import { useOnlineStatus } from './hooks/useOnlineStatus.ts';
import { useGestureNavigation } from './hooks/useGestureNavigation.ts';
import { resolveGestureAction } from './modules/gestureLogic.ts';
import { AssistantHub } from './components/AssistantHub.tsx';
import { MusicCenter } from './components/MusicCenter.tsx';
import { FileExplorerAndReader } from './components/FileExplorerAndReader.tsx';
import { AutomationAndApps } from './components/AutomationAndApps.tsx';
import { SettingsAndPrivacy } from './components/SettingsAndPrivacy.tsx';
import { PersistentMiniPlayer } from './components/PersistentMiniPlayer.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { GestureGuideModal } from './components/GestureGuideModal.tsx';
import { HolographicCommandCenter } from './components/HolographicCommandCenter.tsx';

export default function App() {
  const isOnline = useOnlineStatus();
  const [offlineInit] = useState(() => loadOfflineWorkspaceSnapshot());
  const [activeNav, setActiveNav] = useState<NavSection>('assistente');
  const [navHistory, setNavHistory] = useState<NavSection[]>([]);
  const prevNavRef = useRef<NavSection>('assistente');
  const skipHistoryPushRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const [gestureHud, setGestureHud] = useState<{ label: string; gesture: GestureType } | null>(null);
  const gestureHudTimerRef = useRef<number | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const idTokenRef = useRef<string | null>(null);

  // Core Workspace State (hydrated from offline cache when available)
  const [settings, setSettings] = useState<UserSettings>(
    () => offlineInit?.settings ?? DEFAULT_SETTINGS
  );
  const [messages, setMessages] = useState<ConversationEntry[]>(() =>
    offlineInit?.messages && offlineInit.messages.length > 0
      ? offlineInit.messages
      : [
          {
            id: 'welcome-1',
            role: 'assistant',
            content:
              'Olá! Sou o NEXUS AI, o teu assistente pessoal inteligente. Podes falar comigo em português para tocar músicas, aceder a ficheiros por voz, ler PDFs em voz alta ou navegar mesmo sem internet em modo offline.',
            mode: 'online',
            createdAt: new Date().toISOString(),
          },
        ]
  );
  const [tracks, setTracks] = useState<MediaTrack[]>(SEED_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(
    () => (offlineInit?.playlists && offlineInit.playlists.length > 0 ? offlineInit.playlists : SEED_PLAYLISTS)
  );
  const [files, setFiles] = useState<DeviceFile[]>(
    () => (offlineInit?.files && offlineInit.files.length > 0 ? offlineInit.files : SEED_FILES)
  );
  const [automations, setAutomations] = useState<AutomationRoutine[]>(
    () =>
      offlineInit?.automations && offlineInit.automations.length > 0
        ? offlineInit.automations
        : SEED_AUTOMATIONS
  );

  // Assistant & Voice State
  const [status, setStatus] = useState<AssistantStatus>('disponivel');
  const [recognizedCommand, setRecognizedCommand] = useState('');
  const [lastResponse, setLastResponse] = useState(
    'Pronto para te ajudar. Toca no microfone ou escreve um comando.'
  );
  const [lastExecutionResult, setLastExecutionResult] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer>>(null);

  // Live API State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState<MediaTrack | null>(SEED_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const audioEngineRef = useRef<AudioPlayerEngine | null>(null);

  // File Explorer & Document Reader State
  const [selectedFile, setSelectedFile] = useState<DeviceFile | null>(
    () => (offlineInit?.files && offlineInit.files[0]) ?? SEED_FILES[0]
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileSearchFilter, setFileSearchFilter] = useState('');
  const [fileCategoryFilter, setFileCategoryFilter] = useState<'Todos' | FileCategory>('Todos');
  const [voicePromptImport, setVoicePromptImport] = useState<'file' | 'folder' | null>(null);

  // Device & Permissions State
  const [lastDeviceNotice, setLastDeviceNotice] = useState<string | null>(null);
  const [appPermissions, setAppPermissions] = useState<InstalledAppPermission[]>(
    () =>
      offlineInit?.appPermissions && offlineInit.appPermissions.length > 0
        ? offlineInit.appPermissions
        : DEFAULT_APP_PERMISSIONS
  );
  const [customVoiceProfile, setCustomVoiceProfile] = useState<CustomVoiceProfile>(
    () => offlineInit?.customVoiceProfile ?? DEFAULT_CUSTOM_VOICE_PROFILE
  );
  const [voiceEngineNotice, setVoiceEngineNotice] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<'geral' | 'voz' | 'apps'>('geral');
  const [appLaunchNotice, setAppLaunchNotice] = useState<string | null>(null);
  const [pendingAppConfirmation, setPendingAppConfirmation] =
    useState<InstalledAppPermission | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({
    microphone: 'prompt',
    camera: 'prompt',
    localFiles: 'prompt',
    mediaNotifications: 'granted',
  });

  // Refs for latest state inside audio callbacks
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const repeatRef = useRef(repeatMode);
  repeatRef.current = repeatMode;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const customVoiceRef = useRef(customVoiceProfile);
  customVoiceRef.current = customVoiceProfile;
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  // Apply Dark/Light theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Track navigation history automatically for "Voltar" (swipe_left or voice command)
  useEffect(() => {
    if (prevNavRef.current !== activeNav) {
      if (skipHistoryPushRef.current) {
        skipHistoryPushRef.current = false;
      } else {
        const previous = prevNavRef.current;
        setNavHistory((prev) => [...prev.slice(-11), previous]);
      }
      prevNavRef.current = activeNav;
      setIsExpanded(false);
    }
  }, [activeNav]);

  const showGestureFeedback = useCallback((gesture: GestureType, label: string) => {
    setGestureHud({ gesture, label });
    if (gestureHudTimerRef.current !== null) {
      window.clearTimeout(gestureHudTimerRef.current);
    }
    gestureHudTimerRef.current = window.setTimeout(() => {
      setGestureHud(null);
    }, 2200);
  }, []);

  // Persist workspace locally for seamless offline navigation and reload recovery
  useEffect(() => {
    saveOfflineWorkspaceSnapshot({
      settings,
      customVoiceProfile,
      messages,
      files,
      playlists,
      automations,
      appPermissions,
    });
  }, [settings, customVoiceProfile, messages, files, playlists, automations, appPermissions]);

  // Load SpeechSynthesis voices
  useEffect(() => {
    const loadVoices = () => setAvailableVoices(getAvailablePortugueseVoices());
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, []);

  // Authenticated API helper
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = idTokenRef.current;
    if (!token) return null;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
    return res;
  }, []);

  // Firebase Auth listener -> Sync workspace with Cloud SQL
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          idTokenRef.current = token;
          const res = await fetch('/api/db/workspace', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.settings) setSettings(data.settings);
            if (Array.isArray(data.messages) && data.messages.length > 0) {
              setMessages(data.messages);
            }
            if (Array.isArray(data.tracks) && data.tracks.length > 0) {
              setTracks(data.tracks);
              setCurrentTrack(data.tracks[0]);
            }
            if (Array.isArray(data.playlists)) setPlaylists(data.playlists);
            if (Array.isArray(data.files) && data.files.length > 0) {
              setFiles(data.files);
              setSelectedFile(data.files[0]);
            }
            if (Array.isArray(data.automations) && data.automations.length > 0) {
              setAutomations(data.automations);
            }
            if (Array.isArray(data.appPermissions) && data.appPermissions.length > 0) {
              setAppPermissions(data.appPermissions);
            }
            if (data.customVoiceProfile) {
              setCustomVoiceProfile((prev) => ({
                ...prev,
                ...data.customVoiceProfile,
                samples:
                  prev.samples.length > 0 &&
                  prev.samples.some((s) => Boolean(s.audioDataUrl))
                    ? prev.samples
                    : data.customVoiceProfile.samples ?? [],
              }));
            }
          }
        } catch {
          // Keep local workspace available if Cloud SQL sync fails
        }
      } else {
        idTokenRef.current = null;
      }
    });
    return () => unsub();
  }, []);

  // Helper to speak and update UI state (AIEngine -> CustomVoice/GeminiTTS -> Offline fallback)
  const respondWithVoice = useCallback((text: string) => {
    setLastResponse(text);
    void speakWithCustomOrLocalEngine({
      text,
      settings: settingsRef.current,
      customVoiceProfile: customVoiceRef.current,
      isOnline: isOnlineRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onEngineNotice: (notice) => setVoiceEngineNotice(notice),
    }).then((started) => {
      if (!started) setIsSpeaking(false);
    });
  }, []);

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsReadingAloud(false);
  }, []);

  // Music Playback Controls
  const playTrack = useCallback(
    (track: MediaTrack) => {
      setCurrentTrack(track);
      audioEngineRef.current?.loadAndPlay(track, 0);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === track.id
            ? { ...t, playCount: t.playCount + 1, lastPlayedAt: new Date().toISOString() }
            : t
        )
      );
      if (/^\d+$/.test(track.id)) {
        void authFetch(`/api/db/tracks/${track.id}/play`, {
          method: 'POST',
          body: JSON.stringify({ playCount: track.playCount }),
        });
      }
    },
    [authFetch]
  );

  const handleNextTrack = useCallback(() => {
    const list = tracksRef.current;
    if (list.length === 0) return;
    const cur = currentTrackRef.current;
    if (shuffleRef.current) {
      const next = list[Math.floor(Math.random() * list.length)];
      playTrack(next);
      return;
    }
    const idx = cur ? list.findIndex((t) => t.id === cur.id) : -1;
    const nextIdx = (idx + 1) % list.length;
    playTrack(list[nextIdx]);
  }, [playTrack]);

  const handlePrevTrack = useCallback(() => {
    const list = tracksRef.current;
    if (list.length === 0) return;
    const cur = currentTrackRef.current;
    const idx = cur ? list.findIndex((t) => t.id === cur.id) : 0;
    const prevIdx = (idx - 1 + list.length) % list.length;
    playTrack(list[prevIdx]);
  }, [playTrack]);

  // Initialize AudioPlayerEngine once
  useEffect(() => {
    const engine = new AudioPlayerEngine({
      onTimeUpdate: (sec) => setElapsedSeconds(sec),
      onPlayStateChange: (playing) => setIsPlaying(playing),
      onTrackEnded: () => {
        if (repeatRef.current === 'one' && currentTrackRef.current) {
          audioEngineRef.current?.loadAndPlay(currentTrackRef.current, 0);
        } else if (repeatRef.current === 'all' || shuffleRef.current) {
          handleNextTrack();
        } else {
          handleNextTrack();
        }
      },
      onNext: handleNextTrack,
      onPrev: handlePrevTrack,
    });
    audioEngineRef.current = engine;
    return () => engine.dispose();
  }, [handleNextTrack, handlePrevTrack]);

  const handleTogglePlayPause = useCallback(() => {
    if (!currentTrackRef.current && tracksRef.current.length > 0) {
      playTrack(tracksRef.current[0]);
      return;
    }
    if (isPlaying) {
      audioEngineRef.current?.pause();
    } else if (elapsedSeconds === 0 && currentTrackRef.current) {
      playTrack(currentTrackRef.current);
    } else {
      audioEngineRef.current?.resume();
    }
  }, [elapsedSeconds, isPlaying, playTrack]);

  const handleVolumeChange = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, Number(vol.toFixed(2))));
    setVolume(clamped);
    audioEngineRef.current?.setVolume(clamped);
  }, []);

  // Update Settings + Sync Cloud SQL
  const handleUpdateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      void authFetch('/api/db/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
    },
    [authFetch]
  );

  // Update / Delete Custom Voice Profile + Sync Cloud SQL
  const handleUpdateCustomVoice = useCallback(
    (patch: Partial<CustomVoiceProfile>) => {
      setCustomVoiceProfile((prev) => {
        const next: CustomVoiceProfile = {
          ...prev,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        void authFetch('/api/db/voice-profile', {
          method: 'PUT',
          body: JSON.stringify(next),
        });
        return next;
      });
    },
    [authFetch]
  );

  const handleDeleteCustomVoice = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setCustomVoiceProfile(DEFAULT_CUSTOM_VOICE_PROFILE);
    setVoiceEngineNotice('Configuração de voz personalizada eliminada.');
    void authFetch('/api/db/voice-profile', { method: 'DELETE' });
  }, [authFetch]);

  const handleTestCustomVoice = useCallback((text: string) => {
    if (!text.trim()) return;
    void speakWithCustomOrLocalEngine({
      text,
      settings: { ...settingsRef.current, silentMode: false },
      customVoiceProfile: customVoiceRef.current,
      isOnline: isOnlineRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onEngineNotice: (notice) => setVoiceEngineNotice(notice),
    });
  }, []);

  // Append Message + Sync Cloud SQL
  const appendMessage = useCallback(
    (entry: Omit<ConversationEntry, 'id' | 'createdAt'>) => {
      const full: ConversationEntry = {
        ...entry,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, full]);
      void authFetch('/api/db/messages', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },
    [authFetch]
  );

  // Document Reader Actions
  const handleSelectFile = useCallback(
    (file: DeviceFile) => {
      setSelectedFile(file);
      const page = Math.max(1, Math.min(file.lastPage || 1, file.pageCount));
      setCurrentPage(page);
      setAiAnalysis('');
    },
    []
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      if (selectedFile) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === selectedFile.id
              ? { ...f, lastPage: page, lastOpenedAt: new Date().toISOString() }
              : f
          )
        );
        if (/^\d+$/.test(selectedFile.id)) {
          void authFetch(`/api/db/files/${selectedFile.id}/progress`, {
            method: 'PATCH',
            body: JSON.stringify({ lastPage: page }),
          });
        }
      }
    },
    [authFetch, selectedFile]
  );

  const handleReadAloud = useCallback(
    (fileOverride?: DeviceFile, pageOverride?: number) => {
      const file = fileOverride ?? selectedFile;
      if (!file) return;
      const p = pageOverride ?? currentPage;
      const text = file.pages[Math.max(0, Math.min(p - 1, file.pages.length - 1))] ?? '';
      if (!text) return;
      setIsReadingAloud(true);
      void speakWithCustomOrLocalEngine({
        text: `A ler página ${p} de ${file.name}. ${text}`,
        settings: { ...settingsRef.current, silentMode: false },
        customVoiceProfile: customVoiceRef.current,
        isOnline: isOnlineRef.current,
        onStart: () => {
          setIsSpeaking(true);
          setIsReadingAloud(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setIsReadingAloud(false);
        },
        onEngineNotice: (notice) => setVoiceEngineNotice(notice),
      });
    },
    [currentPage, selectedFile]
  );

  const handleAnalyzeDocument = useCallback(
    async (task: 'summarize' | 'explain') => {
      if (!selectedFile) return;
      const text =
        selectedFile.pages[
          Math.max(0, Math.min(currentPage - 1, selectedFile.pages.length - 1))
        ] ?? '';
      if (settingsRef.current.offlineMode) {
        const offlineMsg =
          task === 'summarize'
            ? `Resumo local (Offline) da página ${currentPage}: ${text.slice(0, 220)}...`
            : `Modo Offline ativo: liga à Internet para obter explicação detalhada com Gemini.`;
        setAiAnalysis(offlineMsg);
        return offlineMsg;
      }

      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/ai/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedFile.name,
            pageNumber: currentPage,
            content: text,
            task,
            language: settingsRef.current.language,
          }),
        });
        const data = await res.json();
        const resultText = data.result || data.error || 'Não foi possível analisar.';
        setAiAnalysis(resultText);
        return resultText;
      } catch {
        const fallback = 'Erro de ligação ao analisar o documento com Gemini.';
        setAiAnalysis(fallback);
        return fallback;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [currentPage, selectedFile]
  );

  // Automation Runner
  const handleRunAutomation = useCallback(
    async (routine: AutomationRoutine): Promise<string> => {
      const executedLabels: string[] = [];
      for (const step of routine.steps) {
        if (step.action === 'set_volume' && typeof step.value === 'number') {
          handleVolumeChange(step.value);
          handleUpdateSettings({ responseVolume: step.value });
          executedLabels.push(step.label);
        } else if (step.action === 'open_view' && typeof step.value === 'string') {
          setActiveNav(step.value as NavSection);
          executedLabels.push(step.label);
        } else if (step.action === 'open_last_pdf') {
          const pdf = files.find((f) => f.category === 'PDF') ?? files[0];
          if (pdf) {
            handleSelectFile(pdf);
            setActiveNav('ficheiros');
            executedLabels.push(`Aberto: ${pdf.name}`);
          }
        } else if (step.action === 'start_tts_reading') {
          const pdf = files.find((f) => f.category === 'PDF') ?? selectedFile;
          if (pdf) {
            handleReadAloud(pdf, pdf.lastPage || 1);
            executedLabels.push(step.label);
          }
        } else if (step.action === 'show_playlists') {
          setActiveNav('musica');
          executedLabels.push(step.label);
        } else if (step.action === 'play_category') {
          const cat = String(step.value || 'Música Cristã');
          const match = tracks.find((t) => t.category === cat) ?? tracks[0];
          if (match) {
            playTrack(match);
            executedLabels.push(`A tocar: ${match.title}`);
          }
        } else if (step.action === 'toggle_silent_mode') {
          handleUpdateSettings({ silentMode: Boolean(step.value ?? true) });
          executedLabels.push(step.label);
        }
      }

      setAutomations((prev) =>
        prev.map((a) =>
          a.id === routine.id ? { ...a, lastRunAt: new Date().toISOString() } : a
        )
      );
      if (/^\d+$/.test(routine.id)) {
        void authFetch(`/api/db/automations/${routine.id}/run`, { method: 'POST' });
      }
      return `${routine.name} executado: ${executedLabels.join(' → ')}.`;
    },
    [
      authFetch,
      files,
      handleReadAloud,
      handleSelectFile,
      handleUpdateSettings,
      handleVolumeChange,
      playTrack,
      selectedFile,
      tracks,
    ]
  );

  // App & Device Action Handler (honest execution confirmation)
  const executeAppAction = useCallback(
    (action: string, label?: string): string => {
      if (action === 'open_whatsapp' || label === 'WhatsApp') {
        const msg =
          'No navegador web não é possível iniciar diretamente a aplicação nativa WhatsApp sem ligação externa; usa https://web.whatsapp.com caso pretendas abrir no browser.';
        setLastDeviceNotice(msg);
        return msg;
      }
      if (action === 'open_youtube' || label === 'YouTube') {
        const msg =
          'No ambiente web protegido, a abertura automática de janelas externas é bloqueada por segurança; no Android nativo este comando lança com.google.android.youtube.';
        setLastDeviceNotice(msg);
        return msg;
      }
      if (action === 'open_facebook' || label === 'Facebook') {
        const msg =
          'Comando "Abrir Facebook" reconhecido: no Android nativo abre a aplicação Facebook; no ambiente web usa a ligação autorizada.';
        setLastDeviceNotice(msg);
        return msg;
      }
      if (action === 'open_settings' || label === 'Definições') {
        setActiveNav('definicoes');
        return 'Abri as Definições e Personalização do NEXUS AI.';
      }
      if (action === 'open_gallery' || label === 'Galeria') {
        setFileCategoryFilter('Fotografias');
        setActiveNav('ficheiros');
        return 'Abri a Galeria de Fotografias no Gestor de Ficheiros.';
      }
      if (action === 'open_camera' || label === 'Câmara') {
        setActiveNav('automacoes');
        const msg = 'Secção de Câmara aberta. Clica em "Câmara" para iniciar o sensor com tua autorização.';
        setLastDeviceNotice(msg);
        return msg;
      }
      if (action === 'go_home') {
        setActiveNav('assistente');
        return 'De volta ao ecrã inicial do NEXUS AI.';
      }
      if (action === 'volume_up') {
        const next = Math.min(1, volume + 0.15);
        handleVolumeChange(next);
        handleUpdateSettings({ responseVolume: next });
        return `Volume aumentado para ${Math.round(next * 100)}%.`;
      }
      if (action === 'volume_down') {
        const next = Math.max(0.05, volume - 0.15);
        handleVolumeChange(next);
        handleUpdateSettings({ responseVolume: next });
        return `Volume reduzido para ${Math.round(next * 100)}%.`;
      }
      if (action === 'bluetooth_on' || action === 'bluetooth_off') {
        const msg =
          'Por restrições de segurança do sistema e do navegador, aplicações web não podem ligar ou desligar o Bluetooth do telemóvel automaticamente; abre as definições de Bluetooth do dispositivo.';
        setLastDeviceNotice(msg);
        return msg;
      }
      return 'Ação processada.';
    },
    [handleUpdateSettings, handleVolumeChange, volume]
  );

  // App Permissions Handlers & Launch Policy Evaluator
  const handleUpdateAppPermission = useCallback(
    (updated: InstalledAppPermission) => {
      setAppPermissions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      void authFetch(`/api/db/app-permissions/${encodeURIComponent(updated.id)}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    },
    [authFetch]
  );

  const handleBulkUpdateApps = useCallback(
    (mode: 'allow_safe' | 'protect_finance' | 'block_all') => {
      setAppPermissions((prev) => {
        const next = prev.map((app) => {
          if (mode === 'allow_safe') {
            return { ...app, canLaunchByVoice: true };
          }
          if (mode === 'block_all') {
            return { ...app, canLaunchByVoice: false };
          }
          if (app.category === 'Finanças' || app.category === 'Redes & Segurança') {
            return { ...app, requireConfirmation: true };
          }
          return app;
        });
        void authFetch('/api/db/app-permissions/bulk', {
          method: 'POST',
          body: JSON.stringify({ items: next }),
        });
        return next;
      });
      setAppLaunchNotice(
        mode === 'protect_finance'
          ? 'Proteção ativa: confirmação obrigatória aplicada a todas as aplicações financeiras e de segurança.'
          : mode === 'allow_safe'
          ? 'Abertura por voz permitida para todas as aplicações configuradas.'
          : 'Abertura por voz bloqueada em todas as aplicações por segurança.'
      );
    },
    [authFetch]
  );

  const executeConfirmedInstalledApp = useCallback(
    (app: InstalledAppPermission): string => {
      if (app.id === 'definicoes') {
        setActiveNav('definicoes');
        const msg = 'Abri as Definições e Personalização do NEXUS AI.';
        setAppLaunchNotice(msg);
        return msg;
      }
      if (app.id === 'fotos') {
        setFileCategoryFilter('Fotografias');
        setActiveNav('ficheiros');
        const msg = 'Permissão concedida: abri a tua Galeria de Fotografias.';
        setAppLaunchNotice(msg);
        return msg;
      }
      const msg = `Permissão concedida para "${app.name}" (${app.packageHint}). No Android nativo, o NEXUS AI inicia esta aplicação; no navegador web protegido, a execução automática de pacotes Android é simulada com segurança.`;
      setAppLaunchNotice(msg);
      setLastDeviceNotice(msg);
      return msg;
    },
    []
  );

  const launchInstalledAppWithPolicy = useCallback(
    (app: InstalledAppPermission): string => {
      const check = evaluateAppLaunchPermission(app);
      if (!check.allowed) {
        setAppLaunchNotice(check.reason);
        setLastDeviceNotice(check.reason);
        return check.reason;
      }
      if (check.needsConfirmation) {
        setPendingAppConfirmation(app);
        const msg = `${check.reason} Confirma no ecrã para prosseguir com a abertura.`;
        setAppLaunchNotice(msg);
        return msg;
      }
      return executeConfirmedInstalledApp(app);
    },
    [executeConfirmedInstalledApp]
  );

  // Execute a ParsedIntent against real modules and return confirmed result
  const executeIntent = useCallback(
    async (
      intent: ParsedIntent,
      aiReply?: string
    ): Promise<{ reply: string; executionResult: string }> => {
      const { module, action, params } = intent;

      if (module === 'music') {
        if (action === 'play_track_number') {
          const num = Number(params.trackNumber ?? 1);
          const found = tracks.find((t) => t.trackNumber === num);
          if (found) {
            playTrack(found);
            setActiveNav('musica');
            return {
              reply: `A reproduzir a música número ${num}: "${found.title}" de ${found.artist}.`,
              executionResult: `Reprodução iniciada (#${num} ${found.title})`,
            };
          }
          return {
            reply: `Não encontrei a música número ${num} na tua biblioteca.`,
            executionResult: 'Faixa não encontrada',
          };
        }
        if (action === 'play_category') {
          const cat = String(params.category ?? '');
          const q = normalizePortuguese(String(params.query ?? cat));
          const matches = tracks.filter(
            (t) =>
              normalizePortuguese(t.category).includes(q) ||
              normalizePortuguese(t.title).includes(q)
          );
          if (matches.length > 0) {
            playTrack(matches[0]);
            setActiveNav('musica');
            return {
              reply: `Encontrei ${matches.length} música(s) de ${matches[0].category}. A reproduzir "${matches[0].title}".`,
              executionResult: `A reproduzir ${matches[0].title}`,
            };
          }
          return {
            reply: `Não encontrei músicas correspondentes a "${cat || q}" na biblioteca.`,
            executionResult: 'Sem resultados musicais',
          };
        }
        if (action === 'play_all') {
          if (tracks.length > 0) {
            playTrack(tracks[0]);
            setActiveNav('musica');
            return {
              reply: `A reproduzir todas as ${tracks.length} músicas da tua biblioteca.`,
              executionResult: `Biblioteca em reprodução (${tracks.length} faixas)`,
            };
          }
        }
        if (action === 'play_recent') {
          const sorted = [...tracks].sort((a, b) => b.playCount - a.playCount);
          if (sorted.length > 0) {
            playTrack(sorted[0]);
            setActiveNav('musica');
            return {
              reply: `A tocar as músicas mais recentes: "${sorted[0].title}".`,
              executionResult: `Mais recente: ${sorted[0].title}`,
            };
          }
        }
        if (action === 'pause') {
          audioEngineRef.current?.pause();
          return { reply: 'Música colocada em pausa.', executionResult: 'Reprodução pausada' };
        }
        if (action === 'resume') {
          audioEngineRef.current?.resume();
          return { reply: 'A continuar a reprodução.', executionResult: 'Reprodução retomada' };
        }
        if (action === 'stop') {
          audioEngineRef.current?.stop();
          return { reply: 'Reprodução parada.', executionResult: 'Reprodução parada' };
        }
        if (action === 'next') {
          handleNextTrack();
          return { reply: 'A passar para a próxima música.', executionResult: 'Próxima faixa' };
        }
        if (action === 'previous') {
          handlePrevTrack();
          return { reply: 'A voltar à música anterior.', executionResult: 'Faixa anterior' };
        }
        if (action === 'repeat_current' && currentTrack) {
          playTrack(currentTrack);
          return {
            reply: `A reproduzir novamente "${currentTrack.title}".`,
            executionResult: `Repetição de ${currentTrack.title}`,
          };
        }
        if (action === 'ask_genre') {
          return {
            reply:
              aiReply ||
              'Que tipo de música gostarias de ouvir? Tenho Música Cristã, Semba & Kizomba, Instrumental e Estudo.',
            executionResult: 'A aguardar escolha de género',
          };
        }
      }

      if (module === 'settings') {
        if (action === 'set_offline_mode') {
          const enabled = Boolean(params.enabled);
          handleUpdateSettings({ offlineMode: enabled });
          return {
            reply: enabled
              ? 'Modo offline ativado. Podes navegar, aceder aos teus ficheiros e usar comandos locais mesmo sem internet.'
              : 'Modo offline desativado. O NEXUS AI usará o modo online sempre que houver rede.',
            executionResult: enabled ? 'Modo Offline ativado' : 'Modo Online reativado',
          };
        }
        if (action === 'set_theme') {
          const theme = params.theme === 'light' ? 'light' : 'dark';
          handleUpdateSettings({ theme });
          return {
            reply: theme === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.',
            executionResult: `Tema: ${theme}`,
          };
        }
        if (action === 'set_silent_mode') {
          const enabled = Boolean(params.enabled);
          handleUpdateSettings({ silentMode: enabled });
          return {
            reply: enabled ? 'Modo silencioso ativado.' : 'Modo silencioso desativado.',
            executionResult: enabled ? 'Silencioso ativado' : 'Voz reativada',
          };
        }
        if (action === 'set_gestures_enabled') {
          const enabled = Boolean(params.enabled);
          handleUpdateSettings({ gesturesEnabled: enabled });
          return {
            reply: enabled
              ? 'Navegação por gestos ativada.'
              : 'Navegação por gestos desativada.',
            executionResult: enabled ? 'Gestos ativados' : 'Gestos desativados',
          };
        }
      }

      if (module === 'files') {
        if (action === 'prompt_device_import') {
          const mode = params.mode === 'folder' ? 'folder' : 'file';
          setVoicePromptImport(mode);
          setActiveNav('ficheiros');
          return {
            reply:
              mode === 'folder'
                ? 'Abri o Gestor de Ficheiros. Confirma em "Autorizar Pasta" para concederes acesso à pasta local.'
                : 'Abri o Gestor de Ficheiros. Confirma em "Selecionar Ficheiro" para escolheres um ficheiro do teu dispositivo.',
            executionResult:
              mode === 'folder' ? 'Pedido de acesso a pasta local' : 'Pedido de importação de ficheiro',
          };
        }
        if (action === 'open_file' || action === 'open_and_read_file') {
          const q = String(params.query ?? '').trim();
          const matched = findFileByVoiceQuery(files, q);
          if (matched) {
            handleSelectFile(matched);
            setFileCategoryFilter('Todos');
            setFileSearchFilter('');
            setActiveNav('ficheiros');
            const targetPage = Math.max(1, Math.min(matched.lastPage || 1, matched.pageCount));
            if (action === 'open_and_read_file') {
              handleReadAloud(matched, targetPage);
              return {
                reply: `Abri "${matched.name}" na página ${targetPage} e iniciei a leitura em voz alta.`,
                executionResult: `A ler: ${matched.name} (pág. ${targetPage})`,
              };
            }
            return {
              reply: `Acedi ao ficheiro "${matched.name}" em ${matched.folderPath}.`,
              executionResult: `Ficheiro aberto: ${matched.name}`,
            };
          }
          setFileSearchFilter(q);
          setFileCategoryFilter('Todos');
          setActiveNav('ficheiros');
          return {
            reply: q
              ? `Não encontrei nenhum ficheiro com "${q}". Podes importar um ficheiro local no Gestor de Ficheiros.`
              : 'Abri o Gestor de Ficheiros.',
            executionResult: 'Pesquisa no Gestor de Ficheiros',
          };
        }
        if (action === 'open_folder') {
          const folder = String(params.folder ?? '').trim();
          const folderMatches = filterFilesByFolderQuery(files, folder);
          setFileSearchFilter(folder);
          setFileCategoryFilter('Todos');
          setActiveNav('ficheiros');
          if (folderMatches.length > 0) {
            handleSelectFile(folderMatches[0]);
            return {
              reply: `Abri a pasta "${folderMatches[0].folderPath}" com ${folderMatches.length} ficheiro(s).`,
              executionResult: `Pasta: ${folderMatches[0].folderPath} (${folderMatches.length})`,
            };
          }
          return {
            reply: `Não existem ficheiros indexados na pasta "${folder}". Clica em "Pasta" para autorizares uma pasta do teu dispositivo.`,
            executionResult: 'Pasta sem ficheiros locais',
          };
        }
        if (action === 'open_latest_pdf') {
          const pdf = files.find((f) => f.category === 'PDF') ?? files[0];
          if (pdf) {
            handleSelectFile(pdf);
            setFileCategoryFilter('PDF');
            setActiveNav('ficheiros');
            return {
              reply: `Abri o PDF "${pdf.name}".`,
              executionResult: `PDF aberto: ${pdf.name}`,
            };
          }
        }
        if (action === 'search_category') {
          const cat = (params.category as 'Todos' | FileCategory) || 'Todos';
          setFileCategoryFilter(cat);
          setFileSearchFilter('');
          setActiveNav('ficheiros');
          const count = files.filter((f) => cat === 'Todos' || f.category === cat).length;
          return {
            reply: `Mostrando ${count} ficheiro(s) na categoria ${cat}.`,
            executionResult: `Filtro: ${cat} (${count})`,
          };
        }
        if (action === 'search_files') {
          const q = String(params.query ?? '');
          setFileSearchFilter(q);
          setFileCategoryFilter('Todos');
          setActiveNav('ficheiros');
          const matches = files.filter((f) =>
            normalizePortuguese(f.name).includes(normalizePortuguese(q))
          );
          if (matches.length > 0 && q) {
            handleSelectFile(matches[0]);
            return {
              reply: `Encontrei "${matches[0].name}" e abri no leitor de documentos.`,
              executionResult: `Ficheiro encontrado: ${matches[0].name}`,
            };
          }
          return {
            reply: q
              ? `Não encontrei nenhum ficheiro com "${q}", mas abri o gestor de ficheiros para pesquisares.`
              : 'Abri os teus documentos.',
            executionResult: 'Gestor de ficheiros aberto',
          };
        }
      }

      if (module === 'document_reader') {
        if (action === 'read_current' || action === 'reread_page') {
          setActiveNav('ficheiros');
          handleReadAloud();
          return {
            reply: `A ler em voz alta a página ${currentPage} de "${selectedFile?.name ?? 'Documento'}".`,
            executionResult: `Leitura TTS página ${currentPage}`,
          };
        }
        if (action === 'go_to_page' && selectedFile) {
          const requested = Number(params.page ?? params.trackNumber ?? 1);
          const target = Math.max(1, Math.min(selectedFile.pageCount, requested));
          handlePageChange(target);
          setActiveNav('ficheiros');
          return {
            reply: `Abri a página ${target} de ${selectedFile.pageCount} em "${selectedFile.name}".`,
            executionResult: `Página ${target}/${selectedFile.pageCount}`,
          };
        }
        if (action === 'next_page' && selectedFile) {
          const next = Math.min(selectedFile.pageCount, currentPage + 1);
          handlePageChange(next);
          setActiveNav('ficheiros');
          return {
            reply: `Avancei para a página ${next} de ${selectedFile.pageCount}.`,
            executionResult: `Página ${next}/${selectedFile.pageCount}`,
          };
        }
        if (action === 'prev_page' && selectedFile) {
          const prev = Math.max(1, currentPage - 1);
          handlePageChange(prev);
          setActiveNav('ficheiros');
          return {
            reply: `Voltei para a página ${prev} de ${selectedFile.pageCount}.`,
            executionResult: `Página ${prev}/${selectedFile.pageCount}`,
          };
        }
        if (action === 'stop_reading') {
          handleStopSpeaking();
          return { reply: 'Leitura interrompida.', executionResult: 'TTS parado' };
        }
        if (action === 'summarize' || action === 'explain') {
          setActiveNav('ficheiros');
          const analysis = await handleAnalyzeDocument(
            action === 'explain' ? 'explain' : 'summarize'
          );
          return {
            reply: analysis || 'Análise concluída no leitor de documentos.',
            executionResult:
              action === 'explain' ? 'Conteúdo explicado com Gemini' : 'Capítulo resumido com Gemini',
          };
        }
      }

      if (module === 'automation') {
        const trigger = normalizePortuguese(String(params.trigger ?? ''));
        const routine =
          automations.find(
            (a) =>
              normalizePortuguese(a.triggerPhrase).includes(trigger) ||
              normalizePortuguese(a.name).includes(trigger)
          ) ?? automations[0];
        if (routine) {
          const resultMsg = await handleRunAutomation(routine);
          return { reply: resultMsg, executionResult: resultMsg };
        }
      }

      if (module === 'app_control') {
        if (action === 'navigate_section') {
          const rawSection = String(params.section ?? params.category ?? 'assistente').toLowerCase();
          if (rawSection.includes('permis')) {
            setSettingsTab('apps');
            setActiveNav('definicoes');
            return {
              reply: 'Naveguei para as Permissões dos Aplicativos.',
              executionResult: 'Navegação: Permissões dos Aplicativos',
            };
          }
          if (rawSection.includes('voz') || params.subTab === 'voz') {
            setSettingsTab('voz');
            setActiveNav('definicoes');
            return {
              reply: 'Abri a área Criar a Minha Voz nas Definições.',
              executionResult: 'Navegação: Criar a Minha Voz',
            };
          }
          const validSection: NavSection =
            rawSection === 'musica' || rawSection === 'ficheiros' || rawSection === 'automacoes' || rawSection === 'definicoes'
              ? (rawSection as NavSection)
              : 'assistente';
          if (validSection === 'definicoes') {
            setSettingsTab(params.subTab === 'apps' ? 'apps' : 'geral');
          }
          setActiveNav(validSection);
          return {
            reply:
              params.subTab === 'apps'
                ? 'Naveguei para as Permissões dos Aplicativos.'
                : `Naveguei para a secção ${validSection}.`,
            executionResult: `Secção aberta: ${validSection}`,
          };
        }

        const rawQuery = String(params.appQuery ?? params.app ?? '').trim();
        const isInternalShortcut =
          action === 'open_app' &&
          ['definições', 'definicoes', 'galeria', 'câmara', 'camara'].includes(
            rawQuery.toLowerCase()
          );

        if ((action === 'open_installed_app' || action === 'open_app') && rawQuery && !isInternalShortcut) {
          const matched = findAppByVoiceQuery(appPermissions, rawQuery);
          if (matched) {
            const policyMsg = launchInstalledAppWithPolicy(matched);
            return {
              reply: policyMsg,
              executionResult: matched.canLaunchByVoice
                ? matched.requireConfirmation
                  ? `A aguardar confirmação: ${matched.name}`
                  : `App autorizada: ${matched.name}`
                : `Bloqueado: ${matched.name}`,
            };
          }
          // Fallback: if voice command asked to "Abrir <nome>" and it matches a local file, open the file!
          const matchedFile = findFileByVoiceQuery(files, rawQuery);
          if (matchedFile) {
            handleSelectFile(matchedFile);
            setActiveNav('ficheiros');
            return {
              reply: `Acedi ao ficheiro "${matchedFile.name}" no Gestor de Ficheiros.`,
              executionResult: `Ficheiro aberto: ${matchedFile.name}`,
            };
          }
          const notFoundMsg = `Não encontrei "${rawQuery}" nos aplicativos instalados nem nos ficheiros locais.`;
          setAppLaunchNotice(notFoundMsg);
          return {
            reply: notFoundMsg,
            executionResult: 'Aplicação ou ficheiro não encontrado',
          };
        }

        if (action === 'navigate_back') {
          const effect = resolveGestureAction('swipe_left', {
            activeNav,
            navHistory,
            isExpanded,
            isSpeaking,
            hasActiveTrack: Boolean(currentTrack && (isPlaying || elapsedSeconds > 0)),
            showGestureGuide,
          });
          if (effect.type === 'collapse') {
            setIsExpanded(false);
            showGestureFeedback('swipe_left', effect.label);
            return { reply: effect.label, executionResult: effect.label };
          }
          if (effect.type === 'navigate') {
            skipHistoryPushRef.current = true;
            setNavHistory((prev) => prev.slice(0, -1));
            setActiveNav(effect.target);
            showGestureFeedback('swipe_left', effect.label);
            return { reply: effect.label, executionResult: effect.label };
          }
          return { reply: effect.label, executionResult: effect.label };
        }

        if (action === 'expand_view') {
          setIsExpanded(true);
          showGestureFeedback('swipe_up', 'Painel expandido');
          return {
            reply: 'Painel expandido para leitura mais confortável.',
            executionResult: 'Vista expandida',
          };
        }

        if (action === 'collapse_view') {
          setIsExpanded(false);
          showGestureFeedback('swipe_down', 'Painel recolhido');
          return {
            reply: 'Painel recolhido para vista normal.',
            executionResult: 'Vista normal',
          };
        }

        if (action === 'open_gesture_guide') {
          setShowGestureGuide(true);
          return {
            reply: 'Abri o guia interativo de navegação por gestos e voz.',
            executionResult: 'Guia de gestos aberto',
          };
        }

        const res = executeAppAction(
          action === 'open_app' ? `open_${rawQuery.toLowerCase()}` : action,
          rawQuery
        );
        return { reply: res, executionResult: res };
      }

      return {
        reply: aiReply || intent.offlineReply || 'Compreendido. Como posso ajudar mais?',
        executionResult: 'Resposta conversacional',
      };
    },
    [
      appPermissions,
      automations,
      currentPage,
      currentTrack,
      executeAppAction,
      files,
      handleAnalyzeDocument,
      handleNextTrack,
      handlePageChange,
      handlePrevTrack,
      handleReadAloud,
      handleRunAutomation,
      handleSelectFile,
      handleStopSpeaking,
      handleUpdateSettings,
      launchInstalledAppWithPolicy,
      playTrack,
      selectedFile,
      tracks,
    ]
  );

  // Main Command Processing Pipeline (Online Gemini + Offline Fallback)
  const handleProcessCommand = useCallback(
    async (rawText: string) => {
      const { hadWakeWord, cleaned } = stripWakeWord(rawText, settingsRef.current.wakeWord);
      if (settingsRef.current.wakeWordEnabled && !hadWakeWord) {
        setLastResponse(
          `Palavra de ativação "${settingsRef.current.wakeWord}" necessária no início do comando.`
        );
        return;
      }

      const commandText = cleaned || rawText;
      setRecognizedCommand(commandText);
      setStatus('a_processar');

      appendMessage({
        role: 'user',
        content: commandText,
        recognizedCommand: commandText,
        mode: settingsRef.current.offlineMode ? 'offline' : 'online',
      });

      const offlineIntent = parseOfflineCommand(commandText);

      // Use Offline/Instant Engine when offlineMode is enabled, navigator is offline,
      // or command is a deterministic high-confidence local device action.
      const isDeterministicAction =
        offlineIntent.confidence >= 0.94 &&
        offlineIntent.module !== 'conversation' &&
        offlineIntent.action !== 'summarize' &&
        offlineIntent.action !== 'explain';

      if (
        settingsRef.current.offlineMode ||
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        isDeterministicAction
      ) {
        setStatus('a_executar');
        const { reply, executionResult } = await executeIntent(offlineIntent);
        setLastExecutionResult(executionResult);
        appendMessage({
          role: 'assistant',
          content: reply,
          intentAction: `${offlineIntent.module}:${offlineIntent.action}`,
          executionResult,
          mode: settingsRef.current.offlineMode ? 'offline' : 'online',
        });
        respondWithVoice(reply);
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'a_executar' ? 'disponivel' : prev));
        }, 700);
        return;
      }

      // Online Mode: Call Gemini 4 Hydrogen for NLU, context memory, and reasoning
      try {
        const res = await fetch('/api/ai/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: commandText,
            history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
            userName: settingsRef.current.assistantUserName,
            language: settingsRef.current.language,
            highThinking: settingsRef.current.highThinking,
            availableTracks: tracks.map((t) => ({
              number: t.trackNumber,
              title: t.title,
              artist: t.artist,
              category: t.category,
            })),
            availableFiles: files.map((f) => ({ name: f.name, category: f.category })),
            availableAutomations: automations.map((a) => a.triggerPhrase),
            currentTrackTitle: currentTrack?.title ?? null,
            currentDocumentTitle: selectedFile?.name ?? null,
          }),
        });

        if (!res.ok) {
          throw new Error('Falha na interpretação online');
        }

        const data = await res.json();
        const intent: ParsedIntent = data.intent ?? offlineIntent;
        setStatus('a_executar');
        const { reply, executionResult } = await executeIntent(intent, data.assistantReply);
        setLastExecutionResult(executionResult);

        appendMessage({
          role: 'assistant',
          content: reply,
          intentAction: `${intent.module}:${intent.action}`,
          executionResult,
          thinkingSummary: data.thinkingSummary ?? null,
          mode: 'online',
        });
        respondWithVoice(reply);
      } catch {
        // Fallback smoothly to local offline command engine if API is unreachable
        setStatus('a_executar');
        const { reply, executionResult } = await executeIntent(offlineIntent);
        setLastExecutionResult(executionResult);
        appendMessage({
          role: 'assistant',
          content: reply,
          intentAction: `${offlineIntent.module}:${offlineIntent.action}`,
          executionResult,
          mode: 'offline',
        });
        respondWithVoice(reply);
      } finally {
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'a_executar' ? 'disponivel' : prev));
        }, 700);
      }
    },
    [
      appendMessage,
      automations,
      currentTrack?.title,
      executeIntent,
      files,
      messages,
      respondWithVoice,
      selectedFile?.name,
      tracks,
    ]
  );

  // Voice Recognition Toggle
  const handleToggleListen = useCallback(() => {
    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setStatus('disponivel');
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setLastResponse(
        'O reconhecimento de voz nativo do navegador não está disponível neste ambiente. Usa a Conversa Live ou escreve o teu comando abaixo.'
      );
      return;
    }

    const rec = createSpeechRecognizer({
      language: settingsRef.current.language,
      continuous: false,
      onInterim: (text) => setRecognizedCommand(text),
      onFinal: (finalText) => {
        setIsListening(false);
        void handleProcessCommand(finalText);
      },
      onError: (err) => {
        setIsListening(false);
        setStatus('disponivel');
        if (err === 'not-allowed') {
          setPermissions((p) => ({ ...p, microphone: 'denied' }));
          setLastResponse('Permissão de microfone recusada. Autoriza o microfone nas definições.');
        }
      },
      onEnd: () => {
        setIsListening(false);
        setStatus((prev) => (prev === 'a_ouvir' ? 'disponivel' : prev));
      },
    });

    if (rec) {
      recognizerRef.current = rec;
      setPermissions((p) => ({ ...p, microphone: 'granted' }));
      setIsListening(true);
      setStatus('a_ouvir');
      rec.start();
    }
  }, [handleProcessCommand, isListening]);

  // Unified Gesture Handler (pairs pointer/touch gestures with voice actions)
  const handleGestureDetected = useCallback(
    (gesture: GestureType) => {
      const effect = resolveGestureAction(gesture, {
        activeNav,
        navHistory,
        isExpanded,
        isSpeaking,
        hasActiveTrack: Boolean(currentTrack && (isPlaying || elapsedSeconds > 0)),
        showGestureGuide,
      });

      if (effect.type === 'noop') return;
      showGestureFeedback(gesture, effect.label);

      if (effect.type === 'expand') {
        setIsExpanded(true);
      } else if (effect.type === 'collapse') {
        setIsExpanded(false);
      } else if (effect.type === 'open_music') {
        setActiveNav('musica');
      } else if (effect.type === 'navigate') {
        if (effect.isBack) {
          skipHistoryPushRef.current = true;
          setNavHistory((prev) => prev.slice(0, -1));
        }
        setActiveNav(effect.target);
      } else if (effect.type === 'toggle_mic') {
        handleToggleListen();
      } else if (effect.type === 'stop_speaking') {
        handleStopSpeaking();
      } else if (effect.type === 'open_guide') {
        setShowGestureGuide(true);
      } else if (effect.type === 'close_guide') {
        setShowGestureGuide(false);
      }
    },
    [
      activeNav,
      currentTrack,
      elapsedSeconds,
      handleStopSpeaking,
      handleToggleListen,
      isExpanded,
      isPlaying,
      isSpeaking,
      navHistory,
      showGestureFeedback,
      showGestureGuide,
    ]
  );

  const workspaceGestures = useGestureNavigation({
    enabled: settings.gesturesEnabled !== false && !showGestureGuide,
    sensitivity: settings.gestureSensitivity ?? 'normal',
    allowVertical: false,
    onGesture: handleGestureDetected,
  });

  // Gemini Live API Real-Time Voice Session (gemini-3.8-live)
  const stopLiveSession = useCallback(() => {
    liveWsRef.current?.close();
    liveWsRef.current = null;
    liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveStreamRef.current = null;
    if (liveInputCtxRef.current && liveInputCtxRef.current.state !== 'closed') {
      void liveInputCtxRef.current.close();
    }
    if (liveOutputCtxRef.current && liveOutputCtxRef.current.state !== 'closed') {
      void liveOutputCtxRef.current.close();
    }
    liveInputCtxRef.current = null;
    liveOutputCtxRef.current = null;
    nextPlayTimeRef.current = 0;
    setIsLiveActive(false);
    setLiveConnected(false);
    setStatus('disponivel');
  }, []);

  const handleToggleLive = useCallback(async () => {
    if (isLiveActive) {
      stopLiveSession();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissions((p) => ({ ...p, microphone: 'granted' }));
      liveStreamRef.current = stream;
      setIsLiveActive(true);
      setStatus('a_ouvir');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live?voice=${settingsRef.current.voiceGender}&userName=${encodeURIComponent(settingsRef.current.assistantUserName)}`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      liveInputCtxRef.current = inputCtx;
      liveOutputCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);
        processor.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const base64 = float32ToPcm16Base64(ev.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        };
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.status === 'connected') {
          setLiveConnected(true);
          setLastResponse('Sessão Live API (gemini-3.8-live) ligada. Podes falar naturalmente.');
        } else if (msg.inputTranscript) {
          setRecognizedCommand(msg.inputTranscript);
        } else if (msg.outputTranscript) {
          setLastResponse(msg.outputTranscript);
        } else if (msg.audio && liveOutputCtxRef.current) {
          const float32 = pcm16Base64ToFloat32(msg.audio);
          const ctx = liveOutputCtxRef.current;
          const buffer = ctx.createBuffer(1, float32.length, 24000);
          buffer.getChannelData(0).set(float32);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
          src.start(startAt);
          nextPlayTimeRef.current = startAt + buffer.duration;
        } else if (msg.error) {
          setLastResponse(msg.error);
          stopLiveSession();
        }
      };

      ws.onerror = () => {
        setLastResponse('Erro na ligação de áudio em tempo real.');
        stopLiveSession();
      };
      ws.onclose = () => {
        setLiveConnected(false);
        setIsLiveActive(false);
      };
    } catch {
      setPermissions((p) => ({ ...p, microphone: 'denied' }));
      setLastResponse('Permissão de microfone necessária para a conversa em tempo real.');
      stopLiveSession();
    }
  }, [isLiveActive, stopLiveSession]);

  // Import Local Audio Files
  const handleImportAudioFiles = useCallback((fileList: FileList) => {
    const newTracks: MediaTrack[] = Array.from(fileList).map((f, idx) => {
      const title = f.name.replace(/\.[^/.]+$/, '');
      return {
        id: `local-track-${Date.now()}-${idx}`,
        trackNumber: tracksRef.current.length + idx + 1,
        title,
        artist: 'Ficheiro Local',
        album: 'Dispositivo',
        category: 'Instrumental',
        durationSeconds: 180,
        coverUrl: COVER_FOCUS,
        sourceType: 'local',
        objectUrl: URL.createObjectURL(f),
        fileHash: computeTrackSignature({ title, artist: 'Ficheiro Local', durationSeconds: 180 }),
        playCount: 0,
      };
    });
    setTracks((prev) => [...prev, ...newTracks]);
    if (newTracks[0]) {
      playTrack(newTracks[0]);
    }
  }, [playTrack]);

  // Clear Conversation History
  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setRecognizedCommand('');
    setLastResponse('Histórico limpo com sucesso.');
    void authFetch('/api/db/messages', { method: 'DELETE' });
  }, [authFetch]);

  // Google Sign-In / Sign-Out
  const handleSignIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch {
      setLastResponse('O início de sessão com Google foi cancelado ou bloqueado pelo navegador.');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  const navItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'assistente', label: 'Assistente', icon: <Mic className="w-4 h-4" /> },
    { id: 'comando', label: 'Centro de Comando', icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
    { id: 'musica', label: 'Música', icon: <Music className="w-4 h-4" /> },
    { id: 'ficheiros', label: 'Ficheiros', icon: <FileText className="w-4 h-4" /> },
    { id: 'automacoes', label: 'Automações', icon: <Layers className="w-4 h-4" /> },
    { id: 'definicoes', label: 'Definições', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#02060B] text-slate-900 dark:text-[#EAFBFF] flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-[#00BFFF]/20 bg-white/90 dark:bg-[#02060B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveNav('assistente')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src={NEXUS_EMBLEM_URL}
              alt="Emblema NEXUS AI"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover border border-[#00F5FF]/45"
            />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-[#EAFBFF]">
              NEXUS AI
            </span>
          </button>

          {/* Zone 2: 5 Single-line Nav Links */}
          <nav
            aria-label="Navegação Principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    active
                      ? 'border-[#00F5FF] text-sky-700 dark:text-[#00F5FF]'
                      : 'border-transparent text-slate-600 dark:text-[#EAFBFF]/70 hover:text-slate-900 dark:hover:text-[#EAFBFF]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Gestures + PWA Install + Account Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowGestureGuide(true)}
              aria-label="Gestos de navegação"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Touchpad className="w-3.5 h-3.5 text-blue-500" />
              <span>Gestos</span>
            </button>
            <PWAInstallButton />
            {firebaseUser ? (
              <button
                type="button"
                onClick={() => setActiveNav('definicoes')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                <span className="max-w-[120px] truncate">
                  {firebaseUser.displayName || settings.assistantUserName}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sincronizar Conta</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area (with horizontal swipe navigation) */}
      <main
        data-testid="nexus-workspace-main"
        {...workspaceGestures}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 space-y-5 touch-pan-y"
      >
        {pendingAppConfirmation && (
          <div
            role="alertdialog"
            aria-labelledby="app-confirm-title"
            className="rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h3
                id="app-confirm-title"
                className="text-sm font-semibold text-amber-900 dark:text-amber-200"
              >
                Confirmar abertura de {pendingAppConfirmation.name}
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/90">
                Esta aplicação ({pendingAppConfirmation.category} ·{' '}
                {pendingAppConfirmation.packageHint}) exige confirmação explícita antes de abrir
                por comando de voz.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const canceledName = pendingAppConfirmation.name;
                  setPendingAppConfirmation(null);
                  const msg = `Abertura de "${canceledName}" cancelada pelo utilizador.`;
                  setAppLaunchNotice(msg);
                  respondWithVoice(msg);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingAppConfirmation;
                  setPendingAppConfirmation(null);
                  const msg = executeConfirmedInstalledApp(target);
                  appendMessage({
                    role: 'assistant',
                    content: `Confirmado: ${msg}`,
                    intentAction: 'app_control:confirmed',
                    executionResult: `Abertura confirmada: ${target.name}`,
                    mode: settings.offlineMode ? 'offline' : 'online',
                  });
                  respondWithVoice(msg);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        )}

        {currentTrack && (isPlaying || elapsedSeconds > 0) && activeNav !== 'musica' && (
          <PersistentMiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            elapsedSeconds={elapsedSeconds}
            gesturesEnabled={settings.gesturesEnabled !== false}
            onTogglePlayPause={handleTogglePlayPause}
            onNext={handleNextTrack}
            onOpenMusic={() => setActiveNav('musica')}
          />
        )}

        {activeNav === 'comando' && (
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
            <HolographicCommandCenter
              settings={settings}
              files={files}
              tracks={tracks}
              onNavigateSection={(sec) => setActiveNav(sec)}
              onSelectFile={(file) => {
                setSelectedFile(file);
                setActiveNav('ficheiros');
              }}
            />
          </main>
        )}

        {activeNav === 'assistente' && (
          <AssistantHub
            status={status}
            recognizedCommand={recognizedCommand}
            lastResponse={lastResponse}
            lastExecutionResult={lastExecutionResult}
            isSpeaking={isSpeaking}
            isReadingAloud={isReadingAloud}
            isListening={isListening}
            isLiveActive={isLiveActive}
            liveConnected={liveConnected}
            messages={messages}
            settings={settings}
            customVoiceProfile={customVoiceProfile}
            speechSupported={isSpeechRecognitionSupported()}
            isOnline={isOnline}
            onToggleListen={handleToggleListen}
            onToggleLive={() => void handleToggleLive()}
            onStopSpeaking={handleStopSpeaking}
            onSubmitCommand={(text) => void handleProcessCommand(text)}
            onUpdateSettings={handleUpdateSettings}
            onUpdateCustomVoice={handleUpdateCustomVoice}
            onClearHistory={handleClearHistory}
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded((v) => !v)}
            onNavigateSection={(section, options) => {
              if (options?.fileCategory) {
                setFileCategoryFilter(options.fileCategory);
              }
              if (options?.focusSearch) {
                setFileSearchFilter('');
              }
              if (options?.settingsTab) {
                setSettingsTab(options.settingsTab);
              }
              setActiveNav(section);
            }}
            onOpenGestureGuide={() => setShowGestureGuide(true)}
            onGestureDetected={handleGestureDetected}
          />
        )}

        {activeNav === 'musica' && (
          <MusicCenter
            tracks={tracks}
            playlists={playlists}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            elapsedSeconds={elapsedSeconds}
            volume={volume}
            shuffle={shuffle}
            repeatMode={repeatMode}
            onPlayTrack={playTrack}
            onTogglePlayPause={handleTogglePlayPause}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onSeek={(sec) => audioEngineRef.current?.seek(sec)}
            onVolumeChange={handleVolumeChange}
            onToggleShuffle={() => setShuffle((s) => !s)}
            onCycleRepeat={() =>
              setRepeatMode((r) => (r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'))
            }
            onCreatePlaylist={(name, category, trackIds) => {
              const created: Playlist = {
                id: `pl-${Date.now()}`,
                name,
                category,
                trackIds,
                createdAt: new Date().toISOString(),
              };
              setPlaylists((prev) => [...prev, created]);
              void authFetch('/api/db/playlists', {
                method: 'POST',
                body: JSON.stringify({ name, category, trackIds }),
              });
            }}
            onDeleteTrack={(trackId) => {
              setTracks((prev) => prev.filter((t) => t.id !== trackId));
              if (/^\d+$/.test(trackId)) {
                void authFetch(`/api/db/tracks/${trackId}`, { method: 'DELETE' });
              }
            }}
            onImportAudioFiles={handleImportAudioFiles}
          />
        )}

        {activeNav === 'ficheiros' && (
          <FileExplorerAndReader
            files={files}
            selectedFile={selectedFile}
            currentPage={currentPage}
            isReadingAloud={isReadingAloud}
            aiAnalysis={aiAnalysis}
            isAnalyzing={isAnalyzing}
            searchFilter={fileSearchFilter}
            categoryFilter={fileCategoryFilter}
            isListening={isListening}
            voicePromptImport={voicePromptImport}
            onSearchFilterChange={setFileSearchFilter}
            onCategoryFilterChange={setFileCategoryFilter}
            onSelectFile={handleSelectFile}
            onPageChange={handlePageChange}
            onReadAloud={() => handleReadAloud()}
            onStopReading={handleStopSpeaking}
            onAnalyzeDocument={(task) => void handleAnalyzeDocument(task)}
            onToggleListen={handleToggleListen}
            onVoiceCommand={(cmd) => void handleProcessCommand(cmd)}
            onDismissVoicePrompt={() => setVoicePromptImport(null)}
            onAddFiles={(newFiles) => {
              const created: DeviceFile[] = newFiles.map((f, idx) => ({
                ...f,
                id: `file-${Date.now()}-${idx}`,
                createdAt: new Date().toISOString(),
              }));
              setFiles((prev) => [...created, ...prev]);
              if (created[0]) handleSelectFile(created[0]);
              for (const nf of newFiles) {
                void authFetch('/api/db/files', {
                  method: 'POST',
                  body: JSON.stringify(nf),
                });
              }
            }}
          />
        )}

        {activeNav === 'automacoes' && (
          <AutomationAndApps
            automations={automations}
            lastDeviceNotice={lastDeviceNotice}
            volume={volume}
            onRunAutomation={(routine) => void handleRunAutomation(routine)}
            onCreateAutomation={(routine) => {
              const created: AutomationRoutine = {
                ...routine,
                id: `auto-${Date.now()}`,
                lastRunAt: null,
              };
              setAutomations((prev) => [...prev, created]);
              void authFetch('/api/db/automations', {
                method: 'POST',
                body: JSON.stringify(routine),
              });
            }}
            onAppAction={(action, label) => {
              const msg = executeAppAction(action, label);
              setLastResponse(msg);
            }}
            onOpenAppPermissions={() => {
              setSettingsTab('apps');
              setActiveNav('definicoes');
            }}
            onCapturePhoto={(dataUrl) => {
              const photo: DeviceFile = {
                id: `photo-${Date.now()}`,
                name: `Captura Câmara ${new Date().toLocaleTimeString('pt-PT')}.jpg`,
                category: categorizeFileByNameAndMime('foto.jpg', 'image/jpeg'),
                mimeType: 'image/jpeg',
                sizeBytes: dataUrl.length,
                folderPath: '/Imagens/Câmara',
                pages: ['Fotografia capturada através do módulo Câmara do NEXUS AI.'],
                pageCount: 1,
                lastPage: 1,
                objectUrl: dataUrl,
                createdAt: new Date().toISOString(),
              };
              setFiles((prev) => [photo, ...prev]);
              handleSelectFile(photo);
              setFileCategoryFilter('Fotografias');
              setActiveNav('ficheiros');
            }}
          />
        )}

        {activeNav === 'definicoes' && (
          <SettingsAndPrivacy
            settings={settings}
            permissions={permissions}
            appPermissions={appPermissions}
            customVoiceProfile={customVoiceProfile}
            initialTab={settingsTab}
            availableVoices={availableVoices}
            userEmail={firebaseUser?.email ?? null}
            appLaunchNotice={appLaunchNotice}
            isOnline={isOnline}
            isSpeaking={isSpeaking}
            voiceEngineNotice={voiceEngineNotice}
            onUpdateSettings={handleUpdateSettings}
            onUpdateCustomVoice={handleUpdateCustomVoice}
            onDeleteCustomVoice={handleDeleteCustomVoice}
            onTestCustomVoice={handleTestCustomVoice}
            onStopSpeaking={handleStopSpeaking}
            onUpdateAppPermission={handleUpdateAppPermission}
            onBulkUpdateApps={handleBulkUpdateApps}
            onTestLaunchApp={(app) => {
              const msg = launchInstalledAppWithPolicy(app);
              setLastResponse(msg);
            }}
            onRequestMicrophone={async () => {
              try {
                const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                s.getTracks().forEach((t) => t.stop());
                setPermissions((p) => ({ ...p, microphone: 'granted' }));
              } catch {
                setPermissions((p) => ({ ...p, microphone: 'denied' }));
              }
            }}
            onRequestCamera={async () => {
              try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true });
                s.getTracks().forEach((t) => t.stop());
                setPermissions((p) => ({ ...p, camera: 'granted' }));
              } catch {
                setPermissions((p) => ({ ...p, camera: 'denied' }));
              }
            }}
            onClearHistory={handleClearHistory}
            onSignIn={() => void handleSignIn()}
            onSignOut={() => void handleSignOut()}
            onOpenGestureGuide={() => setShowGestureGuide(true)}
          />
        )}
      </main>

      <GestureGuideModal
        isOpen={showGestureGuide}
        gesturesEnabled={settings.gesturesEnabled !== false}
        sensitivity={settings.gestureSensitivity ?? 'normal'}
        onClose={() => setShowGestureGuide(false)}
        onToggleEnabled={(enabled) => handleUpdateSettings({ gesturesEnabled: enabled })}
        onChangeSensitivity={(sensitivity) =>
          handleUpdateSettings({ gestureSensitivity: sensitivity })
        }
        onTriggerGesture={handleGestureDetected}
      />

      {gestureHud && !showGestureGuide && (
        <div
          role="status"
          aria-live="polite"
          data-testid="gesture-hud"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-slate-900/95 text-white px-4 py-2 text-xs font-medium shadow-xl"
        >
          <Touchpad className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{gestureHud.label}</span>
        </div>
      )}

      {(!isOnline || settings.offlineMode) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            {!isOnline
              ? 'Sem Internet — Navegação Offline Ativa'
              : 'Modo Offline — Dados locais e navegação ativos'}
          </span>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (<= 15% mobile height, >= 44px touch targets) */}
      <nav
        aria-label="Navegação Móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 text-[10px] font-medium cursor-pointer ${
                active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
