import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  Download,
  Percent,
  SlidersHorizontal,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { RiskResult, ScenarioShockConfig, Finding } from '../types/index.ts';
import { formatCurrency, formatPercent } from '../utils/decimal.ts';
import { generateRiskInvestigation, AgentInvestigationResult } from '../engines/agents.ts';
import { executeRiskEngine } from '../engines/risk.ts';

interface RiskViewProps {
  result: RiskResult;
  onOpenEvidence: (finding: Finding) => void;
  onOpenReview: (finding: Finding) => void;
  onOpenAgent: (investigation: AgentInvestigationResult) => void;
  onExport: () => void;
  onUpdateScenarioResult?: (updated: RiskResult) => void;
  onClearAll?: () => void;
}

export const RiskView: React.FC<RiskViewProps> = ({
  result,
  onOpenEvidence: _onOpenEvidence,
  onOpenReview,
  onOpenAgent,
  onExport,
  onUpdateScenarioResult: _onUpdateScenarioResult,
  onClearAll,
}) => {
  const [activeTab, setActiveTab] = useState<'concentrations' | 'breaches' | 'cross_system' | 'scenarios' | 'positions'>('concentrations');
  const [fxShock, setFxShock] = useState(10);
  const [creditShock, setCreditShock] = useState(25);
  const [simulatedResult, setSimulatedResult] = useState<RiskResult>(result);

  const handleRunCustomShock = () => {
    const customConfig: ScenarioShockConfig[] = [
      {
        name: `Custom Interactive Stress: FX +${fxShock}%, Credit +${creditShock}%`,
        description: `Simulates simultaneous ${fxShock}% foreign exchange adverse shift and ${creditShock}% credit exposure expansion.`,
        fxShockPercent: fxShock,
        counterpartyCreditShockPercent: creditShock,
      },
    ];

    const updated = executeRiskEngine(result.positions, undefined, customConfig, result.runId);
    setSimulatedResult(updated);
  };

  const handleOpenAgent = () => {
    const investigation = generateRiskInvestigation(result);
    onOpenAgent(investigation);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Total Gross Exposure
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {formatCurrency(result.totalGrossExposure, result.baseCurrency)}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Across {result.positionsCount} deals
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Net Exposure
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {formatCurrency(result.totalNetExposure, result.baseCurrency)}
          </span>
          <span className="text-[11px] text-emerald-700 font-mono font-bold mt-0.5 block">
            After collateral offsets
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Active Limit Breaches
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {result.activeBreachesCount}
          </span>
          <span className="text-[11px] text-rose-800 font-mono font-bold mt-0.5 block">
            {result.activeBreachesCount > 0 ? 'Requires remediation' : 'No breaches'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Top Obligor Concentration
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">
            {result.topConcentrations[0]?.shareOfTotalPercent || 0}%
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block truncate">
            {result.topConcentrations[0]?.counterparty || 'None'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Cross-System Variances
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {result.crossSystemDiscrepancies.length}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Treasury vs ERP
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Average Limit Utilized
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {result.averageLimitUtilizationPercent}%
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Institutional portfolio
          </span>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-black shadow-neo-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('concentrations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'concentrations'
                ? 'bg-[#FB7185] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Concentration ({result.topConcentrations.length})
          </button>
          <button
            onClick={() => setActiveTab('breaches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'breaches'
                ? 'bg-rose-600 text-white border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Limit Breaches ({result.activeBreachesCount})
          </button>
          <button
            onClick={() => setActiveTab('cross_system')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'cross_system'
                ? 'bg-[#FFD629] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Cross-System ({result.crossSystemDiscrepancies.length})
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'scenarios'
                ? 'bg-[#10B981] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Stress Testing
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'positions'
                ? 'bg-neutral-900 text-white border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            All Positions ({result.positions.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAgent}
            className="px-3.5 py-1.5 rounded-xl bg-[#FB7185] hover:bg-[#fda4af] border-2 border-black text-black text-xs font-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            AI Risk Specialist
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

      {/* Tab: Counterparty Concentration */}
      {activeTab === 'concentrations' && (
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo p-6">
          <h3 className="text-sm font-black text-black mb-4 flex items-center gap-2">
            <Percent className="w-4 h-4 text-black stroke-[2.5]" />
            Portfolio Concentration by Counterparty
          </h3>

          <div className="space-y-4">
            {result.topConcentrations.map((cp) => (
              <div key={cp.counterparty} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-black">{cp.counterparty}</span>
                    {cp.isBreached && (
                      <span className="px-1.5 py-0.2 rounded border border-black text-[9px] font-black bg-[#FB7185] text-black shadow-neo-sm">
                        BREACH
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-black font-black">{formatCurrency(cp.grossExposure)}</span>
                    <span className="text-neutral-600 font-bold ml-2">({cp.shareOfTotalPercent}%)</span>
                  </div>
                </div>

                {/* Visual Bar with solid borders */}
                <div className="w-full h-3 bg-neutral-100 border border-black rounded-full overflow-hidden flex shadow-inner">
                  <div
                    className={`h-full border-r border-black transition-all duration-500 ${
                      cp.isBreached
                        ? 'bg-[#FB7185]'
                        : cp.shareOfTotalPercent > 20
                        ? 'bg-[#FFD629]'
                        : 'bg-neutral-800'
                    }`}
                    style={{ width: `${Math.min(100, cp.shareOfTotalPercent * 2)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-neutral-600 font-mono font-bold">
                  <span>Net Exposure: {formatCurrency(cp.netExposure)}</span>
                  <span>
                    Limit: {cp.configuredLimit ? formatCurrency(cp.configuredLimit) : 'Unrestricted'}{' '}
                    {cp.limitUtilizationPercent !== undefined ? `(${cp.limitUtilizationPercent}%)` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Limit Breaches */}
      {activeTab === 'breaches' && (
        <div className="space-y-3">
          {result.topConcentrations.filter((c) => c.isBreached).length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-black rounded-2xl text-neutral-700 text-xs font-semibold shadow-neo-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2 stroke-[2.5]" />
              All counterparty exposures are currently operating within approved limits.
            </div>
          ) : (
            result.topConcentrations
              .filter((c) => c.isBreached)
              .map((cp) => (
                <div
                  key={cp.counterparty}
                  className="p-5 rounded-2xl bg-rose-50 border-2 border-black shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase bg-[#FB7185] text-black shadow-neo-sm">
                        Critical Breach
                      </span>
                      <h4 className="text-sm font-black text-black">{cp.counterparty}</h4>
                    </div>
                    <p className="text-xs text-neutral-800 font-semibold mt-1">
                      Gross exposure of <strong>{formatCurrency(cp.grossExposure)}</strong> exceeds authorized limit of{' '}
                      <strong>{formatCurrency(cp.configuredLimit || 0)}</strong> by{' '}
                      <strong className="text-rose-700 font-black">
                        {formatCurrency(cp.grossExposure - (cp.configuredLimit || 0))}
                      </strong>{' '}
                      ({cp.limitUtilizationPercent}% utilized).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        const f = result.findings.find((item) => item.title.includes(cp.counterparty)) || {
                          id: `find_breach_${cp.counterparty}`,
                          runId: result.runId,
                          module: 'risk',
                          title: `Limit Breach: ${cp.counterparty}`,
                          severity: 'critical',
                          category: 'limit_breach',
                          description: `Exposure of ${formatCurrency(cp.grossExposure)} exceeds limit of ${formatCurrency(cp.configuredLimit || 0)}.`,
                          evidence: [],
                          reviewStatus: 'unreviewed',
                        };
                        onOpenReview(f as Finding);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border-2 border-black text-black text-xs font-black transition shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                    >
                      Remediate Breach
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Tab: Cross-System Variances */}
      {activeTab === 'cross_system' && (
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FFFDF8] border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Counterparty / Position</th>
                <th className="py-3 px-4">Treasury Core System</th>
                <th className="py-3 px-4">Secondary ERP Ledger</th>
                <th className="py-3 px-4">Difference</th>
                <th className="py-3 px-4">Relative Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-black">
              {result.crossSystemDiscrepancies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-600 text-xs font-sans font-semibold">
                    No cross-system discrepancies found or secondary ledger was not uploaded.
                  </td>
                </tr>
              ) : (
                result.crossSystemDiscrepancies.map((diff, idx) => (
                  <tr key={idx} className="hover:bg-yellow-50/50 transition">
                    <td className="py-3.5 px-4 font-black text-black">
                      {diff.positionOrCounterparty}
                    </td>
                    <td className="py-3.5 px-4 font-black text-black">
                      {formatCurrency(diff.exposureSystemA)}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700 font-bold">
                      {formatCurrency(diff.exposureSystemB)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-800">
                      {diff.difference > 0 ? `+${formatCurrency(diff.difference)}` : formatCurrency(diff.difference)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-800">
                      {diff.relativeDifferencePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: What-If Scenario Stress Testing */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {/* Interactive Stress Controls */}
          <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-neo">
            <h3 className="text-sm font-black text-black mb-2 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-black stroke-[2.5]" />
              Controlled Scenario Stress Simulation
            </h3>
            <p className="text-xs text-neutral-700 font-semibold mb-6">
              Adjust shocks below to simulate stress impact without altering actual recorded financial balances.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-black font-black">Foreign Exchange Shock (FX)</span>
                  <span className="text-black bg-[#FFD629] px-2 py-0.5 rounded border border-black font-mono font-black text-[11px]">+{fxShock}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={fxShock}
                  onChange={(e) => setFxShock(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer mt-2"
                />
                <span className="text-[10px] text-neutral-600 font-semibold block mt-1">
                  Adverse shift on foreign-denominated assets
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-black font-black">Counterparty Credit Drawdown Shock</span>
                  <span className="text-black bg-[#FB7185] px-2 py-0.5 rounded border border-black font-mono font-black text-[11px]">+{creditShock}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={creditShock}
                  onChange={(e) => setCreditShock(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer mt-2"
                />
                <span className="text-[10px] text-neutral-600 font-semibold block mt-1">
                  Drawdown expansion across major obligors
                </span>
              </div>
            </div>

            <button
              onClick={handleRunCustomShock}
              className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#34d399] text-black text-xs font-black transition border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
            >
              Simulate Stressed Portfolio
            </button>
          </div>

          {/* Scenario Results Cards */}
          <div className="space-y-4">
            {simulatedResult.scenarioResults?.map((sc, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border-2 border-black shadow-neo space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-black">
                  <h4 className="text-sm font-black text-black">{sc.scenarioName}</h4>
                  <span className="text-xs font-mono font-black text-black bg-[#FFD629] border border-black px-2 py-0.5 rounded shadow-neo-sm">
                    +{formatPercent(sc.changePercent)} Total Impact
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#FFFDF8] border border-black shadow-neo-sm">
                    <span className="text-neutral-600 text-[10px] font-black uppercase block">Baseline Gross</span>
                    <span className="text-black font-black text-sm">
                      {formatCurrency(sc.baselineTotalGross)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FFFDF8] border border-black shadow-neo-sm">
                    <span className="text-neutral-600 text-[10px] font-black uppercase block">Stressed Gross</span>
                    <span className="text-rose-700 font-black text-sm">
                      {formatCurrency(sc.stressedTotalGross)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FFFDF8] border border-black shadow-neo-sm">
                    <span className="text-neutral-600 text-[10px] font-black uppercase block">Exposure Shock</span>
                    <span className="text-amber-700 font-black text-sm">
                      +{formatCurrency(sc.changeAmount)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FFFDF8] border border-black shadow-neo-sm">
                    <span className="text-neutral-600 text-[10px] font-black uppercase block">Breached Obligors</span>
                    <span className="text-rose-700 font-black text-sm">
                      {sc.breachedCounterparties.length} Counterpart{sc.breachedCounterparties.length === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-800 font-semibold bg-[#FFFDF8] p-2.5 rounded-xl border border-black font-sans space-y-1">
                  {sc.assumptions.map((ass, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                      <span>{ass}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: All Positions */}
      {activeTab === 'positions' && (
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FFFDF8] border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Position ID</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4">Gross Exposure</th>
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-4">Configured Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-black">
              {result.positions.map((pos) => (
                <tr key={pos.id} className="hover:bg-yellow-50/50 transition">
                  <td className="py-3.5 px-4 font-black text-black">{pos.positionId}</td>
                  <td className="py-3.5 px-4 font-semibold">{pos.counterparty}</td>
                  <td className="py-3.5 px-4 text-neutral-700 font-bold">{pos.instrument}</td>
                  <td className="py-3.5 px-4 font-black text-black">
                    {formatCurrency(pos.exposureAmount, pos.currency)}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-700 font-bold">{pos.currency}</td>
                  <td className="py-3.5 px-4 text-neutral-700 font-bold">
                    {pos.configuredLimit ? formatCurrency(pos.configuredLimit, pos.currency) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
