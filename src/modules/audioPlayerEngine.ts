import type { MediaTrack } from '../types/nexus.ts';

export type RepeatMode = 'none' | 'one' | 'all';

interface AudioEngineCallbacks {
  onTimeUpdate: (elapsedSeconds: number) => void;
  onTrackEnded: () => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
}

export class AudioPlayerEngine {
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private synthTimer: number | null = null;
  private progressTimer: number | null = null;
  private isPlaying = false;
  private currentTrack: MediaTrack | null = null;
  private elapsedSeconds = 0;
  private volume = 0.75;
  private stepIndex = 0;
  private callbacks: AudioEngineCallbacks;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
    if (typeof window !== 'undefined') {
      this.audioEl = new Audio();
      this.audioEl.addEventListener('timeupdate', () => {
        if (this.currentTrack?.sourceType === 'local' && this.audioEl) {
          this.elapsedSeconds = Math.floor(this.audioEl.currentTime);
          this.callbacks.onTimeUpdate(this.elapsedSeconds);
        }
      });
      this.audioEl.addEventListener('ended', () => {
        if (this.currentTrack?.sourceType === 'local') {
          this.callbacks.onTrackEnded();
        }
      });
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume * 0.25;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.25, this.audioCtx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public loadAndPlay(track: MediaTrack, startAtSeconds = 0) {
    this.stopInternal();
    this.currentTrack = track;
    this.elapsedSeconds = startAtSeconds;
    this.stepIndex = 0;
    this.isPlaying = true;
    this.callbacks.onPlayStateChange(true);
    this.callbacks.onTimeUpdate(startAtSeconds);
    this.updateMediaSession(track, 'playing');

    if (track.sourceType === 'local' && track.objectUrl && this.audioEl) {
      this.audioEl.src = track.objectUrl;
      this.audioEl.volume = this.volume;
      this.audioEl.currentTime = startAtSeconds;
      void this.audioEl.play().catch(() => {
        // Fallback if autoplay policy blocks before interaction
      });
      return;
    }

    this.startSynthLoop(track);
    this.startProgressLoop(track);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.callbacks.onPlayStateChange(false);
    if (this.currentTrack?.sourceType === 'local' && this.audioEl) {
      this.audioEl.pause();
    }
    this.clearTimers();
    if (this.currentTrack) {
      this.updateMediaSession(this.currentTrack, 'paused');
    }
  }

  public resume() {
    if (!this.currentTrack || this.isPlaying) return;
    this.isPlaying = true;
    this.callbacks.onPlayStateChange(true);
    this.updateMediaSession(this.currentTrack, 'playing');

    if (this.currentTrack.sourceType === 'local' && this.audioEl) {
      void this.audioEl.play().catch(() => {});
      return;
    }

    this.startSynthLoop(this.currentTrack);
    this.startProgressLoop(this.currentTrack);
  }

  public stop() {
    this.stopInternal();
    this.elapsedSeconds = 0;
    this.callbacks.onTimeUpdate(0);
    this.callbacks.onPlayStateChange(false);
    if (this.currentTrack) {
      this.updateMediaSession(this.currentTrack, 'none');
    }
  }

  public seek(seconds: number) {
    if (!this.currentTrack) return;
    const clamped = Math.max(0, Math.min(this.currentTrack.durationSeconds, Math.floor(seconds)));
    this.elapsedSeconds = clamped;
    this.callbacks.onTimeUpdate(clamped);
    if (this.currentTrack.sourceType === 'local' && this.audioEl) {
      this.audioEl.currentTime = clamped;
    }
  }

  private stopInternal() {
    this.isPlaying = false;
    this.clearTimers();
    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  private clearTimers() {
    if (this.synthTimer !== null) {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.progressTimer !== null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private startProgressLoop(track: MediaTrack) {
    this.progressTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.elapsedSeconds += 1;
      this.callbacks.onTimeUpdate(this.elapsedSeconds);
      if (this.elapsedSeconds >= track.durationSeconds) {
        this.callbacks.onTrackEnded();
      }
    }, 1000);
  }

  private startSynthLoop(track: MediaTrack) {
    const profile = track.synthProfile ?? {
      tempoBpm: 80,
      rootFreq: 261.63,
      scale: [0, 4, 7, 11, 12],
      timbre: 'warm' as const,
    };
    const intervalMs = Math.round((60 / profile.tempoBpm) * 1000);
    const playStep = () => {
      if (!this.isPlaying) return;
      const ctx = this.ensureAudioContext();
      if (!ctx || !this.masterGain) return;

      const noteOffset = profile.scale[this.stepIndex % profile.scale.length];
      const freq = profile.rootFreq * Math.pow(2, noteOffset / 12);
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type =
        profile.timbre === 'marimba'
          ? 'triangle'
          : profile.timbre === 'piano'
          ? 'sine'
          : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const duration = profile.timbre === 'marimba' ? 0.45 : 1.1;
      env.gain.setValueAtTime(0.001, now);
      env.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(env);
      env.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);

      // Gentle bass note every 4 beats
      if (this.stepIndex % 4 === 0) {
        const bass = ctx.createOscillator();
        const bassEnv = ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(profile.rootFreq / 2, now);
        bassEnv.gain.setValueAtTime(0.001, now);
        bassEnv.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
        bassEnv.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        bass.connect(bassEnv);
        bassEnv.connect(this.masterGain);
        bass.start(now);
        bass.stop(now + 1.45);
      }

      this.stepIndex += 1;
    };

    playStep();
    this.synthTimer = window.setInterval(playStep, intervalMs);
  }

  private updateMediaSession(track: MediaTrack, state: 'playing' | 'paused' | 'none') {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.coverUrl
          ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
      navigator.mediaSession.playbackState = state;
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.callbacks.onNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.callbacks.onPrev());
    } catch {
      // Ignore unsupported mediaSession actions
    }
  }

  public dispose() {
    this.stopInternal();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
  }
}
