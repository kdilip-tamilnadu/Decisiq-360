/**
 * Decisiq 360 — Canonical Types & Versioned Contracts
 * Specification Version: 1.0.0
 */

export type ModuleType = 'reconciliation' | 'decision' | 'risk' | 'close';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReviewStatus = 'unreviewed' | 'approved' | 'rejected' | 'flagged';

export interface EvidenceReference {
  fileId: string;
  fileName: string;
  rowNumber?: number;
  recordIdentifier?: string;
  rawFieldValues?: Record<string, any>;
  normalizedValues?: Record<string, any>;
  ruleOrCalculationId: string;
  runId: string;
  notes?: string;
}

export interface Finding {
  id: string;
  runId: string;
  module: ModuleType;
  title: string;
  severity: FindingSeverity;
  category: string;
  description: string;
  impactAmount?: number;
  currency?: string;
  evidence: EvidenceReference[];
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  aiHypothesis?: string;
}

export interface ReviewAction {
  id: string;
  findingId: string;
  runId: string;
  module: ModuleType;
  action: 'approve' | 'reject' | 'flag' | 'comment';
  reviewer: string;
  reason: string;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actionType:
    | 'FILE_UPLOAD'
    | 'ANALYSIS_RUN'
    | 'FINDING_REVIEWED'
    | 'SCENARIO_EXECUTED'
    | 'POLICY_EVALUATED'
    | 'DATA_EXPORTED'
    | 'DATA_CLEARED';
  module?: ModuleType;
  runId?: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface UploadedFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  rowCount: number;
  detectedFormat: 'csv' | 'xlsx' | 'json';
  sourceRole?: string; // e.g. 'source_a' (bank) vs 'source_b' (ledger), or 'applications' vs 'policy'
}

export interface AnalysisRunMetadata {
  id: string;
  module: ModuleType;
  engineVersion: string;
  createdAt: string;
  executionTimeMs: number;
  status: 'success' | 'failed' | 'partial';
  inputFiles: UploadedFileMetadata[];
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  summary: Record<string, any>;
}

/* -------------------------------------------------------------
 * 1. RECONCILIATION INTELLIGENCE CONTRACTS
 * ------------------------------------------------------------- */
export interface ReconRecord {
  id: string;
  sourceFileId: string;
  sourceRole: 'source_a' | 'source_b';
  sourceName: string;
  rowNumber: number;
  transactionId: string;
  date: string;
  amount: number;
  currency: string;
  direction: 'debit' | 'credit';
  reference: string;
  counterparty?: string;
  description?: string;
  raw: Record<string, any>;
}

export interface ReconMatch {
  id: string;
  recordA?: ReconRecord;
  recordB?: ReconRecord;
  matchType: 'exact' | 'tolerance' | 'reference_exact' | 'unmatched';
  amountDifference: number;
  dateDifferenceDays: number;
  status: 'matched' | 'unmatched' | 'discrepancy' | 'ambiguous';
  evidence: EvidenceReference;
  isConfirmed: boolean;
}

export interface ReconConfig {
  amountTolerance: number; // e.g. 0.05
  dateToleranceDays: number; // e.g. 3
  signConvention: 'same_sign' | 'opposite_sign'; // same sign or Debit = Credit opposite
  requireReferenceMatch: boolean;
}

export interface ReconResult {
  runId: string;
  module: 'reconciliation';
  engineVersion: string;
  totalRecordsA: number;
  totalRecordsB: number;
  totalVolumeA: number;
  totalVolumeB: number;
  matchedCount: number;
  matchedVolume: number;
  unmatchedACount: number;
  unmatchedBCount: number;
  unmatchedAVolume: number;
  unmatchedBVolume: number;
  discrepancyCount: number;
  reconciliationRatePercent: number;
  netResidualAmount: number;
  currency: string;
  matches: ReconMatch[];
  findings: Finding[];
}

/* -------------------------------------------------------------
 * 2. DECISION INTELLIGENCE CONTRACTS
 * ------------------------------------------------------------- */
export type RuleEvaluationStatus = 'PASS' | 'FAIL' | 'UNKNOWN' | 'NOT_APPLICABLE';

export interface DecisionRule {
  id: string;
  name: string;
  description: string;
  field: string;
  operator: '<=' | '>=' | '<' | '>' | '==' | '!=' | 'IN' | 'CUSTOM';
  threshold: number | string | (string | number)[];
  severityIfFailed: FindingSeverity;
  category: 'affordability' | 'creditworthiness' | 'collateral' | 'eligibility' | 'compliance';
}

export interface DecisionPolicy {
  policyId: string;
  version: string;
  name: string;
  description: string;
  rules: DecisionRule[];
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  status: RuleEvaluationStatus;
  actualValue: any;
  threshold: any;
  operator: string;
  failureReason?: string;
  evidence: EvidenceReference;
}

export interface CreditApplicationRecord {
  id: string;
  applicantName?: string;
  applicationDate?: string;
  requestedAmount: number;
  loanPurpose?: string;
  monthlyDebtObligations: number;
  grossMonthlyIncome: number;
  creditScore: number;
  propertyValue?: number;
  employmentMonths?: number;
  delinquenciesCount?: number;
  recordedOutcome: 'APPROVED' | 'DECLINED' | 'REFERRED';
  recordedReasonCode?: string;
  raw: Record<string, any>;
  rowNumber: number;
  sourceFileId: string;
}

export interface DecisionEvaluationRecord {
  application: CreditApplicationRecord;
  computedOutcome: 'PASS' | 'FAIL' | 'REFER';
  outcomeMatchesRecorded: boolean;
  computedDTI: number;
  computedLTV?: number;
  ruleResults: RuleEvaluationResult[];
  explanation: string;
  missingDataWarnings: string[];
}

