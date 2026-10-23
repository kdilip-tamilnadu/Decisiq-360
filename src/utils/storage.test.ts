import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveRunMetadata,
  getSavedRuns,
  getRunsByModule,
  saveReconResult,
  getReconResult,
  saveDecisionResult,
  getDecisionResult,
  clearModuleData,
  getAuditEvents,
  MODULE_NAMES,
  getWeeklyAggregatedFindingsCounts,
  purgeDemoData,
} from './storage.ts';
import type { AnalysisRunMetadata, ReconResult, DecisionResult } from '../types/index.ts';

test('Storage: independent module clear isolates and resets only targeted module', () => {
  // 1. Seed Reconciliation run and result
  const reconRun: AnalysisRunMetadata = {
    id: 'test_recon_run_01',
    module: 'reconciliation',
    engineVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    executionTimeMs: 12,
    status: 'success',
    inputFiles: [],
    findingsCount: { critical: 1, high: 0, medium: 0, low: 0, total: 1 },
    summary: { totalRecordsA: 10, totalRecordsB: 10, rate: 90 },
  };
  saveRunMetadata(reconRun);

  const mockReconResult: ReconResult = {
    runId: 'test_recon_run_01',
    module: 'reconciliation',
    engineVersion: '1.0.0',
    currency: 'USD',
    totalRecordsA: 10,
    totalRecordsB: 10,
    matchedCount: 9,
    discrepancyCount: 0,
    unmatchedACount: 1,
    unmatchedBCount: 0,
    reconciliationRatePercent: 90,
    totalVolumeA: 1000,
    totalVolumeB: 900,
    matchedVolume: 900,
    unmatchedAVolume: 100,
    unmatchedBVolume: 0,
    netResidualAmount: 100,
    matches: [],
    findings: [
      {
        id: 'find_recon_01',
        runId: 'test_recon_run_01',
        module: 'reconciliation',
        severity: 'high',
        category: 'UNMATCHED_SETTLEMENT',
        title: 'Unmatched Bank Item',
        description: 'Single missing item',
        evidence: [],
        reviewStatus: 'unreviewed',
      },
    ],
  };
  saveReconResult(mockReconResult);

  // 2. Seed Decision Intelligence run and result
  const decisionRun: AnalysisRunMetadata = {
    id: 'test_decision_run_02',
    module: 'decision',
    engineVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    executionTimeMs: 15,
    status: 'success',
    inputFiles: [],
    findingsCount: { critical: 0, high: 1, medium: 0, low: 0, total: 1 },
    summary: { totalApps: 5, conflicts: 0, computedPasses: 4 },
  };
  saveRunMetadata(decisionRun);

  const mockDecisionResult: DecisionResult = {
    runId: 'test_decision_run_02',
    module: 'decision',
    engineVersion: '1.0.0',
    policyUsed: {
      policyId: 'pol_1',
      version: '1.0',
      name: 'Standard Underwriting',
      description: 'Test policy',
      rules: [],
    },
    totalApplications: 5,
    computedPasses: 4,
    computedFails: 1,
    recordedApprovals: 4,
    recordedDeclines: 1,
    conflictingDecisionsCount: 0,
    evaluations: [],
    findings: [
      {
        id: 'find_decision_01',
        runId: 'test_decision_run_02',
        module: 'decision',
        severity: 'medium',
        category: 'POLICY_EXCEPTION',
        title: 'Policy Exception',
        description: 'Test decision exception',
        evidence: [],
        reviewStatus: 'unreviewed',
      },
    ],
  };
  saveDecisionResult(mockDecisionResult);

  // Verify before clearing
  assert.equal(getRunsByModule('reconciliation').length >= 1, true);
  assert.equal(getRunsByModule('decision').length >= 1, true);
  assert.notEqual(getReconResult('test_recon_run_01'), null);
  assert.notEqual(getDecisionResult('test_decision_run_02'), null);

  // 3. Clear only Reconciliation module
  const result = clearModuleData('reconciliation');
  assert.equal(result.moduleName, MODULE_NAMES.reconciliation);

  // 4. Verify Reconciliation is reset to zero
  assert.equal(getRunsByModule('reconciliation').length, 0);
  assert.equal(getReconResult('test_recon_run_01'), null);

  // 5. Verify Decision Intelligence is 100% untouched
  const decisionRunsAfter = getRunsByModule('decision');
  assert.equal(decisionRunsAfter.some((r) => r.id === 'test_decision_run_02'), true);
  const preservedDecision = getDecisionResult('test_decision_run_02');
  assert.notEqual(preservedDecision, null);
  assert.equal(preservedDecision?.totalApplications, 5);

  // 6. Verify audit event was logged
  const auditEvents = getAuditEvents();
  const clearEvent = auditEvents.find(
    (e) => e.actionType === 'DATA_CLEARED' && e.module === 'reconciliation'
  );
  assert.notEqual(clearEvent, undefined);
  assert.match(clearEvent!.details, /Reconciliation Intelligence/);
});

test('Storage: getWeeklyAggregatedFindingsCounts calculates weekly findings trends across modules', () => {
  // Test weekly aggregation returns array of requested length
  const weekly = getWeeklyAggregatedFindingsCounts(6);
  assert.equal(Array.isArray(weekly), true);
  assert.equal(weekly.length, 6);

  // Each bucket has proper structure
  for (const bucket of weekly) {
    assert.equal(typeof bucket.weekKey, 'string');
    assert.equal(typeof bucket.weekLabel, 'string');
    assert.equal(typeof bucket.shortLabel, 'string');
    assert.equal(typeof bucket.reconciliation, 'number');
    assert.equal(typeof bucket.decision, 'number');
    assert.equal(typeof bucket.risk, 'number');
    assert.equal(typeof bucket.close, 'number');
    assert.equal(typeof bucket.total, 'number');
    assert.equal(bucket.total >= 0, true);
  }

  // The latest bucket is the current week
  const currentBucket = weekly[weekly.length - 1];
  assert.equal(currentBucket.shortLabel, 'Current');
  assert.match(currentBucket.weekLabel, /Current/);
});

test('Storage: purgeDemoData removes all demo runs, findings, and results', () => {
  // 1. Seed a sample demo run
  const demoRun: AnalysisRunMetadata = {
    id: 'sample_recon_demo_run',
    module: 'reconciliation',
    engineVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    executionTimeMs: 10,
    status: 'success',
    inputFiles: [
      {
        id: 'f1',
        name: 'sample_bank_statements.csv',
        size: 1024,
        type: 'text/csv',
        uploadedAt: new Date().toISOString(),
        rowCount: 10,
        detectedFormat: 'csv',
      },
    ],
    findingsCount: { critical: 1, high: 0, medium: 0, low: 0, total: 1 },
    summary: {},
  };
  saveRunMetadata(demoRun);

  // 2. Call purgeDemoData
  const purgeResult = purgeDemoData();
  assert.equal(purgeResult.purgedCount >= 1, true);

  // 3. Verify demo run is gone
  const savedRuns = getSavedRuns();
  assert.equal(savedRuns.some((r) => r.id === 'sample_recon_demo_run'), false);
});
