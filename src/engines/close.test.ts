import test from 'node:test';
import assert from 'node:assert/strict';
import { executeCloseEngine, detectCycles, calculateCPM } from './close.ts';
import type { CloseTask } from '../types/index.ts';

test('Close Engine: CPM calculations with serial and parallel tasks', () => {
  // A (4h) -> B (6h) -> D (2h) [Total path 12h]
  // A (4h) -> C (3h) -> D (2h) [Path 9h, Slack on C is 3h]
  const tasks: CloseTask[] = [
    {
      id: 'T-A',
      name: 'Bank Feeds Ingestion',
      owner: 'Alice',
      status: 'COMPLETED',
      durationHours: 4,
      dueDate: 'Day +1',
      predecessorIds: [],
      approvalsRequired: false,
      rowNumber: 2,
      sourceFileId: 'f1',
    },
    {
      id: 'T-B',
      name: 'Sub-ledger Reconciliation',
      owner: 'Bob',
      status: 'IN_PROGRESS',
      durationHours: 6,
      dueDate: 'Day +2',
      predecessorIds: ['T-A'],
      approvalsRequired: false,
      rowNumber: 3,
      sourceFileId: 'f1',
    },
    {
      id: 'T-C',
      name: 'Fixed Asset Depreciation Run',
      owner: 'Charlie',
      status: 'NOT_STARTED',
      durationHours: 3,
      dueDate: 'Day +2',
      predecessorIds: ['T-A'],
      approvalsRequired: false,
      rowNumber: 4,
      sourceFileId: 'f1',
    },
    {
      id: 'T-D',
      name: 'Trial Balance Sign-off',
      owner: 'Diana',
      status: 'NOT_STARTED',
      durationHours: 2,
      dueDate: 'Day +3',
      predecessorIds: ['T-B', 'T-C'],
      approvalsRequired: true,
      rowNumber: 5,
      sourceFileId: 'f1',
    },
  ];

  const result = executeCloseEngine(tasks);

  assert.equal(result.hasCycles, false);
  assert.equal(result.totalProjectDurationHours, 12);
  // Critical path should be T-A, T-B, T-D (12 hours)
  assert.ok(result.criticalPathTaskIds.includes('T-A'));
  assert.ok(result.criticalPathTaskIds.includes('T-B'));
  assert.ok(result.criticalPathTaskIds.includes('T-D'));
  assert.equal(result.criticalPathTaskIds.includes('T-C'), false);

  // Blocker check: T-D is blocked by T-B (in progress) and T-C (not started)
  assert.ok(result.blockers.some((b) => b.blockedTaskId === 'T-D' && b.predecessorTaskId === 'T-B'));
});

test('Close Engine: Circular dependency detection prevents invalid CPM', () => {
  // A -> B -> C -> A (cycle!)
  const cyclicTasks: CloseTask[] = [
    {
      id: 'T-1',
      name: 'Task 1',
      owner: 'Alice',
      status: 'NOT_STARTED',
      durationHours: 4,
      dueDate: 'Day +1',
      predecessorIds: ['T-3'],
      approvalsRequired: false,
      rowNumber: 2,
      sourceFileId: 'f1',
    },
    {
      id: 'T-2',
      name: 'Task 2',
      owner: 'Bob',
      status: 'NOT_STARTED',
      durationHours: 4,
      dueDate: 'Day +1',
      predecessorIds: ['T-1'],
      approvalsRequired: false,
      rowNumber: 3,
      sourceFileId: 'f1',
    },
    {
      id: 'T-3',
      name: 'Task 3',
      owner: 'Charlie',
      status: 'NOT_STARTED',
      durationHours: 4,
      dueDate: 'Day +1',
      predecessorIds: ['T-2'],
      approvalsRequired: false,
      rowNumber: 4,
      sourceFileId: 'f1',
    },
  ];

  const result = executeCloseEngine(cyclicTasks);

  assert.equal(result.hasCycles, true);
  assert.ok(result.cycleDetails && result.cycleDetails.length > 0);
  assert.equal(result.criticalPathTaskIds.length, 0);
  assert.ok(result.findings.some((f) => f.category === 'dependency_cycle'));
});
