import React, { useEffect } from 'react';
import { X, Trash2, ShieldCheck } from 'lucide-react';
import { ModuleType } from '../types/index.ts';

interface ClearConfirmationModalProps {
  isOpen: boolean;
  module: ModuleType | null;
  isClearing: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const MODULE_TITLES: Record<ModuleType, string> = {
  reconciliation: 'Reconciliation Intelligence',
  decision: 'Decision Intelligence',
  risk: 'Risk & Exposure Intelligence',
  close: 'Close Intelligence',
};

const MODULE_OTHER_NAMES: Record<ModuleType, string> = {
  reconciliation: 'Decision, Risk & Exposure, and Close Intelligence',
  decision: 'Reconciliation, Risk & Exposure, and Close Intelligence',
  risk: 'Reconciliation, Decision, and Close Intelligence',
  close: 'Reconciliation, Decision, and Risk & Exposure Intelligence',
};

export const ClearConfirmationModal: React.FC<ClearConfirmationModalProps> = ({
  isOpen,
  module,
  isClearing,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isClearing) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClearing, onCancel]);

  if (!isOpen || !module) return null;

  const moduleName = MODULE_TITLES[module] || module;
  const otherModules = MODULE_OTHER_NAMES[module];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-modal-title"
      aria-describedby="clear-modal-desc"
    >
      <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg space-y-5">
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FB7185] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-neo-sm">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="clear-modal-title" className="text-base font-black text-black">
                Clear all module data?
              </h3>
              <span className="text-[11px] font-mono font-bold text-neutral-700 bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded">
                {moduleName}
              </span>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isClearing}
            className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition disabled:opacity-40"
            aria-label="Cancel and close dialog"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Primary Warning Description */}
        <p id="clear-modal-desc" className="text-xs text-neutral-800 font-semibold leading-relaxed">
          This will remove the uploaded files, processed data, and previous analysis results from{' '}
          <span className="text-black font-black underline decoration-[#FFD629] decoration-2 underline-offset-2">
            {moduleName}
          </span>
          . This action cannot be undone.
        </p>

        {/* Bullet Breakdown of What Gets Reset */}
        <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black space-y-2 text-xs shadow-neo-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-black">
            Data to be cleared:
          </div>
          <ul className="space-y-1.5 text-neutral-800 font-semibold text-[11px]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 border border-black shrink-0" />
              <span>Previously uploaded documents & extracted records</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 border border-black shrink-0" />
              <span>Calculated findings, exceptions, metrics & cached runs</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 border border-black shrink-0" />
              <span>AI investigation drafts and module session state</span>
            </li>
          </ul>

          <div className="pt-2 border-t-2 border-black flex items-start gap-1.5 text-[10px] text-neutral-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0 mt-0.5" />
            <span>
              <strong className="text-black font-black">Independent Isolation:</strong> Data in{' '}
              {otherModules} and global audit logs remain strictly preserved.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isClearing}
            className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black border-2 border-black shadow-neo-sm transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isClearing}
            className="px-4 py-2 rounded-xl bg-[#FB7185] hover:bg-[#f43f5e] disabled:opacity-50 text-black text-xs font-black border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center gap-2"
          >
            {isClearing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Clearing All Data...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Clear All</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
