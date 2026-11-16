import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Mic,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  WifiOff,
} from 'lucide-react';
import type {
  CustomVoiceProfile,
  GeminiPrebuiltVoice,
  UserSettings,
  VoiceSampleRecord,
} from '../types/nexus.ts';
import { VOICE_TEST_SUITE } from '../modules/seedData.ts';
import {
  computeAverageSampleQuality,
  evaluateVoiceSampleQuality,
} from '../modules/customVoiceLogic.ts';

interface CustomVoiceStudioProps {
  profile: CustomVoiceProfile;
  settings: UserSettings;
  availableVoices: SpeechSynthesisVoice[];
  isOnline: boolean;
  isSpeaking: boolean;
  engineNotice: string | null;
  onUpdateProfile: (patch: Partial<CustomVoiceProfile>) => void;
  onDeleteProfile: () => void;
  onTestSpeak: (text: string, profileOverride?: CustomVoiceProfile) => void;
  onStopSpeaking: () => void;
}

const GEMINI_VOICE_OPTIONS: Array<{
  id: GeminiPrebuiltVoice;
  label: string;
  hint: string;
}> = [
  { id: 'Kore', label: 'Kore', hint: 'Firme, clara e natural' },
  { id: 'Zephyr', label: 'Zephyr', hint: 'Suave, calorosa e próxima' },
  { id: 'Puck', label: 'Puck', hint: 'Expressiva e dinâmica' },
  { id: 'Charon', label: 'Charon', hint: 'Grave, serena e pausada' },
  { id: 'Fenrir', label: 'Fenrir', hint: 'Profunda e articulada' },
];

