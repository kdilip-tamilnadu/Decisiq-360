import React, { useState } from 'react';
import {
  CalendarClock,
  Sparkles,
  Download,
  CheckCircle2,
  Ban,
  Workflow,
  Trash2,
} from 'lucide-react';
import { CloseResult, Finding } from '../types/index.ts';
import { formatPercent } from '../utils/decimal.ts';
import { generateCloseInvestigation, AgentInvestigationResult } from '../engines/agents.ts';

interface CloseViewProps {
  result: CloseResult;
  onOpenEvidence: (finding: Finding) => void;
  onOpenReview: (finding: Finding) => void;
  onOpenAgent: (investigation: AgentInvestigationResult) => void;
  onExport: () => void;
  onClearAll?: () => void;
}

export const CloseView: React.FC<CloseViewProps> = ({
  result,
  onOpenEvidence: _onOpenEvidence,
  onOpenReview,
  onOpenAgent,
  onExport,
  onClearAll,
}) => {
  const [activeTab, setActiveTab] = useState<'critical_path' | 'blockers' | 'all_tasks'>('critical_path');

  const handleOpenAgent = () => {
    const investigation = generateCloseInvestigation(result);
    onOpenAgent(investigation);
  };

  return (
    <div className="space-y-6">
      {/* Cycle Detection Warning Banner if circular dependency exists */}
      {result.hasCycles && (
        <div className="p-4 rounded-2xl bg-rose-100 border-2 border-black text-rose-950 flex items-start gap-3 shadow-neo-sm">
          <Ban className="w-5 h-5 text-rose-700 shrink-0 mt-0.5 stroke-[2.5]" />
          <div>
            <h4 className="text-sm font-black text-black">
              Circular Dependency Detected — Scheduling Paused
            </h4>
            <p className="text-xs text-neutral-800 font-semibold mt-1">
              The uploaded task sequence contains circular prerequisite loops:
            </p>
            <div className="mt-2 text-xs font-mono bg-white border border-black p-2 rounded-lg text-rose-700 font-bold shadow-neo-sm">
              {result.cycleDetails?.join(' | ')}
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Completion Rate
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {formatPercent(result.completionRatePercent, 1)}
          </span>
          <span className="text-[11px] text-emerald-700 font-mono font-bold mt-0.5 block">
            {result.completedTasks} of {result.totalTasks} tasks
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Critical Path Hours
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {result.totalProjectDurationHours} hrs
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Earliest close cycle
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Critical Path Tasks
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-700 mt-1 block">
            {result.criticalPathTaskIds.length}
          </span>
          <span className="text-[11px] text-purple-800 font-mono font-bold mt-0.5 block">
            Zero slack tolerance
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Active Blockers
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {result.blockers.length}
          </span>
          <span className="text-[11px] text-rose-800 font-mono font-bold mt-0.5 block">
            Unfinished dependencies
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            In Progress
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-700 mt-1 block">
            {result.inProgressTasks}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Currently running
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-neo-sm">
          <span className="text-[10px] uppercase font-black text-neutral-600 block tracking-wider font-mono">
            Not Started
          </span>
          <span className="text-xl sm:text-2xl font-black text-black mt-1 block">
            {result.notStartedTasks}
          </span>
          <span className="text-[11px] text-neutral-600 font-mono font-bold mt-0.5 block">
            Queued in pipeline
          </span>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-black shadow-neo-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('critical_path')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'critical_path'
                ? 'bg-[#A855F7] text-white border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Critical Path ({result.criticalPathTaskIds.length})
          </button>
          <button
            onClick={() => setActiveTab('blockers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'blockers'
                ? 'bg-[#FB7185] text-black border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Blockers ({result.blockers.length})
          </button>
          <button
            onClick={() => setActiveTab('all_tasks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'all_tasks'
                ? 'bg-neutral-900 text-white border border-black shadow-neo-sm'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            All Close Tasks ({result.tasks.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAgent}
            className="px-3.5 py-1.5 rounded-xl bg-[#A855F7] hover:bg-[#c084fc] border-2 border-black text-white text-xs font-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            AI Close Specialist
          </button>
          <button
            onClick={onExport}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition flex items-center gap-1.5 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Export
          </button>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 border-2 border-black text-rose-700 text-xs font-black transition flex items-center gap-1.5 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
              title="Clear all module data and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Tab: Critical Path Timeline */}
      {activeTab === 'critical_path' && (
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-black text-black flex items-center gap-2">
                <Workflow className="w-4 h-4 text-black stroke-[2.5]" />
                Zero-Slack Critical Path Sequence
              </h3>
              <p className="text-xs text-neutral-700 font-semibold mt-0.5">
                Any delay in these tasks pushes back the organization's final books closure date.
              </p>
            </div>
            <span className="text-xs font-mono font-black text-black bg-[#FFD629] border border-black px-3 py-1 rounded-lg shadow-neo-sm">
              Total Duration: {result.totalProjectDurationHours} Hours
            </span>
          </div>

          <div className="space-y-3">
            {result.tasks
              .filter((t) => t.isCritical)
              .map((task, idx) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#A855F7] border border-black text-white text-xs font-mono font-black flex items-center justify-center shrink-0 shadow-neo-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-black">{task.name}</span>
                        <span className="text-[10px] font-mono text-black font-bold bg-white border border-black px-1.5 py-0.2 rounded shadow-neo-sm">
                          {task.id}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                            task.status === 'COMPLETED'
                              ? 'bg-[#10B981] text-black'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-[#FFD629] text-black'
                              : task.status === 'BLOCKED'
                              ? 'bg-[#FB7185] text-black'
                              : 'bg-neutral-100 text-black'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-700 font-semibold mt-1 flex items-center gap-3 flex-wrap">
                        <span>Lead: <strong className="text-black font-black">{task.owner}</strong></span>
                        <span>•</span>
                        <span>Duration: <strong className="text-black font-black">{task.durationHours}h</strong></span>
                        <span>•</span>
                        <span>Due: {task.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-neutral-700 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 font-black uppercase block">Schedule</span>
                      <span className="font-bold text-black">
                        T+{task.earlyStart}h → T+{task.earlyFinish}h
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-purple-700 font-black uppercase block">Slack</span>
                      <span className="text-purple-700 font-black">0.0h</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Blockers */}
      {activeTab === 'blockers' && (
        <div className="space-y-3">
          {result.blockers.length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-black rounded-2xl text-neutral-700 text-xs font-semibold shadow-neo-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2 stroke-[2.5]" />
              No active task blockers. Downstream prerequisites are satisfied.
            </div>
          ) : (
            result.blockers.map((b, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 border-black shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  b.isCriticalPath ? 'bg-rose-50' : 'bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-neo-sm ${
                        b.isCriticalPath
                          ? 'bg-[#FB7185] text-black'
                          : 'bg-[#FFD629] text-black'
                      }`}
                    >
                      {b.isCriticalPath ? 'Critical Path Blocker' : 'Prerequisite Blocker'}
                    </span>
                    <span className="text-xs font-black text-black">
                      Task &ldquo;{b.blockedTaskName}&rdquo; is stuck
                    </span>
                  </div>
                  <p className="text-xs text-neutral-800 font-semibold">
                    Cannot begin because predecessor <strong>&ldquo;{b.predecessorTaskName}&rdquo;</strong> assigned to{' '}
                    <strong>{b.predecessorOwner}</strong> is currently <strong>{b.predecessorStatus}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const f = result.findings.find((item) =>
                        item.title.includes(b.predecessorTaskName)
                      ) || {
                        id: `find_blocker_${b.blockedTaskId}`,
                        runId: result.runId,
                        module: 'close',
                        title: `Blocker: ${b.predecessorTaskName}`,
                        severity: b.isCriticalPath ? 'critical' : 'high',
                        category: 'task_blocker',
                        description: `Task ${b.blockedTaskName} blocked by ${b.predecessorTaskName}.`,
                        evidence: [b.evidence],
                        reviewStatus: 'unreviewed',
                      };
                      onOpenReview(f as Finding);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] border-2 border-black text-black text-xs font-black transition shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                  >
                    Expedite Blocker
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: All Tasks CPM Table */}
      {activeTab === 'all_tasks' && (
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-neo">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#FFFDF8] border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Early Start / Finish</th>
                  <th className="py-3 px-4">Late Start / Finish</th>
                  <th className="py-3 px-4">Total Slack</th>
                  <th className="py-3 px-4 text-right">Predecessors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-black">
                {result.tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-yellow-50/50 transition">
                    <td className="py-3.5 px-4 font-black text-black">
                      <div>{task.name}</div>
                      <div className="text-[10px] text-neutral-600 font-sans font-semibold">ID: {task.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase shadow-neo-sm ${
                          task.status === 'COMPLETED'
                            ? 'bg-[#10B981] text-black'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-[#FFD629] text-black'
                            : task.status === 'BLOCKED'
                            ? 'bg-[#FB7185] text-black'
                            : 'bg-neutral-100 text-black'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{task.owner}</td>
                    <td className="py-3.5 px-4 font-black">{task.durationHours}h</td>
                    <td className="py-3.5 px-4 text-neutral-700 font-bold">
                      {task.earlyStart}h → {task.earlyFinish}h
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700 font-bold">
                      {task.lateStart}h → {task.lateFinish}h
                    </td>
                    <td className="py-3.5 px-4">
                      {task.isCritical ? (
                        <span className="text-purple-700 font-black">0.0h (Critical)</span>
                      ) : (
                        <span className="text-neutral-700 font-bold">{task.slack}h</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-neutral-700 font-bold">
                      {task.predecessorIds.length > 0 ? task.predecessorIds.join(', ') : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
