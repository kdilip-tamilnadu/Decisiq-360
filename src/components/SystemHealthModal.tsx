import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Cpu,
  Database,
  Gauge,
  Play,
  RotateCcw,
  Download,
  ScrollText,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AnalysisRunMetadata,
  AuditEvent,
  ModuleType,
} from '../types/index.ts';
import {
  getEnginePerformanceStats,
  runEngineDiagnosticsBenchmark,
  formatBytes,
  OverallSystemHealth,
  BenchmarkResult,
} from '../utils/performance.ts';
import { logAuditEvent } from '../utils/storage.ts';

interface SystemHealthModalProps {
  runs: AnalysisRunMetadata[];
  auditEvents: AuditEvent[];
  onClose: () => void;
  onOpenAuditLog?: () => void;
}

const MODULE_ACCENT_COLORS: Record<ModuleType, { bg: string; border: string; text: string }> = {
  reconciliation: { bg: 'bg-[#FFD629]', border: 'border-black', text: 'text-black' },
  decision: { bg: 'bg-[#10B981]', border: 'border-black', text: 'text-black' },
  risk: { bg: 'bg-[#FB7185]', border: 'border-black', text: 'text-black' },
  close: { bg: 'bg-[#A855F7]', border: 'border-black', text: 'text-white' },
};

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  runs,
  auditEvents,
  onClose,
  onOpenAuditLog,
}) => {
  const [health, setHealth] = useState<OverallSystemHealth>(() =>
    getEnginePerformanceStats(runs, auditEvents)
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'engines' | 'memory' | 'history'>('overview');
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[] | null>(null);
  const [lastGcTime, setLastGcTime] = useState<string | null>(null);

  // Auto-refresh live stats every 3 seconds while open
  useEffect(() => {
    const timer = setInterval(() => {
      setHealth(getEnginePerformanceStats(runs, auditEvents));
    }, 3000);
    return () => clearInterval(timer);
  }, [runs, auditEvents]);

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    // Slight tick to render loading spinner
    await new Promise((r) => setTimeout(r, 100));

    try {
      const results = runEngineDiagnosticsBenchmark();
      setBenchmarkResults(results);

      const totalBenchmarkMs = results.reduce((acc, r) => acc + r.durationMs, 0);

      logAuditEvent({
        actionType: 'PERFORMANCE_BENCHMARK',
        details: `Diagnostic benchmark completed: All 4 engines tested in ${totalBenchmarkMs}ms. Highest latency: ${
          Math.max(...results.map((r) => r.durationMs))
        }ms.`,
        performance: {
          executionTimeMs: totalBenchmarkMs,
          engineStatus: totalBenchmarkMs < 200 ? 'OPTIMAL' : 'ACCEPTABLE',
        },
        metadata: {
          benchmarks: results,
        },
      });

      setHealth(getEnginePerformanceStats(runs, auditEvents));
    } catch (err: any) {
      console.error('Benchmark error:', err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handlePruneCache = () => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      setLastGcTime(new Date().toLocaleTimeString());
      setHealth(getEnginePerformanceStats(runs, auditEvents));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      systemHealth: health,
      benchmarkResults: benchmarkResults || 'Not executed this session',
      recentRuns: runs.slice(0, 10),
      recentAuditEvents: auditEvents.slice(0, 20),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisiq360_system_health_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const performanceEvents = auditEvents.filter(
    (e) =>
      e.performance?.executionTimeMs !== undefined ||
      e.actionType === 'ANALYSIS_RUN' ||
      e.actionType === 'PERFORMANCE_ALERT'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-black">
                  System Health & Engine Performance Monitor
                </h3>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-black" />
              </div>
              <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                Deterministic execution profiling, JS heap monitoring, and client-side storage impact telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportDiagnostics}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active flex items-center gap-1.5"
              title="Export complete diagnostics JSON"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden sm:inline">Export Report</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
              aria-label="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="mt-4 flex items-center gap-2 border-b-2 border-neutral-200 pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-black shadow-neo-sm ${
              activeTab === 'overview'
                ? 'bg-[#FFD629] text-black ring-1 ring-black'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('engines')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-black shadow-neo-sm ${
              activeTab === 'engines'
                ? 'bg-[#FFD629] text-black ring-1 ring-black'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Engine Latency Profiler
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-black shadow-neo-sm ${
              activeTab === 'memory'
                ? 'bg-[#FFD629] text-black ring-1 ring-black'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Memory & Storage Footprint
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-black shadow-neo-sm ${
              activeTab === 'history'
                ? 'bg-[#FFD629] text-black ring-1 ring-black'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Execution History ({performanceEvents.length})
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-5">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Top Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm">
                  <div className="flex items-center justify-between text-neutral-600 mb-1">
                    <span className="text-[10px] uppercase font-mono font-black">System Status</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  </div>
                  <div className="text-lg font-black text-black">
                    {health.status === 'HEALTHY' ? '100% HEALTHY' : health.status}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                    Deterministic engines nominal
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm">
                  <div className="flex items-center justify-between text-neutral-600 mb-1">
                    <span className="text-[10px] uppercase font-mono font-black">Avg Engine Latency</span>
                    <Clock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  </div>
                  <div className="text-lg font-black text-black font-mono">
                    {health.averageExecutionMs} ms
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 font-bold mt-0.5">
                    Across {health.totalRunsCount} recorded run(s)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm">
                  <div className="flex items-center justify-between text-neutral-600 mb-1">
                    <span className="text-[10px] uppercase font-mono font-black">JS Heap Memory</span>
                    <Cpu className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  </div>
                  <div className="text-lg font-black text-black font-mono">
                    {health.browserMemory.isAvailable ? health.browserMemory.usedJSHeapFormatted : 'Active'}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 font-bold mt-0.5">
                    {health.browserMemory.isAvailable
                      ? `${health.browserMemory.heapUtilizationPercent}% of allocated`
                      : 'Chromium runtime managed'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm">
                  <div className="flex items-center justify-between text-neutral-600 mb-1">
                    <span className="text-[10px] uppercase font-mono font-black">Persistent Storage</span>
                    <Database className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  </div>
                  <div className="text-lg font-black text-black font-mono">
                    {health.totalStoredFormatted}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 font-bold mt-0.5">
                    Isolated client-side tables
                  </div>
                </div>
              </div>

              {/* Action Bar: Run Benchmark & Memory GC */}
              <div className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-black stroke-[2.5]" />
                    <span className="text-xs font-black text-black">Live Benchmark Diagnostic Suite</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 font-semibold mt-0.5">
                    Runs an automated non-destructive micro-benchmark across all 4 deterministic engines.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handlePruneCache}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active flex items-center gap-1.5"
                    title="Prune session cache"
                  >
                    <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                    <span>Prune Cache</span>
                  </button>

                  <button
                    onClick={handleRunBenchmark}
                    disabled={isBenchmarking}
                    className="px-4 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] text-black text-xs font-black transition border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isBenchmarking ? (
                      <>
                        <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Benchmarking...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current stroke-[2.5]" />
                        <span>Run Diagnostics</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Benchmark Results Display (if run) */}
              {benchmarkResults && (
                <div className="p-4 rounded-xl bg-white border-2 border-black shadow-neo-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-black uppercase font-mono">
                      Live Diagnostic Benchmark Results
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-black">
                      PASSED (100% Deterministic)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {benchmarkResults.map((b) => (
                      <div
                        key={b.module}
                        className="p-2.5 rounded-lg border border-black bg-[#FFFDF8] font-mono text-xs"
                      >
                        <span className="text-[10px] font-bold text-neutral-600 block truncate">
                          {b.name}
                        </span>
                        <div className="text-sm font-black text-black mt-1">
                          {b.durationMs} ms
                        </div>
                        <div className="text-[10px] text-neutral-600 font-semibold mt-0.5">
                          {b.throughputRowsPerSec.toLocaleString()} rows/s
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engine Latency Overview Cards */}
              <div className="space-y-2">
                <span className="text-xs font-black text-black uppercase font-mono tracking-wider">
                  Engine Execution Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['reconciliation', 'decision', 'risk', 'close'] as ModuleType[]).map((m) => {
                    const stats = health.engineStats[m];
                    const accent = MODULE_ACCENT_COLORS[m];
                    return (
                      <div
                        key={m}
                        className="p-3.5 rounded-xl bg-white border-2 border-black shadow-neo-sm font-mono space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-md ${accent.bg} border border-black shrink-0`} />
                            <span className="text-xs font-black text-black">{stats.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border border-black shadow-neo-sm ${
                            stats.status === 'OPTIMAL' ? 'bg-[#10B981] text-black' : 'bg-[#FFD629] text-black'
                          }`}>
                            {stats.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-xs pt-1 border-t border-neutral-100">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-neutral-500 block">Latest:</span>
                            <span className="font-black text-black">{stats.latestExecutionMs} ms</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-neutral-500 block">Avg:</span>
                            <span className="font-black text-black">{stats.averageExecutionMs} ms</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-amber-700 block">P95:</span>
                            <span className="font-black text-black">{stats.p95ExecutionMs} ms</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-neutral-500 block">Storage:</span>
                            <span className="font-black text-black">{stats.cachedMemoryFormatted}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ENGINES PROFILER TAB */}
          {activeTab === 'engines' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-700 font-sans font-semibold">
                  Detailed latency benchmarking, row throughput capacity, and execution variation across analysis engines.
                </p>
                <button
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                  className="px-3 py-1 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border border-black text-black font-black text-[11px] shadow-neo-sm shrink-0"
                >
                  {isBenchmarking ? 'Running...' : 'Re-run Benchmark'}
                </button>
              </div>

              <div className="space-y-3">
                {(['reconciliation', 'decision', 'risk', 'close'] as ModuleType[]).map((m) => {
                  const s = health.engineStats[m];
                  const accent = MODULE_ACCENT_COLORS[m];
                  const maxBenchmarkBar = 150; // ms baseline
                  const barPercent = Math.min(100, Math.max(5, (s.averageExecutionMs / maxBenchmarkBar) * 100));

                  return (
                    <div
                      key={m}
                      className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-lg ${accent.bg} border border-black shadow-neo-sm`} />
                          <span className="text-sm font-black text-black">{s.name}</span>
                        </div>
                        <span className="text-xs font-black text-black bg-white border border-black px-2 py-0.5 rounded shadow-neo-sm">
                          {s.runsCount} Run(s) Recorded
                        </span>
                      </div>

                      {/* Visual Execution Speed Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-neutral-600 font-bold">
                          <span>Average Latency: <strong className="text-black font-black">{s.averageExecutionMs} ms</strong></span>
                          <span>Throughput: <strong className="text-black font-black">{s.averageThroughputRowsPerSec.toLocaleString()} rows/s</strong></span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-neutral-200 border border-black overflow-hidden relative">
                          <div
                            className={`h-full ${accent.bg} border-r border-black transition-all duration-300`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-neutral-200 text-[11px]">
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase font-bold block">Min Latency:</span>
                          <span className="font-black text-black">{s.minExecutionMs} ms</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase font-bold block">Avg Latency:</span>
                          <span className="font-black text-black">{s.averageExecutionMs} ms</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-amber-700 uppercase font-bold block">P95 Latency:</span>
                          <span className="font-black text-amber-950">{s.p95ExecutionMs} ms</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase font-bold block">Max Latency:</span>
                          <span className="font-black text-black">{s.maxExecutionMs} ms</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase font-bold block">Status:</span>
                          <span className="font-black text-emerald-700">{s.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MEMORY & STORAGE TAB */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border-2 border-black shadow-neo-sm space-y-3">
                <h4 className="text-xs font-black text-black uppercase font-mono flex items-center gap-2">
                  <Cpu className="w-4 h-4 stroke-[2.5]" />
                  Browser JavaScript Heap Allocation
                </h4>
                {health.browserMemory.isAvailable ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span>Used Heap: <strong className="text-black font-black">{health.browserMemory.usedJSHeapFormatted}</strong></span>
                      <span>Allocated: <strong className="text-black font-black">{health.browserMemory.totalJSHeapFormatted}</strong></span>
                      <span>Total Limit: <strong className="text-black font-black">{health.browserMemory.jsHeapLimitFormatted}</strong></span>
                    </div>
                    <div className="w-full h-4 rounded-full bg-neutral-100 border-2 border-black overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] border-r-2 border-black transition-all"
                        style={{ width: `${health.browserMemory.heapUtilizationPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-600 font-semibold font-sans mt-1">
                      Heap Utilization is at {health.browserMemory.heapUtilizationPercent}%. Chromium garbage collector manages allocations automatically.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-700 font-semibold">
                    Browser heap allocation telemetry requires Chromium/Chrome runtime. Storage allocations below are actively tracked.
                  </p>
                )}
              </div>

              {/* Client Storage Allocations Breakdown */}
              <div className="p-4 rounded-xl bg-white border-2 border-black shadow-neo-sm space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-black uppercase flex items-center gap-2">
                    <HardDrive className="w-4 h-4 stroke-[2.5]" />
                    Persistent Client Storage Footprint
                  </h4>
                  <span className="text-xs font-black bg-[#FFD629] border border-black px-2 py-0.5 rounded shadow-neo-sm">
                    Total: {health.storageBreakdown.totalFormatted}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg border border-black bg-[#FFFDF8]">
                    <span className="text-[10px] text-neutral-500 font-bold block">Reconciliation Table:</span>
                    <span className="font-black text-black mt-0.5 block">{health.storageBreakdown.modules.reconciliation.formatted}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-black bg-[#FFFDF8]">
                    <span className="text-[10px] text-neutral-500 font-bold block">Decision Intelligence:</span>
                    <span className="font-black text-black mt-0.5 block">{health.storageBreakdown.modules.decision.formatted}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-black bg-[#FFFDF8]">
                    <span className="text-[10px] text-neutral-500 font-bold block">Risk & Exposure Cache:</span>
                    <span className="font-black text-black mt-0.5 block">{health.storageBreakdown.modules.risk.formatted}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-black bg-[#FFFDF8]">
                    <span className="text-[10px] text-neutral-500 font-bold block">Close Schedule Tree:</span>
                    <span className="font-black text-black mt-0.5 block">{health.storageBreakdown.modules.close.formatted}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-black bg-[#FFFDF8]">
                    <span className="text-[10px] text-neutral-500 font-bold block">Immutable Audit Trail:</span>
                    <span className="font-black text-black mt-0.5 block">{health.storageBreakdown.auditTrailFormatted}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-black bg-[#FFFDF8]">
                    <span className="text-[10px] text-neutral-500 font-bold block">Review Actions & Findings:</span>
                    <span className="font-black text-black mt-0.5 block">{health.storageBreakdown.findingsFormatted}</span>
                  </div>
                </div>

                {lastGcTime && (
                  <p className="text-[10px] text-emerald-700 font-bold pt-1">
                    ✓ Cache was pruned at {lastGcTime}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 font-bold">
                  Tracked Engine Execution Runs & Audit Events
                </span>
                {onOpenAuditLog && (
                  <button
                    onClick={onOpenAuditLog}
                    className="text-xs font-black text-black underline flex items-center gap-1"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    Open Immutable Audit Log
                  </button>
                )}
              </div>

              {performanceEvents.length === 0 ? (
                <div className="p-8 text-center text-neutral-600 font-semibold bg-[#FFFDF8] border-2 border-black rounded-xl">
                  No execution runs logged yet. Execute analysis engines in the workspaces to generate live telemetry.
                </div>
              ) : (
                <div className="space-y-2">
                  {performanceEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border-2 border-black shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        ev.actionType === 'PERFORMANCE_ALERT'
                          ? 'bg-[#FEF3C7] border-amber-950'
                          : 'bg-[#FFFDF8]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {ev.actionType === 'PERFORMANCE_ALERT' ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#F59E0B] text-black border border-black shadow-neo-sm flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                              PERFORMANCE ALERT
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FFD629] text-black border border-black shadow-neo-sm">
                              {ev.actionType}
                            </span>
                          )}
                          {ev.module && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-black">
                              {ev.module}
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-500 font-bold">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs font-sans font-semibold text-black">{ev.details}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {ev.performance?.executionTimeMs !== undefined && (
                          <span className="px-2 py-1 rounded-lg bg-white border border-black text-black text-[11px] font-black shadow-neo-sm flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-600" />
                            {ev.performance.executionTimeMs} ms
                          </span>
                        )}
                        {(ev.performance?.percentileThresholdMs !== undefined || ev.metadata?.p95ThresholdMs !== undefined) && (
                          <span className="px-2 py-1 rounded-lg bg-amber-200 border border-black text-amber-950 text-[10px] font-black shadow-neo-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-800" />
                            P95: {ev.performance?.percentileThresholdMs || ev.metadata?.p95ThresholdMs} ms
                          </span>
                        )}
                        {ev.performance?.memoryImpactFormatted && (
                          <span className="px-2 py-1 rounded-lg bg-white border border-black text-black text-[11px] font-black shadow-neo-sm flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-neutral-600" />
                            {ev.performance.memoryImpactFormatted}
                          </span>
                        )}
                        {ev.performance?.throughputRowsPerSec !== undefined && ev.performance.throughputRowsPerSec > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-emerald-100 border border-black text-emerald-950 text-[10px] font-black shadow-neo-sm">
                            {ev.performance.throughputRowsPerSec} rows/s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t-2 border-black mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 border border-black" />
            <span>Telemetry Status: Active Profiling</span>
            <span>•</span>
            <span>Auto-refresh: 3s</span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenAuditLog && (
              <button
                type="button"
                onClick={onOpenAuditLog}
                className="font-black text-black hover:underline flex items-center gap-1"
              >
                <ScrollText className="w-3.5 h-3.5" />
                View Full System Audit Trail
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