export const CustomVoiceStudio: React.FC<CustomVoiceStudioProps> = ({
  profile,
  settings,
  availableVoices,
  isOnline,
  isSpeaking,
  engineNotice,
  onUpdateProfile,
  onDeleteProfile,
  onTestSpeak,
  onStopSpeaking,
}) => {
  const [selectedPromptId, setSelectedPromptId] = useState(VOICE_TEST_SUITE[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState<string | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [customTestPhrase, setCustomTestPhrase] = useState(
    'Olá! Sou o NEXUS AI a falar contigo em português de Angola.'
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const peakLevelRef = useRef(0);
  const startTimeRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const activePrompt =
    VOICE_TEST_SUITE.find((p) => p.id === selectedPromptId) ?? VOICE_TEST_SUITE[0];

  const stopRecordingCleanup = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicLevel(0);
  };

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      sampleAudioRef.current?.pause();
    };
  }, []);

  const handleStartRecording = async (replaceSampleId?: string) => {
    setRecorderError(null);
    setCalibrationMessage(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setRecorderError(
        'Gravação direta pelo microfone indisponível neste navegador. Autoriza o microfone ou usa um navegador compatível.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      peakLevelRef.current = 0;
      startTimeRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);

      // Web Audio live meter
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let maxDev = 0;
          for (let i = 0; i < data.length; i++) {
            const dev = Math.abs(data[i] - 128) / 128;
            if (dev > maxDev) maxDev = dev;
          }
          if (maxDev > peakLevelRef.current) peakLevelRef.current = maxDev;
          setMicLevel(Math.min(100, Math.round(maxDev * 180)));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        peakLevelRef.current = 0.35;
      }

      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingSeconds(elapsed);
        if (elapsed >= 16) {
          recorder.stop();
        }
      }, 200);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const durationSeconds = Math.max(0.5, (Date.now() - startTimeRef.current) / 1000);
        const finalMime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const evalRes = evaluateVoiceSampleQuality(
          durationSeconds,
          Math.max(peakLevelRef.current, 0.2)
        );
        stopRecordingCleanup();
        setIsRecording(false);

        const reader = new FileReader();
        reader.onloadend = () => {
          const audioDataUrl = typeof reader.result === 'string' ? reader.result : undefined;
          const newSample: VoiceSampleRecord = {
            id: replaceSampleId || `sample-${Date.now()}`,
            label: activePrompt.label,
            promptText: activePrompt.samplePrompt,
            durationSeconds: Number(durationSeconds.toFixed(1)),
            qualityScore: evalRes.score,
            audioDataUrl,
            mimeType: finalMime,
            createdAt: new Date().toISOString(),
          };

          const nextSamples = replaceSampleId
            ? profile.samples.map((s) => (s.id === replaceSampleId ? newSample : s))
            : [newSample, ...profile.samples.slice(0, 5)];

          onUpdateProfile({
            samples: nextSamples,
            calibrationStatus:
              profile.voiceId && profile.calibrationStatus === 'calibrada'
                ? 'calibrada'
                : 'gravada',
          });
          setCalibrationMessage(evalRes.feedback);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
    } catch {
      stopRecordingCleanup();
      setIsRecording(false);
      setRecorderError(
        'Não foi possível aceder ao microfone. Verifica as permissões do navegador ou do dispositivo.'
      );
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      stopRecordingCleanup();
      setIsRecording(false);
    }
  };

  const handlePlaySample = (sample: VoiceSampleRecord) => {
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }
    if (playingSampleId === sample.id) {
      setPlayingSampleId(null);
      return;
    }
    if (!sample.audioDataUrl) {
      setRecorderError(
        'Esta amostra já foi sincronizada apenas com os seus metadados. Grava uma nova amostra se desejares ouvir o áudio bruto.'
      );
      return;
    }
    const audio = new Audio(sample.audioDataUrl);
    sampleAudioRef.current = audio;
    setPlayingSampleId(sample.id);
    audio.onended = () => setPlayingSampleId(null);
    audio.onerror = () => setPlayingSampleId(null);
    void audio.play().catch(() => setPlayingSampleId(null));
  };

  const handleRemoveSample = (sampleId: string) => {
    const nextSamples = profile.samples.filter((s) => s.id !== sampleId);
    onUpdateProfile({
      samples: nextSamples,
      calibrationStatus:
        nextSamples.length === 0 && !profile.voiceId ? 'nao_configurada' : profile.calibrationStatus,
    });
  };

  const handleCalibrateAndSave = async () => {
    if (!profile.consentGranted) {
      setRecorderError(
        'Confirma primeiro o consentimento explícito para utilizar exclusivamente a tua própria voz.'
      );
      return;
    }

    setRecorderError(null);
    setIsCalibrating(true);
    setCalibrationMessage('A calibrar perfil vocal e gerar identificador personalizado...');

    const bestSample =
      [...profile.samples]
        .filter((s) => Boolean(s.audioDataUrl))
        .sort((a, b) => b.qualityScore - a.qualityScore)[0] ?? null;

    try {
      const res = await fetch('/api/ai/voice-profile/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerDisplayName: profile.ownerDisplayName || settings.assistantUserName,
          language: settings.language,
          consentGranted: profile.consentGranted,
          audioBase64: bestSample?.audioDataUrl ?? '',
          mimeType: bestSample?.mimeType ?? 'audio/webm',
          preferredVoiceName: profile.geminiVoiceName,
          sampleCount: profile.samples.length,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao calibrar voz personalizada.');
      }

      const updated: Partial<CustomVoiceProfile> = {
        voiceId: data.voiceId,
        geminiVoiceName: data.geminiVoiceName || profile.geminiVoiceName,
        acousticStylePrompt: data.acousticStylePrompt || profile.acousticStylePrompt,
        calibrationStatus: 'calibrada',
        enabled: true,
      };
      onUpdateProfile(updated);
      setCalibrationMessage(
        `${data.analysisSummary} ${data.cloningNote ? `(${data.cloningNote})` : ''}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao calibrar voz.';
      setRecorderError(msg);
    } finally {
      setIsCalibrating(false);
    }
  };

  const avgQuality = computeAverageSampleQuality(profile.samples);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: A. Gravação da Voz + Consentimento */}
      <section
        aria-label="Criar a minha voz — Gravação e Consentimento"
        className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500 shrink-0" />
              <span>Criar a Minha Voz</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grava amostras da tua voz em português para calibrar timbre, ritmo, entoação e pronúncia angolana com Gemini TTS.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-left sm:text-right">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Identificação da Voz
            </p>
            <p className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
              {profile.voiceId || 'Por gerar'}
            </p>
          </div>
        </div>

        {/* Owner Name + Sample Prompt Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="custom-voice-owner"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Proprietário autorizado da voz
            </label>
            <input
              id="custom-voice-owner"
              type="text"
              value={profile.ownerDisplayName}
              onChange={(e) => onUpdateProfile({ ownerDisplayName: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="custom-voice-prompt-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Categoria de amostra (pt-AO)
            </label>
            <select
              id="custom-voice-prompt-select"
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            >
              {VOICE_TEST_SUITE.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reading Prompt Box & Recorder */}
        <div className="rounded-xl border border-blue-500/25 bg-blue-50/70 dark:bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Lê em voz natural ({activePrompt.label}):
            </span>
            {isRecording && (
              <span className="text-xs font-mono tabular-nums text-rose-500 font-semibold">
                ● A gravar {recordingSeconds.toFixed(1)}s / 16s
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100 font-medium">
            “{activePrompt.samplePrompt}”
          </p>

          {/* Audio Level Meter */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  micLevel > 75 ? 'bg-violet-500' : 'bg-blue-500'
                }`}
                style={{ width: `${isRecording ? Math.max(6, micLevel) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {!isRecording ? (
              <button
                type="button"
                onClick={() => void handleStartRecording()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Gravar Amostra</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Parar Gravação</span>
              </button>
            )}

            <span className="text-xs text-slate-500 dark:text-slate-400">
              {profile.samples.length} amostra(s) gravada(s)
              {profile.samples.length > 0 ? ` · Qualidade média: ${avgQuality}%` : ''}
            </span>
          </div>
        </div>

        {/* Recorded Samples List */}
        {profile.samples.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Amostras Gravadas & Verificação de Qualidade
            </h3>
            <ul className="space-y-2">
              {profile.samples.map((sample) => (
                <li
                  key={sample.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {sample.label} · {sample.durationSeconds}s
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Qualidade de áudio: <strong className="text-emerald-500">{sample.qualityScore}%</strong>
                      {sample.audioDataUrl ? ' · Áudio pronto para reprodução' : ' · Metadados sincronizados'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlaySample(sample)}
                      disabled={!sample.audioDataUrl}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>{playingSampleId === sample.id ? 'Parar' : 'Ouvir'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStartRecording(sample.id)}
                      disabled={isRecording}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Regravar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSample(sample.id)}
                      aria-label={`Eliminar amostra ${sample.label}`}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Consent + Save/Calibrate */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="custom-voice-consent"
              type="checkbox"
              checked={profile.consentGranted}
              onChange={(e) =>
                onUpdateProfile({
                  consentGranted: e.target.checked,
                  consentAcceptedAt: e.target.checked ? new Date().toISOString() : null,
                })
              }
              className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Consentimento do Proprietário:</strong> Confirmo que esta voz é exclusivamente minha (ou expressamente autorizada por mim) e autorizo o NEXUS AI a utilizá-la para síntese das minhas respostas.
            </span>
          </label>

          {profile.consentAcceptedAt && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Consentimento registado em{' '}
                {new Date(profile.consentAcceptedAt).toLocaleString('pt-PT')}
              </span>
            </p>
          )}

          {recorderError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
              {recorderError}
            </p>
          )}

          {calibrationMessage && (
            <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2">
              {calibrationMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCalibrateAndSave()}
              disabled={isCalibrating || !profile.consentGranted}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isCalibrating
                  ? 'A calibrar com Gemini...'
                  : profile.voiceId
                  ? 'Atualizar e Guardar Voz Personalizada'
                  : 'Gerar e Guardar Voz Personalizada'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateProfile({
                  enabled: !profile.enabled,
                })
              }
              disabled={!profile.voiceId || !profile.consentGranted}
              aria-pressed={profile.enabled}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer ${
                profile.enabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {profile.enabled ? 'Voz Personalizada Ativa' : 'Ativar Voz Personalizada'}
            </button>
          </div>
        </div>
      </section>

      {/* Right Column: B/C/D/E/F Motor Gemini TTS, Testes pt-AO, Fallback Offline e Segurança */}
      <section
        aria-label="Configurações do Motor de Voz Personalizada"
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Motor Gemini TTS & Pronúncia (pt-AO)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ajusta expressividade, velocidade, perfil acústico, voz alternativa offline e testa frases reais.
          </p>
        </div>

        {/* Acoustic Style + Gemini Base Voice + Offline Fallback Voice */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="custom-voice-gemini-base"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Perfil base Gemini TTS
            </label>
            <select
              id="custom-voice-gemini-base"
              value={profile.geminiVoiceName}
              onChange={(e) =>
                onUpdateProfile({ geminiVoiceName: e.target.value as GeminiPrebuiltVoice })
              }
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            >
              {GEMINI_VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — {v.hint}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="custom-voice-style-prompt"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Descrição vocal (timbre, entoação e ritmo)
            </label>
            <textarea
              id="custom-voice-style-prompt"
              rows={2}
              value={profile.acousticStylePrompt}
              onChange={(e) => onUpdateProfile({ acousticStylePrompt: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="custom-voice-fallback-uri"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Voz alternativa local (quando sem Internet)
            </label>
            <select
              id="custom-voice-fallback-uri"
              value={profile.fallbackVoiceUri ?? ''}
              onChange={(e) =>
                onUpdateProfile({ fallbackVoiceUri: e.target.value || null })
              }
              className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Voz local padrão ({settings.language})</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders: Speed & Expressiveness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label
                htmlFor="custom-voice-speed"
                className="font-medium text-slate-700 dark:text-slate-300"
              >
                Velocidade
              </label>
              <span className="font-mono tabular-nums text-slate-500">
                {profile.speechRate.toFixed(1)}x
              </span>
            </div>
            <input
              id="custom-voice-speed"
              type="range"
              min={0.7}
              max={1.4}
              step={0.1}
              value={profile.speechRate}
              onChange={(e) => onUpdateProfile({ speechRate: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label
                htmlFor="custom-voice-expressiveness"
                className="font-medium text-slate-700 dark:text-slate-300"
              >
                Expressividade
              </label>
              <span className="font-mono tabular-nums text-slate-500">
                {Math.round(profile.expressiveness * 100)}%
              </span>
            </div>
            <input
              id="custom-voice-expressiveness"
              type="range"
              min={0.3}
              max={1.5}
              step={0.1}
              value={profile.expressiveness}
              onChange={(e) => onUpdateProfile({ expressiveness: Number(e.target.value) })}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>
        </div>

        {/* C. Portuguese & Pronunciation Test Suite */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Testar Qualidade & Pronúncia (pt-AO)
            </h4>
            {!isOnline || settings.offlineMode ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">
                <WifiOff className="w-3 h-3" />
                <span>Offline (voz local)</span>
              </span>
            ) : (
              <span className="text-[11px] text-emerald-500 font-medium">
                Online (Gemini TTS)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {VOICE_TEST_SUITE.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTestSpeak(item.testPhrase)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <label htmlFor="custom-voice-test-input" className="sr-only">
              Frase personalizada para testar a voz
            </label>
            <input
              id="custom-voice-test-input"
              type="text"
              value={customTestPhrase}
              onChange={(e) => setCustomTestPhrase(e.target.value)}
              placeholder="Escreve uma frase para testar a pronúncia..."
              className="flex-1 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
            {isSpeaking ? (
              <button
                type="button"
                onClick={onStopSpeaking}
                className="px-3.5 h-9 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                Parar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTestSpeak(customTestPhrase)}
                className="px-3.5 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Testar Voz
              </button>
            )}
          </div>

          {engineNotice && (
            <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
              {engineNotice}
            </p>
          )}
        </div>

        {/* F. Security, Transparency & Delete */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-900 dark:text-white">
                Indicação transparente de voz por IA
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Assinala quando o áudio é sintetizado pelo Gemini TTS.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateProfile({ aiDisclosureEnabled: !profile.aiDisclosureEnabled })
              }
              aria-pressed={profile.aiDisclosureEnabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                profile.aiDisclosureEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {profile.aiDisclosureEnabled ? 'Ativa' : 'Oculta'}
            </button>
          </div>

          <div className="rounded-xl border border-amber-500/25 bg-amber-50/60 dark:bg-amber-950/20 p-3 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Uso exclusivo da voz autorizada do proprietário. Se a clonagem direta de timbre não estiver disponível na tua conta/região ou sem Internet, o sistema utiliza o perfil Voice Design do Gemini ou a voz local configurada.
            </p>
          </div>

          {!confirmDeleteOpen ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="w-full h-10 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Configuração de Voz Personalizada</span>
            </button>
          ) : (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-2">
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                Confirmas a eliminação do identificador vocal, amostras e consentimento?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProfile();
                    setConfirmDeleteOpen(false);
                    setCalibrationMessage('Configuração de voz personalizada eliminada.');
                  }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white cursor-pointer"
                >
                  Confirmar Eliminação
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
