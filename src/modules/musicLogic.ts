import type { MediaTrack } from '../types/nexus.ts';
import { normalizePortuguese } from './commandParser.ts';

export function computeTrackSignature(track: Pick<MediaTrack, 'title' | 'artist' | 'durationSeconds'>): string {
  const titleNorm = normalizePortuguese(track.title);
  const artistNorm = normalizePortuguese(track.artist);
  return `${titleNorm}::${artistNorm}::${Math.round(track.durationSeconds / 5) * 5}`;
}

export function findDuplicateTrackGroups(tracks: MediaTrack[]): Array<{
  signature: string;
  tracks: MediaTrack[];
}> {
  const groups = new Map<string, MediaTrack[]>();
  for (const track of tracks) {
    const sig = track.fileHash || computeTrackSignature(track);
    const list = groups.get(sig) ?? [];
    list.push(track);
    groups.set(sig, list);
  }
  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([signature, group]) => ({ signature, tracks: group }));
}

export function filterAndSortTracks(
  tracks: MediaTrack[],
  options: {
    query?: string;
    category?: string;
    sortBy?: 'number' | 'recent' | 'title';
  }
): MediaTrack[] {
  const q = normalizePortuguese(options.query ?? '');
  const cat = options.category && options.category !== 'Todas' ? options.category : null;

  const filtered = tracks.filter((t) => {
    if (cat && t.category !== cat) return false;
    if (!q) return true;
    return (
      normalizePortuguese(t.title).includes(q) ||
      normalizePortuguese(t.artist).includes(q) ||
      normalizePortuguese(t.album).includes(q) ||
      normalizePortuguese(t.category).includes(q)
    );
  });

  if (options.sortBy === 'recent') {
    return [...filtered].sort((a, b) => {
      const timeA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
      const timeB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
      return timeB - timeA || b.trackNumber - a.trackNumber;
    });
  }

  if (options.sortBy === 'title') {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  }

  return [...filtered].sort((a, b) => a.trackNumber - b.trackNumber);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
