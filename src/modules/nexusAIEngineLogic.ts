import { ThinkingLevel } from '@google/genai';

export type IntelligenceMode = 'FAST' | 'ADVANCED' | 'PROFESSOR';
export type LearnerDepth = 'INICIANTE' | 'INTERMEDIO' | 'AVANCADO';

export interface LocalKnowledgeSnippet {
  title: string;
  subject: string;
  excerpt: string;
  sourceType?: string;
}

export interface ScienceAttachmentInput {
  mimeType: string;
  dataBase64: string;
  fileName?: string;
}

export interface ScienceQueryPayload {
  question: string;
  mode?: IntelligenceMode;
  learnerDepth?: LearnerDepth;
  language?: string;
  userName?: string;
  enableWebSearch?: boolean;
  enableCodeVerification?: boolean;
  history?: Array<{ role: string; content: string }>;
  localKnowledgeContext?: LocalKnowledgeSnippet[];
  attachments?: ScienceAttachmentInput[];
}

export interface ScienceModelConfigPlan {
  model: string;
  thinkingLevel: ThinkingLevel;
  useGoogleSearch: boolean;
  useCodeExecution: boolean;
}

const SCIENTIFIC_CALC_KEYWORDS = [
  'calcul',
  'equac',
  'deriv',
  'integr',
  'resolva',
  'resolve',
  'problema',
  'movimento',
  'acelerac',
  'velocidade',
  'ohm',
  'corrente',
  'tensao',
  'voltagem',
  'resistencia',
  'estequiometria',
  'mols',
  'massa',
  'energia',
  'probabilidade',
  'estatistica',
  'matriz',
  'raiz',
  'potencia',
  'forca',
  'trabalho',
  'lei de',
  'formula',
  'genetic',
  'cruzamento',
  'aleph',
  'dy/dx',
  'dx',
  '=',
];

export function normalizeIntelligenceMode(raw?: string | null): IntelligenceMode {
  const upper = String(raw ?? '').trim().toUpperCase();
  if (upper === 'FAST' || upper === 'RAPIDO' || upper === 'RÁPIDO') return 'FAST';
  if (upper === 'PROFESSOR' || upper === 'TUTOR') return 'PROFESSOR';
  return 'ADVANCED';
}

export function normalizeLearnerDepth(raw?: string | null): LearnerDepth {
  const upper = String(raw ?? '').trim().toUpperCase();
  if (upper === 'INICIANTE' || upper === 'BEGINNER' || upper === 'SIMPLES') return 'INICIANTE';
  if (upper === 'AVANCADO' || upper === 'AVANÇADO' || upper === 'EXPERT') return 'AVANCADO';
  return 'INTERMEDIO';
}

export function detectNumericalOrDerivationNeed(question: string): boolean {
  const normalized = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/\d/.test(normalized)) return true;
  return SCIENTIFIC_CALC_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function selectScienceModelPlan(params: {
  mode: IntelligenceMode;
  question: string;
  enableWebSearch: boolean;
  enableCodeVerification: boolean;
}): ScienceModelConfigPlan {
  const { mode, question, enableWebSearch, enableCodeVerification } = params;
  const needsComputation =
    enableCodeVerification && mode !== 'FAST' && detectNumericalOrDerivationNeed(question);

  if (mode === 'FAST') {
    return {
      model: 'gemini-flash-lite-latest',
      thinkingLevel: ThinkingLevel.LOW,
      useGoogleSearch: enableWebSearch,
      useCodeExecution: false,
    };
  }

  if (mode === 'PROFESSOR') {
    return {
      model: 'gemini-flash-lite-latest',
      thinkingLevel: ThinkingLevel.HIGH,
      useGoogleSearch: enableWebSearch,
      useCodeExecution: needsComputation,
    };
  }

  return {
    model: 'gemini-flash-lite-latest',
    thinkingLevel: ThinkingLevel.HIGH,
    useGoogleSearch: enableWebSearch,
    useCodeExecution: needsComputation,
  };
}

