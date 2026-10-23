import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { DecisionResult, Finding } from '../types/index.ts';
import { formatCurrency } from '../utils/decimal.ts';
import { generateDecisionInvestigation, AgentInvestigationResult } from '../engines/agents.ts';

interface DecisionViewProps {
  result: DecisionResult;
  onOpenEvidence: (finding: Finding) => void;
  onOpenReview: (finding: Finding) => void;
  onOpenAgent: (investigation: AgentInvestigationResult) => void;
  onExport: () => void;
  onClearAll?: () => void;
}

export const DecisionView: React.FC<DecisionViewProps> = ({
  result,
  onOpenEvidence,
  onOpenReview: _onOpenReview,
  onOpenAgent,
  onExport,
  onClearAll,
}) => {
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'conflicts' | 'declines' | 'approvals'>('all');

  const filteredEvaluations = result.evaluations.filter((ev) => {
    if (filterMode === 'conflicts') return !ev.outcomeMatchesRecorded;
    if (filterMode === 'declines') return ev.computedOutcome === 'FAIL' || ev.application.recordedOutcome === 'DECLINED';
    if (filterMode === 'approvals') return ev.computedOutcome === 'PASS' && ev.application.recordedOutcome === 'APPROVED';
    return true;
  });

  const handleOpenAgent = () => {
    const investigation = generateDecisionInvestigation(result);
    onOpenAgent(investigation);
  };

  return (
    <div className="space-y-6">
      {/* Policy Banner */}
      <div className="p-5 rounded-2xl bg-white border-2 border-black shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-lg bg-[#10B981] border border-black flex items-center justify-center text-black shadow-neo-sm">
              <Scale className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="text-xs font-black text-black uppercase tracking-wider font-mono">
              Active Underwriting Policy:
            </span>
            <span className="text-xs font-mono bg-[#FFFDF8] border border-black px-2 py-0.5 rounded-md text-black font-black shadow-neo-sm">
              {result.policyUsed.name} ({result.policyUsed.version})
            </span>
          </div>
          <p className="text-xs text-neutral-700 font-semibold mt-1.5">{result.policyUsed.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAgent}
            className="px-3.5 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#34d399] border-2 border-black text-black text-xs font-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            AI Underwriting Agent
          </button>
          <button
            onClick={onExport}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition flex items-center gap-1.5 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Export
          </button>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 border-2 border-black text-rose-700 text-xs font-black transition flex items-center gap-1.5 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
              title="Clear all module data and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Total Applications
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {result.totalApplications}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Evaluated batch
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Policy Conflicts
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {result.conflictingDecisionsCount}
          </span>
          <span className="text-[11px] text-rose-800 font-mono font-bold mt-0.5 block">
            Recorded ≠ Computed
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Computed Passes
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
            {result.computedPasses}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Satisfied all rules
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Computed Declines
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">
            {result.computedFails}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Breached thresholds
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Recorded In Source
          </span>
          <span className="text-sm font-black text-black mt-2 block">
            {result.recordedApprovals} Pass / {result.recordedDeclines} Decline
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Source system values
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-black shadow-neo-sm w-fit overflow-x-auto">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
            filterMode === 'all'
              ? 'bg-neutral-900 text-white border border-black shadow-neo-sm'
              : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
          }`}
        >
          All Applications ({result.evaluations.length})
        </button>
        <button
          onClick={() => setFilterMode('conflicts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
            filterMode === 'conflicts'
              ? 'bg-[#FB7185] text-black border border-black shadow-neo-sm'
              : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
          }`}
        >
          Policy Conflicts ({result.conflictingDecisionsCount})
        </button>
        <button
          onClick={() => setFilterMode('declines')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
            filterMode === 'declines'
              ? 'bg-[#FFD629] text-black border border-black shadow-neo-sm'
              : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
          }`}
        >
          Declines ({result.computedFails})
        </button>
        <button
          onClick={() => setFilterMode('approvals')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
            filterMode === 'approvals'
              ? 'bg-[#10B981] text-black border border-black shadow-neo-sm'
              : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
          }`}
        >
          Approvals ({result.computedPasses})
        </button>
      </div>

      {/* Applications Matrix Table */}
      <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FFFDF8] border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Application</th>
                <th className="py-3 px-4">Requested</th>
                <th className="py-3 px-4">Computed DTI</th>
                <th className="py-3 px-4">FICO Score</th>
                <th className="py-3 px-4">Recorded vs Computed</th>
                <th className="py-3 px-4">Integrity Status</th>
                <th className="py-3 px-4 text-right">Rule Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-black">
              {filteredEvaluations.map((ev) => {
                const isExpanded = expandedAppId === ev.application.id;
                const isConflict = !ev.outcomeMatchesRecorded;

                return (
                  <React.Fragment key={ev.application.id}>
                    <tr
                      className={`hover:bg-yellow-50/50 transition cursor-pointer ${
                        isConflict ? 'bg-rose-50/50' : ''
                      }`}
                      onClick={() => setExpandedAppId(isExpanded ? null : ev.application.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-black text-black">{ev.application.id}</div>
                        <div className="text-[11px] text-neutral-600 font-sans font-semibold">
                          {ev.application.applicantName} (Row #{ev.application.rowNumber})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black text-black">
                        {formatCurrency(ev.application.requestedAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black ${
                            ev.computedDTI > 43 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {ev.computedDTI.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-neutral-500 block font-sans">
                          ${ev.application.monthlyDebtObligations.toLocaleString()} / $
                          {ev.application.grossMonthlyIncome.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black ${
                            ev.application.creditScore < 640 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {ev.application.creditScore}
                        </span>
                        <span className="text-[10px] text-neutral-500 block font-sans">
                          Req: 640+
                        </span>
                      </td>

                      {/* Recorded vs Computed */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded border border-black text-[10px] font-black shadow-neo-sm ${
                              ev.application.recordedOutcome === 'APPROVED'
                                ? 'bg-[#10B981] text-black'
                                : 'bg-[#FB7185] text-black'
                            }`}
                          >
                            Rec: {ev.application.recordedOutcome}
                          </span>
                          <span className="text-black font-black">→</span>
                          <span
                            className={`px-1.5 py-0.5 rounded border border-black text-[10px] font-black shadow-neo-sm ${
                              ev.computedOutcome === 'PASS'
                                ? 'bg-[#10B981] text-black'
                                : 'bg-[#FB7185] text-black'
                            }`}
                          >
                            Calc: {ev.computedOutcome}
                          </span>
                        </div>
                      </td>

                      {/* Integrity Status */}
                      <td className="py-3.5 px-4">
                        {isConflict ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#FB7185] text-black border border-black shadow-neo-sm">
                            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                            Divergent Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#10B981] text-black border border-black shadow-neo-sm">
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                            Policy Conforming
                          </span>
                        )}
                      </td>

                      {/* Details toggle */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAppId(isExpanded ? null : ev.application.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 text-black border border-black text-[11px] font-sans font-bold transition inline-flex items-center gap-1 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                        >
                          {isExpanded ? (
                            <>
                              Hide Rules <ChevronUp className="w-3 h-3 stroke-[2.5]" />
                            </>
                          ) : (
                            <>
                              Inspect Rules <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Rule Evaluation Breakdown */}
                    {isExpanded && (
                      <tr className="bg-[#FFFDF8]">
                        <td colSpan={7} className="p-4 border-b-2 border-black">
                          <div className="rounded-xl bg-white border-2 border-black p-4 font-sans shadow-neo-sm">
                            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-3">
                              <h5 className="text-xs font-black text-black flex items-center gap-2">
                                <Scale className="w-4 h-4 text-black stroke-[2.5]" />
                                Deterministic Rule Trace for {ev.application.id} ({ev.application.applicantName})
                              </h5>
                              <button
                                onClick={() => {
                                  const f = result.findings.find(
                                    (item) => item.evidence.some((e) => e.recordIdentifier === ev.application.id)
                                  ) || {
                                    id: `find_app_${ev.application.id}`,
                                    runId: result.runId,
                                    module: 'decision',
                                    title: `Application Trace: ${ev.application.id}`,
                                    severity: ev.computedOutcome === 'FAIL' ? 'high' : 'info',
                                    category: 'decision_trace',
                                    description: ev.explanation,
                                    evidence: ev.ruleResults.map((r) => r.evidence),
                                    reviewStatus: 'unreviewed',
                                  };
                                  onOpenEvidence(f as Finding);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#FFD629] hover:bg-[#ffe066] border border-black text-black text-xs font-black transition inline-flex items-center gap-1 shadow-neo-sm"
                              >
                                <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
                                Audit Evidence
                              </button>
                            </div>

                            <p className="text-xs text-neutral-800 font-semibold mb-4 bg-[#FFFDF8] p-2.5 rounded-lg border border-black">
                              <strong>Decision Explanation:</strong> {ev.explanation}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {ev.ruleResults.map((r) => (
                                <div
                                  key={r.ruleId}
                                  className={`p-3 rounded-xl border-2 border-black text-xs font-mono shadow-neo-sm ${
                                    r.status === 'PASS'
                                      ? 'bg-emerald-50 text-neutral-900'
                                      : r.status === 'FAIL'
                                      ? 'bg-rose-50 text-rose-950'
                                      : 'bg-amber-50 text-amber-950'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-black text-black truncate max-w-[150px]">
                                      {r.ruleName}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded border border-black text-[10px] font-black shadow-neo-sm ${
                                        r.status === 'PASS'
                                          ? 'bg-[#10B981] text-black'
                                          : 'bg-[#FB7185] text-black'
                                      }`}
                                    >
                                      {r.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-neutral-700 font-bold mt-1">
                                    Actual: <span className="text-black font-black">{String(r.actualValue)}</span> vs Req: {r.operator} {String(r.threshold)}
                                  </div>
                                  {r.failureReason && (
                                    <div className="text-[10px] text-rose-800 font-bold mt-1.5 font-sans leading-tight">
                                      {r.failureReason}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
