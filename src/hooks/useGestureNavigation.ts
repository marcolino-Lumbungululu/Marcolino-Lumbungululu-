import { useEffect, useRef } from 'react';
import type React from 'react';
import { classifyPointerSwipe } from '../modules/gestureLogic.ts';
import type { GestureSensitivity, GestureType } from '../types/nexus.ts';

interface UseGestureNavigationOptions {
  enabled: boolean;
  sensitivity?: GestureSensitivity;
  allowHorizontal?: boolean;
  allowVertical?: boolean;
  enableDoubleTap?: boolean;
  enableLongPress?: boolean;
  onGesture: (gesture: GestureType) => void;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);

function isDragBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[data-gesture-ignore="true"]')) return true;
  if (INPUT_TAGS.has(target.tagName)) return true;
  const role = target.getAttribute('role');
  if (role === 'slider' || role === 'textbox') return true;
  return false;
}

function isActionButtonTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, textarea, select, [role="slider"]'));
}

export function useGestureNavigation({
  enabled,
  sensitivity = 'normal',
  allowHorizontal = true,
  allowVertical = false,
  enableDoubleTap = false,
  enableLongPress = false,
  onGesture,
}: UseGestureNavigationOptions) {
  const startRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
    blockedDrag: boolean;
    onButton: boolean;
  } | null>(null);

  const optionsRef = useRef({
    enabled,
    sensitivity,
    allowHorizontal,
    allowVertical,
    enableDoubleTap,
    enableLongPress,
    onGesture,
  });
  optionsRef.current = {
    enabled,
    sensitivity,
    allowHorizontal,
    allowVertical,
    enableDoubleTap,
    enableLongPress,
    onGesture,
  };

  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleWindowMove = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 14) {
        clearLongPress();
      }
    };

    const handleWindowUp = (e: PointerEvent) => {
      clearLongPress();
      const start = startRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      startRef.current = null;

      const opts = optionsRef.current;
      if (!opts.enabled || start.blockedDrag || longPressFiredRef.current) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const durationMs = Date.now() - start.time;

      const gesture = classifyPointerSwipe({
        dx,
        dy,
        durationMs,
        sensitivity: opts.sensitivity,
        allowHorizontal: opts.allowHorizontal,
        allowVertical: opts.allowVertical,
      });

      if (gesture) {
        lastTapRef.current = 0;
        opts.onGesture(gesture);
        return;
      }

      if (
        opts.enableDoubleTap &&
        !start.onButton &&
        Math.hypot(dx, dy) < 18 &&
        durationMs < 280
      ) {
        const now = Date.now();
        if (now - lastTapRef.current > 40 && now - lastTapRef.current < 320) {
          lastTapRef.current = 0;
          opts.onGesture('double_tap');
        } else {
          lastTapRef.current = now;
        }
      }
    };

    const handleWindowCancel = (e: PointerEvent) => {
      if (startRef.current?.pointerId === e.pointerId) {
        clearLongPress();
        startRef.current = null;
      }
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowCancel);
    return () => {
      clearLongPress();
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowCancel);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const blockedDrag = isDragBlockedTarget(e.target);
    const onButton = isActionButtonTarget(e.target);

    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
      blockedDrag,
      onButton,
    };
    longPressFiredRef.current = false;
    clearLongPress();

    if (!blockedDrag && !onButton && enableLongPress) {
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        optionsRef.current.onGesture('long_press');
      }, 600);
    }
  };

  return {
    onPointerDown,
  };
}
