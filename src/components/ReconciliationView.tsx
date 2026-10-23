import React, { useState } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
  Download,
  Filter,
  CheckCircle,
  Eye,
  Shield,
  Search,
  Trash2,
} from 'lucide-react';
import { ReconResult, ReconMatch, Finding } from '../types/index.ts';
import { formatCurrency, formatPercent } from '../utils/decimal.ts';
import { generateReconciliationInvestigation, AgentInvestigationResult } from '../engines/agents.ts';

interface ReconciliationViewProps {
  result: ReconResult;
  onOpenEvidence: (finding: Finding) => void;
  onOpenReview: (finding: Finding) => void;
  onOpenAgent: (investigation: AgentInvestigationResult) => void;
  onExport: () => void;
  onClearAll?: () => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  result,
  onOpenEvidence,
  onOpenReview,
  onOpenAgent,
  onExport,
  onClearAll,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'discrepancies' | 'unmatched_a' | 'unmatched_b' | 'findings'>('discrepancies');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMatches = result.matches.filter((m) => {
    if (activeTab === 'discrepancies' && m.status !== 'discrepancy') return false;
    if (activeTab === 'unmatched_a' && (!m.recordA || m.recordB)) return false;
    if (activeTab === 'unmatched_b' && (!m.recordB || m.recordA)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchA = m.recordA && (m.recordA.reference.toLowerCase().includes(q) || m.recordA.transactionId.toLowerCase().includes(q) || (m.recordA.counterparty && m.recordA.counterparty.toLowerCase().includes(q)));
      const matchB = m.recordB && (m.recordB.reference.toLowerCase().includes(q) || m.recordB.transactionId.toLowerCase().includes(q) || (m.recordB.counterparty && m.recordB.counterparty.toLowerCase().includes(q)));
      return matchA || matchB;
    }
    return true;
  });

