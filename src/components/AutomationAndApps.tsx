import React, { useRef, useState } from 'react';
import {
  Bluetooth,
  Camera,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Play,
  Plus,
  Settings,
  Volume1,
  Volume2,
  X,
} from 'lucide-react';
import type { AutomationRoutine, AutomationStep } from '../types/nexus.ts';

interface AutomationAndAppsProps {
  automations: AutomationRoutine[];
  lastDeviceNotice: string | null;
  volume: number;
  onRunAutomation: (routine: AutomationRoutine) => void;
  onCreateAutomation: (routine: Omit<AutomationRoutine, 'id' | 'lastRunAt'>) => void;
  onAppAction: (action: string, label: string) => void;
  onCapturePhoto: (dataUrl: string) => void;
  onOpenAppPermissions: () => void;
}

export const AutomationAndApps: React.FC<AutomationAndAppsProps> = ({
  automations,
  lastDeviceNotice,
  volume,
  onRunAutomation,
  onCreateAutomation,
  onAppAction,
  onCapturePhoto,
  onOpenAppPermissions,
}) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [selectedAction, setSelectedAction] = useState<AutomationStep['action']>('open_last_pdf');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !trigger.trim()) return;
    const steps: AutomationStep[] = [
      { id: 'c1', action: 'set_volume', label: 'Ajustar volume para 50%', value: 0.5 },
      {
        id: 'c2',
        action: selectedAction,
        label:
          selectedAction === 'open_last_pdf'
            ? 'Abrir último documento PDF'
            : selectedAction === 'play_category'
            ? 'Iniciar Música Cristã'
            : 'Ativar modo silencioso',
        value: selectedAction === 'play_category' ? 'Música Cristã' : true,
      },
    ];
    onCreateAutomation({
      name: name.trim(),
      triggerPhrase: trigger.trim(),
      description: `Sequência personalizada ativada por "${trigger.trim()}".`,
      steps,
      isActive: true,
    });
    setName('');
    setTrigger('');
    setShowBuilder(false);
  };

  const openCamera = async () => {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'A câmara não pôde ser iniciada neste dispositivo ou a permissão foi recusada.'
      );
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      onCapturePhoto(url);
      closeCamera();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Automation Routines */}
      <section
        aria-label="Sistema de Automação"
        className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Sistema de Automação por Voz
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sequências integradas de comandos executáveis por voz ou toque
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBuilder((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Rotina</span>
          </button>
        </div>

        {showBuilder && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="auto-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome da rotina
                </label>
                <input
                  id="auto-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Leitura Noturna"
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="auto-trigger" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Comando de voz
                </label>
                <input
                  id="auto-trigger"
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="Ex.: Modo leitura"
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auto-action" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ação principal
              </label>
              <select
                id="auto-action"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as AutomationStep['action'])}
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                <option value="open_last_pdf">Abrir último PDF utilizado</option>
                <option value="play_category">Iniciar Música Cristã</option>
                <option value="toggle_silent_mode">Ativar modo silencioso</option>
              </select>
            </div>

            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
            >
              Guardar Automação
            </button>
          </form>
        )}

        <div className="space-y-4">
          {automations.map((routine) => (
            <div
              key={routine.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {routine.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Frase de ativação: "{routine.triggerPhrase}" · {routine.steps.length} passos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRunAutomation(routine)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Executar Agora</span>
                </button>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300">{routine.description}</p>

              <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {routine.steps.map((step, idx) => (
                  <li key={step.id} className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      0{idx + 1}.
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Right: App Launcher & System Controls */}
      <section
        aria-label="Controlo de Aplicações e Dispositivo"
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Aplicações e Controlo do Sistema
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Execução direta via APIs autorizadas e transparência de restrições
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAppPermissions}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-600/25 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Permissões dos Apps
          </button>
        </div>

        {lastDeviceNotice && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {lastDeviceNotice}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onAppAction('open_whatsapp', 'WhatsApp')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white">WhatsApp</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onAppAction('open_youtube', 'YouTube')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white">YouTube</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onAppAction('open_facebook', 'Facebook')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white">Facebook</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onAppAction('open_gallery', 'Galeria')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white">Galeria</span>
            <ImageIcon className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => void openCamera()}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white">Câmara</span>
            <Camera className="w-4 h-4 text-blue-500" />
          </button>

          <button
            type="button"
            onClick={() => onAppAction('open_settings', 'Definições')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white">Definições</span>
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* System Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 tabular-nums">
              Volume Geral ({Math.round(volume * 100)}%)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAppAction('volume_down', 'Diminuir volume')}
                aria-label="Diminuir volume"
                className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Volume1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onAppAction('volume_up', 'Aumentar volume')}
                aria-label="Aumentar volume"
                className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Bluetooth</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAppAction('bluetooth_on', 'Ativar Bluetooth')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Ativar
              </button>
              <button
                type="button"
                onClick={() => onAppAction('bluetooth_off', 'Desligar Bluetooth')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Desligar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAppAction('go_home', 'Ecrã inicial')}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Voltar ao Ecrã Inicial do Assistente</span>
          </button>
        </div>

        {/* Camera Capture Panel */}
        {cameraOpen && (
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-medium">Câmara NEXUS</span>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Fechar câmara"
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {cameraError ? (
              <p className="text-xs text-rose-400">{cameraError}</p>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-black max-h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={takePhoto}
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
                >
                  Capturar Fotografia para Galeria
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
