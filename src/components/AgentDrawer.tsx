import React from 'react';
import { X, Sparkles, CheckCircle2, HelpCircle, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { AgentInvestigationResult } from '../engines/agents.ts';

interface AgentDrawerProps {
  investigation: AgentInvestigationResult | null;
  onClose: () => void;
  onTriggerAction?: (actionText: string) => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  investigation,
  onClose,
  onTriggerAction: _onTriggerAction,
}) => {
  if (!investigation) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white border-l-2 border-black h-full overflow-y-auto p-6 sm:p-8 flex flex-col justify-between shadow-neo-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-black">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-black">{investigation.agentName}</h3>
                <p className="text-[10px] font-mono text-black font-black uppercase tracking-wider">
                  Evidence-Grounded Intelligence Specialist
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
              aria-label="Close Agent Drawer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* AI Boundary Notice */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#FFFDF8] border-2 border-black text-black text-xs flex items-start gap-2.5 shadow-neo-sm">
            <ShieldAlert className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
            <span className="text-[11px] font-semibold leading-relaxed">
              <strong className="font-black">Executive Guardrail:</strong> AI agents provide investigative hypotheses and explanations only. All calculations use validated mathematical logic, and no financial actions execute without explicit human approval.
            </span>
          </div>

          {/* Summary Box */}
          <div className="mt-5 p-4 rounded-xl bg-[#FFD629] border-2 border-black shadow-neo-sm text-black">
            <h4 className="text-xs font-black uppercase tracking-wider mb-1">
              Executive Investigation Synopsis
            </h4>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              {investigation.summary}
            </p>
          </div>

          {/* Section 1: Verified Mathematical Facts */}
          <div className="mt-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-black mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              Verified Mathematical Findings ({investigation.verifiedFacts.length})
            </h4>
            <div className="space-y-2">
              {investigation.verifiedFacts.map((fact, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#FFFDF8] border-2 border-black text-xs text-neutral-900 font-semibold flex items-start gap-2.5 shadow-neo-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-[#10B981] border border-black mt-1 shrink-0" />
                  <span className="leading-relaxed">{fact}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Investigative Hypotheses */}
          {investigation.investigationHypotheses.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-black mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                Root-Cause Hypotheses & Anomalies ({investigation.investigationHypotheses.length})
              </h4>
              <div className="space-y-2">
                {investigation.investigationHypotheses.map((hyp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#FFFDF8] border-2 border-black text-xs text-neutral-900 font-semibold flex items-start gap-2.5 shadow-neo-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#FFD629] border border-black mt-1 shrink-0" />
                    <span className="leading-relaxed italic">{hyp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Recommended Actions */}
          {investigation.recommendedActions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-black mb-3 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                Recommended Executive Actions ({investigation.recommendedActions.length})
              </h4>
              <div className="space-y-2.5">
                {investigation.recommendedActions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border-2 border-black text-xs flex items-center justify-between gap-3 shadow-neo-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                          act.priority === 'high'
                            ? 'bg-[#FB7185] text-black'
                            : 'bg-[#FFD629] text-black'
                        }`}
                      >
                        {act.priority}
                      </span>
                      <span className="text-black font-bold">{act.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t-2 border-black mt-6 text-[11px] text-neutral-600 font-bold flex items-center justify-between">
          <span>Decisiq 360 AI Reasoning Layer</span>
          <span className="font-mono font-black text-black">Deterministic Engine</span>
        </div>
      </div>
    </div>
  );
};
