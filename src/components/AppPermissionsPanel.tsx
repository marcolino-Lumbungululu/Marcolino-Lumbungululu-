import React, { useMemo, useState } from 'react';
import {
  Bell,
  FolderOpen,
  Lock,
  Mic,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { InstalledAppCategory, InstalledAppPermission } from '../types/nexus.ts';
import {
  APP_CATEGORIES,
  filterInstalledApps,
} from '../modules/appPermissionsLogic.ts';

interface AppPermissionsPanelProps {
  apps: InstalledAppPermission[];
  onUpdateAppPermission: (updated: InstalledAppPermission) => void;
  onBulkUpdateApps: (mode: 'allow_safe' | 'protect_finance' | 'block_all') => void;
  onTestLaunchApp: (app: InstalledAppPermission) => void;
}

export const AppPermissionsPanel: React.FC<AppPermissionsPanelProps> = ({
  apps,
  onUpdateAppPermission,
  onBulkUpdateApps,
  onTestLaunchApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | InstalledAppCategory>('Todas');
  const [policyFilter, setPolicyFilter] = useState<'all' | 'voice_allowed' | 'voice_blocked' | 'protected'>('all');

  const filteredApps = useMemo(
    () =>
      filterInstalledApps(apps, {
        query: searchQuery,
        category: selectedCategory,
        policyFilter,
      }),
    [apps, searchQuery, selectedCategory, policyFilter]
  );

  const voiceAllowedCount = useMemo(
    () => apps.filter((a) => a.canLaunchByVoice).length,
    [apps]
  );
  const protectedCount = useMemo(
    () => apps.filter((a) => a.requireConfirmation).length,
    [apps]
  );

  const toggleField = (
    app: InstalledAppPermission,
    field: keyof Pick<
      InstalledAppPermission,
      | 'canLaunchByVoice'
      | 'requireConfirmation'
      | 'allowMicrophone'
      | 'allowFiles'
      | 'allowNotifications'
      | 'allowBackground'
    >
  ) => {
    onUpdateAppPermission({
      ...app,
      [field]: !app[field],
    });
  };

  return (
    <section
      aria-label="Configurações de Permissões dos Aplicativos"
      className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Permissões dos Aplicativos Instalados
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {apps.length} aplicativos configurados · {voiceAllowedCount} autorizados por voz ·{' '}
            {protectedCount} com confirmação obrigatória
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onBulkUpdateApps('protect_finance')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-violet-600/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 hover:bg-violet-600/25 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Proteger Financeiros e Segurança</span>
          </button>
          <button
            type="button"
            onClick={() => onBulkUpdateApps('allow_safe')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permitir Todos por Voz</span>
          </button>
          <button
            type="button"
            onClick={() => onBulkUpdateApps('block_all')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/15 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bloquear Voz em Todos</span>
          </button>
        </div>
      </div>

      {/* Search + Policy Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <label htmlFor="app-perm-search" className="sr-only">
            Pesquisar aplicativo instalado
          </label>
          <input
            id="app-perm-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Procurar aplicativo (ex.: PayPay AO, UNITEL Money, VLC, Hinário)..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <label htmlFor="app-policy-filter" className="sr-only">
          Filtrar por estado de permissão
        </label>
        <select
          id="app-policy-filter"
          value={policyFilter}
          onChange={(e) =>
            setPolicyFilter(
              e.target.value as 'all' | 'voice_allowed' | 'voice_blocked' | 'protected'
            )
          }
          className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todos os Estados</option>
          <option value="voice_allowed">Abertura por Voz Permitida</option>
          <option value="voice_blocked">Abertura por Voz Bloqueada</option>
          <option value="protected">Exigem Confirmação</option>
        </select>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {APP_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Apps List */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[540px] overflow-y-auto pr-1">
        {filteredApps.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Nenhum aplicativo corresponde à pesquisa atual.
          </p>
        ) : (
          filteredApps.map((app) => (
            <div
              key={app.id}
              className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {app.name}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {app.category} · {app.packageHint}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {app.description}
                </p>
              </div>

              {/* Granular Permissions Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleField(app, 'canLaunchByVoice')}
                  aria-pressed={app.canLaunchByVoice}
                  aria-label={`Abertura por voz para ${app.name}`}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    app.canLaunchByVoice
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {app.canLaunchByVoice ? 'Voz: Permitido' : 'Voz: Bloqueado'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleField(app, 'requireConfirmation')}
                  aria-pressed={app.requireConfirmation}
                  aria-label={`Confirmar antes de abrir ${app.name}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    app.requireConfirmation
                      ? 'border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Confirmar</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleField(app, 'allowMicrophone')}
                  aria-pressed={app.allowMicrophone}
                  aria-label={`Permissão de microfone para ${app.name}`}
                  title="Acesso ao Microfone"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    app.allowMicrophone
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleField(app, 'allowFiles')}
                  aria-pressed={app.allowFiles}
                  aria-label={`Permissão de ficheiros para ${app.name}`}
                  title="Acesso a Ficheiros"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    app.allowFiles
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleField(app, 'allowNotifications')}
                  aria-pressed={app.allowNotifications}
                  aria-label={`Permissão de notificações para ${app.name}`}
                  title="Notificações"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    app.allowNotifications
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleField(app, 'allowBackground')}
                  aria-pressed={app.allowBackground}
                  aria-label={`Execução em segundo plano para ${app.name}`}
                  title="Segundo Plano"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    app.allowBackground
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onTestLaunchApp(app)}
                  aria-label={`Testar abertura de ${app.name}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Testar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
