import test from 'node:test';
import assert from 'node:assert/strict';
import { executeRiskEngine, convertToBaseCurrency } from './risk.ts';
import type { ExposurePosition } from '../types/index.ts';

test('Risk Engine: Currency conversion and gross/net calculations', () => {
  // 1 EUR = 1.08 USD
  const eurUsd = convertToBaseCurrency(1000, 'EUR');
  assert.equal(eurUsd, 1080);

  const positions: ExposurePosition[] = [
    {
      id: 'p1',
      positionId: 'POS-1',
      counterparty: 'Apex Clearing Corp',
      instrument: 'Repo',
      exposureAmount: 5000000,
      currency: 'USD',
      reportingDate: '2026-10-15',
      sourceSystem: 'TREASURY',
      configuredLimit: 4000000, // Breached! 5M > 4M
      collateralAmount: 1000000,
      netExposureAmount: 4000000,
      rowNumber: 2,
      sourceFileId: 'f1',
      raw: {},
    },
    {
      id: 'p2',
      positionId: 'POS-2',
      counterparty: 'Barclays International',
      instrument: 'Interest Rate Swap',
      exposureAmount: 2000000,
      currency: 'USD',
      reportingDate: '2026-10-15',
      sourceSystem: 'TREASURY',
      configuredLimit: 5000000,
      rowNumber: 3,
      sourceFileId: 'f1',
      raw: {},
    },
  ];

  const result = executeRiskEngine(positions);

  assert.equal(result.totalGrossExposure, 7000000);
  assert.equal(result.activeBreachesCount, 1);
  assert.equal(result.topConcentrations[0].counterparty, 'Apex Clearing Corp');
  assert.equal(result.topConcentrations[0].isBreached, true);
  assert.equal(result.topConcentrations[0].limitUtilizationPercent, 125);
});

test('Risk Engine: Cross-system discrepancy detection', () => {
  const primaryPositions: ExposurePosition[] = [
    {
      id: 'p1',
      positionId: 'POS-1',
      counterparty: 'Citigroup',
      instrument: 'FX Forward',
      exposureAmount: 1000000,
      currency: 'USD',
      reportingDate: '2026-10-15',
      sourceSystem: 'TREASURY',
      rowNumber: 2,
      sourceFileId: 'f1',
      raw: {},
    },
  ];

  const secondaryPositions: ExposurePosition[] = [
    {
      id: 'p2',
      positionId: 'ERP-1',
      counterparty: 'Citigroup',
      instrument: 'FX Forward',
      exposureAmount: 850000, // $150k discrepancy
      currency: 'USD',
      reportingDate: '2026-10-15',
      sourceSystem: 'ERP_LEDGER',
      rowNumber: 2,
      sourceFileId: 'f2',
      raw: {},
    },
  ];

  const result = executeRiskEngine(primaryPositions, secondaryPositions);

  assert.equal(result.crossSystemDiscrepancies.length, 1);
  assert.equal(result.crossSystemDiscrepancies[0].difference, 150000);
  assert.equal(result.crossSystemDiscrepancies[0].relativeDifferencePercent, 17.65);
});

test('Risk Engine: Scenario stress test isolation', () => {
  const positions: ExposurePosition[] = [
    {
      id: 'p1',
      positionId: 'POS-1',
      counterparty: 'Deutsche Bank',
      instrument: 'Sovereign Bond',
      exposureAmount: 1000000,
      currency: 'USD',
      reportingDate: '2026-10-15',
      sourceSystem: 'TREASURY',
      configuredLimit: 1100000,
      rowNumber: 2,
      sourceFileId: 'f1',
      raw: {},
    },
  ];

  const result = executeRiskEngine(positions, undefined, [
    {
      name: 'Credit Stress +25%',
      description: 'Stresses positions by 25%',
      fxShockPercent: 0,
      counterpartyCreditShockPercent: 25,
    },
  ]);

  // Baseline remains unaltered at 1,000,000
  assert.equal(result.totalGrossExposure, 1000000);
  assert.equal(result.scenarioResults?.length, 1);
  // Stressed exposure is 1,250,000 which breaches 1,100,000 limit
  assert.equal(result.scenarioResults?.[0].stressedTotalGross, 1250000);
  assert.equal(result.scenarioResults?.[0].breachedCounterparties.length, 1);
});
