import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  FileCheck2,
  Scale,
  CalendarClock,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ExecutiveBriefing,
  Finding,
  ModuleType,
  ReconResult,
  DecisionResult,
  RiskResult,
  CloseResult,
  WeeklyFindingsAggregation,
} from '../types/index.ts';
import { formatPercent } from '../utils/decimal.ts';
import { getWeeklyAggregatedFindingsCounts } from '../utils/storage.ts';

interface ExecutiveControlRoomProps {
  briefing: ExecutiveBriefing;
  reconResult: ReconResult | null;
  decisionResult: DecisionResult | null;
  riskResult: RiskResult | null;
  closeResult: CloseResult | null;
  onSelectModule: (module: ModuleType) => void;
  onOpenEvidence: (finding: Finding) => void;
  onOpenReview: (finding: Finding) => void;
  onExportDossier: () => void;
  weeklyTrends?: WeeklyFindingsAggregation[];
}

export const ExecutiveControlRoom: React.FC<ExecutiveControlRoomProps> = ({
  briefing,
  reconResult,
  decisionResult,
  riskResult,
  closeResult,
  onSelectModule,
  onOpenEvidence,
  onOpenReview,
  onExportDossier,
  weeklyTrends: propWeeklyTrends,
}) => {
  const [selectedChartMode, setSelectedChartMode] = useState<'all' | 'reconciliation' | 'decision' | 'risk' | 'close'>('all');

  // Compute weekly findings trends from storage or props
  const weeklyData = useMemo(() => {
    if (propWeeklyTrends && propWeeklyTrends.length > 0) {
      return propWeeklyTrends;
    }
    return getWeeklyAggregatedFindingsCounts(6);
  }, [propWeeklyTrends, reconResult, decisionResult, riskResult, closeResult]);

  const latestWeek = weeklyData[weeklyData.length - 1] || {
    reconciliation: 0,
    decision: 0,
    risk: 0,
    close: 0,
    total: 0,
    criticalCount: 0,
  };

  // Compute 6-week arithmetic means for each individual module and total
  const {
    reconMean,
    decisionMean,
    riskMean,
    closeMean,
    totalMean,
  } = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return { reconMean: 0, decisionMean: 0, riskMean: 0, closeMean: 0, totalMean: 0 };
    }
    const n = weeklyData.length;
    const reconSum = weeklyData.reduce((acc, d) => acc + d.reconciliation, 0);
    const decisionSum = weeklyData.reduce((acc, d) => acc + d.decision, 0);
    const riskSum = weeklyData.reduce((acc, d) => acc + d.risk, 0);
    const closeSum = weeklyData.reduce((acc, d) => acc + d.close, 0);
    const totalSum = weeklyData.reduce((acc, d) => acc + d.total, 0);

    return {
      reconMean: Number((reconSum / n).toFixed(1)),
      decisionMean: Number((decisionSum / n).toFixed(1)),
      riskMean: Number((riskSum / n).toFixed(1)),
      closeMean: Number((closeSum / n).toFixed(1)),
      totalMean: Number((totalSum / n).toFixed(1)),
    };
  }, [weeklyData]);

  // Determine active mean for current chart filter
  const activeMean = useMemo(() => {
    switch (selectedChartMode) {
      case 'reconciliation':
        return reconMean;
      case 'decision':
        return decisionMean;
      case 'risk':
        return riskMean;
      case 'close':
        return closeMean;
      case 'all':
      default:
        return totalMean;
    }
  }, [selectedChartMode, reconMean, decisionMean, riskMean, closeMean, totalMean]);

  const activeCurrent = useMemo(() => {
    switch (selectedChartMode) {
      case 'reconciliation':
        return latestWeek.reconciliation;
      case 'decision':
        return latestWeek.decision;
      case 'risk':
        return latestWeek.risk;
      case 'close':
        return latestWeek.close;
      case 'all':
      default:
        return latestWeek.total;
    }
  }, [selectedChartMode, latestWeek]);

  // Context comparison helper
  const getComparison = (current: number, mean: number) => {
    if (mean === 0) {
      return {
        label: current === 0 ? 'Baseline (0)' : `${current} (New)`,
        isAbove: current > 0,
        isBelow: false,
        diffPct: 0,
        diffRaw: current,
      };
    }
    const diff = current - mean;
    const pct = Math.round((Math.abs(diff) / mean) * 100);
    if (diff > 0.05) {
      return {
        label: `+${pct}% Above Avg`,
        isAbove: true,
        isBelow: false,
        diffPct: pct,
        diffRaw: Number(diff.toFixed(1)),
      };
    }
    if (diff < -0.05) {
      return {
        label: `-${pct}% Below Avg`,
        isAbove: false,
        isBelow: true,
        diffPct: pct,
        diffRaw: Number(diff.toFixed(1)),
      };
    }
    return {
      label: 'At 6-Wk Average',
      isAbove: false,
      isBelow: false,
      diffPct: 0,
      diffRaw: 0,
    };
  };

  const activeComparison = useMemo(() => {
    return getComparison(activeCurrent, activeMean);
  }, [activeCurrent, activeMean]);

  const reconComparison = useMemo(() => getComparison(latestWeek.reconciliation, reconMean), [latestWeek.reconciliation, reconMean]);
  const decisionComparison = useMemo(() => getComparison(latestWeek.decision, decisionMean), [latestWeek.decision, decisionMean]);
  const riskComparison = useMemo(() => getComparison(latestWeek.risk, riskMean), [latestWeek.risk, riskMean]);
  const closeComparison = useMemo(() => getComparison(latestWeek.close, closeMean), [latestWeek.close, closeMean]);

  const peakWeeklyFindings = useMemo(() => {
    return Math.max(...weeklyData.map((d) => d.total), 1);
  }, [weeklyData]);

  const totalFindingsAcrossTime = useMemo(() => {
    return weeklyData.reduce((acc, curr) => acc + curr.total, 0);
  }, [weeklyData]);

  // Custom Neobrutalist Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WeeklyFindingsAggregation;
      const pointDiff = data.total - totalMean;
      return (
        <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-neo font-sans text-xs min-w-[210px]">
          <p className="font-black text-black border-b-2 border-black pb-1 mb-2">
            {data.weekLabel || label}
          </p>
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD629] border border-black shrink-0" />
                Reconciliation:
              </span>
              <span className="font-black text-black">{data.reconciliation}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-black shrink-0" />
                Decision:
              </span>
              <span className="font-black text-black">{data.decision}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185] border border-black shrink-0" />
                Risk & Exposure:
              </span>
              <span className="font-black text-black">{data.risk}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border border-black shrink-0" />
                Close:
              </span>
              <span className="font-black text-black">{data.close}</span>
            </div>

            <div className="pt-2 mt-1 border-t-2 border-black flex items-center justify-between gap-3 font-black text-black text-xs">
              <span>Weekly Total:</span>
              <span className="text-sm font-black bg-[#FFD629] border border-black px-1.5 py-0.2 rounded shadow-neo-sm">
                {data.total}
              </span>
            </div>

            {/* Mean Reference Comparison In Tooltip */}
            <div className="pt-1 text-[10px] text-neutral-700 flex items-center justify-between font-bold">
              <span>Vs 6-Wk Mean ({totalMean}):</span>
              <span className={pointDiff > 0 ? 'text-rose-600 font-black' : pointDiff < 0 ? 'text-emerald-700 font-black' : 'text-neutral-700 font-black'}>
                {pointDiff > 0 ? `+${pointDiff.toFixed(1)} Above` : pointDiff < 0 ? `${pointDiff.toFixed(1)} Below` : 'At Mean'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Header */}
      <div className="p-6 rounded-2xl bg-white border-2 border-black shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFD629] border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
              <LayoutDashboard className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                Executive Decision Control Room
              </h1>
              <p className="text-xs sm:text-sm text-neutral-700 font-semibold mt-0.5">
                Consolidated cross-module intelligence synthesized across {briefing.completedModulesCount} active department engine(s).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportDossier}
            className="px-4 py-2 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] text-black text-xs font-black transition border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            Export Executive Briefing Dossier
          </button>
        </div>
      </div>

      {/* Four Department Health Gauges with Mini Sparklines and Horizontal Mean Markers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Reconciliation */}
        <div
          onClick={() => onSelectModule('reconciliation')}
          className="p-5 rounded-2xl bg-white border-2 border-black shadow-neo hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFD629] border-2 border-black flex items-center justify-center text-black shadow-neo-sm group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                  briefing.reconciliationHealth.status === 'OPTIMAL'
                    ? 'bg-[#10B981] text-black'
                    : briefing.reconciliationHealth.status === 'ATTENTION'
                    ? 'bg-[#FFD629] text-black'
                    : briefing.reconciliationHealth.status === 'CRITICAL'
                    ? 'bg-[#FB7185] text-black'
                    : 'bg-neutral-100 text-black'
                }`}
              >
                {briefing.reconciliationHealth.status}
              </span>
            </div>
            <h4 className="text-sm font-black text-black">
              Reconciliation Health
            </h4>
            <div className="mt-2 text-xs font-mono">
              {reconResult ? (
                <>
                  <div className="text-xl font-black text-black">
                    {formatPercent(briefing.reconciliationHealth.rate, 1)} Match
                  </div>
                  <div className="text-[11px] text-neutral-600 font-bold mt-0.5">
                    {briefing.reconciliationHealth.unmatchedCount} unmatched items
                  </div>
                </>
              ) : (
                <span className="text-neutral-500 font-semibold">No data analyzed yet</span>
              )}
            </div>
          </div>

          {/* Mini Sparkline with Horizontal Mean Marker */}
          <div className="mt-3 pt-2 border-t-2 border-neutral-100">
            <div className="h-10 w-full relative">
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={weeklyData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reconGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFD629" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#FFD629" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="reconciliation"
                    stroke="#000000"
                    strokeWidth={2}
                    fill="url(#reconGradient)"
                    isAnimationActive={false}
                  />
                  {/* Horizontal Marker at Mean Volume */}
                  <ReferenceLine
                    y={reconMean}
                    stroke="#000000"
                    strokeDasharray="2 2"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Mean Context Label */}
            <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1 border-t border-neutral-200">
              <span className="text-neutral-600">Mean: <strong className="text-black font-black">{reconMean}</strong></span>
              <span className={`px-1.5 py-0.2 rounded border border-black font-black text-[9px] shadow-neo-sm ${
                reconComparison.isAbove ? 'bg-[#FB7185] text-black' : reconComparison.isBelow ? 'bg-[#10B981] text-black' : 'bg-neutral-100 text-black'
              }`}>
                {reconComparison.label}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Decision Integrity */}
        <div
          onClick={() => onSelectModule('decision')}
          className="p-5 rounded-2xl bg-white border-2 border-black shadow-neo hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981] border-2 border-black flex items-center justify-center text-black shadow-neo-sm group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                  briefing.creditDecisionIntegrity.status === 'OPTIMAL'
                    ? 'bg-[#10B981] text-black'
                    : briefing.creditDecisionIntegrity.status === 'CRITICAL'
                    ? 'bg-[#FB7185] text-black'
                    : 'bg-neutral-100 text-black'
                }`}
              >
                {briefing.creditDecisionIntegrity.status}
              </span>
            </div>
            <h4 className="text-sm font-black text-black">
              Credit Policy Integrity
            </h4>
            <div className="mt-2 text-xs font-mono">
              {decisionResult ? (
                <>
                  <div className="text-xl font-black text-black">
                    {briefing.creditDecisionIntegrity.conflictsCount === 0 ? '100% Conforming' : `${briefing.creditDecisionIntegrity.conflictsCount} Overrides`}
                  </div>
                  <div className="text-[11px] text-neutral-600 font-bold mt-0.5">
                    {decisionResult.totalApplications} applications audited
                  </div>
                </>
              ) : (
                <span className="text-neutral-500 font-semibold">No data analyzed yet</span>
              )}
            </div>
          </div>

          {/* Mini Sparkline with Horizontal Mean Marker */}
          <div className="mt-3 pt-2 border-t-2 border-neutral-100">
            <div className="h-10 w-full relative">
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={weeklyData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="decisionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="decision"
                    stroke="#000000"
                    strokeWidth={2}
                    fill="url(#decisionGradient)"
                    isAnimationActive={false}
                  />
                  {/* Horizontal Marker at Mean Volume */}
                  <ReferenceLine
                    y={decisionMean}
                    stroke="#000000"
                    strokeDasharray="2 2"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Mean Context Label */}
            <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1 border-t border-neutral-200">
              <span className="text-neutral-600">Mean: <strong className="text-black font-black">{decisionMean}</strong></span>
              <span className={`px-1.5 py-0.2 rounded border border-black font-black text-[9px] shadow-neo-sm ${
                decisionComparison.isAbove ? 'bg-[#FB7185] text-black' : decisionComparison.isBelow ? 'bg-[#10B981] text-black' : 'bg-neutral-100 text-black'
              }`}>
                {decisionComparison.label}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Treasury Risk */}
        <div
          onClick={() => onSelectModule('risk')}
          className="p-5 rounded-2xl bg-white border-2 border-black shadow-neo hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FB7185] border-2 border-black flex items-center justify-center text-black shadow-neo-sm group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                  briefing.treasuryRiskHealth.status === 'OPTIMAL'
                    ? 'bg-[#10B981] text-black'
                    : briefing.treasuryRiskHealth.status === 'CRITICAL'
                    ? 'bg-[#FB7185] text-black'
                    : 'bg-neutral-100 text-black'
                }`}
              >
                {briefing.treasuryRiskHealth.status}
              </span>
            </div>
            <h4 className="text-sm font-black text-black">
              Treasury Risk & Limits
            </h4>
            <div className="mt-2 text-xs font-mono">
              {riskResult ? (
                <>
                  <div className="text-xl font-black text-black">
                    {briefing.treasuryRiskHealth.breachesCount} Limit Breach{briefing.treasuryRiskHealth.breachesCount === 1 ? '' : 'es'}
                  </div>
                  <div className="text-[11px] text-neutral-600 font-bold mt-0.5">
                    Max concentration: {briefing.treasuryRiskHealth.highestConcentrationShare}%
                  </div>
                </>
              ) : (
                <span className="text-neutral-500 font-semibold">No data analyzed yet</span>
              )}
            </div>
          </div>

          {/* Mini Sparkline with Horizontal Mean Marker */}
          <div className="mt-3 pt-2 border-t-2 border-neutral-100">
            <div className="h-10 w-full relative">
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={weeklyData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB7185" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#FB7185" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#000000"
                    strokeWidth={2}
                    fill="url(#riskGradient)"
                    isAnimationActive={false}
                  />
                  {/* Horizontal Marker at Mean Volume */}
                  <ReferenceLine
                    y={riskMean}
                    stroke="#000000"
                    strokeDasharray="2 2"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Mean Context Label */}
            <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1 border-t border-neutral-200">
              <span className="text-neutral-600">Mean: <strong className="text-black font-black">{riskMean}</strong></span>
              <span className={`px-1.5 py-0.2 rounded border border-black font-black text-[9px] shadow-neo-sm ${
                riskComparison.isAbove ? 'bg-[#FB7185] text-black' : riskComparison.isBelow ? 'bg-[#10B981] text-black' : 'bg-neutral-100 text-black'
              }`}>
                {riskComparison.label}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Close Health */}
        <div
          onClick={() => onSelectModule('close')}
          className="p-5 rounded-2xl bg-white border-2 border-black shadow-neo hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#A855F7] border-2 border-black flex items-center justify-center text-white shadow-neo-sm group-hover:scale-105 transition-transform">
                <CalendarClock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                  briefing.closeTimelineHealth.status === 'OPTIMAL'
                    ? 'bg-[#10B981] text-black'
                    : briefing.closeTimelineHealth.status === 'CRITICAL'
                    ? 'bg-[#FB7185] text-black'
                    : 'bg-neutral-100 text-black'
                }`}
              >
                {briefing.closeTimelineHealth.status}
              </span>
            </div>
            <h4 className="text-sm font-black text-black">
              Month-End Close Timeline
            </h4>
            <div className="mt-2 text-xs font-mono">
              {closeResult ? (
                <>
                  <div className="text-xl font-black text-black">
                    {formatPercent(briefing.closeTimelineHealth.completionRate, 1)} Done
                  </div>
                  <div className="text-[11px] text-neutral-600 font-bold mt-0.5">
                    {briefing.closeTimelineHealth.blockedCriticalTasks} critical path blocker(s)
                  </div>
                </>
              ) : (
                <span className="text-neutral-500 font-semibold">No data analyzed yet</span>
              )}
            </div>
          </div>

          {/* Mini Sparkline with Horizontal Mean Marker */}
          <div className="mt-3 pt-2 border-t-2 border-neutral-100">
            <div className="h-10 w-full relative">
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={weeklyData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="closeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#000000"
                    strokeWidth={2}
                    fill="url(#closeGradient)"
                    isAnimationActive={false}
                  />
                  {/* Horizontal Marker at Mean Volume */}
                  <ReferenceLine
                    y={closeMean}
                    stroke="#000000"
                    strokeDasharray="2 2"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Mean Context Label */}
            <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1 border-t border-neutral-200">
              <span className="text-neutral-600">Mean: <strong className="text-black font-black">{closeMean}</strong></span>
              <span className={`px-1.5 py-0.2 rounded border border-black font-black text-[9px] shadow-neo-sm ${
                closeComparison.isAbove ? 'bg-[#FB7185] text-black' : closeComparison.isBelow ? 'bg-[#10B981] text-black' : 'bg-neutral-100 text-black'
              }`}>
                {closeComparison.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Findings Volume & Department Trends Chart with Color-Coded Legend & Mean Marker */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border-2 border-black shadow-neo space-y-6">
        {/* Top Header of Sparkline / Trend Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                Historical Findings Volume & Department Trends
              </h2>
            </div>
            <p className="text-xs text-neutral-700 font-semibold mt-1">
              Weekly aggregated volume across departments with horizontal mean baseline markers indicating above or below average performance.
            </p>
          </div>

          {/* Quick Stats Callouts with Mean Baseline Context */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm font-mono text-xs flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-neutral-600">Active Week:</span>
              <span className="font-black text-black text-sm">{activeCurrent}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm font-mono text-xs flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-neutral-600">6-Wk Mean:</span>
              <span className="font-black text-black text-sm">{activeMean} / wk</span>
            </div>

            {/* Context Badge: Above or Below Average */}
            <div className={`px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm font-mono text-xs font-black flex items-center gap-1.5 ${
              activeComparison.isAbove
                ? 'bg-[#FB7185] text-black'
                : activeComparison.isBelow
                ? 'bg-[#10B981] text-black'
                : 'bg-[#FFD629] text-black'
            }`}>
              {activeComparison.isAbove ? (
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
              ) : activeComparison.isBelow ? (
                <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              )}
              <span>{activeComparison.label}</span>
            </div>
          </div>
        </div>

        {/* Small Color-Coded Legend Matching Existing Module Colors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-black uppercase tracking-wider font-mono mr-1">
              Department Legend:
            </span>

            {/* Reconciliation Legend Pill (Yellow) */}
            <button
              onClick={() => setSelectedChartMode(selectedChartMode === 'reconciliation' ? 'all' : 'reconciliation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-black transition-all shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active ${
                selectedChartMode === 'reconciliation' || selectedChartMode === 'all'
                  ? 'bg-[#FFD629] text-black ring-1 ring-black'
                  : 'bg-white text-neutral-500 opacity-60'
              }`}
              title="Filter to Reconciliation Intelligence trend"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD629] border border-black shadow-neo-sm shrink-0" />
              <span>Reconciliation</span>
              <span className="font-mono text-[11px] bg-white border border-black px-1.5 py-0.2 rounded font-black ml-0.5">
                {latestWeek.reconciliation}
              </span>
            </button>

            {/* Decision Legend Pill (Green) */}
            <button
              onClick={() => setSelectedChartMode(selectedChartMode === 'decision' ? 'all' : 'decision')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-black transition-all shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active ${
                selectedChartMode === 'decision' || selectedChartMode === 'all'
                  ? 'bg-[#10B981] text-black ring-1 ring-black'
                  : 'bg-white text-neutral-500 opacity-60'
              }`}
              title="Filter to Decision Intelligence trend"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-black shadow-neo-sm shrink-0" />
              <span>Decision</span>
              <span className="font-mono text-[11px] bg-white border border-black px-1.5 py-0.2 rounded font-black ml-0.5">
                {latestWeek.decision}
              </span>
            </button>

            {/* Risk & Exposure Legend Pill (Pink) */}
            <button
              onClick={() => setSelectedChartMode(selectedChartMode === 'risk' ? 'all' : 'risk')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-black transition-all shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active ${
                selectedChartMode === 'risk' || selectedChartMode === 'all'
                  ? 'bg-[#FB7185] text-black ring-1 ring-black'
                  : 'bg-white text-neutral-500 opacity-60'
              }`}
              title="Filter to Risk & Exposure trend"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185] border border-black shadow-neo-sm shrink-0" />
              <span>Risk & Exposure</span>
              <span className="font-mono text-[11px] bg-white border border-black px-1.5 py-0.2 rounded font-black ml-0.5">
                {latestWeek.risk}
              </span>
            </button>

            {/* Close Intelligence Legend Pill (Purple) */}
            <button
              onClick={() => setSelectedChartMode(selectedChartMode === 'close' ? 'all' : 'close')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-black transition-all shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active ${
                selectedChartMode === 'close' || selectedChartMode === 'all'
                  ? 'bg-[#A855F7] text-white ring-1 ring-black'
                  : 'bg-white text-neutral-500 opacity-60'
              }`}
              title="Filter to Close Intelligence trend"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border border-white shrink-0" />
              <span>Close</span>
              <span className="font-mono text-[11px] bg-white text-black border border-black px-1.5 py-0.2 rounded font-black ml-0.5">
                {latestWeek.close}
              </span>
            </button>
          </div>

          {/* Reset / All Toggle */}
          {selectedChartMode !== 'all' && (
            <button
              onClick={() => setSelectedChartMode('all')}
              className="text-xs font-mono font-bold text-neutral-700 underline hover:text-black"
            >
              Show All Departments
            </button>
          )}
        </div>

        {/* Main Recharts Sparkline Trend Visualization with Horizontal Mean Reference Marker */}
        <div className="w-full bg-[#FFFDF8] border-2 border-black rounded-2xl p-4 sm:p-5 shadow-neo-sm">
          <div className="h-[270px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weeklyData}
                margin={{ top: 25, right: 35, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#111111"
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#111111', fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#111111"
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#111111', fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                  domain={[0, 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Horizontal Marker at Mean Finding Volume */}
                <ReferenceLine
                  y={activeMean}
                  stroke="#E11D48"
                  strokeDasharray="4 4"
                  strokeWidth={2.5}
                  label={{
                    value: `6-Wk Mean: ${activeMean}`,
                    position: 'top',
                    fill: '#BE123C',
                    fontSize: 12,
                    fontWeight: 900,
                    fontFamily: 'JetBrains Mono',
                  }}
                />

                {/* Line 1: Reconciliation (Yellow) */}
                {(selectedChartMode === 'all' || selectedChartMode === 'reconciliation') && (
                  <Line
                    type="monotone"
                    name="Reconciliation"
                    dataKey="reconciliation"
                    stroke="#FFD629"
                    strokeWidth={3.5}
                    dot={{ fill: '#FFD629', stroke: '#000000', strokeWidth: 2, r: 4.5 }}
                    activeDot={{ fill: '#FFD629', stroke: '#000000', strokeWidth: 2.5, r: 6 }}
                    isAnimationActive={true}
                  />
                )}

                {/* Line 2: Decision (Green) */}
                {(selectedChartMode === 'all' || selectedChartMode === 'decision') && (
                  <Line
                    type="monotone"
                    name="Decision"
                    dataKey="decision"
                    stroke="#10B981"
                    strokeWidth={3.5}
                    dot={{ fill: '#10B981', stroke: '#000000', strokeWidth: 2, r: 4.5 }}
                    activeDot={{ fill: '#10B981', stroke: '#000000', strokeWidth: 2.5, r: 6 }}
                    isAnimationActive={true}
                  />
                )}

                {/* Line 3: Risk & Exposure (Pink) */}
                {(selectedChartMode === 'all' || selectedChartMode === 'risk') && (
                  <Line
                    type="monotone"
                    name="Risk & Exposure"
                    dataKey="risk"
                    stroke="#FB7185"
                    strokeWidth={3.5}
                    dot={{ fill: '#FB7185', stroke: '#000000', strokeWidth: 2, r: 4.5 }}
                    activeDot={{ fill: '#FB7185', stroke: '#000000', strokeWidth: 2.5, r: 6 }}
                    isAnimationActive={true}
                  />
                )}

                {/* Line 4: Close Intelligence (Purple) */}
                {(selectedChartMode === 'all' || selectedChartMode === 'close') && (
                  <Line
                    type="monotone"
                    name="Close"
                    dataKey="close"
                    stroke="#A855F7"
                    strokeWidth={3.5}
                    dot={{ fill: '#A855F7', stroke: '#000000', strokeWidth: 2, r: 4.5 }}
                    activeDot={{ fill: '#A855F7', stroke: '#000000', strokeWidth: 2.5, r: 6 }}
                    isAnimationActive={true}
                  />
                )}

                {/* Overall Total Dashed Reference Line when viewing all */}
                {selectedChartMode === 'all' && (
                  <Line
                    type="monotone"
                    name="Combined Total"
                    dataKey="total"
                    stroke="#000000"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={{ fill: '#000000', stroke: '#000000', strokeWidth: 1, r: 3 }}
                    isAnimationActive={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Chart Footer Notes with Mean Baseline Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-2 border-t-2 border-neutral-200 text-[11px] font-mono text-neutral-700">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-black">
                <Activity className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                6-Week Horizon
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-bold text-[#BE123C]">
                <span className="inline-block w-4 border-b-2 border-dashed border-[#E11D48]" />
                Horizontal Marker: Mean Volume ({activeMean}/wk)
              </span>
              <span>•</span>
              <span>
                Current Status: <strong className={activeComparison.isAbove ? 'text-rose-700 font-black' : activeComparison.isBelow ? 'text-emerald-700 font-black' : 'text-black font-black'}>{activeComparison.label}</strong>
              </span>
            </div>
            <div className="font-bold text-neutral-800">
              Total Recorded Findings: <span className="font-black text-black">{totalFindingsAcrossTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prioritized Executive Action Recommendations */}
      <div className="bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo">
        <h3 className="text-sm font-black text-black mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
          Chief of Staff — Prioritized Operational Action Matrix
        </h3>

        {briefing.actionableRecommendations.length === 0 ? (
          <p className="text-xs text-neutral-600 font-semibold">
            Upload files in the departmental engines to generate consolidated operational recommendations.
          </p>
        ) : (
          <div className="space-y-3">
            {briefing.actionableRecommendations.map((rec) => (
              <div
                key={rec.priority}
                className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#FFD629] text-black border border-black text-xs font-mono font-black flex items-center justify-center shrink-0 mt-0.5 shadow-neo-sm">
                    {rec.priority}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-black">{rec.actionText}</span>
                      <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border border-black bg-white text-black shadow-neo-sm">
                        {rec.module}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 font-semibold mt-1">{rec.rationale}</p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectModule(rec.module)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition flex items-center gap-1.5 shrink-0 border border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                >
                  Investigate Engine
                  <ArrowRight className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Critical Cross-Module Exceptions Needing Executive Sign-Off */}
      <div className="bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo">
        <h3 className="text-sm font-black text-black mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
          Unresolved Material Exceptions ({briefing.unresolvedCriticalFindings.length})
        </h3>

        {briefing.unresolvedCriticalFindings.length === 0 ? (
          <div className="p-6 text-center text-neutral-600 text-xs font-semibold">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2 stroke-[2.5]" />
            No critical unreviewed exceptions pending executive sign-off.
          </div>
        ) : (
          <div className="space-y-3">
            {briefing.unresolvedCriticalFindings.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-xl bg-rose-50 border-2 border-black shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FB7185] text-black border border-black shadow-neo-sm">
                      {f.module}
                    </span>
                    <span className="text-xs font-black text-black">{f.title}</span>
                  </div>
                  <p className="text-xs text-neutral-800 font-semibold">{f.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenEvidence(f)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition border border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                  >
                    Evidence
                  </button>
                  <button
                    onClick={() => onOpenReview(f)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border border-black text-black text-xs font-black transition shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                  >
                    Review Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
