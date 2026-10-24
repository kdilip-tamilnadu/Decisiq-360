import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  estimateObjectBytes,
  getEnginePerformanceStats,
  runEngineDiagnosticsBenchmark,
  calculatePercentile,
  checkPercentileExecutionDiagnostic,
  PerformanceAlertResult,
} from './performance.ts';
import type { AnalysisRunMetadata, AuditEvent } from '../types/index.ts';

test('Performance Utils: formatBytes converts byte amounts accurately', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(-10), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(1048576), '1 MB');
  assert.equal(formatBytes(2621440), '2.5 MB');
});

test('Performance Utils: estimateObjectBytes calculates payload size', () => {
  assert.equal(estimateObjectBytes(null), 0);
  assert.equal(estimateObjectBytes(undefined), 0);
  const testObj = { name: 'Test Record', amount: 5000, valid: true };
  const bytes = estimateObjectBytes(testObj);
  assert.equal(bytes > 20, true);
});

test('Performance Utils: calculatePercentile accurately computes P95 across numeric series', () => {
  // Empty / invalid cases
  assert.equal(calculatePercentile([]), 0);
  assert.equal(calculatePercentile([45]), 45);

  // Exact 100 elements series: 1 to 100
  const series100 = Array.from({ length: 100 }, (_, i) => i + 1);
  const p95_100 = calculatePercentile(series100, 95);
  assert.equal(p95_100, 95);

  // Small series: [10, 20, 30, 40, 50]
  const p95Small = calculatePercentile([10, 20, 30, 40, 50], 95);
  assert.equal(p95Small >= 48 && p95Small <= 50, true);

  // Unsorted series
  const unsorted = [50, 10, 40, 20, 30];
  assert.equal(calculatePercentile(unsorted, 95), p95Small);
});

test('Performance Utils: checkPercentileExecutionDiagnostic detects P95 latency breaches and builds PERFORMANCE_ALERT event', () => {
  const historicalRuns: AnalysisRunMetadata[] = [
    {
      id: 'h1',
      module: 'reconciliation',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 30,
      status: 'success',
      inputFiles: [],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
    {
      id: 'h2',
      module: 'reconciliation',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 35,
      status: 'success',
      inputFiles: [],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
    {
      id: 'h3',
      module: 'reconciliation',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 32,
      status: 'success',
      inputFiles: [],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
    {
      id: 'h4',
      module: 'reconciliation',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 38,
      status: 'success',
      inputFiles: [],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
  ];

  // 1. Normal run below P95 threshold
  let warningFired = false;
  const normalResult = checkPercentileExecutionDiagnostic(
    {
      id: 'normal_run_1',
      module: 'reconciliation',
      executionTimeMs: 33,
      rowCount: 500,
    },
    historicalRuns,
    {
      onWarningNotification: () => {
        warningFired = true;
      },
    }
  );

  assert.equal(normalResult.triggered, false);
  assert.equal(warningFired, false);
  assert.equal(normalResult.auditEvent, undefined);

  // 2. High latency run exceeding P95 threshold
  let capturedAlert: PerformanceAlertResult | null = null;
  const alertResult = checkPercentileExecutionDiagnostic(
    {
      id: 'slow_run_1',
      module: 'reconciliation',
      executionTimeMs: 140,
      rowCount: 500,
      memoryDeltaBytes: 15000,
    },
    historicalRuns,
    {
      onWarningNotification: (alert) => {
        capturedAlert = alert;
      },
    }
  );

  assert.equal(alertResult.triggered, true);
  assert.notEqual(capturedAlert, null);
  const alertPayload = capturedAlert as PerformanceAlertResult | null;
  assert.equal(alertPayload?.executionTimeMs, 140);
  assert.equal(alertResult.auditEvent !== undefined, true);

  const ev = alertResult.auditEvent!;
  assert.equal(ev.actionType, 'PERFORMANCE_ALERT');
  assert.equal(ev.module, 'reconciliation');
  assert.equal(ev.runId, 'slow_run_1');
  assert.equal(ev.performance?.executionTimeMs, 140);
  assert.equal(ev.performance?.isAlert, true);
  assert.equal(ev.performance?.percentile, 95);
  assert.equal(ev.metadata?.alertType, 'P95_LATENCY_BREACH');
  assert.equal(ev.details.includes('95th percentile threshold'), true);
});

test('Performance Utils: getEnginePerformanceStats computes latency, P95, and throughput across engines', () => {
  const mockRuns: AnalysisRunMetadata[] = [
    {
      id: 'recon_run_1',
      module: 'reconciliation',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 40,
      status: 'success',
      inputFiles: [
        {
          id: 'f1',
          name: 'bank.csv',
          size: 2048,
          type: 'text/csv',
          uploadedAt: new Date().toISOString(),
          rowCount: 200,
          detectedFormat: 'csv',
        },
      ],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
    {
      id: 'recon_run_2',
      module: 'reconciliation',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 60,
      status: 'success',
      inputFiles: [
        {
          id: 'f2',
          name: 'bank2.csv',
          size: 2048,
          type: 'text/csv',
          uploadedAt: new Date().toISOString(),
          rowCount: 300,
          detectedFormat: 'csv',
        },
      ],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
    {
      id: 'decision_run_1',
      module: 'decision',
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      executionTimeMs: 25,
      status: 'success',
      inputFiles: [
        {
          id: 'f3',
          name: 'apps.csv',
          size: 1024,
          type: 'text/csv',
          uploadedAt: new Date().toISOString(),
          rowCount: 50,
          detectedFormat: 'csv',
        },
      ],
      findingsCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      summary: {},
    },
  ];

  const stats = getEnginePerformanceStats(mockRuns, []);
  assert.equal(stats.totalRunsCount, 3);
  assert.equal(stats.engineStats.reconciliation.runsCount, 2);
  assert.equal(stats.engineStats.reconciliation.averageExecutionMs, 50);
  assert.equal(stats.engineStats.reconciliation.p95ExecutionMs >= 58, true);
  assert.equal(stats.engineStats.reconciliation.minExecutionMs, 40);
  assert.equal(stats.engineStats.reconciliation.maxExecutionMs, 60);
  assert.equal(stats.engineStats.reconciliation.status, 'OPTIMAL');

  assert.equal(stats.engineStats.decision.runsCount, 1);
  assert.equal(stats.engineStats.decision.latestExecutionMs, 25);
  assert.equal(stats.engineStats.decision.p95ExecutionMs, 25);
  assert.equal(stats.fastestEngine?.module, 'decision');
  assert.equal(stats.fastestEngine?.ms, 25);
});

test('Performance Utils: runEngineDiagnosticsBenchmark executes all 4 engines and records timing', () => {
  const benchResults = runEngineDiagnosticsBenchmark();
  assert.equal(Array.isArray(benchResults), true);
  assert.equal(benchResults.length, 4);

  const modules = benchResults.map((r) => r.module);
  assert.equal(modules.includes('reconciliation'), true);
  assert.equal(modules.includes('decision'), true);
  assert.equal(modules.includes('risk'), true);
  assert.equal(modules.includes('close'), true);

  for (const b of benchResults) {
    assert.equal(b.recordCount > 0, true);
    assert.equal(b.durationMs >= 0, true);
    assert.equal(b.throughputRowsPerSec >= 0, true);
    assert.equal(['OPTIMAL', 'ACCEPTABLE', 'DEGRADED'].includes(b.status), true);
  }
});
