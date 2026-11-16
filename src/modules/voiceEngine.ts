import type { CustomVoiceProfile, UserSettings } from '../types/nexus.ts';
import { shouldUseCustomGeminiTts } from './customVoiceLogic.ts';

let activeTtsAudio: HTMLAudioElement | null = null;
let activeTtsObjectUrl: string | null = null;
let activeTtsAbort: AbortController | null = null;

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

export function getAvailablePortugueseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  const ptVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
  return ptVoices.length > 0 ? ptVoices : voices;
}

function cleanupActiveTtsAudio(): void {
  if (activeTtsAudio) {
    try {
      activeTtsAudio.pause();
      activeTtsAudio.src = '';
    } catch {
      // Ignore audio cleanup errors
    }
    activeTtsAudio = null;
  }
  if (activeTtsObjectUrl) {
    try {
      URL.revokeObjectURL(activeTtsObjectUrl);
    } catch {
      // Ignore revoke error
    }
    activeTtsObjectUrl = null;
  }
}

export function speakText(
  text: string,
  settings: UserSettings,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (settings.silentMode || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return false;
  }

  try {
    cleanupActiveTtsAudio();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.language || 'pt-AO';
    utterance.rate = settings.speechRate;
    utterance.volume = settings.responseVolume;
    utterance.pitch = settings.voiceGender === 'masculina' ? 0.88 : 1.08;

    const voices = window.speechSynthesis.getVoices();
    if (settings.voiceUri) {
      const match = voices.find((v) => v.voiceURI === settings.voiceUri);
      if (match) utterance.voice = match;
    } else {
      const ptMatch = voices.find((v) => {
        if (!v.lang.toLowerCase().startsWith('pt')) return false;
        const nameLower = v.name.toLowerCase();
        if (settings.voiceGender === 'masculina') {
          return nameLower.includes('male') || nameLower.includes('daniel') || nameLower.includes('duarte') || nameLower.includes('cristiano');
        }
        return nameLower.includes('female') || nameLower.includes('joana') || nameLower.includes('ines') || nameLower.includes('maria') || nameLower.includes('luciana');
      }) ?? voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (ptMatch) utterance.voice = ptMatch;
    }

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

export function playAudioBase64Wav(
  base64Wav: string,
  options: {
    playbackRate?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): boolean {
  if (typeof window === 'undefined') {
    options.onError?.();
    return false;
  }
  try {
    cleanupActiveTtsAudio();
    const binary = atob(base64Wav);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = Math.max(0.7, Math.min(1.5, options.playbackRate ?? 1.0));
    audio.volume = Math.max(0, Math.min(1, options.volume ?? 0.85));

    activeTtsAudio = audio;
    activeTtsObjectUrl = url;

    audio.onplay = () => options.onStart?.();
    audio.onended = () => {
      cleanupActiveTtsAudio();
      options.onEnd?.();
    };
    audio.onerror = () => {
      cleanupActiveTtsAudio();
      options.onError?.();
    };

    void audio.play().catch(() => {
      cleanupActiveTtsAudio();
      options.onError?.();
    });
    return true;
  } catch {
    cleanupActiveTtsAudio();
    options.onError?.();
    return false;
  }
}

export async function speakWithCustomOrLocalEngine(params: {
  text: string;
  settings: UserSettings;
  customVoiceProfile: CustomVoiceProfile;
  isOnline: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onEngineNotice?: (notice: string) => void;
}): Promise<boolean> {
  const {
    text,
    settings,
    customVoiceProfile,
    isOnline,
    onStart,
    onEnd,
    onEngineNotice,
  } = params;

  if (settings.silentMode || !text.trim()) {
    onEnd?.();
    return false;
  }

  stopSpeaking();

  const fallbackSettings: UserSettings = {
    ...settings,
    voiceUri: customVoiceProfile.fallbackVoiceUri || settings.voiceUri,
    speechRate: customVoiceProfile.enabled ? customVoiceProfile.speechRate : settings.speechRate,
  };

  if (
    !shouldUseCustomGeminiTts({
      profile: customVoiceProfile,
      isOnline,
      offlineMode: settings.offlineMode,
      silentMode: settings.silentMode,
    })
  ) {
    if (customVoiceProfile.enabled && (!isOnline || settings.offlineMode)) {
      onEngineNotice?.(
        'Sem Internet ou em Modo Offline: a utilizar a voz alternativa local do dispositivo.'
      );
    }
    return speakText(text, fallbackSettings, onStart, onEnd);
  }

  const controller = new AbortController();
  activeTtsAbort = controller;

  try {
    onStart?.();
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text,
        customVoiceProfile,
        settings,
      }),
    });

    if (controller.signal.aborted) {
      onEnd?.();
      return false;
    }

    if (!res.ok) {
      throw new Error('Gemini TTS indisponível');
    }

    const data = await res.json();
    if (data?.fallbackRecommended || !data?.audioBase64) {
      onEngineNotice?.(
        data?.reason ||
          'Gemini TTS indisponível para esta conta/região — a usar a voz alternativa local configurada.'
      );
      return speakText(text, fallbackSettings, onStart, onEnd);
    }

    if (data.aiDisclosure) {
      onEngineNotice?.(data.aiDisclosure);
    } else {
      onEngineNotice?.(`Voz personalizada ativa via ${data.modelUsed || 'Gemini TTS'}.`);
    }

    return playAudioBase64Wav(data.audioBase64, {
      playbackRate: customVoiceProfile.speechRate,
      volume: settings.responseVolume,
      onStart,
      onEnd,
      onError: () => {
        onEngineNotice?.('Falha na reprodução Gemini TTS; alternado para voz local alternativa.');
        speakText(text, fallbackSettings, onStart, onEnd);
      },
    });
  } catch (err) {
    if (controller.signal.aborted) {
      onEnd?.();
      return false;
    }
    const reason =
      err instanceof Error ? err.message : 'Gemini TTS indisponível para a conta/região';
    onEngineNotice?.(
      `${reason} — a usar a voz alternativa local configurada.`
    );
    return speakText(text, fallbackSettings, onStart, onEnd);
  } finally {
    if (activeTtsAbort === controller) {
      activeTtsAbort = null;
    }
  }
}

export function stopSpeaking(): void {
  if (activeTtsAbort) {
    try {
      activeTtsAbort.abort();
    } catch {
      // Ignore abort errors
    }
    activeTtsAbort = null;
  }
  cleanupActiveTtsAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function createSpeechRecognizer(options: {
  language: string;
  continuous?: boolean;
  onInterim: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onError: (err: string) => void;
  onEnd: () => void;
}): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = options.language || 'pt-AO';
  rec.continuous = Boolean(options.continuous);
  rec.interimResults = true;

  rec.onresult = (event) => {
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const transcript = res[0]?.transcript ?? '';
      if (res.isFinal) {
        finalText += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    if (interim.trim()) options.onInterim(interim.trim());
    if (finalText.trim()) options.onFinal(finalText.trim());
  };

  rec.onerror = (ev) => {
    options.onError(ev.error || 'erro-desconhecido');
  };

  rec.onend = () => {
    options.onEnd();
  };

  return rec;
}

// Gemini Live API PCM helper utilities (16kHz input, 24kHz output)
export function float32ToPcm16Base64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const float32 = new Float32Array(len / 2);
  for (let i = 0; i < float32.length; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}
