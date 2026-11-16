import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ListMusic,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import type { MediaTrack, Playlist } from '../types/nexus.ts';
import type { RepeatMode } from '../modules/audioPlayerEngine.ts';
import {
  filterAndSortTracks,
  findDuplicateTrackGroups,
  formatDuration,
} from '../modules/musicLogic.ts';

interface MusicCenterProps {
  tracks: MediaTrack[];
  playlists: Playlist[];
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  elapsedSeconds: number;
  volume: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  onPlayTrack: (track: MediaTrack) => void;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onCreatePlaylist: (name: string, category: string, trackIds: string[]) => void;
  onDeleteTrack: (trackId: string) => void;
  onImportAudioFiles: (files: FileList) => void;
}

const CATEGORIES = ['Todas', 'Música Cristã', 'Semba & Kizomba', 'Instrumental', 'Estudo'];

export const MusicCenter: React.FC<MusicCenterProps> = ({
  tracks,
  playlists,
  currentTrack,
  isPlaying,
  elapsedSeconds,
  volume,
  shuffle,
  repeatMode,
  onPlayTrack,
  onTogglePlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onCycleRepeat,
  onCreatePlaylist,
  onDeleteTrack,
  onImportAudioFiles,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'number' | 'recent' | 'title'>('number');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const duplicateGroups = useMemo(() => findDuplicateTrackGroups(tracks), [tracks]);

  const displayedTracks = useMemo(() => {
    let base = tracks;
    if (selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId);
      if (pl) {
        base = tracks.filter((t) => pl.trackIds.includes(t.id));
      }
    }
    return filterAndSortTracks(base, {
      query: searchQuery,
      category: selectedCategory,
      sortBy,
    });
  }, [tracks, playlists, selectedPlaylistId, searchQuery, selectedCategory, sortBy]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    const ids = displayedTracks.slice(0, 5).map((t) => t.id);
    onCreatePlaylist(name, selectedCategory === 'Todas' ? 'Personalizada' : selectedCategory, ids);
    setNewPlaylistName('');
    setShowNewPlaylist(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Active Media3-style Player */}
      <section
        aria-label="Leitor Multimédia"
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6"
      >
        <div className="aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-lg">
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={`Capa do álbum ${currentTrack.album}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <ListMusic className="w-12 h-12 mb-2 opacity-60" />
              <span className="text-sm">Seleciona uma música</span>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate">
            {currentTrack ? currentTrack.title : 'Nenhuma música em reprodução'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
            {currentTrack
              ? `${currentTrack.artist} · ${currentTrack.album}`
              : 'Escolhe uma faixa na biblioteca ou pede por voz'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <label htmlFor="music-seek-slider" className="sr-only">
            Progresso da música
          </label>
          <input
            id="music-seek-slider"
            type="range"
            min={0}
            max={currentTrack?.durationSeconds ?? 100}
            value={Math.min(elapsedSeconds, currentTrack?.durationSeconds ?? 100)}
            disabled={!currentTrack}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-1">
            <span>{formatDuration(elapsedSeconds)}</span>
            <span>{formatDuration(currentTrack?.durationSeconds ?? 0)}</span>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-pressed={shuffle}
            aria-label="Alternar reprodução aleatória"
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              shuffle
                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Música anterior"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'}
            className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Próxima música"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={`Modo de repetição: ${repeatMode}`}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              repeatMode !== 'none'
                ? 'bg-violet-600/15 text-violet-600 dark:text-violet-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
          <label htmlFor="music-volume-slider" className="sr-only">
            Volume da música
          </label>
          <input
            id="music-volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 w-10 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </section>

      {/* Right Column: Library, Playlists & Duplicate Manager */}
      <section
        aria-label="Biblioteca de Música e Listas"
        className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Gestor Inteligente de Músicas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {tracks.length} faixas indexadas · {playlists.length} listas ·{' '}
              {duplicateGroups.length} duplicado(s) detetado(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onImportAudioFiles(e.target.files);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Áudio Local</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewPlaylist((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Lista</span>
            </button>
          </div>
        </div>

        {/* Create Playlist Inline Form */}
        {showNewPlaylist && (
          <form
            onSubmit={handleCreatePlaylist}
            className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-wrap items-center gap-2"
          >
            <label htmlFor="new-playlist-name" className="sr-only">
              Nome da lista de reprodução
            </label>
            <input
              id="new-playlist-name"
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Nome da nova lista (ex.: Culto Matinal)"
              className="flex-1 min-w-[200px] h-10 px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Criar Lista
            </button>
          </form>
        )}

        {/* Duplicate Track Detector Notice */}
        {duplicateGroups.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Detetada música repetida: {duplicateGroups[0].tracks[1].title}
                </p>
                <p className="opacity-85">
                  Corresponde a "{duplicateGroups[0].tracks[0].title}" ({duplicateGroups[0].tracks[0].artist}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDeleteTrack(duplicateGroups[0].tracks[1].id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Remover Duplicado
            </button>
          </div>
        )}

        {/* Search + Sort Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <label htmlFor="music-search-input" className="sr-only">
              Pesquisar músicas por nome, artista ou álbum
            </label>
            <input
              id="music-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar música, artista ou álbum..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <label htmlFor="music-sort-select" className="sr-only">
            Ordenar músicas
          </label>
          <select
            id="music-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'number' | 'recent' | 'title')}
            className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="number">Ordem Numérica</option>
            <option value="recent">Mais Recentes</option>
            <option value="title">Alfabética (A–Z)</option>
          </select>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedPlaylistId(null);
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !selectedPlaylistId && selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Playlists Quick Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Listas:</span>
          {playlists.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() =>
                setSelectedPlaylistId((prev) => (prev === pl.id ? null : pl.id))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedPlaylistId === pl.id
                  ? 'border-violet-500 bg-violet-600/15 text-violet-600 dark:text-violet-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {pl.name} ({pl.trackIds.length})
            </button>
          ))}
        </div>

        {/* Track List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
          {displayedTracks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhuma música encontrada para este filtro.
            </p>
          ) : (
            displayedTracks.map((track) => {
              const active = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  className={`py-3 px-2 flex items-center justify-between gap-3 rounded-xl transition-colors ${
                    active ? 'bg-blue-600/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPlayTrack(track)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <span className="w-7 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      #{track.trackNumber}
                    </span>
                    <img
                      src={track.coverUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium truncate ${
                          active
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {track.artist} · {track.category}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {formatDuration(track.durationSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTrack(track.id)}
                      aria-label={`Remover ${track.title}`}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
