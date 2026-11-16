import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Hand,
  Mic,
  Touchpad,
  X,
} from 'lucide-react';
import { GESTURE_CATALOG } from '../modules/gestureLogic.ts';
import { useGestureNavigation } from '../hooks/useGestureNavigation.ts';
import type { GestureSensitivity, GestureType } from '../types/nexus.ts';

interface GestureGuideModalProps {
  isOpen: boolean;
  gesturesEnabled: boolean;
  sensitivity: GestureSensitivity;
  onClose: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onChangeSensitivity: (sensitivity: GestureSensitivity) => void;
  onTriggerGesture: (gesture: GestureType) => void;
}

const GESTURE_ICONS: Record<GestureType, React.ReactNode> = {
  swipe_up: <ArrowUp className="w-4 h-4 text-blue-500" />,
  swipe_down: <ArrowDown className="w-4 h-4 text-violet-500" />,
  swipe_left: <ArrowLeft className="w-4 h-4 text-emerald-500" />,
  swipe_right: <ArrowRight className="w-4 h-4 text-sky-500" />,
  double_tap: <Mic className="w-4 h-4 text-amber-500" />,
  long_press: <Hand className="w-4 h-4 text-rose-500" />,
};

export const GestureGuideModal: React.FC<GestureGuideModalProps> = ({
  isOpen,
  gesturesEnabled,
  sensitivity,
  onClose,
  onToggleEnabled,
  onChangeSensitivity,
  onTriggerGesture,
}) => {
  const [lastDetected, setLastDetected] = useState<string>(
    'Desliza em qualquer direção, faz duplo toque ou segura nesta área para testar.'
  );

  const testPadHandlers = useGestureNavigation({
    enabled: true,
    sensitivity,
    allowVertical: true,
    enableDoubleTap: true,
    enableLongPress: true,
    onGesture: (g) => {
      const entry = GESTURE_CATALOG.find((item) => item.gesture === g);
      setLastDetected(
        entry
          ? `Gesto detetado: ${entry.title} (${entry.directionHint})`
          : `Gesto detetado: ${g}`
      );
    },
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gesture-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Touchpad className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="gesture-guide-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Navegação por Gestos + Voz
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Combina gestos táteis no ecrã com comandos de voz em português
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar guia de gestos"
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Reconhecimento de Gestos
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ativar deslizes e toques rápidos
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleEnabled(!gesturesEnabled)}
              aria-pressed={gesturesEnabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                gesturesEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {gesturesEnabled ? 'Ativo' : 'Desativado'}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Sensibilidade
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Distância mínima do deslize
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => onChangeSensitivity('normal')}
                className={`px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  sensitivity === 'normal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 dark:text-slate-300'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => onChangeSensitivity('high')}
                className={`px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  sensitivity === 'high'
                    ? 'bg-violet-600 text-white'
                    : 'bg-transparent text-slate-600 dark:text-slate-300'
                }`}
              >
                Alta
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Gesture Test Pad */}
        <div
          data-testid="gesture-test-pad"
          {...testPadHandlers}
          style={{ touchAction: 'none' }}
          className="rounded-2xl border-2 border-dashed border-blue-500/40 bg-gradient-to-br from-blue-500/5 to-violet-500/10 py-5 px-5 text-center select-none cursor-grab active:cursor-grabbing"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Área Interativa de Teste de Gestos
          </p>
          <p
            data-testid="gesture-test-result"
            className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
          >
            {lastDetected}
          </p>
        </div>

        {/* Gesture Catalog + Quick Simulate Buttons */}
        <div className="space-y-2">
          {GESTURE_CATALOG.map((item) => (
            <div
              key={item.gesture}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {GESTURE_ICONS[item.gesture]}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                      Voz: {item.voiceEquivalent}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {item.actionSummary}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerGesture(item.gesture);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Executar ({item.directionHint})
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
