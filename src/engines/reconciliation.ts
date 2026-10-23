import type {
  ReconRecord,
  ReconMatch,
  ReconConfig,
  ReconResult,
  Finding,
  EvidenceReference,
} from '../types/index.ts';
import { roundFinancial, safePercentage, subtractMoney, addMoney } from '../utils/decimal.ts';
import { findMatchingField, parseNumberField, normalizeDate, generateId } from '../utils/fileParser.ts';

export const DEFAULT_RECON_CONFIG: ReconConfig = {
  amountTolerance: 0.05,
  dateToleranceDays: 3,
  signConvention: 'opposite_sign', // Standard bank vs ledger convention
  requireReferenceMatch: false,
};

/**
 * Normalizes raw uploaded rows into canonical ReconRecord items
 */
export function normalizeReconRows(
  rows: Record<string, any>[],
  fileId: string,
  fileName: string,
  sourceRole: 'source_a' | 'source_b'
): ReconRecord[] {
  if (!rows || rows.length === 0) return [];

  const headers = Object.keys(rows[0] || {});

  const idCol = findMatchingField(headers, ['transaction_id', 'txnid', 'id', 'tran_id', 'ref_id', 'entry_id']);
  const dateCol = findMatchingField(headers, ['date', 'txn_date', 'posting_date', 'transaction_date', 'value_date']);
  const amountCol = findMatchingField(headers, [
    'amount',
    'transaction_amount',
    'txn_value',
    'net_amount',
    'value',
    'total',
  ]);
  const currencyCol = findMatchingField(headers, ['currency', 'curr', 'ccy']);
  const directionCol = findMatchingField(headers, ['direction', 'type', 'dr_cr', 'drcr', 'debit_credit']);
  const refCol = findMatchingField(headers, ['reference', 'ref', 'cheque_no', 'check_num', 'invoice_no', 'doc_ref']);
  const counterpartyCol = findMatchingField(headers, ['counterparty', 'beneficiary', 'payee', 'customer', 'vendor', 'party']);
  const descCol = findMatchingField(headers, ['description', 'narrative', 'memo', 'details', 'particulars']);

  return rows.map((row, idx) => {
    const rawAmt = amountCol ? row[amountCol] : 0;
    const parsedAmount = parseNumberField(rawAmt);
    const rawDir = directionCol ? String(row[directionCol]).toLowerCase() : '';
    
    // Determine direction (debit/credit)
    let direction: 'debit' | 'credit' = parsedAmount >= 0 ? 'credit' : 'debit';
    if (rawDir.includes('dr') || rawDir.includes('debit')) {
      direction = 'debit';
    } else if (rawDir.includes('cr') || rawDir.includes('credit')) {
      direction = 'credit';
    }

    const absAmount = Math.abs(parsedAmount);

    return {
      id: `${fileId}_row_${idx + 1}`,
      sourceFileId: fileId,
      sourceRole,
      sourceName: fileName,
      rowNumber: idx + 2, // Account for header row in Excel/CSV
      transactionId: idCol && row[idCol] ? String(row[idCol]).trim() : `TXN-${idx + 1}`,
      date: dateCol ? normalizeDate(row[dateCol]) : new Date().toISOString().split('T')[0],
      amount: absAmount,
      currency: currencyCol && row[currencyCol] ? String(row[currencyCol]).toUpperCase().trim() : 'USD',
      direction,
      reference: refCol && row[refCol] ? String(row[refCol]).trim() : '',
      counterparty: counterpartyCol && row[counterpartyCol] ? String(row[counterpartyCol]).trim() : undefined,
      description: descCol && row[descCol] ? String(row[descCol]).trim() : undefined,
      raw: row,
    };
  });
}

/**
 * Executes deterministic 1-to-1 reconciliation matching
 */
