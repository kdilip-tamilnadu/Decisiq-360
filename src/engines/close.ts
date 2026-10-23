import type {
  CloseTask,
  TaskStatus,
  BlockerDetail,
  CloseResult,
  Finding,
  EvidenceReference,
} from '../types/index.ts';
import { roundFinancial, safePercentage } from '../utils/decimal.ts';
import { findMatchingField, parseNumberField, generateId } from '../utils/fileParser.ts';

/**
 * Normalizes raw uploaded rows into CloseTask items
 */
export function normalizeCloseRows(
  rows: Record<string, any>[],
  fileId: string,
  fileName: string
): CloseTask[] {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});

  const idCol = findMatchingField(headers, ['task_id', 'id', 'task_code', 'step_id', 'wbs']);
  const nameCol = findMatchingField(headers, ['task_name', 'name', 'title', 'task', 'description', 'activity']);
  const ownerCol = findMatchingField(headers, ['owner', 'assignee', 'lead', 'responsible', 'preparer']);
  const statusCol = findMatchingField(headers, ['status', 'state', 'progress', 'phase']);
  const durationCol = findMatchingField(headers, ['duration_hours', 'duration', 'hours', 'estimated_hours', 'est_time']);
  const dueCol = findMatchingField(headers, ['due_date', 'deadline', 'target_date', 'due']);
  const actualCol = findMatchingField(headers, ['actual_date', 'completed_date', 'finished_at']);
  const predCol = findMatchingField(headers, ['predecessors', 'predecessor_ids', 'depends_on', 'deps', 'prerequisites']);
  const approvalCol = findMatchingField(headers, ['approvals_required', 'requires_approval', 'sign_off', 'approval']);

  return rows.map((row, idx) => {
    const rawStatus = statusCol ? String(row[statusCol]).toUpperCase().trim() : '';
    let status: TaskStatus = 'NOT_STARTED';
    if (rawStatus.includes('COMP') || rawStatus.includes('DONE')) {
      status = 'COMPLETED';
    } else if (rawStatus.includes('PROG') || rawStatus.includes('RUN') || rawStatus.includes('DOING')) {
      status = 'IN_PROGRESS';
    } else if (rawStatus.includes('BLOCK') || rawStatus.includes('STUCK') || rawStatus.includes('HOLD')) {
      status = 'BLOCKED';
    }

    const rawPred = predCol ? String(row[predCol]) : '';
    // parse comma/semicolon-separated predecessor IDs
    const predecessorIds = rawPred
      ? rawPred
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.toLowerCase() !== 'none' && s !== '-')
      : [];

    const durationHours = durationCol ? parseNumberField(row[durationCol], 4) : 4;
    const approvalsRequired = approvalCol
      ? String(row[approvalCol]).toLowerCase().includes('true') ||
        String(row[approvalCol]).toLowerCase().includes('yes')
      : false;

    return {
      id: idCol && row[idCol] ? String(row[idCol]).trim() : `TASK-${idx + 1}`,
      name: nameCol && row[nameCol] ? String(row[nameCol]).trim() : `Close Activity #${idx + 1}`,
      owner: ownerCol && row[ownerCol] ? String(row[ownerCol]).trim() : 'Accounting Ops',
      status,
      durationHours: Math.max(0.5, durationHours),
      dueDate: dueCol && row[dueCol] ? String(row[dueCol]).trim() : 'Day +3 Close',
      actualDate: actualCol && row[actualCol] ? String(row[actualCol]).trim() : undefined,
      predecessorIds,
      approvalsRequired,
      rowNumber: idx + 2,
      sourceFileId: fileId,
    };
  });
}

/**
 * Detects circular dependencies in the task graph using Depth-First Search
 */
export function detectCycles(tasks: CloseTask[]): { hasCycle: boolean; cyclePaths: string[] } {
  const adj = new Map<string, string[]>();
  tasks.forEach((t) => adj.set(t.id, []));

  tasks.forEach((t) => {
    t.predecessorIds.forEach((pId) => {
      // predecessor -> task (edge pId -> t.id)
      if (adj.has(pId)) {
        adj.get(pId)!.push(t.id);
      }
    });
  });

  const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  const cyclePaths: string[] = [];

  function dfs(curr: string, path: string[]) {
    visited.set(curr, 1);
    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      if (visited.get(n) === 1) {
        cyclePaths.push([...path, curr, n].join(' → '));
      } else if (!visited.get(n)) {
        dfs(n, [...path, curr]);
      }
    }
    visited.set(curr, 2);
  }

  tasks.forEach((t) => {
    if (!visited.get(t.id)) {
      dfs(t.id, []);
    }
  });

  return {
    hasCycle: cyclePaths.length > 0,
    cyclePaths,
  };
}

