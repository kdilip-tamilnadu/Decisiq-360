import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Flag, ShieldCheck } from 'lucide-react';
import { Finding } from '../types/index.ts';

interface ReviewModalProps {
  finding: Finding | null;
  onClose: () => void;
  onSubmitReview: (review: {
    status: 'approved' | 'rejected' | 'flagged';
    reviewer: string;
    notes?: string;
  }) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  finding,
  onClose,
  onSubmitReview,
}) => {
  if (!finding) return null;

  const [status, setStatus] = useState<'approved' | 'rejected' | 'flagged'>(
    finding.reviewStatus === 'unreviewed' ? 'approved' : (finding.reviewStatus as any)
  );
  const [reviewer, setReviewer] = useState('Chief Risk Officer');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReview({
      status,
      reviewer: reviewer.trim() || 'Executive Decision Maker',
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border-2 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FFD629] border border-black flex items-center justify-center text-black shadow-neo-sm">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h3 className="text-base font-black text-black">Controlled Human Review & Sign-Off</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-black bg-white hover:bg-neutral-100 text-black shadow-neo-sm transition"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Item being reviewed */}
        <div className="mt-4 p-4 rounded-xl bg-[#FFFDF8] border-2 border-black text-xs shadow-neo-sm">
          <p className="text-neutral-600 uppercase tracking-wider text-[10px] font-mono font-black">
            Target Finding
          </p>
          <p className="text-sm font-black text-black mt-0.5">{finding.title}</p>
          <p className="text-neutral-800 font-semibold mt-1 line-clamp-2">{finding.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-black text-black mb-2">
              Decision Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-neo-sm ${
                  status === 'approved'
                    ? 'bg-[#10B981] text-black shadow-neo'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setStatus('flagged')}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-neo-sm ${
                  status === 'flagged'
                    ? 'bg-[#FFD629] text-black shadow-neo'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Flag className="w-3.5 h-3.5 stroke-[2.5]" />
                Flag
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-neo-sm ${
                  status === 'rejected'
                    ? 'bg-[#FB7185] text-black shadow-neo'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Authorized Reviewer Title / Role
            </label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold focus:outline-none shadow-neo-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Resolution Rationale / Audit Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reviewed bank statement clearing advice and confirmed valid settlement timing difference..."
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-semibold focus:outline-none shadow-neo-sm resize-none"
            />
          </div>

          <div className="pt-3 border-t-2 border-black flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black border-2 border-black shadow-neo-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#FFD629] hover:bg-[#ffe066] text-black text-xs font-black border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active transition-all"
            >
              Record Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
