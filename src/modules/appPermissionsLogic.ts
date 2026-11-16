import type { InstalledAppCategory, InstalledAppPermission } from '../types/nexus.ts';
import { normalizePortuguese } from './commandParser.ts';

export const APP_CATEGORIES: Array<'Todas' | InstalledAppCategory> = [
  'Todas',
  'Comunicação',
  'Finanças',
  'Educação & Fé',
  'Multimédia',
  'Produtividade',
  'IA & Nuvem',
  'Ferramentas',
  'Redes & Segurança',
  'Jogos & Lazer',
];

export function filterInstalledApps(
  apps: InstalledAppPermission[],
  options: {
    query?: string;
    category?: 'Todas' | InstalledAppCategory;
    policyFilter?: 'all' | 'voice_allowed' | 'voice_blocked' | 'protected';
  }
): InstalledAppPermission[] {
  const q = normalizePortuguese(options.query ?? '');
  const cat = options.category && options.category !== 'Todas' ? options.category : null;
  const policy = options.policyFilter ?? 'all';

  return apps.filter((app) => {
    if (cat && app.category !== cat) return false;
    if (policy === 'voice_allowed' && !app.canLaunchByVoice) return false;
    if (policy === 'voice_blocked' && app.canLaunchByVoice) return false;
    if (policy === 'protected' && !app.requireConfirmation) return false;
    if (!q) return true;

    return (
      normalizePortuguese(app.name).includes(q) ||
      normalizePortuguese(app.description).includes(q) ||
      normalizePortuguese(app.category).includes(q) ||
      normalizePortuguese(app.packageHint).includes(q)
    );
  });
}

export function findAppByVoiceQuery(
  apps: InstalledAppPermission[],
  query: string
): InstalledAppPermission | null {
  const q = normalizePortuguese(query)
    .replace(/^(o|a|os|as|aplicativo|aplicacao|app)\s+/i, '')
    .trim();
  if (!q) return null;

  // Exact match on normalized name
  const exact = apps.find((a) => normalizePortuguese(a.name) === q);
  if (exact) return exact;

  // Common aliases in Angola / Portuguese
  const aliases: Record<string, string> = {
    'facebook lite': 'facebook-lite',
    'lite': 'facebook-lite',
    'google fotos': 'fotos',
    'fotos': 'fotos',
    'unitel': 'unitel-money',
    'paypay': 'paypay-ao',
    'hinario': 'hinario-umbundu',
    'hinos adventistas': 'hinos-adventistas-pro',
    'youtube music': 'yt-music',
    'youtube studio': 'yt-studio',
    'wps': 'wps-office',
    'pdf reader': 'pdf-reader-hi-read',
    'hi read': 'pdf-reader-hi-read',
    'ia aprendiz': 'ia-aprendiz',
    'egw': 'egw-writings-2',
    'egw writings': 'egw-writings-2',
    'youcut': 'youcut',
    'speaker cleaner': 'speaker-cleaner',
    'qr': 'scanner-qr',
    'scanner qr': 'scanner-qr',
    'gravador': 'gravador-de-voz',
  };

  if (aliases[q]) {
    const aliased = apps.find((a) => a.id === aliases[q]);
    if (aliased) return aliased;
  }

  // Starts-with or contains match
  const partial = apps.find(
    (a) =>
      normalizePortuguese(a.name).includes(q) ||
      q.includes(normalizePortuguese(a.name))
  );
  return partial ?? null;
}

export function evaluateAppLaunchPermission(app: InstalledAppPermission): {
  allowed: boolean;
  needsConfirmation: boolean;
  reason: string;
} {
  if (!app.canLaunchByVoice) {
    return {
      allowed: false,
      needsConfirmation: false,
      reason: `A abertura por voz de "${app.name}" está bloqueada nas Permissões de Aplicativos.`,
    };
  }
  if (app.requireConfirmation) {
    return {
      allowed: true,
      needsConfirmation: true,
      reason: `"${app.name}" está protegido por confirmação explícita antes de abrir.`,
    };
  }
  return {
    allowed: true,
    needsConfirmation: false,
    reason: `Permissão de abertura concedida para "${app.name}" (${app.packageHint}).`,
  };
}
