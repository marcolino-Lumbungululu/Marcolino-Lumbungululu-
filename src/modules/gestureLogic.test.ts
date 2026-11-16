import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPointerSwipe,
  resolveGestureAction,
  type GestureContext,
} from './gestureLogic.ts';

const baseCtx: GestureContext = {
  activeNav: 'assistente',
  navHistory: [],
  isExpanded: false,
  isSpeaking: false,
  hasActiveTrack: false,
  showGestureGuide: false,
};

test('classifyPointerSwipe detects all four cardinal swipe directions', () => {
  assert.equal(classifyPointerSwipe({ dx: 0, dy: -110, durationMs: 220 }), 'swipe_up');
  assert.equal(classifyPointerSwipe({ dx: 0, dy: 110, durationMs: 220 }), 'swipe_down');
  assert.equal(classifyPointerSwipe({ dx: -120, dy: 10, durationMs: 250 }), 'swipe_left');
  assert.equal(classifyPointerSwipe({ dx: 120, dy: -12, durationMs: 250 }), 'swipe_right');
});

test('classifyPointerSwipe rejects slow drifts, short taps, and vertical swipes when disabled', () => {
  assert.equal(classifyPointerSwipe({ dx: -25, dy: 0, durationMs: 120 }), null);
  assert.equal(classifyPointerSwipe({ dx: -120, dy: 0, durationMs: 1200 }), null);
  assert.equal(
    classifyPointerSwipe({ dx: 5, dy: -130, durationMs: 200, allowVertical: false }),
    null
  );
  assert.equal(
    classifyPointerSwipe({ dx: 120, dy: 0, durationMs: 200, allowHorizontal: false }),
    null
  );
  assert.equal(
    classifyPointerSwipe({ dx: -48, dy: 0, durationMs: 200, sensitivity: 'high' }),
    'swipe_left'
  );
});

test('resolveGestureAction handles swipe_up expand and swipe_down collapse', () => {
  const expanded = resolveGestureAction('swipe_up', baseCtx);
  assert.equal(expanded.type, 'expand');

  const collapsed = resolveGestureAction('swipe_down', { ...baseCtx, isExpanded: true });
  assert.equal(collapsed.type, 'collapse');
});

test('resolveGestureAction handles swipe_left to go back using navHistory or previous section', () => {
  const backFromHistory = resolveGestureAction('swipe_left', {
    ...baseCtx,
    activeNav: 'definicoes',
    navHistory: ['assistente', 'ficheiros'],
  });
  assert.deepEqual(backFromHistory, {
    type: 'navigate',
    target: 'ficheiros',
    label: 'Voltar para Ficheiros',
    isBack: true,
  });

  const backWithoutHistory = resolveGestureAction('swipe_left', {
    ...baseCtx,
    activeNav: 'musica',
    navHistory: [],
  });
  assert.deepEqual(backWithoutHistory, {
    type: 'navigate',
    target: 'assistente',
    label: 'Voltar para Assistente',
    isBack: true,
  });
});

test('resolveGestureAction handles swipe_right, double_tap, and long_press', () => {
  const forward = resolveGestureAction('swipe_right', baseCtx);
  assert.deepEqual(forward, {
    type: 'navigate',
    target: 'musica',
    label: 'Avançar para Música',
    isBack: false,
  });

  assert.equal(resolveGestureAction('double_tap', baseCtx).type, 'toggle_mic');
  assert.equal(resolveGestureAction('long_press', baseCtx).type, 'open_guide');
  assert.equal(
    resolveGestureAction('long_press', { ...baseCtx, isSpeaking: true }).type,
    'stop_speaking'
  );
});
