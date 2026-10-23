import React from 'react';
import {
  FileCheck2,
  Scale,
  ShieldAlert,
  CalendarClock,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
} from 'lucide-react';
import {
  ModuleType,
  AnalysisRunMetadata,
  ReconResult,
  DecisionResult,
  RiskResult,
  CloseResult,
} from '../types/index.ts';
import { formatPercent, formatCurrency } from '../utils/decimal.ts';

export interface QuickStatsData {
  primaryKpiLabel: string;
  primaryKpiValue: string;
  statusBadge: {
    label: string;
    variant: 'optimal' | 'attention' | 'critical' | 'neutral';
  };
  metrics: Array<{
    label: string;
    value: string;
    highlight?: boolean;
    alert?: boolean;
  }>;
  runTimestamp?: string;
  runId?: string;
  executionTimeMs?: number;
}

export function extractQuickStats(
  module: ModuleType,
  run: AnalysisRunMetadata | null,
  reconResult: ReconResult | null,
  decisionResult: DecisionResult | null,
  riskResult: RiskResult | null,
  closeResult: CloseResult | null
): QuickStatsData | null {
  if (module === 'reconciliation') {
    if (!reconResult && !run?.summary) return null;
    const rate = reconResult?.reconciliationRatePercent ?? run?.summary?.reconciliationRatePercent ?? 0;
    const unmatchedCount = reconResult
      ? reconResult.unmatchedACount + reconResult.unmatchedBCount
      : run?.summary?.unmatchedCount ?? 0;
    const discrepancies = reconResult?.discrepancyCount ?? run?.summary?.discrepancyCount ?? 0;
    const netVariance = reconResult?.netResidualAmount ?? run?.summary?.netResidualAmount ?? 0;
    const currency = reconResult?.currency ?? 'USD';

    let statusBadge: QuickStatsData['statusBadge'] = {
      label: '100% RECONCILED',
      variant: 'optimal',
    };
    if (discrepancies > 0 || rate < 95) {
      statusBadge = {
        label: rate < 85 ? 'MATERIAL DISCREPANCIES' : 'ATTENTION REQUIRED',
        variant: rate < 85 ? 'critical' : 'attention',
      };
    } else if (unmatchedCount > 0) {
      statusBadge = {
        label: 'PARTIALLY MATCHED',
        variant: 'attention',
      };
    }

    return {
      primaryKpiLabel: 'Overall Reconciliation Match Rate',
      primaryKpiValue: formatPercent(rate, 1),
      statusBadge,
      metrics: [
        {
          label: 'Net Residual Variance',
          value: netVariance === 0 ? '$0.00 Balanced' : formatCurrency(netVariance, currency),
          alert: Math.abs(netVariance) > 0.05,
        },
        {
          label: 'Unmatched Items',
          value: `${unmatchedCount} item${unmatchedCount === 1 ? '' : 's'}`,
          alert: unmatchedCount > 0,
        },
        {
          label: 'Material Discrepancies',
          value: `${discrepancies} item${discrepancies === 1 ? '' : 's'}`,
          alert: discrepancies > 0,
        },
        {
          label: 'Matched Count',
          value: `${reconResult?.matchedCount ?? 0} confirmed`,
          highlight: true,
        },
      ],
      runTimestamp: run?.createdAt,
      runId: run?.id || reconResult?.runId,
      executionTimeMs: run?.executionTimeMs,
    };
  }

  if (module === 'decision') {
    if (!decisionResult && !run?.summary) return null;
    const conflicts = decisionResult?.conflictingDecisionsCount ?? run?.summary?.conflictsCount ?? 0;
    const totalApps = decisionResult?.totalApplications ?? run?.summary?.totalApplications ?? 0;
    const approved = decisionResult?.recordedApprovals ?? run?.summary?.recordedApprovals ?? 0;
    const approvalRate = totalApps > 0 ? (approved / totalApps) * 100 : 0;
    const computedPasses = decisionResult?.computedPasses ?? 0;

    let statusBadge: QuickStatsData['statusBadge'] = {
      label: '100% POLICY CONFORMING',
      variant: 'optimal',
    };
    if (conflicts > 0) {
      statusBadge = {
        label: `${conflicts} OVERRIDE CONFLICT${conflicts === 1 ? '' : 'S'}`,
        variant: 'critical',
      };
    }

    return {
      primaryKpiLabel: 'Credit Policy Integrity',
      primaryKpiValue: conflicts === 0 ? '100% Conforming' : `${conflicts} Overrides Flagged`,
      statusBadge,
      metrics: [
        {
          label: 'Audited Applications',
          value: `${totalApps} files`,
          highlight: true,
        },
        {
          label: 'Recorded Approval Rate',
          value: formatPercent(approvalRate, 1),
        },
        {
          label: 'Policy Passes (Algorithmic)',
          value: `${computedPasses} of ${totalApps}`,
        },
        {
          label: 'Manual Policy Divergence',
          value: `${conflicts} conflict${conflicts === 1 ? '' : 's'}`,
          alert: conflicts > 0,
        },
      ],
      runTimestamp: run?.createdAt,
      runId: run?.id || decisionResult?.runId,
      executionTimeMs: run?.executionTimeMs,
    };
  }

  if (module === 'risk') {
    if (!riskResult && !run?.summary) return null;
    const breaches = riskResult?.activeBreachesCount ?? run?.summary?.breachesCount ?? 0;
    const grossExposure = riskResult?.totalGrossExposure ?? run?.summary?.totalGrossExposure ?? 0;
    const netExposure = riskResult?.totalNetExposure ?? run?.summary?.totalNetExposure ?? 0;
    const avgLimit = riskResult?.averageLimitUtilizationPercent ?? 0;
    const topConcentration = riskResult?.topConcentrations?.[0];
    const topShare = topConcentration?.shareOfTotalPercent ?? run?.summary?.highestConcentrationShare ?? 0;
    const currency = riskResult?.baseCurrency ?? 'USD';

    let statusBadge: QuickStatsData['statusBadge'] = {
      label: 'WITHIN RISK LIMITS',
      variant: 'optimal',
    };
    if (breaches > 0) {
      statusBadge = {
        label: `${breaches} COUNTERPARTY BREACH${breaches === 1 ? '' : 'ES'}`,
        variant: 'critical',
      };
    } else if (avgLimit >= 80 || topShare >= 25) {
      statusBadge = {
        label: 'HIGH CONCENTRATION',
        variant: 'attention',
      };
    }

    return {
      primaryKpiLabel: 'Total Monitored Gross Exposure',
      primaryKpiValue: formatCurrency(grossExposure, currency),
      statusBadge,
      metrics: [
        {
          label: 'Limit Breaches',
          value: `${breaches} breach${breaches === 1 ? '' : 'es'}`,
          alert: breaches > 0,
        },
        {
          label: 'Max Counterparty Share',
          value: `${topShare.toFixed(1)}% (${topConcentration?.counterparty?.split(' ')[0] || 'Top Name'})`,
          alert: topShare >= 25,
        },
        {
          label: 'Net Ledger Exposure',
          value: formatCurrency(netExposure, currency),
          highlight: true,
        },
        {
          label: 'Monitored Positions',
          value: `${riskResult?.positionsCount ?? 0} active`,
        },
      ],
      runTimestamp: run?.createdAt,
      runId: run?.id || riskResult?.runId,
      executionTimeMs: run?.executionTimeMs,
    };
  }

  if (module === 'close') {
    if (!closeResult && !run?.summary) return null;
    const completionRate = closeResult?.completionRatePercent ?? run?.summary?.completionRate ?? 0;
    const totalDurationHours = closeResult?.totalProjectDurationHours ?? run?.summary?.criticalPathHours ?? 0;
    const criticalBlockersFromList = closeResult?.blockers?.filter((b) => b.isCriticalPath).length ?? 0;
    const blockedCount =
      criticalBlockersFromList > 0
        ? criticalBlockersFromList
        : (closeResult?.blockedTasksCount ?? run?.summary?.blockedCriticalTasks ?? 0);
    const hasCycles = closeResult?.hasCycles ?? false;
    const completedTasks = closeResult?.completedTasks ?? 0;
    const totalTasks = closeResult?.totalTasks ?? 0;

    let statusBadge: QuickStatsData['statusBadge'] = {
      label: 'CLOSE ON SCHEDULE',
      variant: 'optimal',
    };
    if (hasCycles) {
      statusBadge = {
        label: 'CIRCULAR DEPENDENCY LOOP',
        variant: 'critical',
      };
    } else if (blockedCount > 0) {
      statusBadge = {
        label: `${blockedCount} CRITICAL BLOCKER${blockedCount === 1 ? '' : 'S'}`,
        variant: 'critical',
      };
    } else if (completionRate < 50) {
      statusBadge = {
        label: 'SCHEDULE IN PROGRESS',
        variant: 'attention',
      };
    }

    return {
      primaryKpiLabel: 'Month-End Close Completion Rate',
      primaryKpiValue: formatPercent(completionRate, 1),
      statusBadge,
      metrics: [
        {
          label: 'Critical Path Duration',
          value: `${totalDurationHours.toFixed(1)} hours`,
          highlight: true,
        },
        {
          label: 'Tasks Completed',
          value: `${completedTasks} of ${totalTasks}`,
        },
        {
          label: 'Critical Path Blockers',
          value: `${blockedCount} blocker${blockedCount === 1 ? '' : 's'}`,
          alert: blockedCount > 0,
        },
        {
          label: 'CPM Schedule Integrity',
          value: hasCycles ? 'Cycle Detected' : 'Cycle-Free',
          alert: hasCycles,
        },
      ],
      runTimestamp: run?.createdAt,
      runId: run?.id || closeResult?.runId,
      executionTimeMs: run?.executionTimeMs,
    };
  }

  return null;
}

