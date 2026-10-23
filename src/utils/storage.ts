import type {
  AnalysisRunMetadata,
  AuditEvent,
  Finding,
  ReviewAction,
  ReconResult,
  DecisionResult,
  RiskResult,
  CloseResult,
  ModuleType,
  WeeklyFindingsAggregation,
} from '../types/index.ts';

const STORAGE_KEYS = {
  ANALYSIS_RUNS: 'decisiq360_analysis_runs_v1',
  RECON_RESULTS: 'decisiq360_recon_results_v1',
  DECISION_RESULTS: 'decisiq360_decision_results_v1',
  RISK_RESULTS: 'decisiq360_risk_results_v1',
  CLOSE_RESULTS: 'decisiq360_close_results_v1',
  FINDINGS: 'decisiq360_findings_v1',
  REVIEW_ACTIONS: 'decisiq360_review_actions_v1',
  AUDIT_LOG: 'decisiq360_audit_events_v1',
};

const memoryStorage = new Map<string, string>();

function safeGet<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    }
    const mem = memoryStorage.get(key);
    if (!mem) return fallback;
    return JSON.parse(mem);
  } catch (e) {
    console.error(`Failed to read ${key} from storage:`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    } else {
      memoryStorage.set(key, serialized);
    }
  } catch (e) {
    console.error(`Failed to write ${key} to storage:`, e);
  }
}

/* -------------------------------------------------------------
 * Analysis Runs Persistence
 * ------------------------------------------------------------- */
export function getSavedRuns(): AnalysisRunMetadata[] {
  return safeGet<AnalysisRunMetadata[]>(STORAGE_KEYS.ANALYSIS_RUNS, []);
}

export function saveRunMetadata(run: AnalysisRunMetadata): void {
  const runs = getSavedRuns();
  // prepend new run
  const updated = [run, ...runs.filter((r) => r.id !== run.id)];
  safeSet(STORAGE_KEYS.ANALYSIS_RUNS, updated);
}

export function getRunsByModule(module: ModuleType): AnalysisRunMetadata[] {
  return getSavedRuns().filter((r) => r.module === module);
}

/* -------------------------------------------------------------
 * Engine Result Persistence
 * ------------------------------------------------------------- */
export function saveReconResult(result: ReconResult): void {
  const all = safeGet<Record<string, ReconResult>>(STORAGE_KEYS.RECON_RESULTS, {});
  all[result.runId] = result;
  safeSet(STORAGE_KEYS.RECON_RESULTS, all);
  syncFindings(result.findings);
}

export function getReconResult(runId: string): ReconResult | null {
  const all = safeGet<Record<string, ReconResult>>(STORAGE_KEYS.RECON_RESULTS, {});
  return all[runId] || null;
}

export function saveDecisionResult(result: DecisionResult): void {
  const all = safeGet<Record<string, DecisionResult>>(STORAGE_KEYS.DECISION_RESULTS, {});
  all[result.runId] = result;
  safeSet(STORAGE_KEYS.DECISION_RESULTS, all);
  syncFindings(result.findings);
}

export function getDecisionResult(runId: string): DecisionResult | null {
  const all = safeGet<Record<string, DecisionResult>>(STORAGE_KEYS.DECISION_RESULTS, {});
  return all[runId] || null;
}

export function saveRiskResult(result: RiskResult): void {
  const all = safeGet<Record<string, RiskResult>>(STORAGE_KEYS.RISK_RESULTS, {});
  all[result.runId] = result;
  safeSet(STORAGE_KEYS.RISK_RESULTS, all);
  syncFindings(result.findings);
}

export function getRiskResult(runId: string): RiskResult | null {
  const all = safeGet<Record<string, RiskResult>>(STORAGE_KEYS.RISK_RESULTS, {});
  return all[runId] || null;
}

export function saveCloseResult(result: CloseResult): void {
  const all = safeGet<Record<string, CloseResult>>(STORAGE_KEYS.CLOSE_RESULTS, {});
  all[result.runId] = result;
  safeSet(STORAGE_KEYS.CLOSE_RESULTS, all);
  syncFindings(result.findings);
}

export function getCloseResult(runId: string): CloseResult | null {
  const all = safeGet<Record<string, CloseResult>>(STORAGE_KEYS.CLOSE_RESULTS, {});
  return all[runId] || null;
}

/* -------------------------------------------------------------
 * Findings & Human Review Persistence
 * ------------------------------------------------------------- */
