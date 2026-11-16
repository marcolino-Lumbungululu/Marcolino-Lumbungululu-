import { useEffect, useState } from 'react';
import type { VisualAssistantState } from '../modules/nexusVisualState.ts';

/**
 * Provides reactive audio amplitude [0..1] for the futuristic holographic soundwave.
 * - During listening (`a_ouvir`), reads live microphone energy via Web Audio AnalyserNode
 *   (falling back cleanly to smooth speech cadence if mic stream is blocked or headless).
 * - During speaking/processing, drives natural rhythmic vocal cadence.
 */
export function useVoiceAmplitude(visualState: VisualAssistantState): {
  amplitude: number;
  tick: number;
} {
  const [amplitude, setAmplitude] = useState(0.15);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAmplitude(visualState === 'disponivel' ? 0.12 : 0.65);
      return;
    }

    let rafId = 0;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let freqData: Uint8Array<ArrayBuffer> | null = null;

    const initMicAnalyser = async () => {
      if (
        visualState !== 'a_ouvir' ||
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof AudioContext === 'undefined'
      ) {
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      } catch {
        // Headless or mic permission prompt fallback: smooth synthetic cadence continues
      }
    };

    void initMicAnalyser();

    let frame = 0;
    let lastUpdate = 0;
    const minIntervalMs = visualState === 'disponivel' ? 600 : 80;
    const loop = (now: number) => {
      if (cancelled) return;
      if (now - lastUpdate >= minIntervalMs) {
        lastUpdate = now;
        frame += 1;
        setTick(frame);

        if (visualState === 'a_ouvir' && analyser && freqData) {
          analyser.getByteFrequencyData(freqData);
          let sum = 0;
          for (let i = 0; i < freqData.length; i++) {
            sum += freqData[i];
          }
          const normalized = sum / (freqData.length * 165);
          setAmplitude(Math.max(0.28, Math.min(1, normalized)));
        } else if (visualState === 'a_ouvir') {
          setAmplitude(0.56 + 0.34 * Math.sin(frame * 0.42));
        } else if (visualState === 'a_responder') {
          setAmplitude(
            0.52 + 0.36 * Math.abs(Math.sin(frame * 0.45) * Math.cos(frame * 0.23))
          );
        } else if (visualState === 'a_processar') {
          setAmplitude(0.45 + 0.25 * Math.sin(frame * 0.32));
        } else if (visualState === 'a_executar') {
          setAmplitude(0.7);
        } else {
          setAmplitude(0.14);
        }
      }
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    };
  }, [visualState]);

  return { amplitude, tick };
}
