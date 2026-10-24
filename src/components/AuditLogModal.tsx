import React, { useState } from 'react';
import {
  X,
  ScrollText,
  Download,
  ShieldCheck,
  Search,
  Activity,
  Clock,
  HardDrive,
  Zap,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import { AuditEvent } from '../types/index.ts';
import { calculateStorageBreakdown, formatBytes } from '../utils/performance.ts';

interface AuditLogModalProps {
  events: AuditEvent[];
  onClose: () => void;
  onOpenSystemHealth?: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  events,
  onClose,
  onOpenSystemHealth,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const performanceEvents = events.filter(
    (ev) =>
      ev.performance?.executionTimeMs !== undefined ||
      ev.actionType === 'PERFORMANCE_BENCHMARK' ||
      ev.actionType === 'PERFORMANCE_ALERT'
  );

  const alertEvents = events.filter(
    (ev) => ev.actionType === 'PERFORMANCE_ALERT' || ev.performance?.isAlert
  );
  const alertCount = alertEvents.length;

  const avgExecutionMs =
    performanceEvents.length > 0
      ? Math.round(
          performanceEvents.reduce((acc, ev) => acc + (ev.performance?.executionTimeMs || 0), 0) /
            performanceEvents.length
        )
      : 0;

  const storageStats = calculateStorageBreakdown();

  const filtered = events.filter((ev) => {
    if (filterType === 'PERFORMANCE') {
      if (
        !ev.performance?.executionTimeMs &&
        ev.actionType !== 'PERFORMANCE_BENCHMARK' &&
        ev.actionType !== 'PERFORMANCE_ALERT'
      ) {
        return false;
      }
    } else if (filterType === 'PERFORMANCE_ALERT') {
      if (ev.actionType !== 'PERFORMANCE_ALERT' && !ev.performance?.isAlert) {
        return false;
      }
    } else if (filterType !== 'ALL' && ev.actionType !== filterType) {
      return false;
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        ev.details.toLowerCase().includes(q) ||
        (ev.module && ev.module.toLowerCase().includes(q)) ||
        ev.actionType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportAuditLog = () => {
    const jsonStr = JSON.stringify(events, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisiq360_audit_trail_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm">
              <ScrollText className="w-4 h-4 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-base font-black text-black">Immutable System Audit Trail & Performance Telemetry</h3>
              <p className="text-[11px] font-semibold text-neutral-600 mt-0.5">
                Every calculation run, parameter update, user review, and execution benchmark is logged permanently.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Performance & Memory Telemetry Ribbon */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#FFFDF8] border-2 border-black shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
              <span className="text-[11px] font-bold text-neutral-600 uppercase">Avg Latency:</span>
              <strong className="text-black font-black text-sm">{avgExecutionMs > 0 ? `${avgExecutionMs} ms` : 'Nominal (<40ms)'}</strong>
            </div>

            <span className="hidden sm:inline text-neutral-300">•</span>

            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-neutral-700 stroke-[2.2]" />
              <span className="text-[11px] font-bold text-neutral-600 uppercase">Total Memory Impact:</span>
              <strong className="text-black font-black text-sm">{storageStats.totalFormatted}</strong>
            </div>

            <span className="hidden sm:inline text-neutral-300">•</span>

            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-neutral-700 stroke-[2.2]" />
              <span className="text-[11px] font-bold text-neutral-600 uppercase">Profiled Runs:</span>
              <strong className="text-black font-black text-sm">{performanceEvents.length}</strong>
            </div>

            {alertCount > 0 && (
              <>
                <span className="hidden sm:inline text-neutral-300">•</span>
                <button
                  onClick={() => setFilterType(filterType === 'PERFORMANCE_ALERT' ? 'ALL' : 'PERFORMANCE_ALERT')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm transition ${
                    filterType === 'PERFORMANCE_ALERT'
                      ? 'bg-[#F59E0B] text-black font-black'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold'
                  }`}
                  title="Filter to Performance Alerts"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-800 stroke-[2.5] animate-bounce" />
                  <span className="text-[11px] uppercase">Alerts:</span>
                  <strong className="text-black font-black text-xs px-1 rounded bg-white/70 border border-black">
                    {alertCount}
                  </strong>
                </button>
              </>
            )}
          </div>

          {onOpenSystemHealth && (
            <button
              onClick={onOpenSystemHealth}
              className="px-3 py-1.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] text-black text-xs font-black transition border border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>System Health Panel</span>
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 stroke-[2.5]" />
              <input
                type="text"
                placeholder="Search audit actions & metrics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black placeholder-neutral-500 focus:outline-none shadow-neo-sm"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black focus:outline-none shadow-neo-sm"
            >
              <option value="ALL">All Actions</option>
              <option value="PERFORMANCE_ALERT">Performance Alerts Only ⚠️</option>
              <option value="PERFORMANCE">All Performance & Latency</option>
              <option value="ANALYSIS_RUN">Analysis Run</option>
              <option value="PERFORMANCE_BENCHMARK">Diagnostics Benchmark</option>
              <option value="FILE_UPLOAD">File Upload</option>
              <option value="FINDING_REVIEWED">Human Review</option>
              <option value="SCENARIO_EXECUTED">Scenario</option>
              <option value="DATA_CLEARED">Data Clear</option>
            </select>
          </div>

          <button
            onClick={exportAuditLog}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black transition flex items-center gap-1.5 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active shrink-0"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Export Audit Trail (JSON)
          </button>
        </div>

        {/* Audit Event List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-neutral-600 font-semibold text-xs bg-[#FFFDF8] border-2 border-black rounded-xl">
              No audit events matching criteria found. Actions are logged automatically as you use the application.
            </div>
          ) : (
            filtered.map((ev) => (
              <div
                key={ev.id}
                className={`p-3.5 rounded-xl border-2 border-black text-xs font-mono shadow-neo-sm space-y-2 ${
                  ev.actionType === 'PERFORMANCE_ALERT'
                    ? 'bg-[#FEF3C7] border-amber-950'
                    : 'bg-[#FFFDF8]'
                }`}
              >
                <div className="flex items-center justify-between text-neutral-700 flex-wrap gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ev.actionType === 'PERFORMANCE_ALERT' ? (
                      <span className="px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase bg-[#F59E0B] text-black shadow-neo-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                        PERFORMANCE ALERT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase bg-[#FFD629] text-black shadow-neo-sm">
                        {ev.actionType}
                      </span>
                    )}
                    {ev.module && (
                      <span className="text-[10px] font-bold text-black uppercase bg-white border border-black px-1.5 py-0.5 rounded shadow-neo-sm">
                        [{ev.module}]
                      </span>
                    )}
                    {ev.runId && (
                      <span className="text-[10px] text-neutral-500 font-bold">
                        #{ev.runId.substring(0, 16)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-600 font-bold">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-black font-sans text-xs font-semibold">{ev.details}</div>

                {/* Performance & Memory Metrics Display */}
                {ev.performance && (
                  <div className="pt-2 border-t border-neutral-200/80 flex items-center gap-2 flex-wrap text-[11px]">
                    {ev.performance.executionTimeMs !== undefined && (
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-black font-black text-black shadow-neo-sm flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-600 stroke-[2.2]" />
                        <span>Execution: <strong>{ev.performance.executionTimeMs} ms</strong></span>
                      </span>
                    )}

                    {(ev.performance.percentileThresholdMs !== undefined || ev.metadata?.p95ThresholdMs !== undefined) && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-200 border border-black font-black text-amber-950 shadow-neo-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-800 stroke-[2.2]" />
                        <span>P95 Threshold: <strong>{ev.performance.percentileThresholdMs || ev.metadata?.p95ThresholdMs} ms</strong></span>
                      </span>
                    )}

                    {ev.performance.memoryImpactFormatted && (
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-black font-black text-black shadow-neo-sm flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-neutral-600 stroke-[2.2]" />
                        <span>Memory: <strong>{ev.performance.memoryImpactFormatted}</strong></span>
                      </span>
                    )}

                    {ev.performance.throughputRowsPerSec !== undefined && ev.performance.throughputRowsPerSec > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-black font-black text-emerald-950 shadow-neo-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-700 stroke-[2.2]" />
                        <span>{ev.performance.throughputRowsPerSec.toLocaleString()} rows/s</span>
                      </span>
                    )}

                    {ev.performance.engineStatus && (
                      <span className={`px-2 py-0.5 rounded-lg border border-black text-[10px] font-black uppercase shadow-neo-sm ${
                        ev.actionType === 'PERFORMANCE_ALERT'
                          ? 'bg-[#F59E0B] text-black'
                          : ev.performance.engineStatus === 'OPTIMAL'
                          ? 'bg-[#10B981] text-black'
                          : 'bg-[#FFD629] text-black'
                      }`}>
                        {ev.actionType === 'PERFORMANCE_ALERT' ? 'P95 EXCEEDED' : ev.performance.engineStatus}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t-2 border-black mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-700 font-bold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            Append-only tamper-evident local audit log with execution profiling
          </span>
          <span className="font-mono">{filtered.length} of {events.length} events</span>
        </div>
      </div>
    </div>
  );
};