  const handleOpenAgent = () => {
    const investigation = generateReconciliationInvestigation(result);
    onOpenAgent(investigation);
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Reconciliation Rate
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {formatPercent(result.reconciliationRatePercent, 1)}
          </span>
          <span className="text-[11px] text-emerald-700 font-mono font-bold mt-0.5 block">
            {result.matchedCount} matched
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Matched Volume
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {formatCurrency(result.matchedVolume, result.currency)}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            1-to-1 Validated
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Discrepancies
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">
            {result.discrepancyCount}
          </span>
          <span className="text-[11px] text-amber-800 font-mono font-bold mt-0.5 block">
            Tolerance flags
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Unmatched Source A
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {result.unmatchedACount}
          </span>
          <span className="text-[11px] text-neutral-700 font-mono font-bold mt-0.5 block">
            {formatCurrency(result.unmatchedAVolume, result.currency)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Unmatched Source B
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {result.unmatchedBCount}
          </span>
          <span className="text-[11px] text-neutral-700 font-mono font-bold mt-0.5 block">
            {formatCurrency(result.unmatchedBVolume, result.currency)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Net Variance
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {formatCurrency(result.netResidualAmount, result.currency)}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Residual delta
          </span>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-black shadow-neo-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('discrepancies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'discrepancies'
                ? 'bg-[#FFD629] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Discrepancies ({result.discrepancyCount})
          </button>
          <button
            onClick={() => setActiveTab('unmatched_a')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'unmatched_a'
                ? 'bg-[#FB7185] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Unmatched A ({result.unmatchedACount})
          </button>
          <button
            onClick={() => setActiveTab('unmatched_b')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'unmatched_b'
                ? 'bg-[#FB7185] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Unmatched B ({result.unmatchedBCount})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            All Matches ({result.matches.length})
          </button>
          <button
            onClick={() => setActiveTab('findings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'findings'
                ? 'bg-[#10B981] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Audit Findings ({result.findings.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search reference, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black placeholder:text-neutral-500 focus:outline-none shadow-neo-sm w-44"
            />
          </div>

          <button
            onClick={handleOpenAgent}
            className="px-3.5 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border-2 border-black text-black text-xs font-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            AI Investigation
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

      {/* Main Table / View */}
      {activeTab === 'findings' ? (
        <div className="space-y-3">
          {result.findings.length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-black rounded-2xl text-neutral-600 text-xs font-semibold shadow-neo-sm">
              No material exceptions or discrepancies discovered.
            </div>
          ) : (
            result.findings.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm hover:shadow-neo transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-black shadow-neo-sm ${
                        f.severity === 'critical'
                          ? 'bg-[#FB7185] text-black'
                          : f.severity === 'high'
                          ? 'bg-[#FFD629] text-black'
                          : 'bg-blue-200 text-black'
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-sm font-black text-black">{f.title}</span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 max-w-2xl">{f.description}</p>
                  {f.resolutionNotes && (
                    <div className="mt-2 text-[11px] text-emerald-950 bg-emerald-100 border border-black p-2 rounded-lg font-mono font-bold shadow-neo-sm">
                      Reviewed by {f.reviewedBy}: {f.resolutionNotes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenEvidence(f)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition flex items-center gap-1.5 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                  >
                    <Shield className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    Evidence
                  </button>
                  <button
                    onClick={() => onOpenReview(f)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border-2 border-black text-black text-xs font-black transition flex items-center gap-1.5 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#FFFDF8] border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source A (Bank/Settlement)</th>
                  <th className="py-3 px-4">Source B (Ledger/Invoices)</th>
                  <th className="py-3 px-4">Variance / Diff</th>
                  <th className="py-3 px-4">Date Window</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-black">
                {filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-600 text-xs font-sans font-semibold">
                      No transactions matching the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((m) => (
                    <tr key={m.id} className="hover:bg-yellow-50/50 transition">
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-black shadow-neo-sm ${
                            m.status === 'matched'
                              ? 'bg-[#10B981] text-black'
                              : m.status === 'discrepancy'
                              ? 'bg-[#FFD629] text-black'
                              : 'bg-[#FB7185] text-black'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      {/* Source A Details */}
                      <td className="py-3.5 px-4">
                        {m.recordA ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-black font-black">
                                {formatCurrency(m.recordA.amount, m.recordA.currency)}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-black bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 rounded">
                                {m.recordA.direction}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-2 font-sans font-semibold">
                              <span>Ref: {m.recordA.reference || 'None'}</span>
                              <span>•</span>
                              <span>Row #{m.recordA.rowNumber}</span>
                            </div>
                            {m.recordA.counterparty && (
                              <div className="text-[10px] text-neutral-500 font-sans">
                                {m.recordA.counterparty}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">None (Unmatched)</span>
                        )}
                      </td>

                      {/* Source B Details */}
                      <td className="py-3.5 px-4">
                        {m.recordB ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-black font-black">
                                {formatCurrency(m.recordB.amount, m.recordB.currency)}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-black bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 rounded">
                                {m.recordB.direction}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-2 font-sans font-semibold">
                              <span>Ref: {m.recordB.reference || 'None'}</span>
                              <span>•</span>
                              <span>Row #{m.recordB.rowNumber}</span>
                            </div>
                            {m.recordB.counterparty && (
                              <div className="text-[10px] text-neutral-500 font-sans">
                                {m.recordB.counterparty}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">None (Unmatched)</span>
                        )}
                      </td>

                      {/* Variance */}
                      <td className="py-3.5 px-4">
                        {m.amountDifference > 0.001 ? (
                          <span className="text-amber-800 font-black">
                            +${m.amountDifference.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-black">$0.00</span>
                        )}
                      </td>

                      {/* Date Window */}
                      <td className="py-3.5 px-4 text-neutral-700 font-bold text-[11px]">
                        {m.dateDifferenceDays === 0 ? 'Same Day' : `${m.dateDifferenceDays}d delta`}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            const f = result.findings.find(
                              (item) => item.evidence.some((e) => e.recordIdentifier === m.recordA?.transactionId)
                            ) || {
                              id: `item_${m.id}`,
                              runId: result.runId,
                              module: 'reconciliation',
                              title: `Transaction Match: ${m.recordA?.reference || m.recordB?.reference || m.id}`,
                              severity: m.status === 'discrepancy' ? 'medium' : 'info',
                              category: m.status,
                              description: `Reconciliation match with variance of $${m.amountDifference.toFixed(2)}.`,
                              evidence: [m.evidence],
                              reviewStatus: 'unreviewed',
                            };
                            onOpenEvidence(f as Finding);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 text-black border border-black text-[11px] font-sans font-bold transition inline-flex items-center gap-1 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                        >
                          <Eye className="w-3 h-3 text-black stroke-[2.2]" />
                          Audit Trace
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