export function getAllFindings(): Finding[] {
  return safeGet<Finding[]>(STORAGE_KEYS.FINDINGS, []);
}

export function syncFindings(newFindings: Finding[]): void {
  const existing = getAllFindings();
  const map = new Map<string, Finding>();
  existing.forEach((f) => map.set(f.id, f));
  // Don't overwrite human review status if it was already updated
  newFindings.forEach((f) => {
    if (map.has(f.id)) {
      const prior = map.get(f.id)!;
      map.set(f.id, {
        ...f,
        reviewStatus: prior.reviewStatus,
        reviewedBy: prior.reviewedBy,
        reviewedAt: prior.reviewedAt,
        resolutionNotes: prior.resolutionNotes,
      });
    } else {
      map.set(f.id, f);
    }
  });
  safeSet(STORAGE_KEYS.FINDINGS, Array.from(map.values()));
}

export function updateFindingReview(
  findingId: string,
  review: {
    status: 'approved' | 'rejected' | 'flagged';
    reviewer: string;
    notes?: string;
  }
): void {
  const findings = getAllFindings();
  const idx = findings.findIndex((f) => f.id === findingId);
  if (idx !== -1) {
    findings[idx].reviewStatus = review.status;
    findings[idx].reviewedBy = review.reviewer;
    findings[idx].reviewedAt = new Date().toISOString();
    findings[idx].resolutionNotes = review.notes;
    safeSet(STORAGE_KEYS.FINDINGS, findings);
  }

  // Also log review action
  const actions = safeGet<ReviewAction[]>(STORAGE_KEYS.REVIEW_ACTIONS, []);
  actions.unshift({
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    findingId,
    runId: idx !== -1 ? findings[idx].runId : '',
    module: idx !== -1 ? findings[idx].module : 'reconciliation',
    action:
      review.status === 'approved'
        ? 'approve'
        : review.status === 'rejected'
        ? 'reject'
        : 'flag',
    reviewer: review.reviewer,
    reason: review.notes || '',
    timestamp: new Date().toISOString(),
  });
  safeSet(STORAGE_KEYS.REVIEW_ACTIONS, actions);
}

export function getReviewActions(): ReviewAction[] {
  return safeGet<ReviewAction[]>(STORAGE_KEYS.REVIEW_ACTIONS, []);
}

/* -------------------------------------------------------------
 * Audit Trail Persistence
 * ------------------------------------------------------------- */
export function getAuditEvents(): AuditEvent[] {
  return safeGet<AuditEvent[]>(STORAGE_KEYS.AUDIT_LOG, []);
}

export function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
  const events = getAuditEvents();
  const entry: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  events.unshift(entry);
  // Keep last 500 audit entries
  safeSet(STORAGE_KEYS.AUDIT_LOG, events.slice(0, 500));
}

/* -------------------------------------------------------------
 * Safe Data Clear (Preserves Audit Log & Config)
 * ------------------------------------------------------------- */
export const MODULE_NAMES: Record<ModuleType, string> = {
  reconciliation: 'Reconciliation Intelligence',
  decision: 'Decision Intelligence',
  risk: 'Risk & Exposure Intelligence',
  close: 'Close Intelligence',
};

/**
 * Resets a single module to a completely fresh zero state.
 * Strictly preserves other modules, file associations, and permanent audit logs.
 */