/**
 * Critical Path Method (CPM) calculation
 */
export function calculateCPM(tasks: CloseTask[]): {
  tasks: CloseTask[];
  criticalPathTaskIds: string[];
  totalProjectDurationHours: number;
} {
  const taskMap = new Map<string, CloseTask>();
  tasks.forEach((t) => taskMap.set(t.id, { ...t, earlyStart: 0, earlyFinish: 0, lateStart: 0, lateFinish: 0, slack: 0, isCritical: false }));

  const successorsMap = new Map<string, string[]>();
  tasks.forEach((t) => successorsMap.set(t.id, []));

  // Build successors map
  tasks.forEach((t) => {
    t.predecessorIds.forEach((pId) => {
      if (successorsMap.has(pId)) {
        successorsMap.get(pId)!.push(t.id);
      }
    });
  });

  // Forward Pass (Topological or Iterative relaxation)
  let changed = true;
  let iterations = 0;
  const maxIterations = tasks.length * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const task of tasks) {
      const current = taskMap.get(task.id)!;
      let maxPredFinish = 0;

      for (const pId of task.predecessorIds) {
        const pred = taskMap.get(pId);
        if (pred && (pred.earlyFinish || 0) > maxPredFinish) {
          maxPredFinish = pred.earlyFinish || 0;
        }
      }

      const newEF = maxPredFinish + task.durationHours;
      if (current.earlyStart !== maxPredFinish || current.earlyFinish !== newEF) {
        current.earlyStart = maxPredFinish;
        current.earlyFinish = newEF;
        changed = true;
      }
    }
  }

  // Find max project completion time
  let maxProjectDuration = 0;
  taskMap.forEach((t) => {
    if ((t.earlyFinish || 0) > maxProjectDuration) {
      maxProjectDuration = t.earlyFinish || 0;
    }
  });

  // Initialize Late Finish with project max duration
  taskMap.forEach((t) => {
    t.lateFinish = maxProjectDuration;
    t.lateStart = Math.max(0, maxProjectDuration - t.durationHours);
  });

  // Backward Pass
  changed = true;
  iterations = 0;
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const task of tasks) {
      const current = taskMap.get(task.id)!;
      const successors = successorsMap.get(task.id) || [];

      if (successors.length > 0) {
        let minSuccStart = Infinity;
        for (const sId of successors) {
          const succ = taskMap.get(sId);
          if (succ && (succ.lateStart || 0) < minSuccStart) {
            minSuccStart = succ.lateStart || 0;
          }
        }
        if (minSuccStart !== Infinity) {
          const newLF = minSuccStart;
          const newLS = Math.max(0, newLF - task.durationHours);
          if (current.lateFinish !== newLF || current.lateStart !== newLS) {
            current.lateFinish = newLF;
            current.lateStart = newLS;
            changed = true;
          }
        }
      }
    }
  }

  // Calculate Slack and Critical Path
  const criticalPathIds: string[] = [];
  taskMap.forEach((t) => {
    const slack = Math.max(0, (t.lateStart || 0) - (t.earlyStart || 0));
    t.slack = roundFinancial(slack, 1);
    t.isCritical = t.slack <= 0.01;
    if (t.isCritical) {
      criticalPathIds.push(t.id);
    }
  });

  return {
    tasks: Array.from(taskMap.values()),
    criticalPathTaskIds: criticalPathIds,
    totalProjectDurationHours: maxProjectDuration,
  };
}

/**
 * Executes Close Intelligence Engine
 */
