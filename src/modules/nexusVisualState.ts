import type {
  AssistantStatus,
  CustomVoiceProfile,
  UserSettings,
} from '../types/nexus.ts';

export type VisualAssistantState =
  | 'disponivel'
  | 'a_ouvir'
  | 'a_processar'
  | 'a_responder'
  | 'a_executar';

export type VoiceOutputMode = 'original' | 'alternativa' | 'silencioso';

export interface VisualStateDescriptor {
  state: VisualAssistantState;
  label: string;
  subtitle: string;
  isWaveActive: boolean;
  isCustomVoiceActive: boolean;
  voiceMode: VoiceOutputMode;
}

export type LateralNodeId =
  | 'musica'
  | 'documentos'
  | 'fotografias'
  | 'videos'
  | 'aplicacoes'
  | 'pesquisa'
  | 'ia'
  | 'voz'
  | 'definicoes'
  | 'memoria';

export interface LateralNodeSpec {
  id: LateralNodeId;
  label: string;
  side: 'left' | 'right';
}

export const LEFT_HOLOGRAPHIC_NODES: LateralNodeSpec[] = [
  { id: 'musica', label: 'Música', side: 'left' },
  { id: 'documentos', label: 'Documentos', side: 'left' },
  { id: 'fotografias', label: 'Fotografias', side: 'left' },
  { id: 'videos', label: 'Vídeos', side: 'left' },
  { id: 'aplicacoes', label: 'Aplicações', side: 'left' },
];

export const RIGHT_HOLOGRAPHIC_NODES: LateralNodeSpec[] = [
  { id: 'pesquisa', label: 'Pesquisa', side: 'right' },
  { id: 'ia', label: 'Inteligência IA', side: 'right' },
  { id: 'voz', label: 'Voz', side: 'right' },
  { id: 'definicoes', label: 'Definições', side: 'right' },
  { id: 'memoria', label: 'Memória', side: 'right' },
];

export interface BottomControlSpec {
  id: 'mic' | 'custom_voice' | 'history' | 'settings' | 'stop' | 'extras';
  label: string;
}

export const BOTTOM_CIRCULAR_CONTROLS: BottomControlSpec[] = [
  { id: 'mic', label: 'Microfone' },
  { id: 'custom_voice', label: 'Voz Personalizada' },
  { id: 'history', label: 'Histórico' },
  { id: 'settings', label: 'Configurações' },
  { id: 'stop', label: 'Interromper' },
  { id: 'extras', label: 'Mais funções' },
];

export function resolveVoiceOutputMode(
  settings: Pick<UserSettings, 'silentMode'>,
  customVoiceProfile: Pick<CustomVoiceProfile, 'enabled' | 'consentGranted' | 'voiceId'>
): VoiceOutputMode {
  if (settings.silentMode) {
    return 'silencioso';
  }
  if (
    customVoiceProfile.enabled &&
    customVoiceProfile.consentGranted &&
    Boolean(customVoiceProfile.voiceId)
  ) {
    return 'original';
  }
  return 'alternativa';
}

export function deriveVisualAssistantState(params: {
  status: AssistantStatus;
  isListening: boolean;
  isSpeaking: boolean;
  isReadingAloud?: boolean;
  isLiveActive: boolean;
  liveConnected?: boolean;
  settings: Pick<UserSettings, 'silentMode' | 'offlineMode'>;
  customVoiceProfile: Pick<CustomVoiceProfile, 'enabled' | 'consentGranted' | 'voiceId'>;
}): VisualStateDescriptor {
  const {
    status,
    isListening,
    isSpeaking,
    isReadingAloud = false,
    isLiveActive,
    liveConnected = false,
    settings,
    customVoiceProfile,
  } = params;

  const voiceMode = resolveVoiceOutputMode(settings, customVoiceProfile);
  const isCustomVoiceActive = voiceMode === 'original';

  if (status === 'a_executar') {
    return {
      state: 'a_executar',
      label: 'A EXECUTAR COMANDO',
      subtitle: 'Operação confirmada no sistema',
      isWaveActive: false,
      isCustomVoiceActive,
      voiceMode,
    };
  }

  if (status === 'a_processar') {
    return {
      state: 'a_processar',
      label: 'A PROCESSAR O COMANDO',
      subtitle: settings.offlineMode
        ? 'Motor neural local em processamento'
        : 'Núcleo Gemini em análise',
      isWaveActive: true,
      isCustomVoiceActive,
      voiceMode,
    };
  }

  if (isSpeaking || isReadingAloud) {
    return {
      state: 'a_responder',
      label: 'A FALAR',
      subtitle: isCustomVoiceActive
        ? 'Síntese vocal personalizada sincronizada'
        : 'Reprodução de resposta por voz',
      isWaveActive: true,
      isCustomVoiceActive,
      voiceMode,
    };
  }

  if (isListening || status === 'a_ouvir' || (isLiveActive && liveConnected)) {
    return {
      state: 'a_ouvir',
      label: 'ESTOU A OUVIR',
      subtitle: isLiveActive
        ? 'Canal de áudio em tempo real ativo'
        : 'Captação vocal em português ativa',
      isWaveActive: true,
      isCustomVoiceActive,
      voiceMode,
    };
  }

  return {
    state: 'disponivel',
    label: 'NEXUS AI DISPONÍVEL',
    subtitle: settings.offlineMode
      ? 'Pronto em modo offline local'
      : 'Pronto para comando de voz ou toque',
    isWaveActive: false,
    isCustomVoiceActive,
    voiceMode,
  };
}

const BASE_WAVE_PATTERN = [
  0.24, 0.42, 0.65, 0.48, 0.86, 0.58, 0.98, 0.72, 1.0, 0.74, 0.94, 0.56, 0.82, 0.46, 0.62, 0.38, 0.22,
];

export function computeWaveformHeights(params: {
  state: VisualAssistantState;
  amplitude: number;
  tick: number;
  minPx?: number;
  maxPx?: number;
}): number[] {
  const { state, amplitude, tick, minPx = 5, maxPx = 42 } = params;
  const clampedAmp = Math.max(0, Math.min(1, amplitude));

  return BASE_WAVE_PATTERN.map((weight, idx) => {
    if (state === 'disponivel') {
      const idleBreath = 0.14 + 0.06 * Math.sin(tick * 0.12 + idx * 0.45);
      return Math.round(minPx + (maxPx - minPx) * idleBreath * weight);
    }

    if (state === 'a_executar') {
      const confirmRipple = 0.28 + 0.15 * Math.cos(tick * 0.2 - Math.abs(idx - 8) * 0.4);
      return Math.round(minPx + (maxPx - minPx) * confirmRipple * weight);
    }

    const waveOsc = 0.55 + 0.45 * Math.sin(tick * 0.38 + idx * 0.65);
    const dynamicLevel = Math.max(0.24, clampedAmp) * waveOsc * weight;
    const normalized = Math.max(0.08, Math.min(1, dynamicLevel));
    return Math.round(minPx + (maxPx - minPx) * normalized);
  });
}
