import type {
  CreditApplicationRecord,
  DecisionPolicy,
  DecisionRule,
  RuleEvaluationResult,
  DecisionEvaluationRecord,
  DecisionResult,
  Finding,
  EvidenceReference,
} from '../types/index.ts';
import { roundFinancial, safeDivide, safePercentage } from '../utils/decimal.ts';
import { findMatchingField, parseNumberField, generateId } from '../utils/fileParser.ts';

export const STANDARD_CREDIT_POLICY: DecisionPolicy = {
  policyId: 'POL_CREDIT_UNDERWRITING_v2.1',
  version: '2.1.0',
  name: 'Standard Retail Credit & Mortgages Policy',
  description: 'Deterministic credit affordability, creditworthiness, and compliance thresholds.',
  rules: [
    {
      id: 'RULE_DTI_MAX',
      name: 'Debt-to-Income (DTI) Cap',
      description: 'Monthly debt obligations divided by gross monthly income must not exceed 43.0%.',
      field: 'computedDTI',
      operator: '<=',
      threshold: 43.0,
      severityIfFailed: 'high',
      category: 'affordability',
    },
    {
      id: 'RULE_CREDIT_SCORE_MIN',
      name: 'Minimum FICO Credit Score',
      description: 'Applicant credit score must be at least 640 for standard underwriting approval.',
      field: 'creditScore',
      operator: '>=',
      threshold: 640,
      severityIfFailed: 'critical',
      category: 'creditworthiness',
    },
    {
      id: 'RULE_DELINQUENCY_MAX',
      name: 'Maximum Prior Delinquencies',
      description: 'No more than 1 30+ day delinquency in the preceding 24 months.',
      field: 'delinquenciesCount',
      operator: '<=',
      threshold: 1,
      severityIfFailed: 'high',
      category: 'creditworthiness',
    },
    {
      id: 'RULE_EMPLOYMENT_MIN',
      name: 'Minimum Employment History',
      description: 'Continuous employment history must be at least 12 months.',
      field: 'employmentMonths',
      operator: '>=',
      threshold: 12,
      severityIfFailed: 'medium',
      category: 'eligibility',
    },
    {
      id: 'RULE_LOAN_AMOUNT_CAP',
      name: 'Single Obligor Loan Cap',
      description: 'Unsecured/Retail requested loan amount must not exceed $500,000.',
      field: 'requestedAmount',
      operator: '<=',
      threshold: 500000,
      severityIfFailed: 'high',
      category: 'compliance',
    },
  ],
};

/**
 * Normalizes raw uploaded rows into CreditApplicationRecord items
 */
export function normalizeDecisionRows(
  rows: Record<string, any>[],
  fileId: string,
  fileName: string
): CreditApplicationRecord[] {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});

  const idCol = findMatchingField(headers, ['application_id', 'app_id', 'id', 'applicant_id', 'loan_id']);
  const nameCol = findMatchingField(headers, ['name', 'applicant_name', 'borrower_name', 'client']);
  const amountCol = findMatchingField(headers, ['requested_amount', 'loan_amount', 'amount', 'principal']);
  const incomeCol = findMatchingField(headers, ['gross_monthly_income', 'monthly_income', 'income', 'salary', 'gross_income']);
  const debtCol = findMatchingField(headers, ['monthly_debt', 'monthly_debt_obligations', 'debt', 'liabilities']);
  const scoreCol = findMatchingField(headers, ['credit_score', 'fico', 'score', 'bureau_score']);
  const outcomeCol = findMatchingField(headers, ['decision', 'outcome', 'recorded_outcome', 'status', 'verdict']);
  const reasonCol = findMatchingField(headers, ['reason', 'reason_code', 'decline_reason', 'rejection_reason']);
  const empCol = findMatchingField(headers, ['employment_months', 'employment_length', 'job_tenure_months', 'tenure']);
  const delinqCol = findMatchingField(headers, ['delinquencies', 'delinquencies_count', 'prior_defaults', 'late_payments']);

  return rows.map((row, idx) => {
    const rawOutcome = outcomeCol ? String(row[outcomeCol]).toUpperCase().trim() : '';
    let recordedOutcome: 'APPROVED' | 'DECLINED' | 'REFERRED' = 'DECLINED';
    if (rawOutcome.includes('APP') || rawOutcome.includes('PASS')) {
      recordedOutcome = 'APPROVED';
    } else if (rawOutcome.includes('REF') || rawOutcome.includes('REVIEW')) {
      recordedOutcome = 'REFERRED';
    }

    return {
      id: idCol && row[idCol] ? String(row[idCol]).trim() : `APP-${idx + 1001}`,
      applicantName: nameCol && row[nameCol] ? String(row[nameCol]).trim() : `Applicant #${idx + 1}`,
      applicationDate: new Date().toISOString().split('T')[0],
      requestedAmount: amountCol ? parseNumberField(row[amountCol]) : 50000,
      grossMonthlyIncome: incomeCol ? parseNumberField(row[incomeCol]) : 0,
      monthlyDebtObligations: debtCol ? parseNumberField(row[debtCol]) : 0,
      creditScore: scoreCol ? parseNumberField(row[scoreCol]) : 0,
      employmentMonths: empCol ? parseNumberField(row[empCol], 12) : 24,
      delinquenciesCount: delinqCol ? parseNumberField(row[delinqCol], 0) : 0,
      recordedOutcome,
      recordedReasonCode: reasonCol && row[reasonCol] ? String(row[reasonCol]).trim() : undefined,
      raw: row,
      rowNumber: idx + 2,
      sourceFileId: fileId,
    };
  });
}

