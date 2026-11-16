import type { GestureSensitivity, GestureType, NavSection } from '../types/nexus.ts';

export const NAV_SECTION_ORDER: NavSection[] = [
  'assistente',
  'comando',
  'musica',
  'ficheiros',
  'automacoes',
  'definicoes',
];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  assistente: 'Assistente',
  comando: 'Centro de Comando',
  musica: 'Música',
  ficheiros: 'Ficheiros',
  automacoes: 'Automações',
  definicoes: 'Definições',
};

export interface GestureCatalogEntry {
  gesture: GestureType;
  title: string;
  actionSummary: string;
  voiceEquivalent: string;
  directionHint: string;
}

export const GESTURE_CATALOG: GestureCatalogEntry[] = [
  {
    gesture: 'swipe_up',
    title: 'Deslizar para cima',
    actionSummary: 'Expande o painel de conversa ou abre o leitor completo a partir do mini-leitor.',
    voiceEquivalent: '"Expandir" / "Expandir painel"',
    directionHint: '↑ Para cima',
  },
  {
    gesture: 'swipe_down',
    title: 'Deslizar para baixo',
    actionSummary: 'Recolhe o painel expandido ou fecha o guia ativo.',
    voiceEquivalent: '"Recolher" / "Minimizar"',
    directionHint: '↓ Para baixo',
  },
  {
    gesture: 'swipe_left',
    title: 'Deslizar para a esquerda',
    actionSummary: 'Volta para a secção anterior no histórico de navegação.',
    voiceEquivalent: '"Voltar" / "Ecrã anterior"',
    directionHint: '← Esquerda',
  },
  {
    gesture: 'swipe_right',
    title: 'Deslizar para a direita',
    actionSummary: 'Avança para o módulo seguinte (Assistente → Música → Ficheiros → Automações → Definições).',
    voiceEquivalent: '"Ir para Música / Ficheiros"',
    directionHint: '→ Direita',
  },
  {
    gesture: 'double_tap',
    title: 'Duplo toque no Centro de Voz',
    actionSummary: 'Ativa ou para o microfone imediatamente sem procurar botões.',
    voiceEquivalent: 'Toque único no microfone',
    directionHint: '◎ 2x Toque',
  },
  {
    gesture: 'long_press',
    title: 'Pressão longa (600ms)',
    actionSummary: 'Interrompe a leitura por voz se ativa ou abre o Guia Rápido de Gestos.',
    voiceEquivalent: '"Interrompe a fala" / "Mostrar gestos"',
    directionHint: '● Segurar',
  },
];

export interface PointerGestureInput {
  dx: number;
  dy: number;
  durationMs: number;
  sensitivity?: GestureSensitivity;
  allowHorizontal?: boolean;
  allowVertical?: boolean;
}

export function getGestureThresholds(sensitivity: GestureSensitivity = 'normal'): {
  minDistancePx: number;
  maxDurationMs: number;
  axisRatio: number;
} {
  if (sensitivity === 'high') {
    return {
      minDistancePx: 42,
      maxDurationMs: 850,
      axisRatio: 1.25,
    };
  }
  return {
    minDistancePx: 64,
    maxDurationMs: 750,
    axisRatio: 1.4,
  };
}

export function classifyPointerSwipe(input: PointerGestureInput): GestureType | null {
  const {
    dx,
    dy,
    durationMs,
    sensitivity = 'normal',
    allowHorizontal = true,
    allowVertical = true,
  } = input;
  const { minDistancePx, maxDurationMs, axisRatio } = getGestureThresholds(sensitivity);

  if (durationMs <= 0 || durationMs > maxDurationMs) {
    return null;
  }

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (allowHorizontal && absX >= minDistancePx && absX >= absY * axisRatio) {
    return dx < 0 ? 'swipe_left' : 'swipe_right';
  }

  if (allowVertical && absY >= minDistancePx && absY >= absX * axisRatio) {
    return dy < 0 ? 'swipe_up' : 'swipe_down';
  }

  return null;
}

