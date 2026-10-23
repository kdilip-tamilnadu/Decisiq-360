import {
  Finding,
  ModuleType,
  ReconResult,
  DecisionResult,
  RiskResult,
  CloseResult,
  ExecutiveBriefing,
} from '../types/index.ts';
import { roundFinancial } from '../utils/decimal.ts';

export interface AgentInvestigationResult {
  agentName: string;
  module: ModuleType | 'executive';
  summary: string;
  verifiedFacts: string[];
  investigationHypotheses: string[];
  recommendedActions: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    targetFindingId?: string;
  }[];
  isAiEnhanced: boolean;
}

/**
 * Deterministic, offline-first Reconciliation Agent investigation
 */
export function generateReconciliationInvestigation(
  result: ReconResult
): AgentInvestigationResult {
  const verifiedFacts: string[] = [
    `Reconciliation matched ${result.matchedCount} transactions totaling $${result.matchedVolume.toLocaleString()} (${result.reconciliationRatePercent}% reconciliation rate).`,
    `Source A contains ${result.unmatchedACount} unmatched records totaling $${result.unmatchedAVolume.toLocaleString()}.`,
    `Source B contains ${result.unmatchedBCount} unmatched records totaling $${result.unmatchedBVolume.toLocaleString()}.`,
    `Discrepancy count: ${result.discrepancyCount} items with variance within configured tolerance.`,
    `Net residual variance between unmatched populations is $${result.netResidualAmount.toLocaleString()}.`,
  ];

  const hypotheses: string[] = [];
  if (result.unmatchedACount > 0 && result.unmatchedBCount > 0) {
    hypotheses.push(
      'Potential timing lag: transactions initiated near month-end cutoff in Source A may have posted in the subsequent cycle in Source B.'
    );
  }
  if (result.discrepancyCount > 0) {
    hypotheses.push(
      'Discrepancies appear consistent with intermediate processing fees, interchange deductions, or rounding tolerances.'
    );
  }

  const actions: AgentInvestigationResult['recommendedActions'] = [];
  if (result.findings.some((f) => f.category === 'duplicate_transactions')) {
    actions.push({
      priority: 'high',
      action: 'Audit internal ledger for potential double-billing or duplicate posting batches identified in Source A.',
    });
  }
  if (result.unmatchedACount > 0) {
    actions.push({
      priority: 'high',
      action: `Request unposted clearing ledger records from banking partner for ${result.unmatchedACount} orphaned entries.`,
    });
  }
  if (result.discrepancyCount > 0) {
    actions.push({
      priority: 'medium',
      action: 'Review fee schedules and tolerance thresholds with settlement operations team.',
    });
  }

  return {
    agentName: 'Reconciliation Specialist Agent',
    module: 'reconciliation',
    summary: `Reconciliation completed with ${result.reconciliationRatePercent}% match rate across ${
      result.totalRecordsA + result.totalRecordsB
    } items. Net variance is $${result.netResidualAmount.toLocaleString()}.`,
    verifiedFacts,
    investigationHypotheses: hypotheses,
    recommendedActions: actions,
    isAiEnhanced: false,
  };
}

/**
 * Deterministic, offline-first Decision Intelligence Agent explanation
 */
export function generateDecisionInvestigation(
  result: DecisionResult
): AgentInvestigationResult {
  const verifiedFacts: string[] = [
    `Evaluated ${result.totalApplications} application(s) against policy "${result.policyUsed.name}" (${result.policyUsed.version}).`,
    `Recorded source system outcomes: ${result.recordedDeclines} Declined, ${result.recordedApprovals} Approved.`,
    `Deterministic policy recomputation results: ${result.computedFails} Failed, ${result.computedPasses} Passed.`,
    `Conflicting decision determinations: ${result.conflictingDecisionsCount} application(s) where source outcome diverges from policy rules.`,
  ];

  const hypotheses: string[] = [];
  if (result.conflictingDecisionsCount > 0) {
    hypotheses.push(
      'Conflicting outcomes may indicate unrecorded manual senior underwriter overrides or an outdated underwriting scorecard.'
    );
  }

  const actions: AgentInvestigationResult['recommendedActions'] = [];
  if (result.conflictingDecisionsCount > 0) {
    actions.push({
      priority: 'high',
      action: 'Initiate underwriting audit on conflicting approvals/declines to verify if exception approval memos exist on file.',
    });
  }
  actions.push({
    priority: 'medium',
    action: 'Confirm debt-to-income (DTI) 43.0% and minimum credit score 640 policy thresholds align with current credit risk appetite.',
  });

  return {
    agentName: 'Credit Decisioning & Explainability Agent',
    module: 'decision',
    summary: `Analyzed ${result.totalApplications} credit decision(s). Identified ${result.conflictingDecisionsCount} policy divergence(s) requiring compliance review.`,
    verifiedFacts,
    investigationHypotheses: hypotheses,
    recommendedActions: actions,
    isAiEnhanced: false,
  };
}

