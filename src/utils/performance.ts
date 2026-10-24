import { ModuleType, AnalysisRunMetadata, AuditEvent } from '../types/index.ts';
import { executeReconciliation, normalizeReconRows } from '../engines/reconciliation.ts';
import { executeDecisionEngine, normalizeDecisionRows } from '../engines/decision.ts';
import { executeRiskEngine, normalizeRiskRows } from '../engines/risk.ts';
import { executeCloseEngine, normalizeCloseRows } from '../engines/close.ts';

export interface BrowserMemoryStats {
  isAvailable: boolean;
  usedJSHeapBytes: number;
  totalJSHeapBytes: number;
  jsHeapLimitBytes: number;
  heapUtilizationPercent: number;
  usedJSHeapFormatted: string;
  totalJSHeapFormatted: string;
  jsHeapLimitFormatted: string;
}

export interface StorageBreakdown {
  totalBytes: number;
  totalFormatted: string;
  modules: Record<ModuleType, { bytes: number; formatted: string }>;
  auditTrailBytes: number;
  auditTrailFormatted: string;
  findingsBytes: number;
  findingsFormatted: string;
  runsBytes: number;
  runsFormatted: string;
}

export interface EnginePerformanceStats {
  module: ModuleType;
  name: string;
  runsCount: number;
  latestExecutionMs: number;
  averageExecutionMs: number;
  p95ExecutionMs: number;
  minExecutionMs: number;
  maxExecutionMs: number;
  averageThroughputRowsPerSec: number;
  cachedMemoryBytes: number;
  cachedMemoryFormatted: string;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
}

export interface OverallSystemHealth {
  status: 'HEALTHY' | 'MODERATE' | 'HEAVY';
  averageExecutionMs: number;
  totalRunsCount: number;
  totalStoredBytes: number;
  totalStoredFormatted: string;
  browserMemory: BrowserMemoryStats;
  engineStats: Record<ModuleType, EnginePerformanceStats>;
  storageBreakdown: StorageBreakdown;
  fastestEngine: { module: ModuleType; name: string; ms: number } | null;
  heaviestEngine: { module: ModuleType; name: string; bytes: number } | null;
}

