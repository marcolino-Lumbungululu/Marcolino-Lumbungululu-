export type AssistantStatus =
  | 'disponivel'
  | 'a_ouvir'
  | 'a_processar'
  | 'a_executar';

export type NavSection =
  | 'assistente'
  | 'musica'
  | 'ficheiros'
  | 'automacoes'
  | 'definicoes'
  | 'comando';

export type FileCategory =
  | 'PDF'
  | 'Word'
  | 'Fotografias'
  | 'Vídeos'
  | 'Áudio'
  | 'Livros Digitais'
  | 'Descarregados'
  | 'Pastas';

export type GestureType =
  | 'swipe_up'
  | 'swipe_down'
  | 'swipe_left'
  | 'swipe_right'
  | 'double_tap'
  | 'long_press';

export type GestureSensitivity = 'normal' | 'high';

export interface UserSettings {
  assistantUserName: string;
  voiceGender: 'feminina' | 'masculina';
  voiceUri: string | null;
  speechRate: number;
  responseVolume: number;
  language: 'pt-AO' | 'pt-PT' | 'pt-BR';
  wakeWord: string;
  wakeWordEnabled: boolean;
  silentMode: boolean;
  theme: 'dark' | 'light';
  offlineMode: boolean;
  highThinking: boolean;
  gesturesEnabled?: boolean;
  gestureSensitivity?: GestureSensitivity;
}

export interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  recognizedCommand?: string | null;
  intentAction?: string | null;
  executionResult?: string | null;
  thinkingSummary?: string | null;
  mode: 'online' | 'offline' | 'live';
  createdAt: string;
}

export interface MediaTrack {
  id: string;
  trackNumber: number;
  title: string;
  artist: string;
  album: string;
  category: string;
  durationSeconds: number;
  coverUrl: string;
  sourceType: 'synth' | 'local';
  objectUrl?: string;
  fileHash: string;
  playCount: number;
  lastPlayedAt?: string | null;
  synthProfile?: {
    tempoBpm: number;
    rootFreq: number;
    scale: number[];
    timbre: 'warm' | 'marimba' | 'piano';
  };
}

export interface Playlist {
  id: string;
  name: string;
  category: string;
  trackIds: string[];
  createdAt: string;
}

export interface DeviceFile {
  id: string;
  name: string;
  category: FileCategory;
  mimeType: string;
  sizeBytes: number;
  folderPath: string;
  pages: string[];
  pageCount: number;
  lastPage: number;
  lastOpenedAt?: string | null;
  objectUrl?: string;
  createdAt: string;
}

export interface AutomationStep {
  id: string;
  action:
    | 'set_volume'
    | 'open_view'
    | 'open_last_pdf'
    | 'start_tts_reading'
    | 'show_playlists'
    | 'play_category'
    | 'toggle_silent_mode';
  label: string;
  value?: string | number | boolean;
}

export interface AutomationRoutine {
  id: string;
  name: string;
  triggerPhrase: string;
  description: string;
  steps: AutomationStep[];
  isActive: boolean;
  lastRunAt?: string | null;
}

export interface ParsedIntent {
  module:
    | 'music'
    | 'files'
    | 'document_reader'
    | 'app_control'
    | 'automation'
    | 'settings'
    | 'conversation';
  action: string;
  params: Record<string, string | number | boolean | null>;
  confidence: number;
  requiresConfirmation?: boolean;
  offlineReply?: string;
}

export interface PermissionState {
  microphone: 'granted' | 'prompt' | 'denied' | 'unsupported';
  camera: 'granted' | 'prompt' | 'denied' | 'unsupported';
  localFiles: 'granted' | 'prompt';
  mediaNotifications: 'granted' | 'prompt' | 'denied';
}

export type InstalledAppCategory =
  | 'Comunicação'
  | 'Finanças'
  | 'Educação & Fé'
  | 'Multimédia'
  | 'Produtividade'
  | 'IA & Nuvem'
  | 'Ferramentas'
  | 'Redes & Segurança'
  | 'Jogos & Lazer';

export interface InstalledAppPermission {
  id: string;
  name: string;
  category: InstalledAppCategory;
  description: string;
  packageHint: string;
  canLaunchByVoice: boolean;
  requireConfirmation: boolean;
  allowMicrophone: boolean;
  allowFiles: boolean;
  allowNotifications: boolean;
  allowBackground: boolean;
}

export interface VoiceSampleRecord {
  id: string;
  label: string;
  promptText: string;
  durationSeconds: number;
  qualityScore: number;
  audioDataUrl?: string;
  mimeType: string;
  createdAt: string;
}

export type GeminiPrebuiltVoice = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

export interface CustomVoiceProfile {
  voiceId: string | null;
  enabled: boolean;
  consentGranted: boolean;
  consentAcceptedAt: string | null;
  ownerDisplayName: string;
  geminiVoiceName: GeminiPrebuiltVoice;
  fallbackVoiceUri: string | null;
  expressiveness: number;
  speechRate: number;
  acousticStylePrompt: string;
  calibrationStatus: 'nao_configurada' | 'gravada' | 'calibrada';
  aiDisclosureEnabled: boolean;
  samples: VoiceSampleRecord[];
  updatedAt: string | null;
}