export function clearModuleData(module: ModuleType): {
  deletedRunsCount: number;
  moduleName: string;
} {
  const moduleName = MODULE_NAMES[module] || module;
  const allRuns = getSavedRuns();
  const runsToDelete = allRuns.filter((r) => r.module === module);
  const runsToKeep = allRuns.filter((r) => r.module !== module);
  const deletedRunIds = new Set(runsToDelete.map((r) => r.id));

  // 1. Invalidate and clear module-specific results table
  if (module === 'reconciliation') {
    safeSet(STORAGE_KEYS.RECON_RESULTS, {});
  } else if (module === 'decision') {
    safeSet(STORAGE_KEYS.DECISION_RESULTS, {});
  } else if (module === 'risk') {
    safeSet(STORAGE_KEYS.RISK_RESULTS, {});
  } else if (module === 'close') {
    safeSet(STORAGE_KEYS.CLOSE_RESULTS, {});
  }

  // 2. Clear module runs from saved runs
  safeSet(STORAGE_KEYS.ANALYSIS_RUNS, runsToKeep);

  // 3. Clear module findings
  const findings = getAllFindings();
  const remainingFindings = findings.filter(
    (f) => f.module !== module && !deletedRunIds.has(f.runId)
  );
  safeSet(STORAGE_KEYS.FINDINGS, remainingFindings);

  // 4. Clear module review actions
  const reviewActions = getReviewActions();
  const remainingReviews = reviewActions.filter(
    (a) => a.module !== module && !deletedRunIds.has(a.runId)
  );
  safeSet(STORAGE_KEYS.REVIEW_ACTIONS, remainingReviews);

  // 5. Invalidate module session caches
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`decisiq360_${module}_cache`);
      sessionStorage.removeItem(`decisiq360_${module}_investigation`);
      sessionStorage.removeItem(`decisiq360_${module}_state`);
    }
  } catch (e) {
    // Ignore session storage errors
  }

  // 6. Record mandatory provenance audit event
  logAuditEvent({
    actionType: 'DATA_CLEARED',
    module,
    details: `Safely cleared all uploaded files, processed data, and analysis results from ${moduleName}. Workspace reset to zero-state.`,
    metadata: {
      deletedRunsCount: runsToDelete.length,
      deletedRunIds: Array.from(deletedRunIds),
    },
  });

  return { deletedRunsCount: runsToDelete.length, moduleName };
}

export function clearPastAnalysisResults(moduleFilter?: ModuleType): {
  deletedRunsCount: number;
} {
  if (moduleFilter) {
    const res = clearModuleData(moduleFilter);
    return { deletedRunsCount: res.deletedRunsCount };
  }

  const allRuns = getSavedRuns();
  const deletedRunIds = new Set(allRuns.map((r) => r.id));

  safeSet(STORAGE_KEYS.RECON_RESULTS, {});
  safeSet(STORAGE_KEYS.DECISION_RESULTS, {});
  safeSet(STORAGE_KEYS.RISK_RESULTS, {});
  safeSet(STORAGE_KEYS.CLOSE_RESULTS, {});
  safeSet(STORAGE_KEYS.ANALYSIS_RUNS, []);
  safeSet(STORAGE_KEYS.FINDINGS, []);
  safeSet(STORAGE_KEYS.REVIEW_ACTIONS, []);

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (e) {
    // Ignore session storage errors
  }

  logAuditEvent({
    actionType: 'DATA_CLEARED',
    details: `Safely cleared all ${allRuns.length} analysis run(s) across all modules. Audit history retained.`,
    metadata: {
      deletedRunCount: allRuns.length,
      deletedRunIds: Array.from(deletedRunIds),
    },
  });

  return { deletedRunsCount: allRuns.length };
}

/**
 * Completely purges all residual demo/sample datasets, findings, and runs
 * ensuring zero demo data exists in storage.
 */
export function purgeDemoData(): { purgedCount: number } {
  const runs = getSavedRuns();
  const demoRunIds = new Set<string>();

  for (const run of runs) {
    const isDemo =
      run.id.toLowerCase().includes('demo') ||
      run.id.toLowerCase().includes('sample') ||
      run.inputFiles?.some(
        (f) =>
          f.name.toLowerCase().includes('sample_') ||
          f.name.toLowerCase().includes('demo_') ||
          f.name.toLowerCase().startsWith('sample')
      );
    if (isDemo) {
      demoRunIds.add(run.id);
    }
  }

  if (demoRunIds.size > 0) {
    const cleanRuns = runs.filter((r) => !demoRunIds.has(r.id));
    safeSet(STORAGE_KEYS.ANALYSIS_RUNS, cleanRuns);

    const findings = getAllFindings().filter(
      (f) =>
        !demoRunIds.has(f.runId) &&
        !f.id.toLowerCase().includes('demo') &&
        !f.id.toLowerCase().includes('sample')
    );
    safeSet(STORAGE_KEYS.FINDINGS, findings);

    const reviews = getReviewActions().filter((r) => !demoRunIds.has(r.runId));
    safeSet(STORAGE_KEYS.REVIEW_ACTIONS, reviews);

    // Clean module result caches
    const reconMap = safeGet<Record<string, ReconResult>>(STORAGE_KEYS.RECON_RESULTS, {});
    for (const id of demoRunIds) delete reconMap[id];
    safeSet(STORAGE_KEYS.RECON_RESULTS, reconMap);

    const decMap = safeGet<Record<string, DecisionResult>>(STORAGE_KEYS.DECISION_RESULTS, {});
    for (const id of demoRunIds) delete decMap[id];
    safeSet(STORAGE_KEYS.DECISION_RESULTS, decMap);

    const riskMap = safeGet<Record<string, RiskResult>>(STORAGE_KEYS.RISK_RESULTS, {});
    for (const id of demoRunIds) delete riskMap[id];
    safeSet(STORAGE_KEYS.RISK_RESULTS, riskMap);

    const closeMap = safeGet<Record<string, CloseResult>>(STORAGE_KEYS.CLOSE_RESULTS, {});
    for (const id of demoRunIds) delete closeMap[id];
    safeSet(STORAGE_KEYS.CLOSE_RESULTS, closeMap);

    logAuditEvent({
      actionType: 'DATA_CLEARED',
      details: `Purged ${demoRunIds.size} legacy demo/sample run(s) and associated findings from workspace storage.`,
      metadata: {
        purgedRunIds: Array.from(demoRunIds),
      },
    });
  }

  return { purgedCount: demoRunIds.size };
}