export interface BenchmarkResult {
  module: ModuleType;
  name: string;
  recordCount: number;
  durationMs: number;
  throughputRowsPerSec: number;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0 || isNaN(bytes) || !isFinite(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm))} ${sizes[clampedIndex]}`;
}

/**
 * Computes the p-th percentile (e.g. 95th percentile) of an array of numeric execution times.
 * Uses linear interpolation across sorted samples.
 */
export function calculatePercentile(values: number[], percentile = 95): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const clampedPercentile = Math.max(0, Math.min(100, percentile));
  const rank = (clampedPercentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const weight = rank - lowerIndex;

  if (lowerIndex === upperIndex) {
    return Math.round(sorted[lowerIndex]);
  }
  const interpolated = sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
  return Math.round(interpolated);
}

export function estimateObjectBytes(obj: any): number {
  if (obj === null || obj === undefined) return 0;
  try {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
}

export function getBrowserMemoryStats(): BrowserMemoryStats {
  if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
    const mem = (window.performance as any).memory;
    const used = Number(mem.usedJSHeapSize) || 0;
    const total = Number(mem.totalJSHeapSize) || 0;
    const limit = Number(mem.jsHeapSizeLimit) || 0;
    const pct = limit > 0 ? (used / limit) * 100 : 0;

    return {
      isAvailable: true,
      usedJSHeapBytes: used,
      totalJSHeapBytes: total,
      jsHeapLimitBytes: limit,
      heapUtilizationPercent: Number(pct.toFixed(1)),
      usedJSHeapFormatted: formatBytes(used),
      totalJSHeapFormatted: formatBytes(total),
      jsHeapLimitFormatted: formatBytes(limit),
    };
  }

  return {
    isAvailable: false,
    usedJSHeapBytes: 0,
    totalJSHeapBytes: 0,
    jsHeapLimitBytes: 0,
    heapUtilizationPercent: 0,
    usedJSHeapFormatted: 'N/A',
    totalJSHeapFormatted: 'N/A',
    jsHeapLimitFormatted: 'N/A',
  };
}

export function calculateStorageBreakdown(): StorageBreakdown {
  const breakdown: StorageBreakdown = {
    totalBytes: 0,
    totalFormatted: '0 B',
    modules: {
      reconciliation: { bytes: 0, formatted: '0 B' },
      decision: { bytes: 0, formatted: '0 B' },
      risk: { bytes: 0, formatted: '0 B' },
      close: { bytes: 0, formatted: '0 B' },
    },
    auditTrailBytes: 0,
    auditTrailFormatted: '0 B',
    findingsBytes: 0,
    findingsFormatted: '0 B',
    runsBytes: 0,
    runsFormatted: '0 B',
  };

  if (typeof localStorage === 'undefined') return breakdown;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('decisiq360_')) continue;
      const value = localStorage.getItem(key) || '';
      const bytes = (key.length + value.length) * 2; // UTF-16 character byte approximation
      breakdown.totalBytes += bytes;

      if (key.includes('recon_results')) {
        breakdown.modules.reconciliation.bytes += bytes;
      } else if (key.includes('decision_results')) {
        breakdown.modules.decision.bytes += bytes;
      } else if (key.includes('risk_results')) {
        breakdown.modules.risk.bytes += bytes;
      } else if (key.includes('close_results')) {
        breakdown.modules.close.bytes += bytes;
      } else if (key.includes('audit_events')) {
        breakdown.auditTrailBytes += bytes;
      } else if (key.includes('findings')) {
        breakdown.findingsBytes += bytes;
      } else if (key.includes('analysis_runs')) {
        breakdown.runsBytes += bytes;
      }
    }

    breakdown.totalFormatted = formatBytes(breakdown.totalBytes);
    breakdown.modules.reconciliation.formatted = formatBytes(breakdown.modules.reconciliation.bytes);
    breakdown.modules.decision.formatted = formatBytes(breakdown.modules.decision.bytes);
    breakdown.modules.risk.formatted = formatBytes(breakdown.modules.risk.bytes);
    breakdown.modules.close.formatted = formatBytes(breakdown.modules.close.bytes);
    breakdown.auditTrailFormatted = formatBytes(breakdown.auditTrailBytes);
    breakdown.findingsFormatted = formatBytes(breakdown.findingsBytes);
    breakdown.runsFormatted = formatBytes(breakdown.runsBytes);
  } catch (err) {
    console.error('Failed to calculate storage breakdown:', err);
  }

  return breakdown;
}

const MODULE_DISPLAY_NAMES: Record<ModuleType, string> = {
  reconciliation: 'Reconciliation Intelligence',
  decision: 'Decision Intelligence',
  risk: 'Risk & Exposure Intelligence',
  close: 'Close Intelligence',
};

export function getEnginePerformanceStats(
  runs: AnalysisRunMetadata[],
  _auditEvents: AuditEvent[]
): OverallSystemHealth {
  const browserMemory = getBrowserMemoryStats();
  const storageBreakdown = calculateStorageBreakdown();

  const modules: ModuleType[] = ['reconciliation', 'decision', 'risk', 'close'];

  const engineStats: Record<ModuleType, EnginePerformanceStats> = {} as any;

  let totalDurationSum = 0;
  let totalRunsWithDuration = 0;

  for (const m of modules) {
    const moduleRuns = runs.filter((r) => r.module === m);
    const count = moduleRuns.length;
    let latestMs = 0;
    let avgMs = 0;
    let p95Ms = 0;
    let minMs = 0;
    let maxMs = 0;
    let totalThroughput = 0;

    if (count > 0) {
      latestMs = moduleRuns[0].executionTimeMs || 0;
      const durations = moduleRuns.map((r) => r.executionTimeMs || 0);
      const sum = durations.reduce((a, b) => a + b, 0);
      avgMs = Math.round(sum / count);
      p95Ms = calculatePercentile(durations, 95);
      minMs = Math.min(...durations);
      maxMs = Math.max(...durations);

      totalDurationSum += sum;
      totalRunsWithDuration += count;

      // Calculate throughput
      let totalRows = 0;
      for (const r of moduleRuns) {
        const rows = r.inputFiles?.reduce((acc, f) => acc + (f.rowCount || 0), 0) || 0;
        totalRows += rows;
      }
      if (sum > 0) {
        totalThroughput = Math.round((totalRows / sum) * 1000);
      }
    }

    let status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED' = 'OPTIMAL';
    if (avgMs > 500) {
      status = 'DEGRADED';
    } else if (avgMs > 100) {
      status = 'ACCEPTABLE';
    }

    engineStats[m] = {
      module: m,
      name: MODULE_DISPLAY_NAMES[m],
      runsCount: count,
      latestExecutionMs: latestMs,
      averageExecutionMs: avgMs,
      p95ExecutionMs: p95Ms,
      minExecutionMs: minMs,
      maxExecutionMs: maxMs,
      averageThroughputRowsPerSec: totalThroughput,
      cachedMemoryBytes: storageBreakdown.modules[m].bytes,
      cachedMemoryFormatted: storageBreakdown.modules[m].formatted,
      status,
    };
  }

  const overallAvgMs = totalRunsWithDuration > 0 ? Math.round(totalDurationSum / totalRunsWithDuration) : 0;

  let overallStatus: 'HEALTHY' | 'MODERATE' | 'HEAVY' = 'HEALTHY';
  if (browserMemory.isAvailable && browserMemory.heapUtilizationPercent > 80) {
    overallStatus = 'HEAVY';
  } else if (overallAvgMs > 300 || storageBreakdown.totalBytes > 10 * 1024 * 1024) {
    overallStatus = 'MODERATE';
  }

  // Find fastest and heaviest engines among those with runs
  const activeEngines = modules
    .map((m) => engineStats[m])
    .filter((s) => s.runsCount > 0);

  let fastestEngine: { module: ModuleType; name: string; ms: number } | null = null;
  if (activeEngines.length > 0) {
    const sortedBySpeed = [...activeEngines].sort((a, b) => a.averageExecutionMs - b.averageExecutionMs);
    fastestEngine = {
      module: sortedBySpeed[0].module,
      name: sortedBySpeed[0].name,
      ms: sortedBySpeed[0].averageExecutionMs,
    };
  }

  const sortedByMemory = [...modules].sort(
    (a, b) => storageBreakdown.modules[b].bytes - storageBreakdown.modules[a].bytes
  );
  const heaviestEngine =
    storageBreakdown.modules[sortedByMemory[0]].bytes > 0
      ? {
          module: sortedByMemory[0],
          name: MODULE_DISPLAY_NAMES[sortedByMemory[0]],
          bytes: storageBreakdown.modules[sortedByMemory[0]].bytes,
        }
      : null;

  return {
    status: overallStatus,
    averageExecutionMs: overallAvgMs,
    totalRunsCount: runs.length,
    totalStoredBytes: storageBreakdown.totalBytes,
    totalStoredFormatted: storageBreakdown.totalFormatted,
    browserMemory,
    engineStats,
    storageBreakdown,
    fastestEngine,
    heaviestEngine,
  };
}

export interface PerformanceAlertResult {
  triggered: boolean;
  executionTimeMs: number;
  p95ThresholdMs: number;
  module: ModuleType;
  runId: string;
  sampleSize: number;
  warningMessage: string;
  auditEvent?: AuditEvent;
}

/**
 * Diagnostic check that evaluates an analysis run's execution latency against historical runs.
 * If the run duration exceeds the 95th percentile (P95) execution latency for that module
 * (or overall historical runs, with a minimum noise floor), it triggers a warning notification
 * callback and generates a 'PERFORMANCE_ALERT' AuditEvent.
 */
export function checkPercentileExecutionDiagnostic(
  currentRun: {
    id: string;
    module: ModuleType;
    executionTimeMs: number;
    rowCount?: number;
    memoryDeltaBytes?: number;
  },
  historicalRuns: AnalysisRunMetadata[],
  options?: {
    percentile?: number; // default 95
    minWarningLatencyMs?: number; // default 20ms to avoid noise on instant micro-runs
    onWarningNotification?: (alert: PerformanceAlertResult) => void;
  }
): PerformanceAlertResult {
  const percentile = options?.percentile ?? 95;
  const minWarningLatencyMs = options?.minWarningLatencyMs ?? 20;

  // Gather historical durations for this module
  const moduleRuns = historicalRuns.filter((r) => r.module === currentRun.module && (r.executionTimeMs || 0) > 0);
  let durations = moduleRuns.map((r) => r.executionTimeMs);

  // If not enough runs for this specific module (< 3), consider pooling from all runs
  if (durations.length < 3) {
    const allDurations = historicalRuns.filter((r) => (r.executionTimeMs || 0) > 0).map((r) => r.executionTimeMs);
    if (allDurations.length >= 3) {
      durations = allDurations;
    }
  }

  // Calculate P95 threshold from historical durations, or baseline if no runs exist
  let p95ThresholdMs: number;
  if (durations.length > 0) {
    p95ThresholdMs = Math.max(minWarningLatencyMs, calculatePercentile(durations, percentile));
  } else {
    // Sensible baseline threshold when running with no historical runs
    p95ThresholdMs = 150;
  }

  const triggered = currentRun.executionTimeMs > p95ThresholdMs;
  const moduleName = MODULE_DISPLAY_NAMES[currentRun.module] || currentRun.module;
  const warningMessage = triggered
    ? `Performance Warning: Analysis run execution time of ${currentRun.executionTimeMs}ms exceeded the ${percentile}th percentile threshold (${p95ThresholdMs}ms) for ${moduleName}.`
    : `Execution time of ${currentRun.executionTimeMs}ms is within normal ${percentile}th percentile boundary (${p95ThresholdMs}ms).`;

  let auditEvent: AuditEvent | undefined;
  if (triggered) {
    auditEvent = {
      id: `audit_alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      actionType: 'PERFORMANCE_ALERT',
      module: currentRun.module,
      runId: currentRun.id,
      details: warningMessage,
      performance: {
        executionTimeMs: currentRun.executionTimeMs,
        memoryImpactBytes: currentRun.memoryDeltaBytes,
        memoryImpactFormatted: currentRun.memoryDeltaBytes ? formatBytes(currentRun.memoryDeltaBytes) : undefined,
        rowCount: currentRun.rowCount,
        engineStatus: 'DEGRADED',
        percentile,
        percentileThresholdMs: p95ThresholdMs,
        isAlert: true,
      },
      metadata: {
        percentile,
        p95ThresholdMs,
        sampleSize: durations.length,
        alertType: 'P95_LATENCY_BREACH',
        severity: currentRun.executionTimeMs > p95ThresholdMs * 1.5 ? 'CRITICAL' : 'WARNING',
      },
    };
  }

  const result: PerformanceAlertResult = {
    triggered,
    executionTimeMs: currentRun.executionTimeMs,
    p95ThresholdMs,
    module: currentRun.module,
    runId: currentRun.id,
    sampleSize: durations.length,
    warningMessage,
    auditEvent,
  };

  if (triggered && options?.onWarningNotification) {
    try {
      options.onWarningNotification(result);
    } catch (err) {
      console.error('Failed to trigger performance warning callback:', err);
    }
  }

  return result;
}