interface QuickStatsBannerProps {
  module: ModuleType;
  run: AnalysisRunMetadata | null;
  reconResult: ReconResult | null;
  decisionResult: DecisionResult | null;
  riskResult: RiskResult | null;
  closeResult: CloseResult | null;
  onScrollToResults?: () => void;
}

const MODULE_THEMES: Record<
  ModuleType,
  {
    name: string;
    kpiSubtext: string;
    icon: React.ComponentType<{ className?: string }>;
    accentBg: string;
    accentBorder: string;
    targetDescription: string;
  }
> = {
  reconciliation: {
    name: 'Reconciliation Intelligence',
    kpiSubtext: 'Primary Bank vs General Ledger Cross-Check',
    icon: FileCheck2,
    accentBg: 'bg-[#FFD629]',
    accentBorder: 'border-black',
    targetDescription: 'Deterministic match rate, tolerance variances, and unmatched volume cross-checking.',
  },
  decision: {
    name: 'Decision Intelligence',
    kpiSubtext: 'Underwriting Policy Adherence & Override Audit',
    icon: Scale,
    accentBg: 'bg-[#10B981]',
    accentBorder: 'border-black',
    targetDescription: 'Automated DTI, FICO, and underwriting policy conformance vs recorded manual outcomes.',
  },
  risk: {
    name: 'Risk & Exposure Intelligence',
    kpiSubtext: 'Institutional Counterparty Limits & Gross Exposure',
    icon: ShieldAlert,
    accentBg: 'bg-[#FB7185]',
    accentBorder: 'border-black',
    targetDescription: 'Counterparty concentration, limit breach monitoring, and treasury vs ERP reconciliation.',
  },
  close: {
    name: 'Close Intelligence',
    kpiSubtext: 'Critical Path Method (CPM) Milestone Projection',
    icon: CalendarClock,
    accentBg: 'bg-[#A855F7]',
    accentBorder: 'border-black',
    targetDescription: 'Task dependency graphs, circular prerequisites prevention, and critical path scheduling.',
  },
};

