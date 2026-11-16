import React from 'react';
import { Pause, Play, SkipForward, Volume2 } from 'lucide-react';
import type { MediaTrack } from '../types/nexus.ts';
import { formatDuration } from '../modules/musicLogic.ts';
import { useGestureNavigation } from '../hooks/useGestureNavigation.ts';

interface PersistentMiniPlayerProps {
  track: MediaTrack;
  isPlaying: boolean;
  elapsedSeconds: number;
  gesturesEnabled?: boolean;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onOpenMusic: () => void;
}

export const PersistentMiniPlayer: React.FC<PersistentMiniPlayerProps> = ({
  track,
  isPlaying,
  elapsedSeconds,
  gesturesEnabled = true,
  onTogglePlayPause,
  onNext,
  onOpenMusic,
}) => {
  const swipeHandlers = useGestureNavigation({
    enabled: gesturesEnabled,
    allowHorizontal: false,
    allowVertical: true,
    onGesture: (g) => {
      if (g === 'swipe_up') onOpenMusic();
    },
  });

  return (
    <aside
      aria-label="Reprodução em segundo plano"
      {...swipeHandlers}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm"
    >
      <button
        type="button"
        onClick={onOpenMusic}
        className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
      >
        <img
          src={track.coverUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {track.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
            {track.artist} · {formatDuration(elapsedSeconds)} / {formatDuration(track.durationSeconds)}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mr-2">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Em segundo plano</span>
        </span>
        <button
          type="button"
          onClick={onTogglePlayPause}
          aria-label={isPlaying ? 'Pausar música em segundo plano' : 'Continuar música'}
          className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Próxima música"
          className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
