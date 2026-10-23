import test from 'node:test';
import assert from 'node:assert/strict';
import { executeDecisionEngine, STANDARD_CREDIT_POLICY } from './decision.ts';
import type { CreditApplicationRecord } from '../types/index.ts';

test('Decision Intelligence: Correct approval evaluation with DTI 30%', () => {
  const apps: CreditApplicationRecord[] = [
    {
      id: 'APP-101',
      applicantName: 'Sarah Jenkins',
      requestedAmount: 25000,
      monthlyDebtObligations: 1800,
      grossMonthlyIncome: 6000, // DTI = 1800 / 6000 = 30% <= 43%
      creditScore: 740,
      employmentMonths: 36,
      delinquenciesCount: 0,
      recordedOutcome: 'APPROVED',
      raw: {},
      rowNumber: 2,
      sourceFileId: 'f_app',
    },
  ];

  const result = executeDecisionEngine(apps, STANDARD_CREDIT_POLICY);

  assert.equal(result.totalApplications, 1);
  assert.equal(result.computedPasses, 1);
  assert.equal(result.computedFails, 0);
  assert.equal(result.conflictingDecisionsCount, 0);
  assert.equal(result.evaluations[0].computedDTI, 30.0);
  assert.equal(result.evaluations[0].computedOutcome, 'PASS');
});

test('Decision Intelligence: Decline explanation due to DTI breach and low FICO', () => {
  const apps: CreditApplicationRecord[] = [
    {
      id: 'APP-102',
      applicantName: 'Robert Vance',
      requestedAmount: 50000,
      monthlyDebtObligations: 3500,
      grossMonthlyIncome: 5000, // DTI = 70% > 43%
      creditScore: 590, // FICO < 640
      employmentMonths: 6, // < 12 months
      delinquenciesCount: 2, // > 1
      recordedOutcome: 'DECLINED',
      raw: {},
      rowNumber: 3,
      sourceFileId: 'f_app',
    },
  ];

  const result = executeDecisionEngine(apps, STANDARD_CREDIT_POLICY);

  assert.equal(result.totalApplications, 1);
  assert.equal(result.computedFails, 1);
  assert.equal(result.evaluations[0].computedOutcome, 'FAIL');
  assert.equal(result.evaluations[0].outcomeMatchesRecorded, true);
  // Four rules failed
  const failedRules = result.evaluations[0].ruleResults.filter((r) => r.status === 'FAIL');
  assert.equal(failedRules.length, 4);
});

test('Decision Intelligence: Discrepancy conflict when recorded is approved but policy fails', () => {
  const apps: CreditApplicationRecord[] = [
    {
      id: 'APP-103',
      applicantName: 'Executive Override Case',
      requestedAmount: 120000,
      monthlyDebtObligations: 4000,
      grossMonthlyIncome: 6000, // DTI = 66.67% > 43%
      creditScore: 580, // FICO < 640
      employmentMonths: 24,
      delinquenciesCount: 0,
      recordedOutcome: 'APPROVED', // Marked approved in source system!
      raw: {},
      rowNumber: 4,
      sourceFileId: 'f_app',
    },
  ];

  const result = executeDecisionEngine(apps, STANDARD_CREDIT_POLICY);

  assert.equal(result.conflictingDecisionsCount, 1);
  assert.equal(result.evaluations[0].outcomeMatchesRecorded, false);
  assert.ok(result.findings.some((f) => f.category === 'policy_conflict'));
});

test('Decision Intelligence: Safe handling of zero gross monthly income', () => {
  const apps: CreditApplicationRecord[] = [
    {
      id: 'APP-104',
      applicantName: 'Zero Income Case',
      requestedAmount: 10000,
      monthlyDebtObligations: 500,
      grossMonthlyIncome: 0, // Zero denominator
      creditScore: 700,
      employmentMonths: 0,
      delinquenciesCount: 0,
      recordedOutcome: 'DECLINED',
      raw: {},
      rowNumber: 5,
      sourceFileId: 'f_app',
    },
  ];

  const result = executeDecisionEngine(apps, STANDARD_CREDIT_POLICY);
  assert.equal(result.totalApplications, 1);
  assert.ok(result.evaluations[0].missingDataWarnings.length > 0);
  assert.equal(result.evaluations[0].computedOutcome, 'FAIL');
});
