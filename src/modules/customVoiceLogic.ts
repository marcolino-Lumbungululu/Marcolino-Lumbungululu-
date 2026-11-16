import type {
  CustomVoiceProfile,
  GeminiPrebuiltVoice,
  UserSettings,
  VoiceSampleRecord,
} from '../types/nexus.ts';

export interface SampleQualityEvaluation {
  score: number;
  rating: 'excelente' | 'boa' | 'baixa';
  acceptable: boolean;
  feedback: string;
}

export function evaluateVoiceSampleQuality(
  durationSeconds: number,
  peakLevel: number
): SampleQualityEvaluation {
  const safeDuration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  const safePeak = Number.isFinite(peakLevel) ? Math.max(0, Math.min(1, peakLevel)) : 0;

  if (safeDuration < 1.8) {
    return {
      score: Math.min(45, Math.round(safeDuration * 20)),
      rating: 'baixa',
      acceptable: false,
      feedback: 'Gravação demasiado curta. Fala durante pelo menos 3 segundos com clareza.',
    };
  }

  if (safePeak < 0.04) {
    return {
      score: 38,
      rating: 'baixa',
      acceptable: false,
      feedback: 'Sinal de microfone muito baixo. Aproxima-te do microfone e grava novamente.',
    };
  }

  if (safePeak > 0.98) {
    return {
      score: 68,
      rating: 'boa',
      acceptable: true,
      feedback: 'Áudio captado com ligeira saturação. Se notares distorção ao reproduzir, regrava mais afastado.',
    };
  }

  const durationScore = Math.min(50, Math.round((Math.min(safeDuration, 8) / 8) * 50));
  const levelScore = safePeak >= 0.18 && safePeak <= 0.88 ? 50 : 38;
  const score = Math.max(55, Math.min(100, durationScore + levelScore));

  if (score >= 82) {
    return {
      score,
      rating: 'excelente',
      acceptable: true,
      feedback: 'Qualidade excelente: timbre nítido, bom volume e duração adequada para calibração.',
    };
  }

  return {
    score,
    rating: 'boa',
    acceptable: true,
    feedback: 'Qualidade boa para calibração. Podes gravar mais amostras para maior precisão.',
  };
}

export function formatVoiceProfileId(ownerDisplayName: string, seed = ''): string {
  const slug = ownerDisplayName
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'OWNER';

  const source = `${slug}:${seed}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `NX-VOZ-${slug}-${suffix}`;
}

export function sanitizeGeminiVoiceName(name: string | undefined | null): GeminiPrebuiltVoice {
  const allowed: GeminiPrebuiltVoice[] = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];
  if (name && allowed.includes(name as GeminiPrebuiltVoice)) {
    return name as GeminiPrebuiltVoice;
  }
  return 'Kore';
}

export function describeSpeechRate(rate: number): string {
  if (rate <= 0.85) return 'ritmo pausado e articulado';
  if (rate >= 1.2) return 'ritmo ágil e dinâmico';
  return 'ritmo natural e equilibrado';
}

export function describeExpressiveness(expressiveness: number): string {
  if (expressiveness <= 0.65) return 'entoação serena, neutra e objetiva';
  if (expressiveness >= 1.25) return 'entoação expressiva, calorosa e envolvente';
  return 'entoação natural, humana e próxima';
}

export function buildGeminiTtsStylePrompt(
  profile: CustomVoiceProfile,
  settings: Pick<UserSettings, 'language' | 'assistantUserName'>
): string {
  const langLabel =
    settings.language === 'pt-AO'
      ? 'Portuguese (Angola, pt-AO)'
      : settings.language === 'pt-PT'
      ? 'Portuguese (Portugal, pt-PT)'
      : 'Portuguese (Brazil, pt-BR)';

  const rateDesc = describeSpeechRate(profile.speechRate);
  const exprDesc = describeExpressiveness(profile.expressiveness);
  const baseProfile = profile.acousticStylePrompt?.trim()
    ? profile.acousticStylePrompt.trim()
    : 'Natural human voice timbre, clear diction and warm conversational cadence.';

  return [
    `Speak in ${langLabel}, preserving natural Angolan Portuguese pronunciation of proper names and rhythm.`,
    `Vocal persona (${profile.ownerDisplayName || settings.assistantUserName}): ${baseProfile}`,
    `Delivery: ${exprDesc}, ${rateDesc}.`,
  ].join(' ');
}

export function shouldUseCustomGeminiTts(params: {
  profile: CustomVoiceProfile;
  isOnline: boolean;
  offlineMode: boolean;
  silentMode: boolean;
}): boolean {
  const { profile, isOnline, offlineMode, silentMode } = params;
  if (silentMode) return false;
  if (!isOnline || offlineMode) return false;
  if (!profile.enabled || !profile.consentGranted) return false;
  return Boolean(profile.voiceId);
}

export function computeAverageSampleQuality(samples: VoiceSampleRecord[]): number {
  if (samples.length === 0) return 0;
  const total = samples.reduce((acc, s) => acc + s.qualityScore, 0);
  return Math.round(total / samples.length);
}