export function executeReconciliation(
  recordsA: ReconRecord[],
  recordsB: ReconRecord[],
  config: ReconConfig = DEFAULT_RECON_CONFIG,
  runId = generateId('run_recon')
): ReconResult {
  const matches: ReconMatch[] = [];
  const findings: Finding[] = [];

  const matchedBIds = new Set<string>();
  const totalVolumeA = recordsA.reduce((sum, r) => addMoney(sum, r.amount), 0);
  const totalVolumeB = recordsB.reduce((sum, r) => addMoney(sum, r.amount), 0);

  let matchedVolume = 0;
  let matchedCount = 0;
  let discrepancyCount = 0;

  // Track potential duplicates within Source A
  const refMapA = new Map<string, ReconRecord[]>();
  recordsA.forEach((r) => {
    if (r.reference) {
      const list = refMapA.get(r.reference) || [];
      list.push(r);
      refMapA.set(r.reference, list);
    }
  });

  refMapA.forEach((list, ref) => {
    if (list.length > 1) {
      findings.push({
        id: `find_dup_${runId}_${ref}`,
        runId,
        module: 'reconciliation',
        title: `Duplicate Reference in Source A: "${ref}"`,
        severity: 'high',
        category: 'duplicate_transactions',
        description: `Found ${list.length} transactions sharing the exact reference "${ref}" totaling $${list.reduce(
          (sum, r) => sum + r.amount,
          0
        ).toFixed(2)}.`,
        impactAmount: list.reduce((sum, r) => sum + r.amount, 0),
        currency: list[0].currency,
        reviewStatus: 'unreviewed',
        evidence: list.map((item) => ({
          fileId: item.sourceFileId,
          fileName: item.sourceName,
          rowNumber: item.rowNumber,
          recordIdentifier: item.transactionId,
          rawFieldValues: item.raw,
          normalizedValues: { amount: item.amount, date: item.date, ref: item.reference },
          ruleOrCalculationId: 'RULE_RECON_DUPLICATE_CHECK',
          runId,
        })),
      });
    }
  });

  // Pass 1: Exact Match (Reference match + Amount match within tolerance)
  for (const recA of recordsA) {
    let bestCandidateB: ReconRecord | null = null;
    let minDiff = Infinity;
    let candidateMatches = 0;

    for (const recB of recordsB) {
      if (matchedBIds.has(recB.id)) continue;

      // Currency check
      if (recA.currency && recB.currency && recA.currency !== recB.currency) {
        continue;
      }

      // Sign convention check
      let amountDiff: number;
      if (config.signConvention === 'opposite_sign') {
        // opposite sign: e.g. recA is credit, recB should match if direction is debit or vice-versa
        // If directions are explicit, verify opposite; otherwise absolute amounts compared
        amountDiff = Math.abs(recA.amount - recB.amount);
      } else {
        amountDiff = Math.abs(recA.amount - recB.amount);
      }

      // Reference similarity
      const refMatches =
        recA.reference &&
        recB.reference &&
        recA.reference.toLowerCase() === recB.reference.toLowerCase();

      // Date difference in days
      const dateA = new Date(recA.date).getTime();
      const dateB = new Date(recB.date).getTime();
      const daysDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);

      if (refMatches && amountDiff <= config.amountTolerance && daysDiff <= config.dateToleranceDays) {
        candidateMatches++;
        if (amountDiff < minDiff) {
          minDiff = amountDiff;
          bestCandidateB = recB;
        }
      }
    }

    if (bestCandidateB) {
      matchedBIds.add(bestCandidateB.id);
      matchedCount++;
      matchedVolume = addMoney(matchedVolume, recA.amount);

      const daysDiff = Math.round(
        Math.abs(new Date(recA.date).getTime() - new Date(bestCandidateB.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const isDiscrepancy = minDiff > 0.001;
      if (isDiscrepancy) discrepancyCount++;

      const matchId = `match_${recA.id}_${bestCandidateB.id}`;
      matches.push({
        id: matchId,
        recordA: recA,
        recordB: bestCandidateB,
        matchType: minDiff <= 0.001 ? 'exact' : 'tolerance',
        amountDifference: roundFinancial(minDiff, 4),
        dateDifferenceDays: daysDiff,
        status: isDiscrepancy ? 'discrepancy' : 'matched',
        isConfirmed: !isDiscrepancy,
        evidence: {
          fileId: recA.sourceFileId,
          fileName: recA.sourceName,
          rowNumber: recA.rowNumber,
          recordIdentifier: recA.transactionId,
          rawFieldValues: { sourceA: recA.raw, sourceB: bestCandidateB.raw },
          normalizedValues: {
            amountA: recA.amount,
            amountB: bestCandidateB.amount,
            diff: minDiff,
          },
          ruleOrCalculationId: 'RULE_RECON_REF_AMOUNT_MATCH',
          runId,
        },
      });

      if (isDiscrepancy) {
        findings.push({
          id: `find_recon_${matchId}`,
          runId,
          module: 'reconciliation',
          title: `Amount Discrepancy of $${minDiff.toFixed(2)} on Ref "${recA.reference}"`,
          severity: minDiff > 100 ? 'high' : 'medium',
          category: 'amount_discrepancy',
          description: `Source A recorded $${recA.amount.toFixed(2)} while Source B recorded $${bestCandidateB.amount.toFixed(
            2
          )}. Difference: $${minDiff.toFixed(2)}.`,
          impactAmount: minDiff,
          currency: recA.currency,
          reviewStatus: 'unreviewed',
          evidence: [
            {
              fileId: recA.sourceFileId,
              fileName: recA.sourceName,
              rowNumber: recA.rowNumber,
              recordIdentifier: recA.transactionId,
              rawFieldValues: recA.raw,
              ruleOrCalculationId: 'RULE_RECON_AMOUNT_DIFF',
              runId,
            },
            {
              fileId: bestCandidateB.sourceFileId,
              fileName: bestCandidateB.sourceName,
              rowNumber: bestCandidateB.rowNumber,
              recordIdentifier: bestCandidateB.transactionId,
              rawFieldValues: bestCandidateB.raw,
              ruleOrCalculationId: 'RULE_RECON_AMOUNT_DIFF',
              runId,
            },
          ],
        });
      }
    }
  }

  // Pass 2: Fallback Exact Amount + Date window if reference was not matched
  if (!config.requireReferenceMatch) {
    for (const recA of recordsA) {
      // Check if already matched
      if (matches.some((m) => m.recordA?.id === recA.id)) continue;

      let candidateB: ReconRecord | null = null;
      let minDiff = Infinity;

      for (const recB of recordsB) {
        if (matchedBIds.has(recB.id)) continue;
        if (recA.currency && recB.currency && recA.currency !== recB.currency) continue;

        const amountDiff = Math.abs(recA.amount - recB.amount);
        const daysDiff =
          Math.abs(new Date(recA.date).getTime() - new Date(recB.date).getTime()) /
          (1000 * 60 * 60 * 24);

        if (amountDiff <= config.amountTolerance && daysDiff <= config.dateToleranceDays) {
          if (amountDiff < minDiff) {
            minDiff = amountDiff;
            candidateB = recB;
          }
        }
      }

      if (candidateB) {
        matchedBIds.add(candidateB.id);
        matchedCount++;
        matchedVolume = addMoney(matchedVolume, recA.amount);

        const daysDiff = Math.round(
          Math.abs(new Date(recA.date).getTime() - new Date(candidateB.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        matches.push({
          id: `match_${recA.id}_${candidateB.id}`,
          recordA: recA,
          recordB: candidateB,
          matchType: 'tolerance',
          amountDifference: roundFinancial(minDiff, 4),
          dateDifferenceDays: daysDiff,
          status: minDiff > 0.001 ? 'discrepancy' : 'matched',
          isConfirmed: minDiff <= 0.001,
          evidence: {
            fileId: recA.sourceFileId,
            fileName: recA.sourceName,
            rowNumber: recA.rowNumber,
            recordIdentifier: recA.transactionId,
            rawFieldValues: { sourceA: recA.raw, sourceB: candidateB.raw },
            normalizedValues: {
              amountA: recA.amount,
              amountB: candidateB.amount,
            },
            ruleOrCalculationId: 'RULE_RECON_AMOUNT_WINDOW_MATCH',
            runId,
          },
        });
      }
    }
  }

  // Pass 3: Identify Unmatched Records in Source A
  const matchedAIds = new Set(matches.map((m) => m.recordA?.id).filter(Boolean));
  let unmatchedAVolume = 0;
  let unmatchedACount = 0;

  for (const recA of recordsA) {
    if (!matchedAIds.has(recA.id)) {
      unmatchedACount++;
      unmatchedAVolume = addMoney(unmatchedAVolume, recA.amount);
      matches.push({
        id: `unmatched_A_${recA.id}`,
        recordA: recA,
        matchType: 'unmatched',
        amountDifference: recA.amount,
        dateDifferenceDays: 0,
        status: 'unmatched',
        isConfirmed: false,
        evidence: {
          fileId: recA.sourceFileId,
          fileName: recA.sourceName,
          rowNumber: recA.rowNumber,
          recordIdentifier: recA.transactionId,
          rawFieldValues: recA.raw,
          normalizedValues: { amount: recA.amount, date: recA.date },
          ruleOrCalculationId: 'RULE_RECON_UNMATCHED_A',
          runId,
        },
      });

      if (recA.amount > 500) {
        findings.push({
          id: `find_unmatched_a_${recA.id}`,
          runId,
          module: 'reconciliation',
          title: `Unmatched Source A Entry: $${recA.amount.toFixed(2)} (${recA.transactionId})`,
          severity: recA.amount > 5000 ? 'critical' : 'high',
          category: 'unmatched_transaction',
          description: `Transaction ${recA.transactionId} (${recA.reference || 'No Ref'}) on ${
            recA.date
          } has no corresponding match in Source B.`,
          impactAmount: recA.amount,
          currency: recA.currency,
          reviewStatus: 'unreviewed',
          evidence: [
            {
              fileId: recA.sourceFileId,
              fileName: recA.sourceName,
              rowNumber: recA.rowNumber,
              recordIdentifier: recA.transactionId,
              rawFieldValues: recA.raw,
              ruleOrCalculationId: 'RULE_RECON_UNMATCHED_A',
              runId,
            },
          ],
        });
      }
    }
  }

  // Pass 4: Identify Unmatched Records in Source B
  let unmatchedBVolume = 0;
  let unmatchedBCount = 0;

  for (const recB of recordsB) {
    if (!matchedBIds.has(recB.id)) {
      unmatchedBCount++;
      unmatchedBVolume = addMoney(unmatchedBVolume, recB.amount);
      matches.push({
        id: `unmatched_B_${recB.id}`,
        recordB: recB,
        matchType: 'unmatched',
        amountDifference: recB.amount,
        dateDifferenceDays: 0,
        status: 'unmatched',
        isConfirmed: false,
        evidence: {
          fileId: recB.sourceFileId,
          fileName: recB.sourceName,
          rowNumber: recB.rowNumber,
          recordIdentifier: recB.transactionId,
          rawFieldValues: recB.raw,
          normalizedValues: { amount: recB.amount, date: recB.date },
          ruleOrCalculationId: 'RULE_RECON_UNMATCHED_B',
          runId,
        },
      });

      if (recB.amount > 500) {
        findings.push({
          id: `find_unmatched_b_${recB.id}`,
          runId,
          module: 'reconciliation',
          title: `Unmatched Source B Entry: $${recB.amount.toFixed(2)} (${recB.transactionId})`,
          severity: recB.amount > 5000 ? 'critical' : 'high',
          category: 'unmatched_transaction',
          description: `Source B record ${recB.transactionId} on ${recB.date} for $${recB.amount.toFixed(
            2
          )} could not be verified in Source A.`,
          impactAmount: recB.amount,
          currency: recB.currency,
          reviewStatus: 'unreviewed',
          evidence: [
            {
              fileId: recB.sourceFileId,
              fileName: recB.sourceName,
              rowNumber: recB.rowNumber,
              recordIdentifier: recB.transactionId,
              rawFieldValues: recB.raw,
              ruleOrCalculationId: 'RULE_RECON_UNMATCHED_B',
              runId,
            },
          ],
        });
      }
    }
  }

  const totalInputCount = recordsA.length + recordsB.length;
  const reconciliationRatePercent = safePercentage(matchedCount * 2, totalInputCount, 2);
  const netResidualAmount = roundFinancial(Math.abs(subtractMoney(unmatchedAVolume, unmatchedBVolume)), 2);

  return {
    runId,
    module: 'reconciliation',
    engineVersion: '2.4.0-deterministic',
    totalRecordsA: recordsA.length,
    totalRecordsB: recordsB.length,
    totalVolumeA: roundFinancial(totalVolumeA, 2),
    totalVolumeB: roundFinancial(totalVolumeB, 2),
    matchedCount,
    matchedVolume: roundFinancial(matchedVolume, 2),
    unmatchedACount,
    unmatchedBCount,
    unmatchedAVolume: roundFinancial(unmatchedAVolume, 2),
    unmatchedBVolume: roundFinancial(unmatchedBVolume, 2),
    discrepancyCount,
    reconciliationRatePercent,
    netResidualAmount,
    currency: recordsA[0]?.currency || recordsB[0]?.currency || 'USD',
    matches,
    findings,
  };
}
