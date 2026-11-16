import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalRagContextBlock,
  buildScienceSystemInstruction,
  detectNumericalOrDerivationNeed,
  extractGroundingSources,
  normalizeIntelligenceMode,
  normalizeLearnerDepth,
  selectScienceModelPlan,
} from './nexusAIEngineLogic.ts';

test('normalizes intelligence modes and learner depth accurately', () => {
  assert.equal(normalizeIntelligenceMode('fast'), 'FAST');
  assert.equal(normalizeIntelligenceMode('rápido'), 'FAST');
  assert.equal(normalizeIntelligenceMode('professor'), 'PROFESSOR');
  assert.equal(normalizeIntelligenceMode('tutor'), 'PROFESSOR');
  assert.equal(normalizeIntelligenceMode('unknown'), 'ADVANCED');

  assert.equal(normalizeLearnerDepth('iniciante'), 'INICIANTE');
  assert.equal(normalizeLearnerDepth('simples'), 'INICIANTE');
  assert.equal(normalizeLearnerDepth('avançado'), 'AVANCADO');
  assert.equal(normalizeLearnerDepth('other'), 'INTERMEDIO');
});

test('selects model plan with computation and search tools per mode', () => {
  const fastPlan = selectScienceModelPlan({
    mode: 'FAST',
    question: 'Calcula a resistência para U=12V e I=3A',
    enableWebSearch: false,
    enableCodeVerification: true,
  });
  assert.equal(fastPlan.model, 'gemini-4-hydrogen');
  assert.equal(fastPlan.useCodeExecution, false);

  const advMathPlan = selectScienceModelPlan({
    mode: 'ADVANCED',
    question: 'Resolve a equação diferencial dy/dx + 2y = 6',
    enableWebSearch: true,
    enableCodeVerification: true,
  });
  assert.equal(advMathPlan.model, 'gemini-4-hydrogen');
  assert.equal(advMathPlan.useCodeExecution, true);
  assert.equal(advMathPlan.useGoogleSearch, true);

  assert.equal(detectNumericalOrDerivationNeed('Explicar a estrutura atómica'), false);
  assert.equal(
    detectNumericalOrDerivationNeed('Um carro parte do repouso com aceleração 2 m/s²'),
    true
  );
});

test('system instruction includes 8-step scientific solver and Professor Nexus rules', () => {
  const prompt = buildScienceSystemInstruction({
    mode: 'PROFESSOR',
    learnerDepth: 'INICIANTE',
    language: 'pt-AO',
    userName: 'Marcolino',
    hasLocalKnowledge: true,
    enableWebSearch: true,
  });
  assert.match(prompt, /MODO PROFESSOR NEXUS ATIVO/);
  assert.match(prompt, /1\. Identificação do problema/);
  assert.match(prompt, /8\. Interpretação científica do resultado/);
  assert.match(prompt, /Base de Conhecimento Local/);
  assert.match(prompt, /Marcolino/);
});

test('builds local RAG context block and deduplicates grounding sources', () => {
  const rag = buildLocalRagContextBlock([
    {
      title: 'Lei de Ohm',
      subject: 'Física',
      excerpt: 'R = U / I em condutores óhmicos.',
      sourceType: 'DOCUMENTO_LOCAL',
    },
  ]);
  assert.match(rag, /Fonte Local #1/);
  assert.match(rag, /Lei de Ohm/);

  const sources = extractGroundingSources([
    { web: { uri: 'https://example.org/ohm', title: 'Lei de Ohm' } },
    { web: { uri: 'https://example.org/ohm', title: 'Duplicado' } },
    { web: { uri: 'https://example.org/physics', title: 'Física' } },
  ]);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].title, 'Lei de Ohm');
});
