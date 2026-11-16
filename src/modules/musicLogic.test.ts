import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAndSortTracks,
  findDuplicateTrackGroups,
  formatDuration,
} from './musicLogic.ts';
import type { MediaTrack } from '../types/nexus.ts';

const sampleTracks: MediaTrack[] = [
  {
    id: 't1',
    trackNumber: 1,
    title: 'Luz da Manhã',
    artist: 'Coral Esperança Luanda',
    album: 'Adoração Viva',
    category: 'Música Cristã',
    durationSeconds: 215,
    coverUrl: '/a.jpg',
    sourceType: 'synth',
    fileHash: 'hash-luz-coral',
    playCount: 3,
  },
  {
    id: 't2',
    trackNumber: 2,
    title: 'Luz da Manhã (Cópia)',
    artist: 'Coral Esperança Luanda',
    album: 'Adoração Viva',
    category: 'Música Cristã',
    durationSeconds: 215,
    coverUrl: '/a.jpg',
    sourceType: 'synth',
    fileHash: 'hash-luz-coral',
    playCount: 0,
  },
  {
    id: 't3',
    trackNumber: 3,
    title: 'Brisa do Mussulo',
    artist: 'Paulo Flores',
    album: 'Semba Clássico',
    category: 'Semba & Kizomba',
    durationSeconds: 248,
    coverUrl: '/b.jpg',
    sourceType: 'synth',
    fileHash: 'hash-mussulo',
    playCount: 5,
  },
];

test('detects duplicate tracks by fileHash', () => {
  const groups = findDuplicateTrackGroups(sampleTracks);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].tracks.length, 2);
});

test('filters tracks by category and search query', () => {
  const semba = filterAndSortTracks(sampleTracks, { category: 'Semba & Kizomba' });
  assert.equal(semba.length, 1);
  assert.equal(semba[0].id, 't3');

  const query = filterAndSortTracks(sampleTracks, { query: 'Mussulo' });
  assert.equal(query.length, 1);
  assert.equal(query[0].artist, 'Paulo Flores');
});

test('formats seconds to mm:ss', () => {
  assert.equal(formatDuration(215), '3:35');
  assert.equal(formatDuration(5), '0:05');
});
