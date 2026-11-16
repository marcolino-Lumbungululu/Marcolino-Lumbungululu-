import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Lightbulb,
  Mic,
  MicOff,
  Music,
  Search,
  Sparkles,
  Square,
  Upload,
  Video,
  Volume2,
} from 'lucide-react';
import type { DeviceFile, FileCategory } from '../types/nexus.ts';
import {
  categorizeFileByNameAndMime,
  FILE_CATEGORIES,
  formatFileSize,
  searchDeviceFiles,
} from '../modules/fileLogic.ts';

interface FileExplorerAndReaderProps {
  files: DeviceFile[];
  selectedFile: DeviceFile | null;
  currentPage: number;
  isReadingAloud: boolean;
  aiAnalysis: string;
  isAnalyzing: boolean;
  searchFilter: string;
  categoryFilter: 'Todos' | FileCategory;
  isListening?: boolean;
  voicePromptImport?: 'file' | 'folder' | null;
  onSearchFilterChange: (q: string) => void;
  onCategoryFilterChange: (cat: 'Todos' | FileCategory) => void;
  onSelectFile: (file: DeviceFile) => void;
  onPageChange: (page: number) => void;
  onReadAloud: () => void;
  onStopReading: () => void;
  onAnalyzeDocument: (task: 'summarize' | 'explain') => void;
  onAddFiles: (newFiles: Omit<DeviceFile, 'id' | 'createdAt'>[]) => void;
  onToggleListen?: () => void;
  onVoiceCommand?: (command: string) => void;
  onDismissVoicePrompt?: () => void;
}