export function buildScienceSystemInstruction(params: {
  mode: IntelligenceMode;
  learnerDepth: LearnerDepth;
  language: string;
  userName: string;
  hasLocalKnowledge: boolean;
  enableWebSearch: boolean;
}): string {
  const {
    mode,
    learnerDepth,
    language,
    userName,
    hasLocalKnowledge,
    enableWebSearch,
  } = params;

  const depthGuidance =
    learnerDepth === 'INICIANTE'
      ? 'Adapta a explicação ao nível iniciante: parte do zero, usa analogias intuitivas e evita jargão sem o definir primeiro.'
      : learnerDepth === 'AVANCADO'
      ? 'Adapta a explicação ao nível avançado/universitário: inclui rigor formal, deduções completas, casos limite e nuances científicas.'
      : 'Adapta a explicação ao nível intermédio: equilibra clareza didática com rigor científico e fórmulas essenciais.';

  const modeSection =
    mode === 'FAST'
      ? [
          'MODO RÁPIDO ATIVO:',
          '- Fornece respostas diretas, precisas e concisas sem perder correção científica.',
          '- Se for um cálculo simples, mostra a fórmula principal, substituição e resultado final claro.',
        ].join('\n')
      : mode === 'PROFESSOR'
      ? [
          'MODO PROFESSOR NEXUS ATIVO:',
          '- Atua como um professor particular brilhante, paciente e rigoroso.',
          '- Ensina desde os fundamentos até ao conceito avançado.',
          '- Explica conceitos difíceis em linguagem clara e acessível, ligando-os a exemplos práticos do quotidiano.',
          '- Relaciona disciplinas (ex.: Matemática com Física, Química com Biologia) quando enriquecer a compreensão.',
          '- Quando apropriado ou pedido, propõe exercícios práticos, corrige respostas do estudante passo a passo identificando exatamente onde ocorreu eventual erro de raciocínio, apresenta demonstrações matemáticas completas, elabora resumos estruturados ou cria planos de aprendizagem por etapas.',
        ].join('\n')
      : [
          'MODO AVANÇADO ATIVO:',
          '- Produz análises científicas aprofundadas, rigorosas e bem estruturadas.',
          '- Compara teorias, hipóteses e modelos científicos quando aplicável, indicando limitações e evidências.',
        ].join('\n');

  const eightStepProtocol =
    mode === 'FAST'
      ? 'Quando resolveres cálculos numéricos curtos, verifica o resultado antes de responder.'
      : [
          'PROTOCOLO OBRIGATÓRIO PARA PROBLEMAS MATEMÁTICOS, FÍSICOS, QUÍMICOS OU QUANTITATIVOS:',
          'Sempre que a questão envolver cálculo, dedução quantitativa ou resolução de problema científico, organiza a resolução com os 8 passos numerados abaixo:',
          '1. Identificação do problema',
          '2. Dados fornecidos',
          '3. O que se pretende determinar',
          '4. Fórmula ou princípio científico aplicável',
          '5. Substituição dos valores (com unidades SI)',
          '6. Desenvolvimento dos cálculos',
          '7. Resultado final (com unidade e precisão adequada)',
          '8. Interpretação científica do resultado',
        ].join('\n');

  const epistemicRules = [
    'REGRAS DE VERACIDADE, RIGOR E FONTES:',
    '- NUNCA inventes cálculos, números, dados experimentais ou referências bibliográficas.',
    '- Distingue claramente factos científicos estabelecidos de hipóteses, modelos teóricos ou temas em debate.',
    enableWebSearch
      ? '- Usa a pesquisa na web (Google Search Grounding) quando precisares de factos atualizados ou confirmação de literatura científica.'
      : '- Pesquisa web desligada neste pedido; apoia-te no conhecimento científico verificado e nos materiais fornecidos.',
    hasLocalKnowledge
      ? '- FORAM FORNECIDOS CONTEÚDOS DA BASE LOCAL DO UTILIZADOR (Room/SQLite). Distingue explicitamente na resposta o que veio da "Base de Conhecimento Local" do que veio de "Conhecimento Científico Geral / Pesquisa Web".'
      : '- Se não houver informação suficiente para responder com segurança, reconhece explicitamente a incerteza.',
    '- Responde em português natural (' + language + '), tratando o utilizador por "' + userName + '" quando apropriado.',
  ].join('\n');

  return [
    'És o NexusAIEngine, o cérebro avançado de inteligência artificial científica e educativa do NEXUS AI.',
    'Áreas de especialização: Matemática (álgebra, aritmética, geometria, trigonometria, cálculo diferencial e integral, estatística, probabilidades, demonstrações), Física (mecânica, eletricidade, magnetismo, termodinâmica, óptica, ondas, física moderna, relatividade, quântica), Química (orgânica, inorgânica, físico-química, estequiometria, analítica), Biologia (anatomia, fisiologia, genética, citologia, microbiologia, evolução, ecologia, biologia molecular), Astronomia (sistema solar, estrelas, galáxias, cosmologia, astrofísica, buracos negros), além de Medicina, Engenharia, Informática, Geografia, História, Filosofia e Educação.',
    depthGuidance,
    modeSection,
    eightStepProtocol,
    epistemicRules,
  ].join('\n\n');
}

export function buildLocalRagContextBlock(snippets: LocalKnowledgeSnippet[] = []): string {
  if (!snippets.length) return '';
  const formatted = snippets.slice(0, 5).map((item, idx) => {
    const src = item.sourceType || 'Base Local Room';
    return `[Fonte Local #${idx + 1} | Área: ${item.subject} | Origem: ${src}] Título: ${item.title}\nConteúdo: ${item.excerpt.slice(0, 1200)}`;
  });
  return [
    '=== CONHECIMENTO LOCAL RECUPERADO DA BASE DO UTILIZADOR (RAG) ===',
    ...formatted,
    '=== FIM DO CONTEXTO LOCAL ===',
  ].join('\n\n');
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export function extractGroundingSources(
  groundingChunks: Array<{ web?: { uri?: string; title?: string } }> | undefined | null
): GroundingSource[] {
  if (!Array.isArray(groundingChunks)) return [];
  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const chunk of groundingChunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({
      title: chunk.web?.title?.trim() || uri,
      uri,
    });
  }
  return out;
}
