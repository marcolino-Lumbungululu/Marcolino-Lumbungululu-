import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeminiTtsStylePrompt,
  computeAverageSampleQuality,
  evaluateVoiceSampleQuality,
  formatVoiceProfileId,
  sanitizeGeminiVoiceName,
  shouldUseCustomGeminiTts,
} from './customVoiceLogic.ts';
import { DEFAULT_CUSTOM_VOICE_PROFILE } from './seedData.ts';

test('evaluateVoiceSampleQuality rejects very short or silent clips', () => {
  const tooShort = evaluateVoiceSampleQuality(0.9, 0.5);
  assert.equal(tooShort.acceptable, false);
  assert.equal(tooShort.rating, 'baixa');

  const tooQuiet = evaluateVoiceSampleQuality(4.5, 0.01);
  assert.equal(tooQuiet.acceptable, false);
  assert.equal(tooQuiet.rating, 'baixa');
});

test('evaluateVoiceSampleQuality accepts clear speech clips', () => {
  const clear = evaluateVoiceSampleQuality(6.2, 0.45);
  assert.equal(clear.acceptable, true);
  assert.ok(clear.score >= 80);
  assert.equal(clear.rating, 'excelente');
});

test('formatVoiceProfileId produces deterministic NX-VOZ identifier', () => {
  const id1 = formatVoiceProfileId('Marcolino João', 'sample-1');
  const id2 = formatVoiceProfileId('Marcolino João', 'sample-1');
  assert.equal(id1, id2);
  assert.match(id1, /^NX-VOZ-MARCOL-[A-Z0-9]{6}$/);
});

test('sanitizeGeminiVoiceName accepts valid voices and defaults invalid ones', () => {
  assert.equal(sanitizeGeminiVoiceName('Fenrir'), 'Fenrir');
  assert.equal(sanitizeGeminiVoiceName('Unknown'), 'Kore');
});

test('buildGeminiTtsStylePrompt preserves pt-AO, timbre, rate and expressiveness', () => {
  const prompt = buildGeminiTtsStylePrompt(
    {
      ...DEFAULT_CUSTOM_VOICE_PROFILE,
      ownerDisplayName: 'Marcolino',
      expressiveness: 1.35,
      speechRate: 0.8,
      acousticStylePrompt: 'Timbre grave e sereno, dicção pausada.',
    },
    { language: 'pt-AO', assistantUserName: 'Marcolino' }
  );

  assert.match(prompt, /pt-AO/);
  assert.match(prompt, /Timbre grave e sereno/);
  assert.match(prompt, /expressiva/);
  assert.match(prompt, /pausado/);
});

test('shouldUseCustomGeminiTts enforces consent, voiceId, online status and non-silent mode', () => {
  const readyProfile = {
    ...DEFAULT_CUSTOM_VOICE_PROFILE,
    voiceId: 'NX-VOZ-TEST-123456',
    enabled: true,
    consentGranted: true,
  };

  assert.equal(
    shouldUseCustomGeminiTts({
      profile: readyProfile,
      isOnline: true,
      offlineMode: false,
      silentMode: false,
    }),
    true
  );

  assert.equal(
    shouldUseCustomGeminiTts({
      profile: readyProfile,
      isOnline: false,
      offlineMode: false,
      silentMode: false,
    }),
    false
  );

  assert.equal(
    shouldUseCustomGeminiTts({
      profile: readyProfile,
      isOnline: true,
      offlineMode: true,
      silentMode: false,
    }),
    false
  );

  assert.equal(
    shouldUseCustomGeminiTts({
      profile: { ...readyProfile, consentGranted: false },
      isOnline: true,
      offlineMode: false,
      silentMode: false,
    }),
    false
  );
});

test('computeAverageSampleQuality computes rounded average', () => {
  assert.equal(computeAverageSampleQuality([]), 0);
  assert.equal(
    computeAverageSampleQuality([
      {
        id: '1',
        label: 'Frase Curta',
        promptText: 'Olá',
        durationSeconds: 4,
        qualityScore: 85,
        mimeType: 'audio/webm',
        createdAt: '2026-11-14T00:00:00Z',
      },
      {
        id: '2',
        label: 'Pergunta',
        promptText: 'Tudo bem?',
        durationSeconds: 5,
        qualityScore: 92,
        mimeType: 'audio/webm',
        createdAt: '2026-11-14T00:00:00Z',
      },
    ]),
    89
  );
});