export function executeCloseEngine(
  rawTasks: CloseTask[],
  runId = generateId('run_close')
): CloseResult {
  const findings: Finding[] = [];

  // Check cycles
  const cycleAnalysis = detectCycles(rawTasks);

  if (cycleAnalysis.hasCycle) {
    findings.push({
      id: `find_close_cycle_${runId}`,
      runId,
      module: 'close',
      title: 'Circular Dependency Detected in Close Schedule',
      severity: 'critical',
      category: 'dependency_cycle',
      description: `Detected closed loop in task prerequisites: ${cycleAnalysis.cyclePaths.slice(0, 3).join('; ')}. CPM scheduling cannot proceed until circular loop is resolved.`,
      reviewStatus: 'unreviewed',
      evidence: [
        {
          fileId: rawTasks[0]?.sourceFileId || 'tasks',
          fileName: 'Month-End Close Checklist',
          ruleOrCalculationId: 'RULE_CLOSE_CYCLE_DETECTION',
          runId,
        },
      ],
    });

    return {
      runId,
      module: 'close',
      engineVersion: '2.2.0-deterministic',
      totalTasks: rawTasks.length,
      completedTasks: rawTasks.filter((t) => t.status === 'COMPLETED').length,
      inProgressTasks: rawTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      notStartedTasks: rawTasks.filter((t) => t.status === 'NOT_STARTED').length,
      blockedTasksCount: 0,
      completionRatePercent: safePercentage(
        rawTasks.filter((t) => t.status === 'COMPLETED').length,
        rawTasks.length,
        1
      ),
      hasCycles: true,
      cycleDetails: cycleAnalysis.cyclePaths,
      criticalPathTaskIds: [],
      totalProjectDurationHours: 0,
      earliestAchievableFinishHours: 0,
      blockers: [],
      tasks: rawTasks,
      findings,
    };
  }

  // Calculate CPM
  const cpm = calculateCPM(rawTasks);
  const taskMap = new Map<string, CloseTask>();
  cpm.tasks.forEach((t) => taskMap.set(t.id, t));

  // Identify Explicit and Inferred Blockers
  const blockers: BlockerDetail[] = [];
  let blockedTasksCount = 0;

  for (const t of cpm.tasks) {
    if (t.status === 'COMPLETED') continue;

    // Check incomplete predecessors
    for (const pId of t.predecessorIds) {
      const pred = taskMap.get(pId);
      if (pred && pred.status !== 'COMPLETED') {
        const isCritical = t.isCritical || pred.isCritical || false;
        blockedTasksCount++;

        const blocker: BlockerDetail = {
          blockedTaskId: t.id,
          blockedTaskName: t.name,
          predecessorTaskId: pred.id,
          predecessorTaskName: pred.name,
          predecessorStatus: pred.status,
          predecessorOwner: pred.owner,
          isCriticalPath: isCritical,
          slackRemaining: t.slack || 0,
          severity: isCritical ? 'critical' : 'high',
          evidence: {
            fileId: t.sourceFileId,
            fileName: 'Month-End Close Checklist',
            rowNumber: t.rowNumber,
            recordIdentifier: t.id,
            normalizedValues: {
              task: t.id,
              blockedBy: pred.id,
              predStatus: pred.status,
              slack: t.slack,
            },
            ruleOrCalculationId: 'RULE_CLOSE_BLOCKER_IDENTIFICATION',
            runId,
          },
        };
        blockers.push(blocker);

        if (isCritical) {
          findings.push({
            id: `find_close_crit_block_${t.id}_${pred.id}`,
            runId,
            module: 'close',
            title: `Critical Path Blocker: "${pred.name}" blocking "${t.name}"`,
            severity: 'critical',
            category: 'critical_path_blocker',
            description: `Zero-slack critical path task "${t.name}" (${t.owner}) cannot start because predecessor "${pred.name}" (${pred.owner}) is currently ${pred.status}. Directly impacts final financial book sign-off.`,
            reviewStatus: 'unreviewed',
            evidence: [blocker.evidence],
          });
        }
      }
    }
  }

  const completedCount = cpm.tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = cpm.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const notStartedCount = cpm.tasks.filter((t) => t.status === 'NOT_STARTED').length;

  return {
    runId,
    module: 'close',
    engineVersion: '2.2.0-deterministic',
    totalTasks: cpm.tasks.length,
    completedTasks: completedCount,
    inProgressTasks: inProgressCount,
    notStartedTasks: notStartedCount,
    blockedTasksCount,
    completionRatePercent: safePercentage(completedCount, cpm.tasks.length, 1),
    hasCycles: false,
    criticalPathTaskIds: cpm.criticalPathTaskIds,
    totalProjectDurationHours: cpm.totalProjectDurationHours,
    earliestAchievableFinishHours: cpm.totalProjectDurationHours,
    blockers,
    tasks: cpm.tasks,
    findings,
  };
}
