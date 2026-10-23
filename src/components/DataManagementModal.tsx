import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ModuleType } from '../types/index.ts';

interface DataManagementModalProps {
  onClose: () => void;
  onClearData: (moduleFilter?: ModuleType) => void;
  totalRunsCount: number;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  onClose,
  onClearData,
  totalRunsCount,
}) => {
  const [selectedModule, setSelectedModule] = useState<'all' | ModuleType>('all');
  const [confirmed, setConfirmed] = useState(false);
  const [deletedStatus, setDeletedStatus] = useState<string | null>(null);

  const handleExecuteClear = () => {
    if (!confirmed) return;
    const filter = selectedModule === 'all' ? undefined : selectedModule;
    onClearData(filter);
    setDeletedStatus(
      `Successfully cleared past analysis runs for ${
        selectedModule === 'all' ? 'all modules' : selectedModule
      }. Audit history preserved.`
    );
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg">
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FB7185] border border-black flex items-center justify-center text-black shadow-neo-sm">
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h3 className="text-base font-black text-black">Data Management & Reset</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {deletedStatus ? (
          <div className="my-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto stroke-[2.5]" />
            <p className="text-sm font-black text-black">{deletedStatus}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-black text-xs text-amber-950 space-y-2 shadow-neo-sm">
              <div className="flex items-center gap-1.5 font-black text-black">
                <AlertTriangle className="w-4 h-4 stroke-[2.5] text-amber-600" />
                Clear Past Analysis Runs
              </div>
              <p className="font-semibold leading-relaxed">
                This operation removes derived calculation runs and exception findings from local storage to reset your workspace.
              </p>
              <div className="pt-2 border-t border-amber-300 text-[11px] text-neutral-800 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>
                  <strong className="font-black text-black">Audit Integrity Guarantee:</strong> Original system audit logs and policy configurations are permanently retained.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Select Scope to Clear
              </label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black focus:outline-none shadow-neo-sm"
              >
                <option value="all">All Modules (Entire Workspace Reset)</option>
                <option value="reconciliation">Reconciliation Engine Only</option>
                <option value="decision">Decision Intelligence Only</option>
                <option value="risk">Risk & Exposure Engine Only</option>
                <option value="close">Close Scheduling Engine Only</option>
              </select>
            </div>

            <div className="p-3 bg-[#FFFDF8] rounded-xl border-2 border-black text-xs text-black font-semibold flex items-center justify-between shadow-neo-sm">
              <span>Total Persisted Runs in Scope:</span>
              <span className="font-mono font-black text-black text-sm">{totalRunsCount}</span>
            </div>

            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="confirm-reset"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-black w-4 h-4 cursor-pointer"
              />
              <label htmlFor="confirm-reset" className="text-xs text-neutral-800 font-semibold cursor-pointer select-none">
                I understand that selected analysis results will be deleted and workspaces returned to initial state.
              </label>
            </div>

            <div className="pt-4 border-t-2 border-black flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black border-2 border-black shadow-neo-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={!confirmed}
                className="px-5 py-2 rounded-xl bg-[#FB7185] hover:bg-[#f43f5e] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-black border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                Clear Analysis Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