/**
 * Deterministic, offline-first Risk Agent investigation
 */
export function generateRiskInvestigation(
  result: RiskResult
): AgentInvestigationResult {
  const verifiedFacts: string[] = [
    `Total gross exposure across ${result.positionsCount} position(s): $${result.totalGrossExposure.toLocaleString()} USD.`,
    `Total net exposure after collateral deductions: $${result.totalNetExposure.toLocaleString()} USD.`,
    `Active credit limit breaches: ${result.activeBreachesCount} counterparty limit breach(es) detected.`,
    `Average institutional limit utilization: ${result.averageLimitUtilizationPercent}%.`,
    result.topConcentrations[0]
      ? `Top single counterparty concentration: ${result.topConcentrations[0].counterparty} (${result.topConcentrations[0].shareOfTotalPercent}% of portfolio).`
      : 'No concentrations recorded.',
  ];

  const hypotheses: string[] = [];
  if (result.crossSystemDiscrepancies.length > 0) {
    hypotheses.push(
      'Cross-system variances between Treasury and ERP may stem from un-synchronized mark-to-market trade revaluations.'
    );
  }
  if (result.activeBreachesCount > 0) {
    hypotheses.push(
      'Limit breaches may be exacerbated by recent FX movements on unhedged multi-currency collateral pools.'
    );
  }

  const actions: AgentInvestigationResult['recommendedActions'] = [];
  if (result.activeBreachesCount > 0) {
    actions.push({
      priority: 'high',
      action: 'Issue collateral top-up calls or freeze incremental trading limits for breached counterparties.',
    });
  }
  if (result.crossSystemDiscrepancies.length > 0) {
    actions.push({
      priority: 'high',
      action: 'Run end-of-day valuation reconciliation between Treasury front-office and General Ledger.',
    });
  }

  return {
    agentName: 'Treasury Risk & Exposure Agent',
    module: 'risk',
    summary: `Monitored $${result.totalGrossExposure.toLocaleString()} in institutional positions. Detected ${
      result.activeBreachesCount
    } limit breach(es) and ${result.crossSystemDiscrepancies.length} ledger discrepancy(ies).`,
    verifiedFacts,
    investigationHypotheses: hypotheses,
    recommendedActions: actions,
    isAiEnhanced: false,
  };
}

/**
 * Deterministic, offline-first Close Agent investigation
 */
export function generateCloseInvestigation(
  result: CloseResult
): AgentInvestigationResult {
  const verifiedFacts: string[] = [
    `Close checklist progress: ${result.completedTasks} of ${result.totalTasks} completed (${result.completionRatePercent}%).`,
    `Critical path contains ${result.criticalPathTaskIds.length} zero-slack task(s).`,
    `Total estimated critical close cycle duration: ${result.totalProjectDurationHours} hours.`,
    `Identified ${result.blockedTasksCount} task blockage(s), including ${result.blockers.filter((b) => b.isCriticalPath).length} critical-path blockers.`,
  ];

  if (result.hasCycles) {
    verifiedFacts.unshift('CRITICAL ALERT: Dependency graph contains circular loops preventing CPM scheduling.');
  }

  const hypotheses: string[] = [];
  if (result.blockers.some((b) => b.predecessorTaskName.toLowerCase().includes('reconcil'))) {
    hypotheses.push(
      'Close schedule bottleneck correlates directly with pending intercompany and bank reconciliation sign-offs.'
    );
  }

  const actions: AgentInvestigationResult['recommendedActions'] = [];
  const topCriticalBlockers = result.blockers.filter((b) => b.isCriticalPath);
  if (topCriticalBlockers.length > 0) {
    actions.push({
      priority: 'high',
      action: `Expedite "${topCriticalBlockers[0].predecessorTaskName}" assigned to ${topCriticalBlockers[0].predecessorOwner} to unlock downstream critical path.`,
    });
  }
  actions.push({
    priority: 'medium',
    action: 'Review resource allocation across accounting leads with more than 3 active critical close duties.',
  });

  return {
    agentName: 'Financial Close Scheduling Agent',
    module: 'close',
    summary: `Close is ${result.completionRatePercent}% complete. ${topCriticalBlockers.length} critical path blocker(s) threaten targeted books closure deadline.`,
    verifiedFacts,
    investigationHypotheses: hypotheses,
    recommendedActions: actions,
    isAiEnhanced: false,
  };
}

/**
 * Executive Chief of Staff Agent: synthesizes findings across all 4 departments
 */