/**
 * Evaluates an individual rule deterministically against an application
 */
export function evaluateRule(
  rule: DecisionRule,
  app: CreditApplicationRecord,
  computedDTI: number,
  runId: string
): RuleEvaluationResult {
  let actualValue: any;

  if (rule.field === 'computedDTI') {
    actualValue = computedDTI;
  } else if (rule.field === 'creditScore') {
    actualValue = app.creditScore;
  } else if (rule.field === 'delinquenciesCount') {
    actualValue = app.delinquenciesCount;
  } else if (rule.field === 'employmentMonths') {
    actualValue = app.employmentMonths;
  } else if (rule.field === 'requestedAmount') {
    actualValue = app.requestedAmount;
  } else {
    actualValue = app.raw[rule.field];
  }

  // Handle missing data
  if (actualValue === undefined || actualValue === null || isNaN(actualValue)) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'UNKNOWN',
      actualValue: 'N/A',
      threshold: rule.threshold,
      operator: rule.operator,
      failureReason: `Required attribute "${rule.field}" is missing or unparseable in source record.`,
      evidence: {
        fileId: app.sourceFileId,
        fileName: 'Application Source',
        rowNumber: app.rowNumber,
        recordIdentifier: app.id,
        rawFieldValues: app.raw,
        ruleOrCalculationId: rule.id,
        runId,
      },
    };
  }

  let passed = false;
  if (rule.operator === '<=') {
    passed = actualValue <= (rule.threshold as number);
  } else if (rule.operator === '>=') {
    passed = actualValue >= (rule.threshold as number);
  } else if (rule.operator === '<') {
    passed = actualValue < (rule.threshold as number);
  } else if (rule.operator === '>') {
    passed = actualValue > (rule.threshold as number);
  } else if (rule.operator === '==') {
    passed = actualValue == rule.threshold;
  } else {
    passed = true;
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    status: passed ? 'PASS' : 'FAIL',
    actualValue,
    threshold: rule.threshold,
    operator: rule.operator,
    failureReason: passed
      ? undefined
      : `Actual value (${actualValue}) breached policy threshold (${rule.operator} ${rule.threshold}).`,
    evidence: {
      fileId: app.sourceFileId,
      fileName: 'Application Source',
      rowNumber: app.rowNumber,
      recordIdentifier: app.id,
      rawFieldValues: app.raw,
      normalizedValues: { [rule.field]: actualValue },
      ruleOrCalculationId: rule.id,
      runId,
    },
  };
}

/**
 * Executes deterministic Decision Intelligence evaluation across applications
 */