export const QuickStatsBanner: React.FC<QuickStatsBannerProps> = ({
  module,
  run,
  reconResult,
  decisionResult,
  riskResult,
  closeResult,
  onScrollToResults,
}) => {
  const theme = MODULE_THEMES[module];
  const IconComponent = theme.icon;

  const stats = extractQuickStats(
    module,
    run,
    reconResult,
    decisionResult,
    riskResult,
    closeResult
  );

  // High-contrast Zero State Banner (when no runs have been executed yet)
  if (!stats) {
    return (
      <div className="rounded-2xl border-2 border-black bg-white p-5 sm:p-6 shadow-neo transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl ${theme.accentBg} border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0`}>
              <IconComponent className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded border border-black bg-neutral-100 text-black shadow-neo-sm">
                  Quick Stats Banner
                </span>
                <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded border border-black bg-[#FFD629] text-black shadow-neo-sm">
                  Awaiting Ingestion
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-black tracking-tight mt-1">
                {theme.name} — Performance Baseline
              </h3>
              <p className="text-xs text-neutral-700 font-semibold mt-0.5 max-w-2xl">
                {theme.targetDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-200">
            <div className="px-4 py-2 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block">Critical KPI Target:</span>
              <span className="font-black text-black text-sm">
                {module === 'reconciliation' ? 'Match Rate (%)' : module === 'decision' ? 'Policy Conformance (%)' : module === 'risk' ? 'Gross Exposure & Breaches' : 'Completion Rate & CPM'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const badgeBg =
    stats.statusBadge.variant === 'optimal'
      ? 'bg-[#10B981] text-black'
      : stats.statusBadge.variant === 'attention'
      ? 'bg-[#FFD629] text-black'
      : stats.statusBadge.variant === 'critical'
      ? 'bg-[#FB7185] text-black'
      : 'bg-neutral-100 text-black';

  return (
    <div className="rounded-2xl border-2 border-black bg-white p-5 sm:p-6 shadow-neo transition-all space-y-4">
      {/* Top Banner Row: Header & Primary KPI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-4 border-b-2 border-neutral-200">
        {/* Left: Module identity & Status Badge */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl ${theme.accentBg} border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0`}>
            <IconComponent className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded border border-black bg-neutral-100 text-black shadow-neo-sm">
                Latest Run Performance
              </span>
              <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-0.5 rounded border border-black shadow-neo-sm ${badgeBg}`}>
                {stats.statusBadge.label}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-black tracking-tight mt-1 flex items-center gap-2">
              <span>{theme.name}</span>
            </h3>
            <p className="text-xs text-neutral-600 font-bold mt-0.5">
              {theme.kpiSubtext}
            </p>
          </div>
        </div>

        {/* Right: High-Contrast Hero KPI Display */}
        <div className="flex items-center gap-4 flex-wrap self-start lg:self-auto">
          <div className="px-5 py-3 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono font-black text-neutral-600 tracking-wider block">
                {stats.primaryKpiLabel}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono tracking-tight mt-0.5 flex items-baseline gap-2">
                <span>{stats.primaryKpiValue}</span>
                <span className="text-xs font-black px-1.5 py-0.5 rounded bg-black text-white uppercase font-sans">
                  Active
                </span>
              </div>
            </div>

            <div className={`w-10 h-10 rounded-xl ${theme.accentBg} border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0`}>
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Supporting KPI Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {stats.metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border-2 border-black font-mono shadow-neo-sm transition-all ${
              metric.alert
                ? 'bg-rose-50 border-black text-black'
                : metric.highlight
                ? 'bg-[#FFFDF8] border-black text-black'
                : 'bg-white border-black text-black'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-neutral-600 block truncate">
              {metric.label}
            </span>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span
                className={`text-sm sm:text-base font-black truncate ${
                  metric.alert ? 'text-rose-700' : 'text-black'
                }`}
              >
                {metric.value}
              </span>
              {metric.alert && (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5] shrink-0" />
              )}
              {metric.highlight && !metric.alert && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Footer: Run Metadata and Jump Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-200 text-[11px] font-mono text-neutral-600">
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="w-3.5 h-3.5 text-neutral-800 stroke-[2.2]" />
          <span>
            Run ID: <strong className="text-black font-black">{stats.runId ? stats.runId.substring(0, 16) : 'Current'}</strong>
          </span>
          {stats.runTimestamp && (
            <>
              <span>•</span>
              <span>{new Date(stats.runTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </>
          )}
          {stats.executionTimeMs !== undefined && (
            <>
              <span>•</span>
              <span>Computed in {stats.executionTimeMs}ms</span>
            </>
          )}
        </div>

        {onScrollToResults && (
          <button
            type="button"
            onClick={onScrollToResults}
            className="text-xs font-mono font-black text-black hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Jump to Full Breakdown</span>
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
