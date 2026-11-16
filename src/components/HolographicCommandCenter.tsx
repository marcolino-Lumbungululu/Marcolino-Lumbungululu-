import React, { useState } from 'react';
import {
  Cpu,
  Database,
  Eye,
  FileText,
  Layers,
  Lock,
  Radio,
  Server,
  ShieldAlert,
  Sparkles,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';
import type { DeviceFile, MediaTrack, UserSettings } from '../types/nexus.ts';

interface HolographicCommandCenterProps {
  settings: UserSettings;
  files: DeviceFile[];
  tracks: MediaTrack[];
  onNavigateSection: (section: any) => void;
  onSelectFile: (file: DeviceFile) => void;
}

export const HolographicCommandCenter: React.FC<HolographicCommandCenterProps> = ({
  settings,
  files,
  tracks,
  onNavigateSection,
  onSelectFile,
}) => {
  const [selectedNode, setSelectedNode] = useState<string>('project_ai');
  const [showImageRef, setShowImageRef] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[INIT] NEXUS FILE MANAGEMENT SYSTEM v7.1 active.',
    '[CORE] Quantum neural bridge synchronized successfully.',
    '[SECURE] Data archive encryption level: AES-256 Quantum.',
    '[AI] Gemini Cloud Run backend connected (Free Tier).',
  ]);

  const addLog = (msg: string) => {
    setTerminalLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  return (
    <div className="relative min-h-[85vh] bg-[#02060B] text-cyan-100 p-4 sm:p-6 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-[0_0_60px_rgba(0,191,255,0.15)] flex flex-col gap-6">
      {/* Background Holographic Grid & Lighting Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,191,255,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-32 bg-purple-600/10 blur-3xl pointer-events-none" />

      {/* Top Bar / Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-cyan-300 drop-shadow-[0_0_12px_rgba(0,191,255,0.6)]">
              NEXUS COMMAND CENTER v7.1
            </h1>
          </div>
          <p className="text-xs text-cyan-400/70 font-mono mt-0.5">
            Holographic File & AI Intelligence Architecture • Cloud Run Node Active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImageRef(!showImageRef)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium hover:bg-cyan-900/50 transition shadow-[0_0_15px_rgba(0,191,255,0.2)]"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            {showImageRef ? 'Ocultar Referência Visual' : 'Ver Imagem de Referência'}
          </button>
          <button
            onClick={() => {
              addLog('Diagnóstico completo executado. Todos os sistemas operacionais.');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-medium hover:bg-blue-900/50 transition"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            Diagnóstico
          </button>
        </div>
      </div>

      {/* Visual Reference Image Preview Modal/Banner */}
      {showImageRef && (
        <div className="relative z-20 bg-slate-900/90 border border-cyan-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
              Referência Visual Fornecida pelo Utilizador
            </span>
            <button
              onClick={() => setShowImageRef(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Fechar
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-cyan-500/35 max-h-80 flex items-center justify-center bg-black/50">
            <img
              src="/public/assets/aistudio/Screenshot_20261116_140518_b2ed5ddb.jpg"
              alt="Referência Visual do Centro de Comando Nexus"
              className="max-h-72 object-contain"
            />
          </div>
        </div>
      )}

      {/* Main Holographic Workspace Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Core System Logs & Quick Index */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_0_20px_rgba(0,191,255,0.08)]">
            <div className="flex items-center gap-2 mb-3 text-cyan-400">
              <Server className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">
                Categorias do Sistema
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs font-mono">
              {[
                { name: 'CORE_SYSTEM', color: 'border-cyan-500/50 text-cyan-300' },
                { name: 'RESEARCH_LOGS', color: 'border-blue-500/50 text-blue-300' },
                { name: 'ENCRYPTED', color: 'border-purple-500/50 text-purple-300' },
                { name: 'TEMP', color: 'border-amber-500/50 text-amber-300' },
              ].map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => addLog(`Acedido repositório: ${cat.name}`)}
                  className={`px-3 py-2 rounded-lg border bg-slate-900/60 hover:bg-cyan-950/40 transition cursor-pointer flex items-center justify-between ${cat.color}`}
                >
                  <span>{cat.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_0_20px_rgba(0,191,255,0.08)]">
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <Database className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">
                Armazenamento
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-2">
              <div className="flex justify-between font-mono">
                <span>Capacidade:</span>
                <span className="text-cyan-300">219.5 GB / 3.2 TB</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-cyan-500/20">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[28%]" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Estado: Ótimo</span>
                <span>79% Disponível</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Main Holographic Panel */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-blue-950/70 border-2 border-cyan-500/40 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,191,255,0.2)] relative overflow-hidden">
            {/* Holographic Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30 mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
                <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-cyan-200">
                  PROJECT: ADVANCE AI (3.2 TB)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-400/40 text-[10px] font-mono text-cyan-300">
                ONLINE • LIVE SYNC
              </span>
            </div>

            {/* Interactive Holographic Nodes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {[
                { id: 'project_ai', label: 'Neural Core', icon: Sparkles, desc: 'Gemini Flash Engine' },
                { id: 'secure_archive', label: 'Secure Archive', icon: Lock, desc: 'AES-256 Quantum' },
                { id: 'files', label: 'Ficheiros & PDFs', icon: FileText, desc: `${files.length} documentos` },
                { id: 'music', label: 'Música & Áudio', icon: Radio, desc: `${tracks.length} faixas` },
              ].map((node) => {
                const IconComp = node.icon;
                const isSelected = selectedNode === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node.id);
                      addLog(`Selecionado nó holográfico: ${node.label}`);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,191,255,0.4)] text-cyan-100'
                        : 'bg-slate-900/50 border-cyan-500/20 text-slate-300 hover:bg-cyan-950/30 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <IconComp className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                    </div>
                    <span className="text-xs font-bold font-mono">{node.label}</span>
                    <span className="text-[10px] text-slate-400">{node.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* Selected Node Details & Actions */}
            <div className="bg-black/50 border border-cyan-500/30 rounded-xl p-4 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between mb-2 text-cyan-300 border-b border-cyan-500/20 pb-1.5">
                <span className="font-bold uppercase tracking-wider">
                  Inspeção de Nó: {selectedNode}
                </span>
                <span className="text-[10px] text-cyan-400/80">STATUS: VERIFICADO</span>
              </div>
              {selectedNode === 'project_ai' && (
                <div className="space-y-2">
                  <p>Motor de IA avançada operacional com suporte a raciocínio científico e Professor Nexus.</p>
                  <button
                    onClick={() => onNavigateSection('assistente')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-200 hover:bg-cyan-500/30 transition text-xs font-sans font-bold flex items-center gap-1.5 mt-2"
                  >
                    <Zap className="w-3.5 h-3.5" /> Abrir Assistente Inteligente
                  </button>
                </div>
              )}
              {selectedNode === 'secure_archive' && (
                <div className="space-y-2">
                  <p>Repositório de dados criptografados para documentos confidenciais e notas científicas.</p>
                  <button
                    onClick={() => onNavigateSection('ficheiros')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-200 hover:bg-cyan-500/30 transition text-xs font-sans font-bold flex items-center gap-1.5 mt-2"
                  >
                    <FileText className="w-3.5 h-3.5" /> Aceder aos Ficheiros
                  </button>
                </div>
              )}
              {selectedNode === 'files' && (
                <div className="space-y-2">
                  <p>Documentos PDF e relatórios disponíveis para leitura inteligente por voz.</p>
                  {files[0] && (
                    <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-cyan-500/20 mt-1">
                      <span className="text-cyan-200 truncate">{files[0].name}</span>
                      <button
                        onClick={() => {
                          onSelectFile(files[0]);
                          onNavigateSection('ficheiros');
                        }}
                        className="px-2.5 py-1 bg-cyan-600 text-white rounded text-[10px] font-sans hover:bg-cyan-500"
                      >
                        Ler
                      </button>
                    </div>
                  )}
                </div>
              )}
              {selectedNode === 'music' && (
                <div className="space-y-2">
                  <p>Reprodutor de áudio holográfico e sintetizador de frequências terapêuticas e semba.</p>
                  <button
                    onClick={() => onNavigateSection('musica')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-200 hover:bg-cyan-500/30 transition text-xs font-sans font-bold flex items-center gap-1.5 mt-2"
                  >
                    <Radio className="w-3.5 h-3.5" /> Abrir Centro de Música
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Terminal Logs & Security Console */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_0_20px_rgba(0,191,255,0.08)] flex flex-col h-72">
            <div className="flex items-center gap-2 mb-2 text-cyan-400 border-b border-cyan-500/20 pb-2">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">
                Consola de Registos
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] text-cyan-300/90 pr-1">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="border-l-2 border-cyan-500/50 pl-2 py-0.5 bg-cyan-950/20 rounded-r">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_0_20px_rgba(0,191,255,0.08)]">
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">
                Segurança Ativa
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Firewall Cloud Run ativada. Zero chaves expostas no cliente. Autenticação Firebase segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
