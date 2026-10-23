import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Play,
  RotateCcw,
  RefreshCw,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { ModuleType } from '../types/index.ts';

interface FileUploadZoneProps {
  module: ModuleType;
  fileA: File | null;
  fileB: File | null;
  onFilesUpdated: (files: { fileA: File | null; fileB: File | null }) => void;
  onExecutePipeline: (files: { fileA: File; fileB?: File }) => void;
  isProcessing: boolean;
  hasExistingData: boolean;
  hasDataToClear: boolean;
  isClearing: boolean;
  onClearAll: () => void;
  onRefresh?: () => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  module,
  fileA,
  fileB,
  onFilesUpdated,
  onExecutePipeline,
  isProcessing,
  hasExistingData,
  hasDataToClear,
  isClearing,
  onClearAll,
  onRefresh,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmRemoveTarget, setConfirmRemoveTarget] = useState<'A' | 'B' | null>(null);

  const inputRefA = useRef<HTMLInputElement>(null);
  const inputRefB = useRef<HTMLInputElement>(null);
  const replaceRefA = useRef<HTMLInputElement>(null);
  const replaceRefB = useRef<HTMLInputElement>(null);

  const requiresDualInput = module === 'reconciliation' || module === 'risk';

  const validateFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'json'].includes(ext || '')) {
      setErrorMsg(`Unsupported file format .${ext}. Please upload CSV, XLSX, or JSON.`);
      return false;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg(`File exceeds maximum size of 25MB.`);
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>, target: 'A' | 'B') => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!validateFile(file)) return;
      if (target === 'A') {
        onFilesUpdated({ fileA: file, fileB });
        if (!requiresDualInput) {
          onExecutePipeline({ fileA: file });
        }
      } else {
        onFilesUpdated({ fileA, fileB: file });
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!validateFile(file)) return;
      if (target === 'A') {
        onFilesUpdated({ fileA: file, fileB });
        if (!requiresDualInput) {
          onExecutePipeline({ fileA: file });
        }
      } else {
        onFilesUpdated({ fileA, fileB: file });
      }
    }
  };

  const handleRemoveFile = (target: 'A' | 'B') => {
    if (target === 'A') {
      onFilesUpdated({ fileA: null, fileB });
    } else {
      onFilesUpdated({ fileA, fileB: null });
    }
    setConfirmRemoveTarget(null);
  };

  const handleStartAnalysis = () => {
    if (!fileA) {
      setErrorMsg('Please upload the primary source file to proceed.');
      return;
    }
    if (module === 'reconciliation' && !fileB) {
      setErrorMsg('Reconciliation requires two datasets to compare (Source A and Source B).');
      return;
    }
    setErrorMsg(null);
    onExecutePipeline({ fileA, fileB: fileB || undefined });
  };

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-neo space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-neutral-100">
        <div>
          <h2 className="text-sm font-black text-black flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#FFD629] border border-black shadow-neo-sm">
              <UploadCloud className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            </div>
            <span>Workspace Document Management</span>
          </h2>
          <p className="text-[11px] font-semibold text-neutral-600 mt-1">
            Formats: <span className="font-mono text-black font-bold">CSV, XLSX, JSON</span> (isolated strictly to this module)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasExistingData && onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isProcessing || isClearing}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-black text-xs font-black transition flex items-center gap-1.5 disabled:opacity-40 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
              title="Re-run calculation with current files"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.5]" />
              Re-run
            </button>
          )}

          <button
            type="button"
            onClick={onClearAll}
            disabled={isProcessing || isClearing || !hasDataToClear}
            className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-white hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 text-rose-700 text-xs font-black transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-rose-700 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
            title={hasDataToClear ? "Clear all module data and start fresh" : "No data to clear for this module"}
            aria-label={`Clear all data for ${module}`}
          >
            {isClearing ? (
              <>
                <span className="w-3 h-3 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3 stroke-[2.5]" />
                <span>Clear All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-100 border-2 border-black text-rose-900 text-xs font-bold flex items-center gap-2 shadow-neo-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 stroke-[2.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Dropzones & File Items */}
      <div className={`grid ${requiresDualInput ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3`}>
        {/* Slot A */}
        <div>
          <input
            type="file"
            ref={inputRefA}
            onChange={(e) => handleFileInputChange(e, 'A')}
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
          />
          <input
            type="file"
            ref={replaceRefA}
            onChange={(e) => handleFileInputChange(e, 'A')}
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
          />

          {fileA ? (
            <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black flex items-center justify-between gap-3 shadow-neo-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#10B981] border border-black flex items-center justify-center text-black shrink-0 shadow-neo-sm">
                  <FileCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-black truncate">{fileA.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-mono mt-0.5 font-bold">
                    <span>{(fileA.size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="uppercase">{fileA.name.split('.').pop()}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-black">Ready</span>
                  </div>
                </div>
              </div>

              {confirmRemoveTarget === 'A' ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-black text-rose-700">Remove?</span>
                  <button
                    onClick={() => handleRemoveFile('A')}
                    className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-600 text-white border border-black hover:bg-rose-500 shadow-neo-sm"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmRemoveTarget(null)}
                    className="px-2 py-1 rounded-lg text-[10px] font-black bg-white text-black border border-black hover:bg-neutral-100 shadow-neo-sm"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => replaceRefA.current?.click()}
                    className="p-1.5 rounded-lg border border-black bg-white hover:bg-neutral-100 text-black transition shadow-neo-sm"
                    title="Replace this file"
                  >
                    <RefreshCw className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                  <button
                    onClick={() => setConfirmRemoveTarget('A')}
                    className="p-1.5 rounded-lg border border-black bg-white hover:bg-rose-100 text-rose-700 transition shadow-neo-sm"
                    title="Remove this file"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleFileDrop(e, 'A')}
              onClick={() => inputRefA.current?.click()}
              className="border-2 border-dashed border-neutral-400 hover:border-black rounded-xl p-5 text-center cursor-pointer bg-[#FFFDF8] hover:bg-yellow-50/50 transition group"
            >
              <FileSpreadsheet className="w-6 h-6 mx-auto text-neutral-600 group-hover:text-black mb-1.5 transition-colors stroke-[2]" />
              <p className="text-xs font-black text-black">
                {module === 'reconciliation'
                  ? 'Source A: Bank Statement'
                  : module === 'decision'
                  ? 'Credit Applications Dataset'
                  : module === 'risk'
                  ? 'Treasury Positions Dataset'
                  : 'Close Tasks Dataset'}
              </p>
              <p className="text-[10px] font-semibold text-neutral-600 mt-0.5">Click or drop CSV / XLSX</p>
            </div>
          )}
        </div>

        {/* Slot B (for dual-source modules) */}
        {requiresDualInput && (
          <div>
            <input
              type="file"
              ref={inputRefB}
              onChange={(e) => handleFileInputChange(e, 'B')}
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
            />
            <input
              type="file"
              ref={replaceRefB}
              onChange={(e) => handleFileInputChange(e, 'B')}
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
            />

            {fileB ? (
              <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black flex items-center justify-between gap-3 shadow-neo-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981] border border-black flex items-center justify-center text-black shrink-0 shadow-neo-sm">
                    <FileCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-black truncate">{fileB.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-mono mt-0.5 font-bold">
                      <span>{(fileB.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="uppercase">{fileB.name.split('.').pop()}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-black">Ready</span>
                    </div>
                  </div>
                </div>

                {confirmRemoveTarget === 'B' ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-black text-rose-700">Remove?</span>
                    <button
                      onClick={() => handleRemoveFile('B')}
                      className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-600 text-white border border-black hover:bg-rose-500 shadow-neo-sm"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmRemoveTarget(null)}
                      className="px-2 py-1 rounded-lg text-[10px] font-black bg-white text-black border border-black hover:bg-neutral-100 shadow-neo-sm"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => replaceRefB.current?.click()}
                      className="p-1.5 rounded-lg border border-black bg-white hover:bg-neutral-100 text-black transition shadow-neo-sm"
                      title="Replace this file"
                    >
                      <RefreshCw className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                    <button
                      onClick={() => setConfirmRemoveTarget('B')}
                      className="p-1.5 rounded-lg border border-black bg-white hover:bg-rose-100 text-rose-700 transition shadow-neo-sm"
                      title="Remove this file"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(e, 'B')}
                onClick={() => inputRefB.current?.click()}
                className="border-2 border-dashed border-neutral-400 hover:border-black rounded-xl p-5 text-center cursor-pointer bg-[#FFFDF8] hover:bg-yellow-50/50 transition group"
              >
                <FileText className="w-6 h-6 mx-auto text-neutral-600 group-hover:text-black mb-1.5 transition-colors stroke-[2]" />
                <p className="text-xs font-black text-black">
                  {module === 'reconciliation'
                    ? 'Source B: General Ledger'
                    : 'Comparison: Secondary ERP Ledger'}
                </p>
                <p className="text-[10px] font-semibold text-neutral-600 mt-0.5">Click or drop CSV / XLSX</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Action when files ready */}
      {fileA && (
        <div className="flex justify-end pt-1">
          <button
            onClick={handleStartAnalysis}
            disabled={isProcessing || (module === 'reconciliation' && !fileB)}
            className="px-5 py-2.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border-2 border-black text-black text-xs font-black transition-all flex items-center gap-2 shadow-neo hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active active:translate-x-0 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Running Analysis...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current stroke-[2.5]" />
                <span>Run {module === 'reconciliation' ? 'Reconciliation' : module === 'decision' ? 'Decision Audit' : module === 'risk' ? 'Risk Analysis' : 'Close Scheduling'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