/* -------------------------------------------------------------
 * Weekly Findings Aggregations for Executive Trends & Sparklines
 * ------------------------------------------------------------- */
/**
 * Calculates weekly aggregated findings counts across all four modules
 * to power historical trend charts and sparklines in the ExecutiveControlRoom.
 */
export function getWeeklyAggregatedFindingsCounts(weeksBack: number = 6): WeeklyFindingsAggregation[] {
  const allFindings = getAllFindings();
  const allRuns = getSavedRuns();

  const runMap = new Map<string, AnalysisRunMetadata>();
  allRuns.forEach((r) => runMap.set(r.id, r));

  const now = new Date();
  const weeklyBuckets: WeeklyFindingsAggregation[] = [];

  // Generate intervals for the past `weeksBack` weeks (oldest first, current week last)
  for (let i = weeksBack - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const weekIndex = weeksBack - i;
    const shortLabel = i === 0 ? 'Current' : `Wk ${weekIndex}`;
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekLabel =
      i === 0
        ? `Week ${weekIndex} (Current: ${startStr} - ${endStr})`
        : `Week ${weekIndex} (${startStr} - ${endStr})`;

    weeklyBuckets.push({
      weekKey: `week_${weekIndex}`,
      weekLabel,
      shortLabel,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      reconciliation: 0,
      decision: 0,
      risk: 0,
      close: 0,
      total: 0,
      criticalCount: 0,
    });
  }

  // Count findings that match timestamp in each week bucket
  for (const finding of allFindings) {
    let timestamp = now.getTime();
    if (finding.runId && runMap.has(finding.runId)) {
      const runDate = new Date(runMap.get(finding.runId)!.createdAt).getTime();
      if (!isNaN(runDate)) timestamp = runDate;
    } else if (finding.reviewedAt) {
      const revDate = new Date(finding.reviewedAt).getTime();
      if (!isNaN(revDate)) timestamp = revDate;
    }

    // Match to one of the weekly buckets
    for (const bucket of weeklyBuckets) {
      const startMs = new Date(bucket.startDate).getTime();
      const endMs = new Date(bucket.endDate).getTime();
      if (timestamp >= startMs && timestamp <= endMs) {
        if (finding.module === 'reconciliation') bucket.reconciliation++;
        else if (finding.module === 'decision') bucket.decision++;
        else if (finding.module === 'risk') bucket.risk++;
        else if (finding.module === 'close') bucket.close++;

        bucket.total++;
        if (finding.severity === 'critical') {
          bucket.criticalCount++;
        }
        break;
      }
    }
  }

  // Active counts in current state for each module
  const currentRecon = allFindings.filter((f) => f.module === 'reconciliation').length;
  const currentDecision = allFindings.filter((f) => f.module === 'decision').length;
  const currentRisk = allFindings.filter((f) => f.module === 'risk').length;
  const currentClose = allFindings.filter((f) => f.module === 'close').length;

  const currentBucket = weeklyBuckets[weeklyBuckets.length - 1];
  // Ensure the current week bucket accurately reflects the live persisted findings
  currentBucket.reconciliation = currentRecon;
  currentBucket.decision = currentDecision;
  currentBucket.risk = currentRisk;
  currentBucket.close = currentClose;
  currentBucket.total = currentRecon + currentDecision + currentRisk + currentClose;
  currentBucket.criticalCount = allFindings.filter((f) => f.severity === 'critical').length;

  return weeklyBuckets;
}

