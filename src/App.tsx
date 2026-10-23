import React, { useState, useEffect } from 'react';
import {
  ModuleType,
  ReconResult,
  DecisionResult,
  RiskResult,
  CloseResult,
  Finding,
  AnalysisRunMetadata,
  AuditEvent,
} from './types/index.ts';
import { Header } from './components/Header.tsx';
import { ModuleGrid } from './components/ModuleGrid.tsx';
import { FileUploadZone } from './components/FileUploadZone.tsx';
import { ReconciliationView } from './components/ReconciliationView.tsx';
import { DecisionView } from './components/DecisionView.tsx';
import { RiskView } from './components/RiskView.tsx';
import { CloseView } from './components/CloseView.tsx';
import { ExecutiveControlRoom } from './components/ExecutiveControlRoom.tsx';
import { EvidenceDrawer } from './components/EvidenceDrawer.tsx';
import { ReviewModal } from './components/ReviewModal.tsx';
import { AgentDrawer } from './components/AgentDrawer.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { QuickStatsBanner } from './components/QuickStatsBanner.tsx';
import { AuditLogModal } from './components/AuditLogModal.tsx';
import { DataManagementModal } from './components/DataManagementModal.tsx';
import { ClearConfirmationModal } from './components/ClearConfirmationModal.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { SupportAssistantModal } from './components/SupportAssistantModal.tsx';

import { parseUploadedFile, generateId } from './utils/fileParser.ts';
import {
  getSavedRuns,
  saveRunMetadata,
  getReconResult,
  saveReconResult,
  getDecisionResult,
  saveDecisionResult,
  getRiskResult,
  saveRiskResult,
  getCloseResult,
  saveCloseResult,
  getAllFindings,
  updateFindingReview,
  getAuditEvents,
  logAuditEvent,
  clearModuleData,
  clearPastAnalysisResults,
  purgeDemoData,
} from './utils/storage.ts';

import { normalizeReconRows, executeReconciliation } from './engines/reconciliation.ts';
import { normalizeDecisionRows, executeDecisionEngine } from './engines/decision.ts';
import { normalizeRiskRows, executeRiskEngine } from './engines/risk.ts';
import { normalizeCloseRows, executeCloseEngine } from './engines/close.ts';
import {
  AgentInvestigationResult,
  synthesizeExecutiveBriefing,
  generateReconciliationInvestigation,
  generateDecisionInvestigation,
  generateRiskInvestigation,
  generateCloseInvestigation,
} from './engines/agents.ts';

import { ArrowLeft, Clock, AlertCircle, CheckCircle2, X, Trash2 } from 'lucide-react';

const MODULE_ACCENT: Record<ModuleType, { bg: string; label: string }> = {
  reconciliation: { bg: 'bg-[#FFD629]', label: 'Module 01' },
  decision: { bg: 'bg-[#10B981]', label: 'Module 02' },
  risk: { bg: 'bg-[#FB7185]', label: 'Module 03' },
  close: { bg: 'bg-[#A855F7]', label: 'Module 04' },
};

