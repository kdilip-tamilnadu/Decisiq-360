import test from 'node:test';
import assert from 'node:assert/strict';
import { executeReconciliation, normalizeReconRows } from './reconciliation.ts';
import type { ReconRecord } from '../types/index.ts';

test('Reconciliation: Exact matches with opposite sign convention', () => {
  const recordsA: ReconRecord[] = [
    {
      id: 'a1',
      sourceFileId: 'f1',
      sourceRole: 'source_a',
      sourceName: 'bank.csv',
      rowNumber: 2,
      transactionId: 'TXN-101',
      date: '2026-10-01',
      amount: 1500.00,
      currency: 'USD',
      direction: 'credit',
      reference: 'INV-9901',
      raw: {},
    },
    {
      id: 'a2',
      sourceFileId: 'f1',
      sourceRole: 'source_a',
      sourceName: 'bank.csv',
      rowNumber: 3,
      transactionId: 'TXN-102',
      date: '2026-10-02',
      amount: 450.50,
      currency: 'USD',
      direction: 'debit',
      reference: 'INV-9902',
      raw: {},
    },
  ];

  const recordsB: ReconRecord[] = [
    {
      id: 'b1',
      sourceFileId: 'f2',
      sourceRole: 'source_b',
      sourceName: 'ledger.csv',
      rowNumber: 2,
      transactionId: 'LED-501',
      date: '2026-10-01',
      amount: 1500.00,
      currency: 'USD',
      direction: 'debit',
      reference: 'INV-9901',
      raw: {},
    },
    {
      id: 'b2',
      sourceFileId: 'f2',
      sourceRole: 'source_b',
      sourceName: 'ledger.csv',
      rowNumber: 3,
      transactionId: 'LED-502',
      date: '2026-10-03',
      amount: 450.50,
      currency: 'USD',
      direction: 'credit',
      reference: 'INV-9902',
      raw: {},
    },
  ];

  const result = executeReconciliation(recordsA, recordsB);

  assert.equal(result.matchedCount, 2);
  assert.equal(result.unmatchedACount, 0);
  assert.equal(result.unmatchedBCount, 0);
  assert.equal(result.reconciliationRatePercent, 100);
  assert.equal(result.discrepancyCount, 0);
  assert.equal(result.netResidualAmount, 0);
});

test('Reconciliation: Tolerance boundary and discrepancy detection', () => {
  const recordsA: ReconRecord[] = [
    {
      id: 'a1',
      sourceFileId: 'f1',
      sourceRole: 'source_a',
      sourceName: 'bank.csv',
      rowNumber: 2,
      transactionId: 'TXN-201',
      date: '2026-10-05',
      amount: 1000.02,
      currency: 'USD',
      direction: 'credit',
      reference: 'WIRE-11',
      raw: {},
    },
  ];

  const recordsB: ReconRecord[] = [
    {
      id: 'b1',
      sourceFileId: 'f2',
      sourceRole: 'source_b',
      sourceName: 'ledger.csv',
      rowNumber: 2,
      transactionId: 'LED-601',
      date: '2026-10-05',
      amount: 1000.00,
      currency: 'USD',
      direction: 'debit',
      reference: 'WIRE-11',
      raw: {},
    },
  ];

  const result = executeReconciliation(recordsA, recordsB, {
    amountTolerance: 0.05,
    dateToleranceDays: 3,
    signConvention: 'opposite_sign',
    requireReferenceMatch: true,
  });

  assert.equal(result.matchedCount, 1);
  assert.equal(result.discrepancyCount, 1);
  assert.equal(result.matches[0].amountDifference, 0.02);
});

test('Reconciliation: Unmatched entries and duplicate detection', () => {
  const recordsA: ReconRecord[] = [
    {
      id: 'a1',
      sourceFileId: 'f1',
      sourceRole: 'source_a',
      sourceName: 'bank.csv',
      rowNumber: 2,
      transactionId: 'TXN-301',
      date: '2026-10-10',
      amount: 8000,
      currency: 'USD',
      direction: 'credit',
      reference: 'DUP-REF',
      raw: {},
    },
    {
      id: 'a2',
      sourceFileId: 'f1',
      sourceRole: 'source_a',
      sourceName: 'bank.csv',
      rowNumber: 3,
      transactionId: 'TXN-302',
      date: '2026-10-10',
      amount: 8000,
      currency: 'USD',
      direction: 'credit',
      reference: 'DUP-REF', // duplicate in source A!
      raw: {},
    },
  ];

  const recordsB: ReconRecord[] = [
    {
      id: 'b1',
      sourceFileId: 'f2',
      sourceRole: 'source_b',
      sourceName: 'ledger.csv',
      rowNumber: 2,
      transactionId: 'LED-701',
      date: '2026-10-10',
      amount: 8000,
      currency: 'USD',
      direction: 'debit',
      reference: 'DUP-REF',
      raw: {},
    },
  ];

  const result = executeReconciliation(recordsA, recordsB);

  // Exactly one matches, one remains unmatched in A
  assert.equal(result.matchedCount, 1);
  assert.equal(result.unmatchedACount, 1);
  assert.equal(result.unmatchedBCount, 0);
  assert.equal(result.unmatchedAVolume, 8000);
  // Duplicate finding triggered
  assert.ok(result.findings.some((f) => f.category === 'duplicate_transactions'));
});