export interface DecisionResult {
  runId: string;
  module: 'decision';
  engineVersion: string;
  policyUsed: DecisionPolicy;
  totalApplications: number;
  recordedDeclines: number;
  recordedApprovals: number;
  computedPasses: number;
  computedFails: number;
  conflictingDecisionsCount: number; // where recorded outcome != computed rule verdict
  evaluations: DecisionEvaluationRecord[];
  findings: Finding[];
}

/* -------------------------------------------------------------
 * 3. RISK & EXPOSURE INTELLIGENCE CONTRACTS
 * ------------------------------------------------------------- */
export interface ExposurePosition {
  id: string;
  positionId: string;
  counterparty: string;
  instrument: string;
  exposureAmount: number;
  currency: string;
  reportingDate: string;
  sourceSystem: string;
  valuationMethod?: string;
  collateralAmount?: number;
  netExposureAmount?: number;
  configuredLimit?: number;
  rowNumber: number;
  sourceFileId: string;
  raw: Record<string, any>;
}

export interface CounterpartySummary {
  counterparty: string;
  grossExposure: number;
  netExposure: number;
  configuredLimit?: number;
  limitUtilizationPercent?: number;
  shareOfTotalPercent: number;
  isBreached: boolean;
  positionsCount: number;
}

export interface CrossSystemExposureDiff {
  positionOrCounterparty: string;
  exposureSystemA: number;
  exposureSystemB: number;
  difference: number;
  absoluteDifference: number;
  relativeDifferencePercent: number;
  evidence: EvidenceReference;
}

export interface ScenarioShockConfig {
  name: string;
  description: string;
  fxShockPercent: number; // e.g. +10% or -10%
  counterpartyCreditShockPercent: number; // e.g. +25%
  targetCounterparty?: string;
  instrumentFilter?: string;
}

export interface ScenarioResult {
  scenarioName: string;
  baselineTotalGross: number;
  stressedTotalGross: number;
  changeAmount: number;
  changePercent: number;
  affectedPositionsCount: number;
  breachedCounterparties: string[];
  assumptions: string[];
}

export interface RiskResult {
  runId: string;
  module: 'risk';
  engineVersion: string;
  baseCurrency: string;
  totalGrossExposure: number;
  totalNetExposure: number;
  totalConfiguredLimit: number;
  averageLimitUtilizationPercent: number;
  topConcentrations: CounterpartySummary[];
  crossSystemDiscrepancies: CrossSystemExposureDiff[];
  activeBreachesCount: number;
  positionsCount: number;
  positions: ExposurePosition[];
  scenarioResults?: ScenarioResult[];
  findings: Finding[];
}

/* -------------------------------------------------------------
 * 4. CLOSE INTELLIGENCE CONTRACTS
 * ------------------------------------------------------------- */
export type TaskStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'BLOCKED';

export interface CloseTask {
  id: string;
  name: string;
  owner: string;
  status: TaskStatus;
  durationHours: number;
  dueDate: string;
  actualDate?: string;
  predecessorIds: string[];
  approvalsRequired: boolean;
  rowNumber: number;
  sourceFileId: string;
  evidence?: string;
  // CPM Calculated Fields
  earlyStart?: number;
  earlyFinish?: number;
  lateStart?: number;
  lateFinish?: number;
  slack?: number;
  isCritical?: boolean;
}

export interface BlockerDetail {
  blockedTaskId: string;
  blockedTaskName: string;
  predecessorTaskId: string;
  predecessorTaskName: string;
  predecessorStatus: TaskStatus;
  predecessorOwner: string;
  isCriticalPath: boolean;
  slackRemaining: number;
  severity: FindingSeverity;
  evidence: EvidenceReference;
}

export interface CloseResult {
  runId: string;
  module: 'close';
  engineVersion: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  blockedTasksCount: number;
  completionRatePercent: number;
  hasCycles: boolean;
  cycleDetails?: string[];
  criticalPathTaskIds: string[];
  totalProjectDurationHours: number;
  earliestAchievableFinishHours: number;
  blockers: BlockerDetail[];
  tasks: CloseTask[];
  findings: Finding[];
}

/* -------------------------------------------------------------
 * 5. CROSS-MODULE EXECUTIVE INTELLIGENCE CONTRACTS
 * ------------------------------------------------------------- */
export interface ExecutiveBriefing {
  generatedAt: string;
  completedModulesCount: number;
  unresolvedCriticalFindings: Finding[];
  totalUnresolvedDiscrepancyAmount: number;
  reconciliationHealth: {
    status: 'OPTIMAL' | 'ATTENTION' | 'CRITICAL' | 'NO_DATA';
    rate: number;
    unmatchedCount: number;
  };
  creditDecisionIntegrity: {
    status: 'OPTIMAL' | 'ATTENTION' | 'CRITICAL' | 'NO_DATA';
    conflictsCount: number;
    declineAccuracy: number;
  };
  treasuryRiskHealth: {
    status: 'OPTIMAL' | 'ATTENTION' | 'CRITICAL' | 'NO_DATA';
    breachesCount: number;
    highestConcentrationShare: number;
  };
  closeTimelineHealth: {
    status: 'OPTIMAL' | 'ATTENTION' | 'CRITICAL' | 'NO_DATA';
    blockedCriticalTasks: number;
    completionRate: number;
  };
  actionableRecommendations: {
    priority: number;
    module: ModuleType;
    actionText: string;
    rationale: string;
    targetRunId?: string;
  }[];
}

export interface WeeklyFindingsAggregation {
  weekKey: string;
  weekLabel: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
  reconciliation: number;
  decision: number;
  risk: number;
  close: number;
  total: number;
  criticalCount: number;
}