export const FileExplorerAndReader: React.FC<FileExplorerAndReaderProps> = ({
  files,
  selectedFile,
  currentPage,
  isReadingAloud,
  aiAnalysis,
  isAnalyzing,
  searchFilter,
  categoryFilter,
  isListening = false,
  voicePromptImport = null,
  onSearchFilterChange,
  onCategoryFilterChange,
  onSelectFile,
  onPageChange,
  onReadAloud,
  onStopReading,
  onAnalyzeDocument,
  onAddFiles,
  onToggleListen,
  onVoiceCommand,
  onDismissVoicePrompt,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const filteredFiles = useMemo(
    () =>
      searchDeviceFiles(files, {
        query: searchFilter,
        category: categoryFilter,
      }),
    [files, searchFilter, categoryFilter]
  );

  const handleImportFiles = async (fileList: FileList) => {
    setImportNotice('A processar ficheiros selecionados...');
    const imported: Omit<DeviceFile, 'id' | 'createdAt'>[] = [];

    for (const file of Array.from(fileList)) {
      const category = categorizeFileByNameAndMime(file.name, file.type);
      let pages: string[] = [];
      let objectUrl: string | undefined;

      if (category === 'Fotografias' || category === 'Vídeos' || category === 'Áudio') {
        objectUrl = URL.createObjectURL(file);
        pages = [`Ficheiro local (${file.type || category}): ${file.name}`];
      } else if (category === 'PDF') {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          for (let p = 1; p <= Math.min(pdf.numPages, 25); p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const text = content.items
              .map((item) => ('str' in item ? item.str : ''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            pages.push(text || `Página ${p} (conteúdo gráfico ou sem texto selecionável).`);
          }
        } catch {
          pages = [`Documento PDF "${file.name}" carregado localmente.`];
        }
      } else {
        try {
          const text = await file.text();
          const chunks = text.match(/[\s\S]{1,1200}/g) ?? [text];
          pages = chunks.slice(0, 20);
        } catch {
          pages = [`Documento "${file.name}" disponível no dispositivo.`];
        }
      }

      if (pages.length === 0) {
        pages = [`Conteúdo de "${file.name}" pronto para visualização.`];
      }

      imported.push({
        name: file.name,
        category,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        folderPath: '/Armazenamento Local',
        pages,
        pageCount: pages.length,
        lastPage: 1,
        objectUrl,
        lastOpenedAt: new Date().toISOString(),
      });
    }

    onAddFiles(imported);
    setImportNotice(`${imported.length} ficheiro(s) indexado(s) com sucesso.`);
  };

  const handleSelectDirectory = async () => {
    const picker = (window as unknown as {
      showDirectoryPicker?: () => Promise<{
        name: string;
        values: () => AsyncIterable<{ kind: string; name: string; getFile?: () => Promise<File> }>;
      }>;
    }).showDirectoryPicker;

    if (!picker) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const dirHandle = await picker();
      const loaded: Omit<DeviceFile, 'id' | 'createdAt'>[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.getFile) {
          const f = await entry.getFile();
          const cat = categorizeFileByNameAndMime(f.name, f.type);
          loaded.push({
            name: f.name,
            category: cat,
            mimeType: f.type || 'application/octet-stream',
            sizeBytes: f.size,
            folderPath: `/${dirHandle.name}`,
            pages: [`Ficheiro da pasta "${dirHandle.name}": ${f.name}`],
            pageCount: 1,
            lastPage: 1,
            objectUrl: cat === 'Fotografias' || cat === 'Vídeos' ? URL.createObjectURL(f) : undefined,
          });
        }
      }
      if (loaded.length > 0) {
        onAddFiles(loaded);
        setImportNotice(`Pasta "${dirHandle.name}" autorizada (${loaded.length} ficheiros).`);
      } else {
        setImportNotice(`Pasta "${dirHandle.name}" autorizada.`);
      }
    } catch {
      // User cancelled picker
    }
  };

  const pageText =
    selectedFile?.pages[Math.max(0, Math.min(currentPage - 1, selectedFile.pages.length - 1))] ??
    '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: File Explorer */}
      <section
        aria-label="Gestor de Ficheiros Inteligente"
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Gestor de Ficheiros
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredFiles.length} de {files.length} ficheiros autorizados
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.doc,.docx,.epub,image/*,video/*,audio/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleImportFiles(e.target.files);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSelectDirectory()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Pasta</span>
            </button>
            {onToggleListen && (
              <button
                type="button"
                onClick={onToggleListen}
                aria-label={isListening ? 'Parar comando de voz nos ficheiros' : 'Aceder a ficheiros por voz'}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-500" />}
                <span>{isListening ? 'A ouvir...' : 'Por Voz'}</span>
              </button>
            )}
          </div>
        </div>

        {voicePromptImport && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {voicePromptImport === 'folder'
                ? 'Por segurança do navegador, confirma abaixo para autorizar o acesso a uma pasta local:'
                : 'Por segurança do navegador, confirma abaixo para selecionar um ficheiro do dispositivo:'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onDismissVoicePrompt?.();
                  if (voicePromptImport === 'folder') {
                    void handleSelectDirectory();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white cursor-pointer"
              >
                {voicePromptImport === 'folder' ? 'Autorizar Pasta' : 'Selecionar Ficheiro'}
              </button>
              <button
                type="button"
                onClick={() => onDismissVoicePrompt?.()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {onVoiceCommand && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              'Abrir o último PDF',
              'Abrir o ficheiro Cálculo',
              'Ler o documento Matemática',
              'Mostrar ficheiros descarregados',
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => onVoiceCommand(cmd)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-600/15 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>
        )}

        {importNotice && (
          <p className="text-xs text-blue-600 dark:text-blue-400">{importNotice}</p>
        )}

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <label htmlFor="file-search-input" className="sr-only">
            Pesquisar ficheiros e documentos
          </label>
          <input
            id="file-search-input"
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchFilterChange(e.target.value)}
            placeholder="Procurar por nome, tema ou pasta..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryFilterChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[440px] overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum ficheiro encontrado nesta categoria.
            </p>
          ) : (
            filteredFiles.map((file) => {
              const active = selectedFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelectFile(file)}
                  className={`w-full py-3 px-2.5 flex items-start gap-3 text-left rounded-xl transition-colors cursor-pointer ${
                    active ? 'bg-blue-600/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    {file.category === 'Fotografias' ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : file.category === 'Vídeos' ? (
                      <Video className="w-4 h-4" />
                    ) : file.category === 'Áudio' ? (
                      <Music className="w-4 h-4" />
                    ) : file.category === 'Livros Digitais' ? (
                      <BookOpen className="w-4 h-4" />
                    ) : file.category === 'Pastas' ? (
                      <FolderOpen className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                      {file.category} · {file.folderPath} · {formatFileSize(file.sizeBytes)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Right: Document Reader & Gemini Analysis */}
      <section
        aria-label="Leitor de Documentos e Análise Inteligente"
        className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/70 p-6 flex flex-col min-h-[580px]"
      >
        {!selectedFile ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-12 h-12 text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Seleciona um documento ou PDF
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Podes abrir apontamentos, livros ou PDFs locais para leitura em voz alta, resumo automático e explicação com Gemini.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {selectedFile.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                  {selectedFile.category} · {selectedFile.folderPath} · Página {currentPage} de{' '}
                  {selectedFile.pageCount}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Página anterior"
                  className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono tabular-nums px-2 text-slate-700 dark:text-slate-300">
                  {currentPage}/{selectedFile.pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(selectedFile.pageCount, currentPage + 1))}
                  disabled={currentPage >= selectedFile.pageCount}
                  aria-label="Próxima página"
                  className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="py-3 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
              {isReadingAloud ? (
                <button
                  type="button"
                  onClick={onStopReading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Parar Leitura</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onReadAloud}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Ler em Voz Alta</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onAnalyzeDocument('summarize')}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span>Resumir Capítulo</span>
              </button>

              <button
                type="button"
                onClick={() => onAnalyzeDocument('explain')}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                <span>Explicar Conteúdo</span>
              </button>
            </div>

            {/* Document Content Area */}
            <div className="flex-1 py-5 space-y-4 overflow-y-auto">
              {selectedFile.category === 'Fotografias' && selectedFile.objectUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72">
                  <img
                    src={selectedFile.objectUrl}
                    alt={selectedFile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain bg-slate-950"
                  />
                </div>
              )}

              {selectedFile.category === 'Vídeos' && selectedFile.objectUrl && (
                <video
                  src={selectedFile.objectUrl}
                  controls
                  className="w-full rounded-xl max-h-72 bg-black"
                />
              )}

              <article className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-5 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {pageText}
              </article>

              {(isAnalyzing || aiAnalysis) && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-violet-700 dark:text-violet-300">
                    <span>Análise Inteligente Gemini</span>
                    {isAnalyzing && <span>A processar com raciocínio avançado...</span>}
                  </div>
                  {aiAnalysis && (
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {aiAnalysis}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