export default function App() {
  const [activeView, setActiveView] = useState<ModuleType | 'home' | 'executive'>('home');
  const [runs, setRuns] = useState<AnalysisRunMetadata[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // Active module results
  const [reconResult, setReconResult] = useState<ReconResult | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Independent clear & isolation state
  const [moduleToClear, setModuleToClear] = useState<ModuleType | null>(null);
  const [isClearingModule, setIsClearingModule] = useState(false);
  const [clearSuccessMessage, setClearSuccessMessage] = useState<{
    module: ModuleType;
    text: string;
  } | null>(null);
  const processingGenerations = React.useRef<Record<ModuleType, number>>({
    reconciliation: 0,
    decision: 0,
    risk: 0,
    close: 0,
  });

  // Independent document collections per module
  const [moduleFiles, setModuleFiles] = useState<Record<ModuleType, { fileA: File | null; fileB: File | null }>>({
    reconciliation: { fileA: null, fileB: null },
    decision: { fileA: null, fileB: null },
    risk: { fileA: null, fileB: null },
    close: { fileA: null, fileB: null },
  });

  // Modals & Drawers
  const [activeFindingForEvidence, setActiveFindingForEvidence] = useState<Finding | null>(null);
  const [activeFindingForReview, setActiveFindingForReview] = useState<Finding | null>(null);
  const [activeInvestigation, setActiveInvestigation] = useState<AgentInvestigationResult | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Global search keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load initial data on mount (purging any legacy demo/sample datasets)
  useEffect(() => {
    purgeDemoData();
    const savedRuns = getSavedRuns();
    setRuns(savedRuns);

    // Load most recent result for each module if available
    const latestRecon = savedRuns.find((r) => r.module === 'reconciliation');
    if (latestRecon) setReconResult(getReconResult(latestRecon.id));

    const latestDecision = savedRuns.find((r) => r.module === 'decision');
    if (latestDecision) setDecisionResult(getDecisionResult(latestDecision.id));

    const latestRisk = savedRuns.find((r) => r.module === 'risk');
    if (latestRisk) setRiskResult(getRiskResult(latestRisk.id));

    const latestClose = savedRuns.find((r) => r.module === 'close');
    if (latestClose) setCloseResult(getCloseResult(latestClose.id));
  }, []);

  // Compute counts for header pills
  const runCounts: Record<ModuleType, number> = {
    reconciliation: runs.filter((r) => r.module === 'reconciliation').length,
    decision: runs.filter((r) => r.module === 'decision').length,
    risk: runs.filter((r) => r.module === 'risk').length,
    close: runs.filter((r) => r.module === 'close').length,
  };

  // Pipeline execution for uploaded files
  const handleFilesSubmitted = async (files: { fileA: File; fileB?: File }) => {
    if (activeView === 'home' || activeView === 'executive') return;

    const currentGen = ++processingGenerations.current[activeView];
    setClearSuccessMessage(null);
    setIsProcessing(true);
    setErrorMessage(null);
    setModuleFiles((prev) => ({
      ...prev,
      [activeView]: { fileA: files.fileA, fileB: files.fileB || null },
    }));
    const startTime = performance.now();
    const runId = generateId(`run_${activeView}`);

    try {
      // 1. Parse Primary Dataset A
      const parsedA = await parseUploadedFile(files.fileA);

      // Log upload audit
      logAuditEvent({
        actionType: 'FILE_UPLOAD',
        module: activeView,
        runId,
        details: `Uploaded primary file "${files.fileA.name}" (${(files.fileA.size / 1024).toFixed(
          1
        )} KB) with ${parsedA.totalRows} records.`,
      });

      // 2. Parse Secondary Dataset B (if provided)
      let parsedB: any = null;
      if (files.fileB) {
        parsedB = await parseUploadedFile(files.fileB);
        logAuditEvent({
          actionType: 'FILE_UPLOAD',
          module: activeView,
          runId,
          details: `Uploaded comparison file "${files.fileB.name}" (${(files.fileB.size / 1024).toFixed(
            1
          )} KB) with ${parsedB.totalRows} records.`,
        });
      }

      // 3. Dispatch to appropriate deterministic engine
      if (activeView === 'reconciliation') {
        if (!parsedB || !files.fileB) {
          throw new Error('Reconciliation requires two comparable datasets (Source A and Source B).');
        }
        const recordsA = normalizeReconRows(parsedA.rows, parsedA.fileId, parsedA.fileName, 'source_a');
        const recordsB = normalizeReconRows(parsedB.rows, parsedB.fileId, parsedB.fileName, 'source_b');
        const result = executeReconciliation(recordsA, recordsB, undefined, runId);

        saveReconResult(result);
        setReconResult(result);

        const runMeta: AnalysisRunMetadata = {
          id: runId,
          module: 'reconciliation',
          engineVersion: result.engineVersion,
          createdAt: new Date().toISOString(),
          executionTimeMs: Math.round(performance.now() - startTime),
          status: 'success',
          inputFiles: [
            {
              id: parsedA.fileId,
              name: parsedA.fileName,
              size: files.fileA.size,
              type: files.fileA.type,
              uploadedAt: new Date().toISOString(),
              rowCount: parsedA.totalRows,
              detectedFormat: parsedA.format,
              sourceRole: 'source_a',
            },
            {
              id: parsedB.fileId,
              name: parsedB.fileName,
              size: files.fileB.size,
              type: files.fileB.type,
              uploadedAt: new Date().toISOString(),
              rowCount: parsedB.totalRows,
              detectedFormat: parsedB.format,
              sourceRole: 'source_b',
            },
          ],
          findingsCount: {
            critical: result.findings.filter((f) => f.severity === 'critical').length,
            high: result.findings.filter((f) => f.severity === 'high').length,
            medium: result.findings.filter((f) => f.severity === 'medium').length,
            low: result.findings.filter((f) => f.severity === 'low').length,
            total: result.findings.length,
          },
          summary: {
            matchRate: result.reconciliationRatePercent,
            matchedCount: result.matchedCount,
            netVariance: result.netResidualAmount,
          },
        };

        saveRunMetadata(runMeta);
        setRuns((prev) => [runMeta, ...prev.filter((r) => r.id !== runId)]);
        setActiveRunId(runId);

        logAuditEvent({
          actionType: 'ANALYSIS_RUN',
          module: 'reconciliation',
          runId,
          details: `Reconciliation completed: ${result.reconciliationRatePercent}% matched across ${
            result.totalRecordsA + result.totalRecordsB
          } items. ${result.findings.length} finding(s) generated.`,
        });
      } else if (activeView === 'decision') {
        const apps = normalizeDecisionRows(parsedA.rows, parsedA.fileId, parsedA.fileName);
        const result = executeDecisionEngine(apps, undefined, runId);

        saveDecisionResult(result);
        setDecisionResult(result);

        const runMeta: AnalysisRunMetadata = {
          id: runId,
          module: 'decision',
          engineVersion: result.engineVersion,
          createdAt: new Date().toISOString(),
          executionTimeMs: Math.round(performance.now() - startTime),
          status: 'success',
          inputFiles: [
            {
              id: parsedA.fileId,
              name: parsedA.fileName,
              size: files.fileA.size,
              type: files.fileA.type,
              uploadedAt: new Date().toISOString(),
              rowCount: parsedA.totalRows,
              detectedFormat: parsedA.format,
            },
          ],
          findingsCount: {
            critical: result.findings.filter((f) => f.severity === 'critical').length,
            high: result.findings.filter((f) => f.severity === 'high').length,
            medium: result.findings.filter((f) => f.severity === 'medium').length,
            low: result.findings.filter((f) => f.severity === 'low').length,
            total: result.findings.length,
          },
          summary: {
            totalApps: result.totalApplications,
            conflicts: result.conflictingDecisionsCount,
            computedPasses: result.computedPasses,
          },
        };

        saveRunMetadata(runMeta);
        setRuns((prev) => [runMeta, ...prev.filter((r) => r.id !== runId)]);
        setActiveRunId(runId);

        logAuditEvent({
          actionType: 'ANALYSIS_RUN',
          module: 'decision',
          runId,
          details: `Decision auditing completed: ${result.totalApplications} application(s) evaluated. ${result.conflictingDecisionsCount} policy conflict(s) detected.`,
        });
      } else if (activeView === 'risk') {
        const positions = normalizeRiskRows(parsedA.rows, parsedA.fileId, parsedA.fileName, 'TREASURY');
        let secondaryPositions: any[] | undefined = undefined;
        if (parsedB) {
          secondaryPositions = normalizeRiskRows(parsedB.rows, parsedB.fileId, parsedB.fileName, 'ERP_LEDGER');
        }

        const result = executeRiskEngine(positions, secondaryPositions, undefined, runId);
        saveRiskResult(result);
        setRiskResult(result);

        const runMeta: AnalysisRunMetadata = {
          id: runId,
          module: 'risk',
          engineVersion: result.engineVersion,
          createdAt: new Date().toISOString(),
          executionTimeMs: Math.round(performance.now() - startTime),
          status: 'success',
          inputFiles: [
            {
              id: parsedA.fileId,
              name: parsedA.fileName,
              size: files.fileA.size,
              type: files.fileA.type,
              uploadedAt: new Date().toISOString(),
              rowCount: parsedA.totalRows,
              detectedFormat: parsedA.format,
            },
          ],
          findingsCount: {
            critical: result.findings.filter((f) => f.severity === 'critical').length,
            high: result.findings.filter((f) => f.severity === 'high').length,
            medium: result.findings.filter((f) => f.severity === 'medium').length,
            low: result.findings.filter((f) => f.severity === 'low').length,
            total: result.findings.length,
          },
          summary: {
            totalGross: result.totalGrossExposure,
            breaches: result.activeBreachesCount,
            topConcentration: result.topConcentrations[0]?.shareOfTotalPercent || 0,
          },
        };

        saveRunMetadata(runMeta);
        setRuns((prev) => [runMeta, ...prev.filter((r) => r.id !== runId)]);
        setActiveRunId(runId);

        logAuditEvent({
          actionType: 'ANALYSIS_RUN',
          module: 'risk',
          runId,
          details: `Risk monitoring completed: $${result.totalGrossExposure.toLocaleString()} gross exposure analyzed. ${result.activeBreachesCount} limit breach(es).`,
        });
      } else if (activeView === 'close') {
        const tasks = normalizeCloseRows(parsedA.rows, parsedA.fileId, parsedA.fileName);
        const result = executeCloseEngine(tasks, runId);
        saveCloseResult(result);
        setCloseResult(result);

        const runMeta: AnalysisRunMetadata = {
          id: runId,
          module: 'close',
          engineVersion: result.engineVersion,
          createdAt: new Date().toISOString(),
          executionTimeMs: Math.round(performance.now() - startTime),
          status: 'success',
          inputFiles: [
            {
              id: parsedA.fileId,
              name: parsedA.fileName,
              size: files.fileA.size,
              type: files.fileA.type,
              uploadedAt: new Date().toISOString(),
              rowCount: parsedA.totalRows,
              detectedFormat: parsedA.format,
            },
          ],
          findingsCount: {
            critical: result.findings.filter((f) => f.severity === 'critical').length,
            high: result.findings.filter((f) => f.severity === 'high').length,
            medium: result.findings.filter((f) => f.severity === 'medium').length,
            low: result.findings.filter((f) => f.severity === 'low').length,
            total: result.findings.length,
          },
          summary: {
            totalTasks: result.totalTasks,
            completionRate: result.completionRatePercent,
            criticalPathHours: result.totalProjectDurationHours,
          },
        };

        saveRunMetadata(runMeta);
        setRuns((prev) => [runMeta, ...prev.filter((r) => r.id !== runId)]);
        setActiveRunId(runId);

        logAuditEvent({
          actionType: 'ANALYSIS_RUN',
          module: 'close',
          runId,
          details: `Close scheduling completed: ${result.completionRatePercent}% complete. Critical path is ${result.totalProjectDurationHours} hours.`,
        });
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMessage(err.message || 'An error occurred during dataset processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewSubmission = (review: {
    status: 'approved' | 'rejected' | 'flagged';
    reviewer: string;
    notes?: string;
  }) => {
    if (!activeFindingForReview) return;
    updateFindingReview(activeFindingForReview.id, review);

    logAuditEvent({
      actionType: 'FINDING_REVIEWED',
      module: activeFindingForReview.module,
      runId: activeFindingForReview.runId,
      details: `Finding "${activeFindingForReview.title}" was ${review.status.toUpperCase()} by ${review.reviewer}. Reason: ${
        review.notes || 'None provided'
      }.`,
    });

    // Refresh active results findings state
    if (reconResult) {
      const updated = getReconResult(reconResult.runId);
      if (updated) setReconResult(updated);
    }
    if (decisionResult) {
      const updated = getDecisionResult(decisionResult.runId);
      if (updated) setDecisionResult(updated);
    }
    if (riskResult) {
      const updated = getRiskResult(riskResult.runId);
      if (updated) setRiskResult(updated);
    }
    if (closeResult) {
      const updated = getCloseResult(closeResult.runId);
      if (updated) setCloseResult(updated);
    }
  };

  const handleExecuteClearModule = async () => {
    if (!moduleToClear) return;
    setIsClearingModule(true);
    try {
      // Invalidate any ongoing processing jobs for this module
      processingGenerations.current[moduleToClear]++;

      // Safe pause for cancellation
      await new Promise((resolve) => setTimeout(resolve, 300));

      const { moduleName } = clearModuleData(moduleToClear);

      // Reset module files
      setModuleFiles((prev) => ({
        ...prev,
        [moduleToClear]: { fileA: null, fileB: null },
      }));

      // Reset module results
      if (moduleToClear === 'reconciliation') setReconResult(null);
      if (moduleToClear === 'decision') setDecisionResult(null);
      if (moduleToClear === 'risk') setRiskResult(null);
      if (moduleToClear === 'close') setCloseResult(null);

      // Close active drawers if they reference this cleared module
      if (activeFindingForEvidence?.module === moduleToClear) {
        setActiveFindingForEvidence(null);
      }
      if (activeFindingForReview?.module === moduleToClear) {
        setActiveFindingForReview(null);
      }
      if (activeInvestigation && activeInvestigation.agentName.toLowerCase().includes(moduleToClear)) {
        setActiveInvestigation(null);
      }

      const freshRuns = getSavedRuns();
      setRuns(freshRuns);
      if (activeRunId && !freshRuns.some((r) => r.id === activeRunId)) {
        setActiveRunId(null);
      }

      setClearSuccessMessage({
        module: moduleToClear,
        text: 'Workspace cleared. Upload a new file to start fresh.',
      });
      setErrorMessage(null);
      setModuleToClear(null);
    } catch (err: any) {
      console.error('Failed to clear module data:', err);
      setErrorMessage(`Failed to clear module data: ${err.message || 'Unknown error'}`);
    } finally {
      setIsClearingModule(false);
    }
  };

  const handleClearData = (moduleFilter?: ModuleType) => {
    if (moduleFilter) {
      processingGenerations.current[moduleFilter]++;
      clearModuleData(moduleFilter);
      setModuleFiles((prev) => ({
        ...prev,
        [moduleFilter]: { fileA: null, fileB: null },
      }));
    } else {
      (Object.keys(processingGenerations.current) as ModuleType[]).forEach((m) => {
        processingGenerations.current[m]++;
      });
      clearPastAnalysisResults();
      setModuleFiles({
        reconciliation: { fileA: null, fileB: null },
        decision: { fileA: null, fileB: null },
        risk: { fileA: null, fileB: null },
        close: { fileA: null, fileB: null },
      });
    }
    const remainingRuns = getSavedRuns();
    setRuns(remainingRuns);

    if (!moduleFilter || moduleFilter === 'reconciliation') setReconResult(null);
    if (!moduleFilter || moduleFilter === 'decision') setDecisionResult(null);
    if (!moduleFilter || moduleFilter === 'risk') setRiskResult(null);
    if (!moduleFilter || moduleFilter === 'close') setCloseResult(null);
  };

  // Determine current active result payload for export
  const getActiveExportPayload = () => {
    if (activeView === 'reconciliation') return reconResult;
    if (activeView === 'decision') return decisionResult;
    if (activeView === 'risk') return riskResult;
    if (activeView === 'close') return closeResult;
    return {
      briefing: synthesizeExecutiveBriefing(reconResult, decisionResult, riskResult, closeResult, getAllFindings()),
    };
  };

  const hasDataToClear =
    activeView !== 'home' && activeView !== 'executive'
      ? !!moduleFiles[activeView].fileA ||
        !!moduleFiles[activeView].fileB ||
        (activeView === 'reconciliation'
          ? !!reconResult
          : activeView === 'decision'
          ? !!decisionResult
          : activeView === 'risk'
          ? !!riskResult
          : !!closeResult) ||
        runs.some((r) => r.module === activeView)
      : false;

  const currentResultRunId =
    activeView === 'reconciliation'
      ? reconResult?.runId || 'none'
      : activeView === 'decision'
      ? decisionResult?.runId || 'none'
      : activeView === 'risk'
      ? riskResult?.runId || 'none'
      : activeView === 'close'
      ? closeResult?.runId || 'none'
      : 'executive_summary';

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-[#111111] flex flex-col font-sans selection:bg-[#FFD629] selection:text-black">
      {/* Top Header matching reference */}
      <Header
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          setErrorMessage(null);
          setClearSuccessMessage(null);
        }}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenDataManagement={() => setIsDataManagementOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        activeRunCounts={runCounts}
      />

      {/* Main Container */}
      <main className="flex-1">
        {activeView === 'home' && (
          <ModuleGrid
            onSelectModule={(m) => {
              setActiveView(m);
              setErrorMessage(null);
              setClearSuccessMessage(null);
            }}
            activeRunCounts={runCounts}
          />
        )}

        {activeView === 'executive' && (
          <ExecutiveControlRoom
            briefing={synthesizeExecutiveBriefing(
              reconResult,
              decisionResult,
              riskResult,
              closeResult,
              getAllFindings()
            )}
            reconResult={reconResult}
            decisionResult={decisionResult}
            riskResult={riskResult}
            closeResult={closeResult}
            onSelectModule={(m) => {
              setActiveView(m);
              setClearSuccessMessage(null);
            }}
            onOpenEvidence={(f) => setActiveFindingForEvidence(f)}
            onOpenReview={(f) => setActiveFindingForReview(f)}
            onExportDossier={() => setIsExportOpen(true)}
          />
        )}

        {/* Dedicated Department Workspaces */}
        {activeView !== 'home' && activeView !== 'executive' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Workspace Shell Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-neutral-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveView('home');
                    setClearSuccessMessage(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-neutral-100 text-black border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center justify-center shrink-0"
                  aria-label="Return to Overview"
                  title="Return to Overview"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className={`text-[11px] uppercase font-mono px-2.5 py-0.5 rounded-lg border-2 border-black font-black shadow-neo-sm ${MODULE_ACCENT[activeView].bg} text-black`}
                    >
                      {MODULE_ACCENT[activeView].label}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                      {activeView === 'reconciliation'
                        ? 'Reconciliation Intelligence'
                        : activeView === 'decision'
                        ? 'Decision Intelligence'
                        : activeView === 'risk'
                        ? 'Risk & Exposure Intelligence'
                        : 'Close Intelligence'}
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-neutral-700 mt-1">
                    {activeView === 'reconciliation'
                      ? 'Upload bank statements and internal ledgers to isolate discrepancies and unmatched volume.'
                      : activeView === 'decision'
                      ? 'Audit credit underwriting records against deterministic policy rules and flag overrides.'
                      : activeView === 'risk'
                      ? 'Monitor institutional counterparty concentrations, credit limit utilization, and stress scenarios.'
                      : 'Track month-end financial task dependencies, critical paths, and prerequisite bottlenecks.'}
                  </p>
                </div>
              </div>

              {/* Top Bar Actions: Run Selector & Workspace Clear All */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {runs.filter((r) => r.module === activeView).length > 1 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    <select
                      value={currentResultRunId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setActiveRunId(id);
                        if (activeView === 'reconciliation') setReconResult(getReconResult(id));
                        if (activeView === 'decision') setDecisionResult(getDecisionResult(id));
                        if (activeView === 'risk') setRiskResult(getRiskResult(id));
                        if (activeView === 'close') setCloseResult(getCloseResult(id));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs text-black font-mono font-bold focus:outline-none shadow-neo-sm"
                    >
                      {runs
                        .filter((r) => r.module === activeView)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Run {r.id.substring(r.id.length - 8)} ({new Date(r.createdAt).toLocaleTimeString()})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setModuleToClear(activeView)}
                  disabled={isProcessing || isClearingModule || !hasDataToClear}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 border-2 border-black text-rose-700 text-xs font-black transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-rose-700 shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active"
                  title={hasDataToClear ? `Clear all ${activeView} module data and start fresh` : 'No data to clear for this module'}
                  aria-label={`Clear all ${activeView} data`}
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-100 border-2 border-black text-rose-900 text-xs font-bold flex items-center gap-2 shadow-neo-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 stroke-[2.5]" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message Banner upon Module Reset */}
            {clearSuccessMessage && clearSuccessMessage.module === activeView && (
              <div className="p-4 rounded-xl bg-emerald-100 border-2 border-black text-emerald-950 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-neo-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 stroke-[2.5]" />
                  <span>
                    {clearSuccessMessage.text}
                  </span>
                </div>
                <button
                  onClick={() => setClearSuccessMessage(null)}
                  className="text-black hover:bg-black/10 p-1 rounded-lg transition"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            )}

            {/* Quick Stats Performance Banner */}
            <QuickStatsBanner
              module={activeView}
              run={runs.find((r) => r.module === activeView) || null}
              reconResult={reconResult}
              decisionResult={decisionResult}
              riskResult={riskResult}
              closeResult={closeResult}
              onScrollToResults={() => {
                const resultsSection = document.getElementById('module-results-display');
                if (resultsSection) {
                  resultsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {/* Dedicated Workspace File Upload Zone */}
            <FileUploadZone
              module={activeView}
              fileA={moduleFiles[activeView].fileA}
              fileB={moduleFiles[activeView].fileB}
              onFilesUpdated={(updated) => {
                setModuleFiles((prev) => ({
                  ...prev,
                  [activeView]: updated,
                }));
                setClearSuccessMessage(null);
              }}
              onExecutePipeline={handleFilesSubmitted}
              isProcessing={isProcessing}
              hasExistingData={
                (activeView === 'reconciliation' && !!reconResult) ||
                (activeView === 'decision' && !!decisionResult) ||
                (activeView === 'risk' && !!riskResult) ||
                (activeView === 'close' && !!closeResult)
              }
              hasDataToClear={hasDataToClear}
              isClearing={isClearingModule}
              onClearAll={() => setModuleToClear(activeView)}
              onRefresh={() => {
                const current = moduleFiles[activeView];
                if (current.fileA) {
                  handleFilesSubmitted({ fileA: current.fileA, fileB: current.fileB || undefined });
                }
              }}
            />

            {/* Module Calculation Results Display */}
            <div id="module-results-display">
              {activeView === 'reconciliation' && reconResult && (
                <ReconciliationView
                result={reconResult}
                onOpenEvidence={(f) => setActiveFindingForEvidence(f)}
                onOpenReview={(f) => setActiveFindingForReview(f)}
                onOpenAgent={(inv) => setActiveInvestigation(inv)}
                onExport={() => setIsExportOpen(true)}
                onClearAll={() => setModuleToClear(activeView)}
              />
            )}

            {activeView === 'decision' && decisionResult && (
              <DecisionView
                result={decisionResult}
                onOpenEvidence={(f) => setActiveFindingForEvidence(f)}
                onOpenReview={(f) => setActiveFindingForReview(f)}
                onOpenAgent={(inv) => setActiveInvestigation(inv)}
                onExport={() => setIsExportOpen(true)}
                onClearAll={() => setModuleToClear(activeView)}
              />
            )}

            {activeView === 'risk' && riskResult && (
              <RiskView
                result={riskResult}
                onOpenEvidence={(f) => setActiveFindingForEvidence(f)}
                onOpenReview={(f) => setActiveFindingForReview(f)}
                onOpenAgent={(inv) => setActiveInvestigation(inv)}
                onExport={() => setIsExportOpen(true)}
                onClearAll={() => setModuleToClear(activeView)}
              />
            )}

            {activeView === 'close' && closeResult && (
              <CloseView
                result={closeResult}
                onOpenEvidence={(f) => setActiveFindingForEvidence(f)}
                onOpenReview={(f) => setActiveFindingForReview(f)}
                onOpenAgent={(inv) => setActiveInvestigation(inv)}
                onExport={() => setIsExportOpen(true)}
                onClearAll={() => setModuleToClear(activeView)}
              />
            )}
            </div>
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <EvidenceDrawer
        finding={activeFindingForEvidence}
        onClose={() => setActiveFindingForEvidence(null)}
      />

      <ReviewModal
        finding={activeFindingForReview}
        onClose={() => setActiveFindingForReview(null)}
        onSubmitReview={handleReviewSubmission}
      />

      <AgentDrawer
        investigation={activeInvestigation}
        onClose={() => setActiveInvestigation(null)}
      />

      {isExportOpen && (
        <ExportModal
          module={activeView === 'home' ? 'reconciliation' : activeView}
          runId={currentResultRunId}
          dataPayload={getActiveExportPayload()}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {isAuditOpen && (
        <AuditLogModal
          events={getAuditEvents()}
          onClose={() => setIsAuditOpen(false)}
        />
      )}

      {isDataManagementOpen && (
        <DataManagementModal
          totalRunsCount={runs.length}
          onClose={() => setIsDataManagementOpen(false)}
          onClearData={handleClearData}
        />
      )}

      {/* Module Clear Confirmation Modal */}
      <ClearConfirmationModal
        isOpen={!!moduleToClear}
        module={moduleToClear}
        isClearing={isClearingModule}
        onConfirm={handleExecuteClearModule}
        onCancel={() => setModuleToClear(null)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectModule={(m) => {
          setActiveView(m);
          setIsSearchOpen(false);
        }}
        onOpenAudit={() => {
          setIsSearchOpen(false);
          setIsAuditOpen(true);
        }}
        onOpenSettings={() => {
          setIsSearchOpen(false);
          setIsDataManagementOpen(true);
        }}
        onOpenFinding={(f) => {
          setIsSearchOpen(false);
          setActiveFindingForEvidence(f);
        }}
        activeFindings={getAllFindings()}
      />

      {/* Gemini In-App Support Assistant Modal */}
      <SupportAssistantModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        activeModule={activeView}
        hasActiveResults={!!currentResultRunId && currentResultRunId !== 'none'}
      />
    </div>
  );
}