export function executeDecisionEngine(
  applications: CreditApplicationRecord[],
  policy: DecisionPolicy = STANDARD_CREDIT_POLICY,
  runId = generateId('run_decision')
): DecisionResult {
  const evaluations: DecisionEvaluationRecord[] = [];
  const findings: Finding[] = [];

  let recordedDeclines = 0;
  let recordedApprovals = 0;
  let computedPasses = 0;
  let computedFails = 0;
  let conflictingDecisionsCount = 0;

  for (const app of applications) {
    if (app.recordedOutcome === 'DECLINED') recordedDeclines++;
    if (app.recordedOutcome === 'APPROVED') recordedApprovals++;

    // Deterministic DTI calculation: monthly debt / gross monthly income * 100
    const missingDataWarnings: string[] = [];
    let computedDTI = 0;

    if (app.grossMonthlyIncome <= 0) {
      missingDataWarnings.push('Gross monthly income is zero or missing; DTI cannot be computed.');
      computedDTI = 999; // Extreme DTI indicating lack of income
    } else {
      computedDTI = safePercentage(app.monthlyDebtObligations, app.grossMonthlyIncome, 2);
    }

    if (app.creditScore <= 0) {
      missingDataWarnings.push('Credit bureau score is missing or 0.');
    }

    // Evaluate all rules deterministically
    const ruleResults = policy.rules.map((rule) => evaluateRule(rule, app, computedDTI, runId));

    const failedRules = ruleResults.filter((r) => r.status === 'FAIL');
    const unknownRules = ruleResults.filter((r) => r.status === 'UNKNOWN');

    const computedOutcome = failedRules.length > 0 ? 'FAIL' : unknownRules.length > 0 ? 'REFER' : 'PASS';

    if (computedOutcome === 'PASS') computedPasses++;
    else computedFails++;

    // Compare computed outcome against recorded outcome
    const isConflict =
      (computedOutcome === 'PASS' && app.recordedOutcome === 'DECLINED') ||
      (computedOutcome === 'FAIL' && app.recordedOutcome === 'APPROVED');

    if (isConflict) {
      conflictingDecisionsCount++;
    }

    // Build evidence-backed explanation
    let explanation = '';
    if (failedRules.length > 0) {
      const reasons = failedRules
        .map((r) => `${r.ruleName}: actual ${r.actualValue} vs policy threshold ${r.operator} ${r.threshold}`)
        .join('; ');
      explanation = `Computed Decline: Breached ${failedRules.length} underwriting rule(s): ${reasons}.`;
    } else if (unknownRules.length > 0) {
      explanation = `Referred for Manual Underwriting: ${unknownRules.length} mandatory underwriting attribute(s) missing.`;
    } else {
      explanation = `Satisfied all ${policy.rules.length} policy guidelines (Computed DTI: ${computedDTI.toFixed(
        1
      )}%, Credit Score: ${app.creditScore}).`;
    }

    evaluations.push({
      application: app,
      computedOutcome,
      outcomeMatchesRecorded: !isConflict,
      computedDTI: roundFinancial(computedDTI, 2),
      ruleResults,
      explanation,
      missingDataWarnings,
    });

    // Material Findings
    if (isConflict) {
      findings.push({
        id: `find_decision_conflict_${app.id}`,
        runId,
        module: 'decision',
        title: `Decision Discrepancy: ${app.id} (${app.applicantName})`,
        severity: 'critical',
        category: 'policy_conflict',
        description: `Source system recorded "${app.recordedOutcome}" but deterministic policy evaluation resulted in "${computedOutcome}". ${explanation}`,
        impactAmount: app.requestedAmount,
        currency: 'USD',
        reviewStatus: 'unreviewed',
        evidence: [
          {
            fileId: app.sourceFileId,
            fileName: 'Credit Applications',
            rowNumber: app.rowNumber,
            recordIdentifier: app.id,
            rawFieldValues: app.raw,
            normalizedValues: {
              recordedOutcome: app.recordedOutcome,
              computedOutcome,
              computedDTI,
              creditScore: app.creditScore,
            },
            ruleOrCalculationId: 'RULE_POLICY_OUTCOME_COMPARISON',
            runId,
          },
        ],
      });
    } else if (failedRules.some((r) => r.ruleId === 'RULE_CREDIT_SCORE_MIN')) {
      findings.push({
        id: `find_score_fail_${app.id}`,
        runId,
        module: 'decision',
        title: `Sub-Prime Credit Score (${app.creditScore}) on ${app.id}`,
        severity: 'high',
        category: 'creditworthiness_breach',
        description: `Application ${app.id} for $${app.requestedAmount.toLocaleString()} was declined due to credit score of ${
          app.creditScore
        } (minimum required is 640).`,
        impactAmount: app.requestedAmount,
        currency: 'USD',
        reviewStatus: 'unreviewed',
        evidence: [
          {
            fileId: app.sourceFileId,
            fileName: 'Credit Applications',
            rowNumber: app.rowNumber,
            recordIdentifier: app.id,
            rawFieldValues: app.raw,
            ruleOrCalculationId: 'RULE_CREDIT_SCORE_MIN',
            runId,
          },
        ],
      });
    }
  }

  return {
    runId,
    module: 'decision',
    engineVersion: '2.1.0-deterministic',
    policyUsed: policy,
    totalApplications: applications.length,
    recordedDeclines,
    recordedApprovals,
    computedPasses,
    computedFails,
    conflictingDecisionsCount,
    evaluations,
    findings,
  };
}
