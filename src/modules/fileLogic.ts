import type { DeviceFile, FileCategory } from '../types/nexus.ts';
import { normalizePortuguese } from './commandParser.ts';

export const FILE_CATEGORIES: Array<'Todos' | FileCategory> = [
  'Todos',
  'PDF',
  'Word',
  'Fotografias',
  'Vídeos',
  'Áudio',
  'Livros Digitais',
  'Descarregados',
  'Pastas',
];

export function categorizeFileByNameAndMime(fileName: string, mimeType: string): FileCategory {
  const lower = fileName.toLowerCase();
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return 'PDF';
  if (
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.txt') ||
    mimeType.includes('wordprocessingml')
  ) {
    return 'Word';
  }
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
    return 'Fotografias';
  }
  if (mimeType.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(lower)) {
    return 'Vídeos';
  }
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(lower)) {
    return 'Áudio';
  }
  if (/\.(epub|mobi|azw3)$/i.test(lower)) {
    return 'Livros Digitais';
  }
  return 'Descarregados';
}

export function searchDeviceFiles(
  files: DeviceFile[],
  options: { query?: string; category?: 'Todos' | FileCategory }
): DeviceFile[] {
  const q = normalizePortuguese(options.query ?? '');
  const cat = options.category && options.category !== 'Todos' ? options.category : null;

  return files.filter((file) => {
    if (cat && file.category !== cat) return false;
    if (!q) return true;
    return (
      normalizePortuguese(file.name).includes(q) ||
      normalizePortuguese(file.folderPath).includes(q) ||
      normalizePortuguese(file.category).includes(q) ||
      file.pages.some((p) => normalizePortuguese(p).includes(q))
    );
  });
}

export function findFileByVoiceQuery(files: DeviceFile[], rawQuery: string): DeviceFile | null {
  let q = normalizePortuguese(rawQuery);
  const fillerPrefix = /^(?:o|a|os|as|um|uma|ficheiro|documento|arquivo|pdf|word|de|da|do|dos|das|sobre|chamado|com|nome)\s+/i;
  while (fillerPrefix.test(q)) {
    q = q.replace(fillerPrefix, '').trim();
  }
  if (!q) return null;

  // 1. Exact filename match (with or without extension)
  const exact = files.find((f) => {
    const normName = normalizePortuguese(f.name);
    const noExt = normalizePortuguese(f.name.replace(/\.[^.]+$/, ''));
    return normName === q || noExt === q;
  });
  if (exact) return exact;

  // 2. Partial filename match
  const byName = files.find((f) => normalizePortuguese(f.name).includes(q));
  if (byName) return byName;

  // 3. Token-based matching across name, folderPath, category, and extracted pages
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 0) {
    let bestFile: DeviceFile | null = null;
    let bestScore = 0;

    for (const file of files) {
      const haystack = normalizePortuguese(
        `${file.name} ${file.folderPath} ${file.category} ${file.pages.join(' ')}`
      );
      let score = 0;
      for (const tok of tokens) {
        if (normalizePortuguese(file.name).includes(tok)) {
          score += 3;
        } else if (haystack.includes(tok)) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestFile = file;
      }
    }
    if (bestFile && bestScore > 0) return bestFile;
  }

  return null;
}

export function filterFilesByFolderQuery(files: DeviceFile[], folderQuery: string): DeviceFile[] {
  let q = normalizePortuguese(folderQuery);
  const folderPrefix = /^(?:a|o|as|os|pasta|diretorio|diretoria|de|da|do)\s+/i;
  while (folderPrefix.test(q)) {
    q = q.replace(folderPrefix, '').trim();
  }
  if (!q) return files;
  return files.filter((f) => normalizePortuguese(f.folderPath).includes(q));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
