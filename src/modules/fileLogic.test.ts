import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFilesByFolderQuery, findFileByVoiceQuery } from './fileLogic.ts';
import type { DeviceFile } from '../types/nexus.ts';

const SAMPLE_FILES: DeviceFile[] = [
  {
    id: 'f1',
    name: 'Apontamentos de Matemática — Cálculo I.pdf',
    category: 'PDF',
    mimeType: 'application/pdf',
    sizeBytes: 2048000,
    folderPath: '/Documentos/Universidade',
    pages: ['Limites e continuidade de funções reais.'],
    pageCount: 1,
    lastPage: 1,
    createdAt: '2026-11-12T08:00:00Z',
  },
  {
    id: 'f2',
    name: 'Plano de Estudo Semanal.docx',
    category: 'Word',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 120000,
    folderPath: '/Documentos/Estudo',
    pages: ['Horário de revisões em Angola e tarefas diárias.'],
    pageCount: 1,
    lastPage: 1,
    createdAt: '2026-11-13T08:00:00Z',
  },
];

test('findFileByVoiceQuery matches file names with Portuguese filler prefixes stripped', () => {
  const f1 = findFileByVoiceQuery(SAMPLE_FILES, 'o ficheiro de cálculo');
  assert.equal(f1?.id, 'f1');

  const f2 = findFileByVoiceQuery(SAMPLE_FILES, 'documento plano de estudo');
  assert.equal(f2?.id, 'f2');
});

test('findFileByVoiceQuery matches content inside file pages', () => {
  const f1 = findFileByVoiceQuery(SAMPLE_FILES, 'limites continuidade');
  assert.equal(f1?.id, 'f1');
});

test('filterFilesByFolderQuery filters by folder path', () => {
  const uni = filterFilesByFolderQuery(SAMPLE_FILES, 'a pasta Universidade');
  assert.equal(uni.length, 1);
  assert.equal(uni[0].id, 'f1');
});
