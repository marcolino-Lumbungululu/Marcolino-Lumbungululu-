import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePortuguese,
  parseOfflineCommand,
  stripWakeWord,
} from './commandParser.ts';

test('normalizes Portuguese diacritics and punctuation', () => {
  assert.equal(normalizePortuguese('Música Cristã, por favor!'), 'musica crista por favor');
});

test('strips wake word NEXUS cleanly', () => {
  const res = stripWakeWord('NEXUS, toca a música número 10', 'NEXUS');
  assert.equal(res.hadWakeWord, true);
  assert.equal(res.cleaned, 'toca a música número 10');
});

test('parses track number command in Portuguese', () => {
  const intent = parseOfflineCommand('Toca a música número 10');
  assert.equal(intent.module, 'music');
  assert.equal(intent.action, 'play_track_number');
  assert.equal(intent.params.trackNumber, 10);
});

test('parses Christian music request and vague music request', () => {
  const christian = parseOfflineCommand('Procura músicas de música cristã');
  assert.equal(christian.module, 'music');
  assert.equal(christian.action, 'play_category');
  assert.equal(christian.params.category, 'Música Cristã');

  const vague = parseOfflineCommand('Quero ouvir música');
  assert.equal(vague.module, 'music');
  assert.equal(vague.action, 'ask_genre');
});

test('parses document search and PDF reading commands', () => {
  const search = parseOfflineCommand('Encontra o documento de Matemática');
  assert.equal(search.module, 'files');
  assert.equal(search.action, 'search_files');
  assert.equal(search.params.query, 'matematica');

  const nextPage = parseOfflineCommand('Avança para a próxima página');
  assert.equal(nextPage.module, 'document_reader');
  assert.equal(nextPage.action, 'next_page');
});

test('parses automation modes and app navigation', () => {
  const study = parseOfflineCommand('Modo estudo');
  assert.equal(study.module, 'automation');
  assert.equal(study.params.trigger, 'modo estudo');

  const whatsapp = parseOfflineCommand('Abrir WhatsApp');
  assert.equal(whatsapp.module, 'app_control');
  assert.equal(whatsapp.action, 'open_installed_app');
  assert.equal(whatsapp.params.appQuery, 'WhatsApp');

  const unitel = parseOfflineCommand('Abrir UNITEL Money');
  assert.equal(unitel.module, 'app_control');
  assert.equal(unitel.action, 'open_installed_app');
  assert.equal(unitel.params.appQuery, 'UNITEL Money');
});

test('parses voice file access and offline section navigation commands', () => {
  const openFile = parseOfflineCommand('Abrir o ficheiro Cálculo');
  assert.equal(openFile.module, 'files');
  assert.equal(openFile.action, 'open_file');
  assert.equal(openFile.params.query, 'calculo');

  const readFile = parseOfflineCommand('Ler o documento Matemática');
  assert.equal(readFile.module, 'files');
  assert.equal(readFile.action, 'open_and_read_file');
  assert.equal(readFile.params.query, 'matematica');

  const openFolder = parseOfflineCommand('Abrir a pasta Universidade');
  assert.equal(openFolder.module, 'files');
  assert.equal(openFolder.action, 'open_folder');
  assert.equal(openFolder.params.folder, 'universidade');

  const pageJump = parseOfflineCommand('Ir para a página 2');
  assert.equal(pageJump.module, 'document_reader');
  assert.equal(pageJump.action, 'go_to_page');
  assert.equal(pageJump.params.page, 2);

  const navMusic = parseOfflineCommand('Ir para música');
  assert.equal(navMusic.module, 'app_control');
  assert.equal(navMusic.action, 'navigate_section');
  assert.equal(navMusic.params.section, 'musica');

  const navPerms = parseOfflineCommand('Abrir permissões dos aplicativos');
  assert.equal(navPerms.module, 'app_control');
  assert.equal(navPerms.action, 'navigate_section');
  assert.equal(navPerms.params.section, 'definicoes');
  assert.equal(navPerms.params.subTab, 'apps');

  const offlineOn = parseOfflineCommand('Ativar modo offline');
  assert.equal(offlineOn.module, 'settings');
  assert.equal(offlineOn.action, 'set_offline_mode');
  assert.equal(offlineOn.params.enabled, true);

  const goBack = parseOfflineCommand('Voltar');
  assert.equal(goBack.module, 'app_control');
  assert.equal(goBack.action, 'navigate_back');

  const expand = parseOfflineCommand('Expandir painel');
  assert.equal(expand.module, 'app_control');
  assert.equal(expand.action, 'expand_view');

  const collapse = parseOfflineCommand('Recolher');
  assert.equal(collapse.module, 'app_control');
  assert.equal(collapse.action, 'collapse_view');

  const guide = parseOfflineCommand('Mostrar gestos');
  assert.equal(guide.module, 'app_control');
  assert.equal(guide.action, 'open_gesture_guide');
});