export interface GestureContext {
  activeNav: NavSection;
  navHistory: NavSection[];
  isExpanded: boolean;
  isSpeaking: boolean;
  hasActiveTrack: boolean;
  showGestureGuide: boolean;
}

export type ResolvedGestureEffect =
  | { type: 'expand'; label: string }
  | { type: 'collapse'; label: string }
  | { type: 'open_music'; label: string }
  | { type: 'navigate'; target: NavSection; label: string; isBack: boolean }
  | { type: 'toggle_mic'; label: string }
  | { type: 'stop_speaking'; label: string }
  | { type: 'open_guide'; label: string }
  | { type: 'close_guide'; label: string }
  | { type: 'noop'; label: string };

export function resolveGestureAction(
  gesture: GestureType,
  ctx: GestureContext
): ResolvedGestureEffect {
  if (gesture === 'swipe_up') {
    if (ctx.activeNav === 'assistente') {
      if (!ctx.isExpanded) {
        return { type: 'expand', label: 'Painel do assistente expandido' };
      }
      return { type: 'noop', label: 'Painel já está expandido' };
    }
    if (ctx.hasActiveTrack && ctx.activeNav !== 'musica') {
      return { type: 'open_music', label: 'Leitor de música expandido' };
    }
    if (!ctx.isExpanded) {
      return { type: 'expand', label: 'Vista expandida ativada' };
    }
    return { type: 'noop', label: 'Vista já expandida' };
  }

  if (gesture === 'swipe_down') {
    if (ctx.showGestureGuide) {
      return { type: 'close_guide', label: 'Guia de gestos fechado' };
    }
    if (ctx.isExpanded) {
      return { type: 'collapse', label: 'Painel recolhido para vista normal' };
    }
    if (ctx.isSpeaking) {
      return { type: 'stop_speaking', label: 'Leitura por voz interrompida' };
    }
    return { type: 'noop', label: 'Já está na vista normal' };
  }

  if (gesture === 'swipe_left') {
    if (ctx.showGestureGuide) {
      return { type: 'close_guide', label: 'Voltar — guia fechado' };
    }
    if (ctx.isExpanded) {
      return { type: 'collapse', label: 'Voltar à vista completa' };
    }
    const previous = ctx.navHistory[ctx.navHistory.length - 1];
    if (previous && previous !== ctx.activeNav) {
      return {
        type: 'navigate',
        target: previous,
        label: `Voltar para ${NAV_SECTION_LABELS[previous]}`,
        isBack: true,
      };
    }
    const currentIndex = NAV_SECTION_ORDER.indexOf(ctx.activeNav);
    if (currentIndex > 0) {
      const prevSection = NAV_SECTION_ORDER[currentIndex - 1];
      return {
        type: 'navigate',
        target: prevSection,
        label: `Voltar para ${NAV_SECTION_LABELS[prevSection]}`,
        isBack: true,
      };
    }
    return { type: 'noop', label: 'Já está no ecrã inicial' };
  }

  if (gesture === 'swipe_right') {
    const currentIndex = NAV_SECTION_ORDER.indexOf(ctx.activeNav);
    const nextIndex = (currentIndex + 1) % NAV_SECTION_ORDER.length;
    const nextSection = NAV_SECTION_ORDER[nextIndex];
    return {
      type: 'navigate',
      target: nextSection,
      label: `Avançar para ${NAV_SECTION_LABELS[nextSection]}`,
      isBack: false,
    };
  }

  if (gesture === 'double_tap') {
    return { type: 'toggle_mic', label: 'Microfone alternado por duplo toque' };
  }

  // long_press
  if (ctx.isSpeaking) {
    return { type: 'stop_speaking', label: 'Leitura interrompida por pressão longa' };
  }
  return { type: 'open_guide', label: 'Guia de gestos aberto' };
}
