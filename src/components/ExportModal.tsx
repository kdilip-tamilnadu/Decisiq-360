import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Printer,
  Check,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { ModuleType } from '../types/index.ts';
import { generateStakeholderPDFReport } from '../utils/pdfGenerator.ts';

interface ExportModalProps {
  module: ModuleType | 'executive';
  runId: string;
  dataPayload: any;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  module,
  runId,
  dataPayload,
  onClose,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await generateStakeholderPDFReport({
        module,
        runId,
        dataPayload,
      });
      setDownloadSuccess('PDF Report generated and downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert(`Could not generate PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadJSON = () => {
    const jsonStr = JSON.stringify(dataPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisiq360_${module}_${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('JSON Audit Dossier downloaded.');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const downloadCSV = () => {
    let csvContent = '';

    if (module === 'reconciliation' && dataPayload.matches) {
      csvContent =
        'Status,SourceA_ID,SourceA_Amount,SourceA_Ref,SourceB_ID,SourceB_Amount,SourceB_Ref,AmountDiff,DateDiffDays\n';
      dataPayload.matches.forEach((m: any) => {
        csvContent += `"${m.status}","${m.recordA?.transactionId || ''}",${m.recordA?.amount || 0},"${
          m.recordA?.reference || ''
        }","${m.recordB?.transactionId || ''}",${m.recordB?.amount || 0},"${
          m.recordB?.reference || ''
        }",${m.amountDifference},${m.dateDifferenceDays}\n`;
      });
    } else if (module === 'decision' && dataPayload.evaluations) {
      csvContent =
        'ApplicationID,ApplicantName,RequestedAmount,GrossIncome,MonthlyDebt,DTI,CreditScore,RecordedOutcome,ComputedOutcome,Matches\n';
      dataPayload.evaluations.forEach((ev: any) => {
        csvContent += `"${ev.application.id}","${ev.application.applicantName}",${
          ev.application.requestedAmount
        },${ev.application.grossMonthlyIncome},${ev.application.monthlyDebtObligations},${
          ev.computedDTI
        },${ev.application.creditScore},"${ev.application.recordedOutcome}","${
          ev.computedOutcome
        }",${ev.outcomeMatchesRecorded}\n`;
      });
    } else if (module === 'risk' && dataPayload.positions) {
      csvContent =
        'PositionID,Counterparty,Instrument,ExposureAmount,Currency,ConfiguredLimit,NetExposure\n';
      dataPayload.positions.forEach((p: any) => {
        csvContent += `"${p.positionId}","${p.counterparty}","${p.instrument}",${
          p.exposureAmount
        },"${p.currency}",${p.configuredLimit || 0},${p.netExposureAmount || 0}\n`;
      });
    } else if (module === 'close' && dataPayload.tasks) {
      csvContent =
        'TaskID,Name,Owner,Status,DurationHours,EarlyStart,EarlyFinish,LateStart,LateFinish,Slack,IsCritical\n';
      dataPayload.tasks.forEach((t: any) => {
        csvContent += `"${t.id}","${t.name}","${t.owner}","${t.status}",${t.durationHours},${
          t.earlyStart || 0
        },${t.earlyFinish || 0},${t.lateStart || 0},${t.lateFinish || 0},${t.slack || 0},${
          t.isCritical || false
        }\n`;
      });
    } else {
      csvContent = JSON.stringify(dataPayload);
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisiq360_${module}_${runId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('CSV Report downloaded.');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const printReport = () => {
    window.print();
  };

  const findingsCount = dataPayload.findings ? dataPayload.findings.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-base font-black text-black">Export Stakeholder Dossier</h3>
              <p className="text-[11px] text-neutral-600 font-mono font-bold">
                Decisiq 360 • {module.toUpperCase()} • Run {runId.substring(0, 10)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-100 border-2 border-black text-emerald-950 text-xs font-black flex items-center gap-2 shadow-neo-sm">
            <Check className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.5]" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Stakeholder PDF Highlight Banner */}
        <div className="mt-5 p-5 rounded-2xl bg-[#FFD629] border-2 border-black shadow-neo">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-black bg-white text-black text-[10px] font-black uppercase tracking-wider mb-2 shadow-neo-sm">
                <Sparkles className="w-3 h-3 stroke-[2.5]" />
                Stakeholder PDF Report
              </div>
              <h4 className="text-sm font-black text-black">
                Formatted Executive Report ({module.toUpperCase()})
              </h4>
              <p className="text-xs text-neutral-900 font-semibold mt-1">
                Includes Decisiq 360 branding, KPI metrics, material findings table ({findingsCount} exceptions), and verified evidence proof.
              </p>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 disabled:opacity-50 text-black text-xs font-black transition border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Other Export Formats */}
        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-black">
            Raw Data & System Exports
          </p>

          <button
            onClick={downloadCSV}
            className="w-full p-3.5 rounded-xl bg-[#FFFDF8] hover:bg-yellow-50/50 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981] border border-black flex items-center justify-center text-black shadow-neo-sm">
                <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-black text-black">Structured CSV Report</p>
                <p className="text-[11px] text-neutral-700 font-semibold">
                  Tabular financial rows with calculated variances and flags
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-black stroke-[2.5]" />
          </button>

          <button
            onClick={downloadJSON}
            className="w-full p-3.5 rounded-xl bg-[#FFFDF8] hover:bg-yellow-50/50 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FB7185] border border-black flex items-center justify-center text-black shadow-neo-sm">
                <FileJson className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-black text-black">Full JSON Audit Dossier</p>
                <p className="text-[11px] text-neutral-700 font-semibold">
                  Complete machine-readable payload with full row evidence references
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-black stroke-[2.5]" />
          </button>

          <button
            onClick={printReport}
            className="w-full p-3.5 rounded-xl bg-[#FFFDF8] hover:bg-yellow-50/50 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-black flex items-center justify-center text-black shadow-neo-sm">
                <Printer className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-black text-black">System Print Dialog</p>
                <p className="text-[11px] text-neutral-700 font-semibold">Print or save as local system PDF</p>
              </div>
            </div>
            <Printer className="w-4 h-4 text-black stroke-[2.5]" />
          </button>
        </div>

        {/* Hidden styled report DOM element for visual html2canvas capture if needed */}
        <div className="hidden">
          <div
            ref={reportRef}
            className="p-8 bg-white text-black font-sans max-w-3xl border-2 border-black"
          >
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-black">Decisiq 360</h1>
                <p className="text-xs text-neutral-700 font-bold">Financial Decision Intelligence Report</p>
              </div>
              <div className="text-right text-xs font-mono font-bold text-neutral-700">
                <p>RUN ID: {runId}</p>
                <p>{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <h2 className="text-lg font-black text-black mb-2 capitalize">{module} Summary</h2>
            <div className="border-2 border-black rounded-xl p-4 text-xs font-bold">
              <p>Total Findings: {findingsCount}</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t-2 border-black mt-6 flex items-center justify-between text-[11px] text-neutral-700 font-bold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            Stakeholder-grade deterministic audit export
          </span>
          <span className="font-mono">Decisiq 360 PDF v1.0</span>
        </div>
      </div>
    </div>
  );
};