export function synthesizeExecutiveBriefing(
  recon: ReconResult | null,
  decision: DecisionResult | null,
  risk: RiskResult | null,
  close: CloseResult | null,
  allFindings: Finding[]
): ExecutiveBriefing {
  let completedCount = 0;
  if (recon) completedCount++;
  if (decision) completedCount++;
  if (risk) completedCount++;
  if (close) completedCount++;

  const criticalFindings = allFindings.filter((f) => f.severity === 'critical' && f.reviewStatus !== 'approved');

  let totalDiscrepancyAmount = 0;
  allFindings.forEach((f) => {
    if (f.impactAmount && f.reviewStatus !== 'approved') {
      totalDiscrepancyAmount += f.impactAmount;
    }
  });

  const reconHealth = !recon
    ? { status: 'NO_DATA' as const, rate: 0, unmatchedCount: 0 }
    : {
        status: recon.reconciliationRatePercent >= 95 ? ('OPTIMAL' as const) : recon.reconciliationRatePercent >= 80 ? ('ATTENTION' as const) : ('CRITICAL' as const),
        rate: recon.reconciliationRatePercent,
        unmatchedCount: recon.unmatchedACount + recon.unmatchedBCount,
      };

  const decisionHealth = !decision
    ? { status: 'NO_DATA' as const, conflictsCount: 0, declineAccuracy: 0 }
    : {
        status: decision.conflictingDecisionsCount === 0 ? ('OPTIMAL' as const) : ('CRITICAL' as const),
        conflictsCount: decision.conflictingDecisionsCount,
        declineAccuracy: safePercentage(decision.totalApplications - decision.conflictingDecisionsCount, decision.totalApplications, 1),
      };

  const riskHealth = !risk
    ? { status: 'NO_DATA' as const, breachesCount: 0, highestConcentrationShare: 0 }
    : {
        status: risk.activeBreachesCount === 0 ? ('OPTIMAL' as const) : ('CRITICAL' as const),
        breachesCount: risk.activeBreachesCount,
        highestConcentrationShare: risk.topConcentrations[0]?.shareOfTotalPercent || 0,
      };

  const closeHealth = !close
    ? { status: 'NO_DATA' as const, blockedCriticalTasks: 0, completionRate: 0 }
    : {
        status: close.blockers.filter((b) => b.isCriticalPath).length === 0 ? ('OPTIMAL' as const) : ('CRITICAL' as const),
        blockedCriticalTasks: close.blockers.filter((b) => b.isCriticalPath).length,
        completionRate: close.completionRatePercent,
      };

  const recommendations: ExecutiveBriefing['actionableRecommendations'] = [];
  let prio = 1;

  if (close && close.blockers.some((b) => b.isCriticalPath)) {
    const b = close.blockers.find((item) => item.isCriticalPath)!;
    recommendations.push({
      priority: prio++,
      module: 'close',
      actionText: `Resolve Critical Close Blocker: ${b.predecessorTaskName}`,
      rationale: `Blocking critical path task "${b.blockedTaskName}". Escalation required to avoid close delay.`,
      targetRunId: close.runId,
    });
  }

  if (risk && risk.activeBreachesCount > 0) {
    recommendations.push({
      priority: prio++,
      module: 'risk',
      actionText: `Remediate ${risk.activeBreachesCount} Active Treasury Limit Breach(es)`,
      rationale: `Total excess exposure exceeds institutional credit ceilings. Collateral call recommended.`,
      targetRunId: risk.runId,
    });
  }

  if (decision && decision.conflictingDecisionsCount > 0) {
    recommendations.push({
      priority: prio++,
      module: 'decision',
      actionText: `Audit ${decision.conflictingDecisionsCount} Conflicting Credit Decisions`,
      rationale: `Underwriting determinations violate approved policy guidelines. Regulatory audit risk.`,
      targetRunId: decision.runId,
    });
  }

  if (recon && (recon.unmatchedACount > 0 || recon.unmatchedBCount > 0)) {
    recommendations.push({
      priority: prio++,
      module: 'reconciliation',
      actionText: `Clear ${recon.unmatchedACount + recon.unmatchedBCount} Unmatched Ledger Items`,
      rationale: `Net un-reconciled residual variance is $${recon.netResidualAmount.toLocaleString()}.`,
      targetRunId: recon.runId,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    completedModulesCount: completedCount,
    unresolvedCriticalFindings: criticalFindings,
    totalUnresolvedDiscrepancyAmount: roundFinancial(totalDiscrepancyAmount, 2),
    reconciliationHealth: reconHealth,
    creditDecisionIntegrity: decisionHealth,
    treasuryRiskHealth: riskHealth,
    closeTimelineHealth: closeHealth,
    actionableRecommendations: recommendations,
  };
}

function safePercentage(num: number, den: number, dec: number): number {
  if (den === 0) return 0;
  return Number(((num / den) * 100).toFixed(dec));
}
