import React, { useState } from 'react';
import { X, ScrollText, Download, ShieldCheck, Search } from 'lucide-react';
import { AuditEvent } from '../types/index.ts';

interface AuditLogModalProps {
  events: AuditEvent[];
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ events, onClose }) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = events.filter((ev) => {
    if (filterType !== 'ALL' && ev.actionType !== filterType) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        ev.details.toLowerCase().includes(q) ||
        (ev.module && ev.module.toLowerCase().includes(q)) ||
        ev.actionType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportAuditLog = () => {
    const jsonStr = JSON.stringify(events, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisiq360_audit_trail_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm">
              <ScrollText className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h3 className="text-base font-black text-black">Immutable System Audit Trail</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 stroke-[2.5]" />
              <input
                type="text"
                placeholder="Search audit actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black placeholder-neutral-500 focus:outline-none shadow-neo-sm"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black focus:outline-none shadow-neo-sm"
            >
              <option value="ALL">All Actions</option>
              <option value="FILE_UPLOAD">File Upload</option>
              <option value="ANALYSIS_RUN">Analysis Run</option>
              <option value="FINDING_REVIEWED">Human Review</option>
              <option value="SCENARIO_EXECUTED">Scenario</option>
              <option value="DATA_CLEARED">Data Clear</option>
            </select>
          </div>

          <button
            onClick={exportAuditLog}
            className="px-3.5 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] text-black text-xs font-black transition flex items-center gap-1.5 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active shrink-0"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Export Audit Trail (JSON)
          </button>
        </div>

        {/* Audit Event List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-neutral-600 font-semibold text-xs bg-[#FFFDF8] border-2 border-black rounded-xl">
              No audit events found. Actions are logged automatically as you use the application.
            </div>
          ) : (
            filtered.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-[#FFFDF8] border-2 border-black text-xs font-mono shadow-neo-sm"
              >
                <div className="flex items-center justify-between text-neutral-700 mb-1 flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase bg-[#FFD629] text-black shadow-neo-sm">
                      {ev.actionType}
                    </span>
                    {ev.module && (
                      <span className="text-[10px] font-bold text-black uppercase bg-white border border-neutral-300 px-1.5 py-0.5 rounded">
                        [{ev.module}]
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-600 font-bold">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-black font-sans text-xs font-semibold mt-1">{ev.details}</div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t-2 border-black mt-4 flex items-center justify-between text-[11px] text-neutral-700 font-bold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            Append-only tamper-evident local audit log
          </span>
          <span className="font-mono">{filtered.length} of {events.length} events</span>
        </div>
      </div>
    </div>
  );
};
