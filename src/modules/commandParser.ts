import type { ParsedIntent } from '../types/nexus.ts';

export function normalizePortuguese(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripWakeWord(input: string, wakeWord = 'NEXUS'): {
  hadWakeWord: boolean;
  cleaned: string;
} {
  const normWake = normalizePortuguese(wakeWord);
  const rawTrimmed = input.trim();
  const norm = normalizePortuguese(rawTrimmed);
  if (!normWake) return { hadWakeWord: false, cleaned: rawTrimmed };

  if (norm === normWake) {
    return { hadWakeWord: true, cleaned: '' };
  }

  const regex = new RegExp(`^${normWake}[,\\s:!-]*`, 'i');
  if (regex.test(rawTrimmed)) {
    return {
      hadWakeWord: true,
      cleaned: rawTrimmed.replace(regex, '').trim(),
    };
  }
  return { hadWakeWord: false, cleaned: rawTrimmed };
}

export function parseOfflineCommand(rawInput: string): ParsedIntent {
  const norm = normalizePortuguese(rawInput);

  if (!norm) {
    return {
      module: 'conversation',
      action: 'clarify',
      params: {},
      confidence: 0.4,
      offlineReply: 'Não captei nenhum comando. Podes repetir, por favor?',
    };
  }

  // Automation triggers
  if (norm.includes('modo estudo') || norm.includes('ativar estudo')) {
    return {
      module: 'automation',
      action: 'run_automation',
      params: { trigger: 'modo estudo' },
      confidence: 0.96,
      offlineReply: 'A iniciar o Modo Estudo.',
    };
  }
  if (norm.includes('modo musica') || norm.includes('ativar modo musica')) {
    return {
      module: 'automation',
      action: 'run_automation',
      params: { trigger: 'modo musica' },
      confidence: 0.96,
      offlineReply: 'A iniciar o Modo Música.',
    };
  }

  // Document reader commands
  if (
    norm.includes('le este documento') ||
    norm.includes('ler este documento') ||
    norm.includes('le o documento') ||
    norm.includes('ler em voz alta')
  ) {
    return {
      module: 'document_reader',
      action: 'read_current',
      params: {},
      confidence: 0.95,
      offlineReply: 'A iniciar a leitura em voz alta do documento atual.',
    };
  }
  if (norm.includes('proxima pagina') || norm.includes('avanca para a proxima pagina')) {
    return {
      module: 'document_reader',
      action: 'next_page',
      params: {},
      confidence: 0.95,
      offlineReply: 'A avançar para a página seguinte.',
    };
  }
  if (norm.includes('pagina anterior') || norm.includes('volta a pagina anterior')) {
    return {
      module: 'document_reader',
      action: 'prev_page',
      params: {},
      confidence: 0.95,
      offlineReply: 'A voltar para a página anterior.',
    };
  }
  if (norm.includes('le novamente') || norm.includes('ler novamente')) {
    return {
      module: 'document_reader',
      action: 'reread_page',
      params: {},
      confidence: 0.94,
      offlineReply: 'A ler novamente a página atual.',
    };
  }
  if (norm.includes('para a leitura') || norm.includes('parar leitura') || norm.includes('interrompe a fala')) {
    return {
      module: 'document_reader',
      action: 'stop_reading',
      params: {},
      confidence: 0.96,
      offlineReply: 'Leitura interrompida.',
    };
  }
  const pageJumpMatch = norm.match(/(?:ir para|abrir|abre|vai para|mostrar)\s+(?:a\s+)?pagina\s+(\d+)/);
  if (pageJumpMatch) {
    return {
      module: 'document_reader',
      action: 'go_to_page',
      params: { page: Number(pageJumpMatch[1]) },
      confidence: 0.95,
      offlineReply: `A abrir a página ${pageJumpMatch[1]}.`,
    };
  }
  if (norm.includes('resume este capitulo') || norm.includes('resumir capitulo') || norm.includes('resume o documento')) {
    return {
      module: 'document_reader',
      action: 'summarize',
      params: {},
      confidence: 0.92,
      offlineReply: 'A preparar o resumo do capítulo.',
    };
  }
  if (norm.includes('explica este conteudo') || norm.includes('explicar conteudo') || norm.includes('explica esta pagina')) {
    return {
      module: 'document_reader',
      action: 'explain',
      params: {},
      confidence: 0.92,
      offlineReply: 'A analisar e explicar este conteúdo.',
    };
  }

  // Offline mode & personalization toggles (work 100% offline)
  if (
    norm.includes('ativar modo offline') ||
    norm.includes('ligar modo offline') ||
    norm.includes('modo sem internet') ||
    norm.includes('navegar sem internet') ||
    norm.includes('trabalhar sem internet')
  ) {
    return {
      module: 'settings',
      action: 'set_offline_mode',
      params: { enabled: true },
      confidence: 0.96,
      offlineReply: 'Modo offline ativado. Podes navegar, aceder aos ficheiros e controlar o NEXUS AI mesmo sem internet.',
    };
  }
  if (
    norm.includes('desativar modo offline') ||
    norm.includes('desligar modo offline') ||
    norm.includes('voltar ao modo online')
  ) {
    return {
      module: 'settings',
      action: 'set_offline_mode',
      params: { enabled: false },
      confidence: 0.96,
      offlineReply: 'Modo offline desativado. Ligação inteligente online restaurada quando houver rede.',
    };
  }
  if (norm.includes('modo escuro') || norm.includes('tema escuro')) {
    return {
      module: 'settings',
      action: 'set_theme',
      params: { theme: 'dark' },
      confidence: 0.95,
      offlineReply: 'Tema escuro ativado.',
    };
  }
  if (norm.includes('modo claro') || norm.includes('tema claro')) {
    return {
      module: 'settings',
      action: 'set_theme',
      params: { theme: 'light' },
      confidence: 0.95,
      offlineReply: 'Tema claro ativado.',
    };
  }
  if (norm.includes('ativar modo silencioso') || norm.includes('ligar modo silencioso')) {
    return {
      module: 'settings',
      action: 'set_silent_mode',
      params: { enabled: true },
      confidence: 0.95,
      offlineReply: 'Modo silencioso ativado.',
    };
  }
  if (norm.includes('desativar modo silencioso') || norm.includes('desligar modo silencioso')) {
    return {
      module: 'settings',
      action: 'set_silent_mode',
      params: { enabled: false },
      confidence: 0.95,
      offlineReply: 'Modo silencioso desativado.',
    };
  }

  // Music commands
  const trackNumMatch = norm.match(/(?:musica|faixa)\s*(?:numero|n|num)?\s*(\d+)/);
  if (trackNumMatch) {
    return {
      module: 'music',
      action: 'play_track_number',
      params: { trackNumber: Number(trackNumMatch[1]) },
      confidence: 0.96,
      offlineReply: `A procurar a música número ${trackNumMatch[1]}.`,
    };
  }

  if (
    norm.includes('pausa a musica') ||
    norm.includes('coloca a musica em pausa') ||
    norm === 'pausa' ||
    norm === 'pausar'
  ) {
    return {
      module: 'music',
      action: 'pause',
      params: {},
      confidence: 0.96,
      offlineReply: 'Música colocada em pausa.',
    };
  }

  if (
    norm.includes('continua a reproducao') ||
    norm.includes('retoma a musica') ||
    norm === 'continua' ||
    norm === 'continuar'
  ) {
    return {
      module: 'music',
      action: 'resume',
      params: {},
      confidence: 0.95,
      offlineReply: 'A continuar a reprodução.',
    };
  }

  if (norm.includes('para a musica') || norm.includes('parar musica')) {
    return {
      module: 'music',
      action: 'stop',
      params: {},
      confidence: 0.96,
      offlineReply: 'Reprodução de música parada.',
    };
  }

  if (norm.includes('passa para a proxima') || norm.includes('proxima musica') || norm.includes('seguinte')) {
    return {
      module: 'music',
      action: 'next',
      params: {},
      confidence: 0.95,
      offlineReply: 'A avançar para a próxima música.',
    };
  }

  if (norm.includes('volta a musica anterior') || norm.includes('musica anterior')) {
    return {
      module: 'music',
      action: 'previous',
      params: {},
      confidence: 0.95,
      offlineReply: 'A voltar à música anterior.',
    };
  }

  if (norm.includes('reproduz novamente esta musica') || norm.includes('repete esta musica') || norm.includes('repetir musica')) {
    return {
      module: 'music',
      action: 'repeat_current',
      params: {},
      confidence: 0.94,
      offlineReply: 'A repetir a música atual.',
    };
  }

  if (norm.includes('reproduzir todas') || norm.includes('toca todas as musicas')) {
    return {
      module: 'music',
      action: 'play_all',
      params: {},
      confidence: 0.94,
      offlineReply: 'A reproduzir todas as músicas da biblioteca.',
    };
  }

  if (norm.includes('musicas mais recentes') || norm.includes('toca as mais recentes')) {
    return {
      module: 'music',
      action: 'play_recent',
      params: {},
      confidence: 0.93,
      offlineReply: 'A reproduzir as músicas mais recentes.',
    };
  }

  if (norm.includes('crista') || norm.includes('gospel') || norm.includes('louvor')) {
    return {
      module: 'music',
      action: 'play_category',
      params: { category: 'Música Cristã', query: 'cristã' },
      confidence: 0.93,
      offlineReply: 'Encontrei músicas cristãs na tua biblioteca.',
    };
  }

  if (norm.includes('semba') || norm.includes('kizomba') || norm.includes('angolana')) {
    return {
      module: 'music',
      action: 'play_category',
      params: { category: 'Semba & Kizomba', query: 'semba' },
      confidence: 0.93,
      offlineReply: 'A abrir músicas de Semba e Kizomba.',
    };
  }

  if (norm.includes('quero ouvir musica') || norm === 'musica' || norm === 'tocar musica') {
    return {
      module: 'music',
      action: 'ask_genre',
      params: {},
      confidence: 0.88,
      offlineReply: 'Que tipo de música gostarias de ouvir? Tenho Música Cristã, Semba & Kizomba, Instrumental e Estudo.',
    };
  }

  // Volume commands
  if (norm.includes('aumenta o volume') || norm.includes('subir o volume') || norm.includes('mais alto')) {
    return {
      module: 'app_control',
      action: 'volume_up',
      params: {},
      confidence: 0.96,
      offlineReply: 'Volume aumentado.',
    };
  }
  if (norm.includes('baixa o volume') || norm.includes('diminui o volume') || norm.includes('diminuir o volume') || norm.includes('mais baixo')) {
    return {
      module: 'app_control',
      action: 'volume_down',
      params: {},
      confidence: 0.96,
      offlineReply: 'Volume reduzido.',
    };
  }

  // Bluetooth (explicitly handles OS boundary transparently)
  if (norm.includes('bluetooth')) {
    const enable = norm.includes('ativa') || norm.includes('liga');
    return {
      module: 'app_control',
      action: enable ? 'bluetooth_on' : 'bluetooth_off',
      params: {},
      confidence: 0.94,
    };
  }

  // Voice-driven File Access & Device Storage Commands
  if (
    norm.includes('importar ficheiro') ||
    norm.includes('carregar ficheiro') ||
    norm.includes('selecionar ficheiro') ||
    norm.includes('escolher ficheiro') ||
    norm.includes('aceder ao armazenamento') ||
    norm.includes('aceder a ficheiro local')
  ) {
    return {
      module: 'files',
      action: 'prompt_device_import',
      params: { mode: 'file' },
      confidence: 0.95,
      offlineReply: 'Abri o Gestor de Ficheiros pronto para importares um ficheiro do teu dispositivo.',
    };
  }
  if (
    norm.includes('autorizar pasta') ||
    norm.includes('selecionar pasta') ||
    norm.includes('escolher pasta') ||
    norm.includes('aceder a pasta')
  ) {
    return {
      module: 'files',
      action: 'prompt_device_import',
      params: { mode: 'folder' },
      confidence: 0.95,
      offlineReply: 'Pronto para autorizar uma pasta local do teu dispositivo.',
    };
  }

  if (norm.includes('ultimo pdf')) {
    return {
      module: 'files',
      action: 'open_latest_pdf',
      params: {},
      confidence: 0.95,
      offlineReply: 'A abrir o último PDF descarregado.',
    };
  }

  const readSpecificFileMatch = norm.match(
    /^(?:ler|le|ouvir|reproduzir)\s+(?:o\s+|a\s+)?(?:ficheiro|documento|arquivo|pdf)\s+(?:de\s+|sobre\s+)?(.+)$/
  );
  if (readSpecificFileMatch && readSpecificFileMatch[1]) {
    return {
      module: 'files',
      action: 'open_and_read_file',
      params: { query: readSpecificFileMatch[1].trim() },
      confidence: 0.95,
    };
  }

  const openFolderMatch = norm.match(
    /^(?:abrir|abre|mostrar|mostra|ver|aceder)\s+(?:a\s+|ao\s+)?pasta\s+(?:de\s+|dos\s+|das\s+)?(.+)$/
  );
  if (openFolderMatch && openFolderMatch[1]) {
    return {
      module: 'files',
      action: 'open_folder',
      params: { folder: openFolderMatch[1].trim() },
      confidence: 0.95,
    };
  }

  const openFileMatch = norm.match(
    /^(?:abrir|abre|aceder|acede|acessar|acessa|mostrar|mostra|ver)\s+(?:o\s+|a\s+|ao\s+|um\s+)?(?:ficheiro|documento|arquivo|pdf)\s+(?:de\s+|do\s+|da\s+|sobre\s+)?(.+)$/
  );
  if (openFileMatch && openFileMatch[1]) {
    return {
      module: 'files',
      action: 'open_file',
      params: { query: openFileMatch[1].trim() },
      confidence: 0.95,
    };
  }

  if (norm.includes('fotografias') || norm.includes('fotos')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'Fotografias', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A mostrar fotografias encontradas.',
    };
  }
  if (norm.includes('videos') || norm.includes('mostrar video')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'Vídeos', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A procurar vídeos disponíveis.',
    };
  }
  if (norm.includes('ficheiros de audio') || norm.includes('mostrar audio')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'Áudio', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A listar ficheiros de áudio.',
    };
  }
  if (norm.includes('descarregados') || norm.includes('downloads')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'Descarregados', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A abrir os ficheiros descarregados.',
    };
  }
  if (norm.includes('documentos word') || norm.includes('ficheiros word')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'Word', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A mostrar documentos Word e texto.',
    };
  }
  if (norm.includes('todos os pdf') || norm.includes('mostrar pdf') || norm.includes('listar pdf')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'PDF', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A listar todos os documentos PDF.',
    };
  }
  if (norm.includes('livro')) {
    return {
      module: 'files',
      action: 'search_category',
      params: { category: 'Livros Digitais', query: rawInput },
      confidence: 0.94,
      offlineReply: 'A abrir os livros digitais.',
    };
  }
  if (
    norm.includes('encontra o documento') ||
    norm.includes('procura o documento') ||
    norm.includes('procura os meus documentos') ||
    norm.includes('abrir os meus documentos') ||
    norm.includes('meus documentos')
  ) {
    const docMatch = norm.match(/documento(?: de| sobre)? (.+)/);
    return {
      module: 'files',
      action: 'search_files',
      params: { query: docMatch ? docMatch[1].trim() : '' },
      confidence: 0.94,
      offlineReply: docMatch
        ? `A procurar documentos relacionados com "${docMatch[1].trim()}".`
        : 'A abrir o gestor de documentos.',
    };
  }

  // Offline Section Navigation (all views navigable without internet)
  if (
    norm.includes('criar a minha voz') ||
    norm.includes('criar minha voz') ||
    norm.includes('configurar minha voz') ||
    norm.includes('configurar a minha voz') ||
    norm.includes('voz personalizada') ||
    norm.includes('abrir minha voz')
  ) {
    return {
      module: 'app_control',
      action: 'navigate_section',
      params: { section: 'definicoes', subTab: 'voz' },
      confidence: 0.96,
      offlineReply: 'Abri a área Criar a Minha Voz nas Definições.',
    };
  }
  if (
    norm.includes('permissoes dos aplicativos') ||
    norm.includes('configuracoes de permissoes') ||
    norm.includes('abrir permissoes') ||
    norm.includes('ir para permissoes') ||
    norm.includes('gerir permissoes')
  ) {
    return {
      module: 'app_control',
      action: 'navigate_section',
      params: { section: 'definicoes', subTab: 'apps' },
      confidence: 0.96,
      offlineReply: 'Abri as Permissões dos Aplicativos em modo offline.',
    };
  }
  if (
    norm === 'musica' ||
    norm === 'abrir musica' ||
    norm.includes('ir para musica') ||
    norm.includes('navegar para musica') ||
    norm.includes('leitor de musica')
  ) {
    return {
      module: 'app_control',
      action: 'navigate_section',
      params: { section: 'musica' },
      confidence: 0.95,
      offlineReply: 'A navegar para o Centro Multimédia.',
    };
  }
  if (
    norm === 'ficheiros' ||
    norm === 'abrir ficheiros' ||
    norm.includes('ir para ficheiros') ||
    norm.includes('navegar para ficheiros') ||
    norm.includes('gestor de ficheiros') ||
    norm.includes('explorador de ficheiros') ||
    norm === 'abrir documentos'
  ) {
    return {
      module: 'app_control',
      action: 'navigate_section',
      params: { section: 'ficheiros' },
      confidence: 0.95,
      offlineReply: 'A navegar para o Gestor de Ficheiros.',
    };
  }
  if (
    norm === 'automacoes' ||
    norm === 'abrir automacoes' ||
    norm.includes('ir para automacoes') ||
    norm.includes('navegar para automacoes')
  ) {
    return {
      module: 'app_control',
      action: 'navigate_section',
      params: { section: 'automacoes' },
      confidence: 0.95,
      offlineReply: 'A navegar para Automações e Aplicativos.',
    };
  }

  // App navigation commands (system shortcuts + any installed app)
  if (norm.includes('definicoes') || norm.includes('configuracoes')) {
    return {
      module: 'app_control',
      action: 'open_app',
      params: { app: 'Definições' },
      confidence: 0.95,
    };
  }
  if (norm.includes('galeria')) {
    return {
      module: 'app_control',
      action: 'open_app',
      params: { app: 'Galeria' },
      confidence: 0.95,
    };
  }
  if (norm.includes('camara') || norm.includes('camera')) {
    return {
      module: 'app_control',
      action: 'open_app',
      params: { app: 'Câmara' },
      confidence: 0.95,
    };
  }
  if (norm.includes('ecra inicial') || norm.includes('inicio') || norm.includes('assistente')) {
    return {
      module: 'app_control',
      action: 'go_home',
      params: {},
      confidence: 0.95,
      offlineReply: 'De volta ao ecrã principal do NEXUS AI.',
    };
  }
  if (
    norm === 'voltar' ||
    norm === 'voltar atras' ||
    norm.includes('ecra anterior') ||
    norm.includes('seccao anterior') ||
    norm.includes('menu anterior')
  ) {
    return {
      module: 'app_control',
      action: 'navigate_back',
      params: {},
      confidence: 0.96,
      offlineReply: 'A voltar ao ecrã anterior.',
    };
  }
  if (
    norm === 'expandir' ||
    norm.includes('expandir painel') ||
    norm.includes('expandir conversa') ||
    norm.includes('modo expandido') ||
    norm.includes('ecra inteiro')
  ) {
    return {
      module: 'app_control',
      action: 'expand_view',
      params: {},
      confidence: 0.96,
      offlineReply: 'Painel expandido.',
    };
  }
  if (
    norm === 'recolher' ||
    norm === 'minimizar' ||
    norm.includes('recolher painel') ||
    norm.includes('vista normal') ||
    norm.includes('fechar expansao')
  ) {
    return {
      module: 'app_control',
      action: 'collapse_view',
      params: {},
      confidence: 0.96,
      offlineReply: 'Painel recolhido para vista normal.',
    };
  }
  if (
    norm.includes('mostrar gestos') ||
    norm.includes('guia de gestos') ||
    norm.includes('abrir gestos') ||
    norm.includes('quais sao os gestos')
  ) {
    return {
      module: 'app_control',
      action: 'open_gesture_guide',
      params: {},
      confidence: 0.96,
      offlineReply: 'Abri o guia de navegação por gestos e voz.',
    };
  }
  if (norm.includes('ativar gestos') || norm.includes('ligar gestos')) {
    return {
      module: 'settings',
      action: 'set_gestures_enabled',
      params: { enabled: true },
      confidence: 0.96,
      offlineReply: 'Navegação por gestos ativada.',
    };
  }
  if (norm.includes('desativar gestos') || norm.includes('desligar gestos')) {
    return {
      module: 'settings',
      action: 'set_gestures_enabled',
      params: { enabled: false },
      confidence: 0.96,
      offlineReply: 'Navegação por gestos desativada.',
    };
  }

  const openAppMatch = rawInput
    .trim()
    .match(/^(?:abrir|abre|iniciar|inicia|executar|executa|lancar|lanca)\s+(?:o|a|os|as)?\s*(.+)$/i);
  if (openAppMatch && openAppMatch[1]) {
    return {
      module: 'app_control',
      action: 'open_installed_app',
      params: { appQuery: openAppMatch[1].trim() },
      confidence: 0.94,
    };
  }

  return {
    module: 'conversation',
    action: 'chat',
    params: { text: rawInput },
    confidence: 0.5,
  };
}