/**
 * Runs a micro-benchmark diagnostic test across all four engines
 * to test live execution latency and throughput under current CPU/Memory conditions.
 * Non-destructive and does not persist mock records.
 */
export function runEngineDiagnosticsBenchmark(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // 1. Reconciliation Benchmark (50 records vs 50 records)
  const reconA = Array.from({ length: 50 }, (_, i) => ({
    Transaction_ID: `BENCH-A-${i + 1}`,
    Date: '2026-10-20',
    Amount: (1000 + i * 15.5).toFixed(2),
    Currency: 'USD',
    Type: i % 2 === 0 ? 'Credit' : 'Debit',
    Reference: `REF-${1000 + i}`,
    Counterparty: `Counterparty ${i % 5}`,
    Description: `Synthetic reconciliation test record ${i + 1}`,
  }));
  const reconB = Array.from({ length: 50 }, (_, i) => ({
    Entry_ID: `BENCH-B-${i + 1}`,
    Posting_Date: '2026-10-20',
    Net_Amount: (1000 + i * 15.5).toFixed(2),
    Currency: 'USD',
    Direction: i % 2 === 0 ? 'Debit' : 'Credit',
    Invoice_No: `REF-${1000 + i}`,
    Payee: `Counterparty ${i % 5}`,
    Narrative: `Synthetic ledger counterpart ${i + 1}`,
  }));

  const t0Recon = performance.now();
  const normA = normalizeReconRows(reconA, 'bench_a', 'bench_a.csv', 'source_a');
  const normB = normalizeReconRows(reconB, 'bench_b', 'bench_b.csv', 'source_b');
  executeReconciliation(normA, normB, undefined, 'benchmark_recon');
  const durRecon = Math.max(1, Math.round(performance.now() - t0Recon));
  results.push({
    module: 'reconciliation',
    name: 'Reconciliation Engine',
    recordCount: 100,
    durationMs: durRecon,
    throughputRowsPerSec: Math.round((100 / durRecon) * 1000),
    status: durRecon < 50 ? 'OPTIMAL' : durRecon < 150 ? 'ACCEPTABLE' : 'DEGRADED',
  });

  // 2. Decision Engine Benchmark (50 underwriting applications)
  const decisionRows = Array.from({ length: 50 }, (_, i) => ({
    Application_ID: `BENCH-APP-${i + 1}`,
    Applicant_Name: `Applicant ${i + 1}`,
    Requested_Amount: 25000 + i * 1000,
    Gross_Monthly_Income: 6000 + (i % 8) * 500,
    Monthly_Debt_Obligations: 1800 + (i % 6) * 300,
    Credit_Score: 620 + (i % 15) * 10,
    Employment_Months: 12 + i * 2,
    Delinquencies_Count: i % 7 === 0 ? 1 : 0,
    Recorded_Outcome: i % 4 === 0 ? 'DECLINED' : 'APPROVED',
  }));

  const t0Decision = performance.now();
  const normDec = normalizeDecisionRows(decisionRows, 'bench_dec', 'bench_decision.csv');
  executeDecisionEngine(normDec, undefined, 'benchmark_decision');
  const durDecision = Math.max(1, Math.round(performance.now() - t0Decision));
  results.push({
    module: 'decision',
    name: 'Decision Integrity Engine',
    recordCount: 50,
    durationMs: durDecision,
    throughputRowsPerSec: Math.round((50 / durDecision) * 1000),
    status: durDecision < 50 ? 'OPTIMAL' : durDecision < 150 ? 'ACCEPTABLE' : 'DEGRADED',
  });

  // 3. Risk Engine Benchmark (50 treasury positions)
  const riskRows = Array.from({ length: 50 }, (_, i) => ({
    Position_ID: `BENCH-POS-${i + 1}`,
    Counterparty: `Counterparty ${i % 8}`,
    Instrument: i % 3 === 0 ? 'FX Forward' : 'Cross-Currency Swap',
    Exposure_Amount: 500000 + i * 50000,
    Currency: 'USD',
    Reporting_Date: '2026-10-20',
    Configured_Limit: 3000000,
    Collateral_Amount: 200000,
  }));

  const t0Risk = performance.now();
  const normRisk = normalizeRiskRows(riskRows, 'bench_risk', 'bench_risk.csv', 'TREASURY');
  executeRiskEngine(normRisk, undefined, undefined, 'benchmark_risk');
  const durRisk = Math.max(1, Math.round(performance.now() - t0Risk));
  results.push({
    module: 'risk',
    name: 'Risk & Exposure Engine',
    recordCount: 50,
    durationMs: durRisk,
    throughputRowsPerSec: Math.round((50 / durRisk) * 1000),
    status: durRisk < 50 ? 'OPTIMAL' : durRisk < 150 ? 'ACCEPTABLE' : 'DEGRADED',
  });

  // 4. Close Engine Benchmark (25 CPM task graph nodes)
  const closeRows = Array.from({ length: 25 }, (_, i) => ({
    Task_ID: `BENCH-TASK-${i + 1}`,
    Task_Name: `Task ${i + 1}`,
    Owner: `Lead ${i % 4}`,
    Status: i < 15 ? 'COMPLETED' : 'IN_PROGRESS',
    Duration_Hours: 2 + (i % 5),
    Due_Date: 'Day +3 Close',
    Predecessors: i > 0 && i % 3 !== 0 ? `BENCH-TASK-${i}` : '',
  }));

  const t0Close = performance.now();
  const normClose = normalizeCloseRows(closeRows, 'bench_close', 'bench_close.csv');
  executeCloseEngine(normClose, 'benchmark_close');
  const durClose = Math.max(1, Math.round(performance.now() - t0Close));
  results.push({
    module: 'close',
    name: 'Close CPM Scheduling Engine',
    recordCount: 25,
    durationMs: durClose,
    throughputRowsPerSec: Math.round((25 / durClose) * 1000),
    status: durClose < 50 ? 'OPTIMAL' : durClose < 150 ? 'ACCEPTABLE' : 'DEGRADED',
  });

  return results;
}
