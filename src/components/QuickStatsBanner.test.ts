import test from 'node:test';
import assert from 'node:assert/strict';
import { extractQuickStats } from './QuickStatsBanner.tsx';
import type { ReconResult, DecisionResult, RiskResult, CloseResult } from '../types/index.ts';

test('QuickStatsBanner: returns null when no results or runs exist', () => {
  const stats = extractQuickStats('reconciliation', null, null, null, null, null);
  assert.equal(stats, null);
});

test('QuickStatsBanner: extracts Reconciliation Match Rate KPI accurately', () => {
  const reconMock: ReconResult = {
    runId: 'recon_run_123',
    module: 'reconciliation',
    engineVersion: '1.0.0',
    totalRecordsA: 10,
    totalRecordsB: 10,
    totalVolumeA: 100000,
    totalVolumeB: 100000,
    matchedCount: 8,
    matchedVolume: 80000,
    unmatchedACount: 1,
    unmatchedBCount: 1,
    unmatchedAVolume: 10000,
    unmatchedBVolume: 10000,
    discrepancyCount: 0,
    reconciliationRatePercent: 80.0,
    netResidualAmount: 0,
    currency: 'USD',
    matches: [],
    findings: [],
  };

  const stats = extractQuickStats('reconciliation', null, reconMock, null, null, null);
  assert.notEqual(stats, null);
  assert.equal(stats?.primaryKpiLabel, 'Overall Reconciliation Match Rate');
  assert.equal(stats?.primaryKpiValue, '80.0%');
  assert.equal(stats?.statusBadge.variant, 'critical');
  assert.equal(stats?.metrics.some((m) => m.label === 'Net Residual Variance'), true);
  assert.equal(stats?.metrics.some((m) => m.label === 'Unmatched Items' && m.value === '2 items'), true);
});

test('QuickStatsBanner: extracts Decision Policy Integrity KPI accurately', () => {
  const decisionMock: DecisionResult = {
    runId: 'decision_run_456',
    module: 'decision',
    engineVersion: '1.0.0',
    policyUsed: {
      policyId: 'pol_1',
      version: '1.0',
      name: 'Standard Underwriting',
      description: 'Test',
      rules: [],
    },
    totalApplications: 12,
    recordedDeclines: 4,
    recordedApprovals: 8,
    computedPasses: 8,
    computedFails: 4,
    conflictingDecisionsCount: 2,
    evaluations: [],
    findings: [],
  };

  const stats = extractQuickStats('decision', null, null, decisionMock, null, null);
  assert.notEqual(stats, null);
  assert.equal(stats?.primaryKpiLabel, 'Credit Policy Integrity');
  assert.equal(stats?.primaryKpiValue, '2 Overrides Flagged');
  assert.equal(stats?.statusBadge.variant, 'critical');
  assert.equal(stats?.metrics.some((m) => m.label === 'Audited Applications' && m.value === '12 files'), true);
});

test('QuickStatsBanner: extracts Risk Limit Breaches and Gross Exposure KPI', () => {
  const riskMock: RiskResult = {
    runId: 'risk_run_789',
    module: 'risk',
    engineVersion: '1.0.0',
    baseCurrency: 'USD',
    totalGrossExposure: 15500000,
    totalNetExposure: 14200000,
    totalConfiguredLimit: 20000000,
    averageLimitUtilizationPercent: 77.5,
    topConcentrations: [
      {
        counterparty: 'Apex Clearing Corp',
        grossExposure: 6000000,
        netExposure: 5500000,
        shareOfTotalPercent: 38.7,
        isBreached: false,
        positionsCount: 2,
      },
    ],
    crossSystemDiscrepancies: [],
    activeBreachesCount: 0,
    positionsCount: 4,
    positions: [],
    findings: [],
  };

  const stats = extractQuickStats('risk', null, null, null, riskMock, null);
  assert.notEqual(stats, null);
  assert.equal(stats?.primaryKpiLabel, 'Total Monitored Gross Exposure');
  assert.match(stats?.primaryKpiValue || '', /\$15,500,000/);
  assert.equal(stats?.statusBadge.variant, 'attention'); // because top concentration is 38.7% >= 25%
  assert.equal(stats?.metrics.some((m) => m.label === 'Limit Breaches' && m.value === '0 breaches'), true);
});

test('QuickStatsBanner: extracts Close Completion Rate and Critical Path Duration KPI', () => {
  const closeMock: CloseResult = {
    runId: 'close_run_999',
    module: 'close',
    engineVersion: '1.0.0',
    totalTasks: 9,
    completedTasks: 6,
    inProgressTasks: 2,
    notStartedTasks: 1,
    blockedTasksCount: 1,
    completionRatePercent: 66.7,
    hasCycles: false,
    totalProjectDurationHours: 14.5,
    earliestAchievableFinishHours: 14.5,
    criticalPathTaskIds: ['TASK-1', 'TASK-2'],
    blockers: [],
    tasks: [],
    findings: [],
  };

  const stats = extractQuickStats('close', null, null, null, null, closeMock);
  assert.notEqual(stats, null);
  assert.equal(stats?.primaryKpiLabel, 'Month-End Close Completion Rate');
  assert.equal(stats?.primaryKpiValue, '66.7%');
  assert.equal(stats?.statusBadge.variant, 'critical'); // because criticalPathBlockersCount is 1
  assert.equal(stats?.metrics.some((m) => m.label === 'Critical Path Duration' && m.value === '14.5 hours'), true);
});
