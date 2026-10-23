import React from 'react';
import { X, FileText, Shield, Hash, Layers } from 'lucide-react';
import { Finding } from '../types/index.ts';

interface EvidenceDrawerProps {
  finding: Finding | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ finding, onClose }) => {
  if (!finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white border-l-2 border-black h-full overflow-y-auto p-6 sm:p-8 flex flex-col justify-between shadow-neo-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-black">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm">
                <Shield className="w-4 h-4 stroke-[2.5]" />
              </span>
              <h3 className="text-base font-black text-black">Source Evidence & Audit Trace</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
              aria-label="Close Evidence Drawer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Finding Summary */}
          <div className="mt-6 bg-[#FFFDF8] border-2 border-black rounded-2xl p-4 shadow-neo-sm">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                  finding.severity === 'critical'
                    ? 'bg-[#FB7185] text-black'
                    : finding.severity === 'high'
                    ? 'bg-[#FFD629] text-black'
                    : 'bg-blue-200 text-black'
                }`}
              >
                {finding.severity}
              </span>
              <span className="text-xs font-mono font-bold text-neutral-700 bg-white border border-neutral-300 px-1.5 py-0.5 rounded">
                {finding.category}
              </span>
            </div>
            <h4 className="text-sm font-black text-black">{finding.title}</h4>
            <p className="mt-1 text-xs text-neutral-800 font-semibold leading-relaxed">{finding.description}</p>
          </div>

          {/* Verifiable Provenance Evidence Items */}
          <div className="mt-6">
            <h5 className="text-xs font-black uppercase tracking-wider text-black mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
              Verifiable Evidence Records ({finding.evidence.length})
            </h5>

            <div className="space-y-4">
              {finding.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="bg-[#FFFDF8] border-2 border-black rounded-2xl p-4 text-xs font-mono shadow-neo-sm"
                >
                  <div className="grid grid-cols-2 gap-2 pb-3 border-b-2 border-black text-black">
                    <div>
                      <span className="text-neutral-600 block text-[10px] font-black uppercase">Source File</span>
                      <span className="text-black font-black flex items-center gap-1 mt-0.5">
                        <FileText className="w-3 h-3 text-black stroke-[2.5]" />
                        {ev.fileName}
                      </span>
                    </div>
                    {ev.rowNumber && (
                      <div>
                        <span className="text-neutral-600 block text-[10px] font-black uppercase">Record Location</span>
                        <span className="text-black font-black flex items-center gap-1 mt-0.5">
                          <Hash className="w-3 h-3 stroke-[2.5]" />
                          Row #{ev.rowNumber}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-neutral-600 block text-[10px] font-black uppercase">Rule / Calculation ID</span>
                      <span className="text-black font-black mt-0.5 block">{ev.ruleOrCalculationId}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600 block text-[10px] font-black uppercase">Analysis Run ID</span>
                      <span className="text-neutral-700 font-bold truncate block mt-0.5">{ev.runId}</span>
                    </div>
                  </div>

                  {ev.rawFieldValues && (
                    <div className="mt-3">
                      <span className="text-neutral-700 block text-[10px] uppercase font-black tracking-wider mb-1">
                        Original Raw Values
                      </span>
                      <pre className="p-2.5 rounded-xl bg-white border-2 border-black text-black text-[11px] overflow-x-auto whitespace-pre-wrap font-bold shadow-inner">
                        {JSON.stringify(ev.rawFieldValues, null, 2)}
                      </pre>
                    </div>
                  )}

                  {ev.normalizedValues && (
                    <div className="mt-3">
                      <span className="text-neutral-700 block text-[10px] uppercase font-black tracking-wider mb-1">
                        Normalized Mathematical Inputs
                      </span>
                      <pre className="p-2.5 rounded-xl bg-white border-2 border-black text-emerald-950 text-[11px] overflow-x-auto whitespace-pre-wrap font-bold shadow-inner">
                        {JSON.stringify(ev.normalizedValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t-2 border-black mt-6 text-[11px] text-neutral-700 font-bold flex items-center justify-between">
          <span>Deterministic Audit Guarantee</span>
          <span className="font-mono font-black text-black">Decisiq 360</span>
        </div>
      </div>
    </div>
  );
};
