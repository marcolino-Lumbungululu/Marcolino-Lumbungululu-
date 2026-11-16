import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOTTOM_CIRCULAR_CONTROLS,
  LEFT_HOLOGRAPHIC_NODES,
  RIGHT_HOLOGRAPHIC_NODES,
  computeWaveformHeights,
  deriveVisualAssistantState,
  resolveVoiceOutputMode,
} from './nexusVisualState.ts';

const activeCustomVoice = {
  enabled: true,
  consentGranted: true,
  voiceId: 'NX-VOZ-001',
};

const disabledCustomVoice = {
  enabled: false,
  consentGranted: false,
  voiceId: null,
};

test('deriveVisualAssistantState maps all 5 required futuristic states and Portuguese labels', () => {
  const s1 = deriveVisualAssistantState({
    status: 'disponivel',
    isListening: false,
    isSpeaking: false,
    isLiveActive: false,
    settings: { silentMode: false, offlineMode: false },
    customVoiceProfile: activeCustomVoice,
  });
  assert.equal(s1.state, 'disponivel');
  assert.equal(s1.label, 'NEXUS AI DISPONÍVEL');
  assert.equal(s1.isCustomVoiceActive, true);

  const s2 = deriveVisualAssistantState({
    status: 'a_ouvir',
    isListening: true,
    isSpeaking: false,
    isLiveActive: false,
    settings: { silentMode: false, offlineMode: false },
    customVoiceProfile: activeCustomVoice,
  });
  assert.equal(s2.state, 'a_ouvir');
  assert.equal(s2.label, 'ESTOU A OUVIR');
  assert.equal(s2.isWaveActive, true);

  const s3 = deriveVisualAssistantState({
    status: 'a_processar',
    isListening: false,
    isSpeaking: false,
    isLiveActive: false,
    settings: { silentMode: false, offlineMode: false },
    customVoiceProfile: activeCustomVoice,
  });
  assert.equal(s3.state, 'a_processar');
  assert.equal(s3.label, 'A PROCESSAR O COMANDO');

  const s4 = deriveVisualAssistantState({
    status: 'disponivel',
    isListening: false,
    isSpeaking: true,
    isLiveActive: false,
    settings: { silentMode: false, offlineMode: false },
    customVoiceProfile: activeCustomVoice,
  });
  assert.equal(s4.state, 'a_responder');
  assert.equal(s4.label, 'A FALAR');
  assert.equal(s4.isWaveActive, true);

  const s5 = deriveVisualAssistantState({
    status: 'a_executar',
    isListening: false,
    isSpeaking: false,
    isLiveActive: false,
    settings: { silentMode: false, offlineMode: false },
    customVoiceProfile: activeCustomVoice,
  });
  assert.equal(s5.state, 'a_executar');
  assert.equal(s5.label, 'A EXECUTAR COMANDO');
});

test('resolveVoiceOutputMode differentiates original custom voice, alternative voice, and silent mode', () => {
  assert.equal(
    resolveVoiceOutputMode({ silentMode: false }, activeCustomVoice),
    'original'
  );
  assert.equal(
    resolveVoiceOutputMode({ silentMode: false }, disabledCustomVoice),
    'alternativa'
  );
  assert.equal(
    resolveVoiceOutputMode({ silentMode: true }, activeCustomVoice),
    'silencioso'
  );
});

test('holographic lateral nodes and bottom circular controls match specification counts', () => {
  assert.equal(LEFT_HOLOGRAPHIC_NODES.length, 5);
  assert.equal(RIGHT_HOLOGRAPHIC_NODES.length, 5);
  assert.equal(BOTTOM_CIRCULAR_CONTROLS.length, 6);
});

test('computeWaveformHeights scales dynamically with amplitude and respects bounds', () => {
  const idle = computeWaveformHeights({ state: 'disponivel', amplitude: 0, tick: 1 });
  const loud = computeWaveformHeights({ state: 'a_ouvir', amplitude: 0.95, tick: 4 });
  assert.equal(idle.length, 17);
  assert.equal(loud.length, 17);
  assert.ok(Math.max(...loud) > Math.max(...idle));
  for (const h of loud) {
    assert.ok(h >= 5 && h <= 42);
  }
});
