import React, { useState } from 'react';
import { Submission } from '../../api/mockApi';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ZoomIn,
  Ticket,
  Mail,
  Phone,
  User,
  Clock,
  Loader2,
} from 'lucide-react';

interface DetailPanelProps {
  submission: Submission;
  approverName: string;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  submission,
  approverName,
  onClose,
  onApprove,
  onReject,
}) => {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('Amount mismatched with bank statement.');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(submission.id);
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading(true);
    await onReject(submission.id, rejectReason.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col font-sans">
      {/* Slide-over Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Reviewing Slip &bull; {submission.id}
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            {submission.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Slide-over Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Attendee Details Grid */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">{submission.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">{submission.phone}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Ticket className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Requested Allocation:{' '}
              <strong className="text-slate-900 font-bold">
                {submission.quantity} Passes &bull; Rs. {(submission.quantity * 1000).toLocaleString()}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Submitted on: {new Date(submission.submittedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bank Transfer Receipt Slip Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Attached Bank Deposit Slip / Transfer Proof
            </label>
            <a
              href={submission.paymentSlipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              Open Full
            </a>
          </div>

          <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center p-2 min-h-[220px]">
            <img
              src={submission.paymentSlipUrl}
              alt="Payment Slip"
              className="max-h-[280px] w-auto object-contain rounded shadow-xs"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Verify account number: <strong>8942-0012-3841-992</strong> and amount equals <strong>Rs. {(submission.quantity * 1000).toLocaleString()}</strong>.
          </p>
        </div>

        {/* Rejection Mode Input if active */}
        {rejectMode && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Specify Rejection Reason (Sent to Attendee)</span>
            </div>
            <textarea
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="e.g. Unreadable receipt screenshot..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectMode(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleReject}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Action Footer */}
      {!rejectMode && (
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => setRejectMode(true)}
            className="px-4 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject Slip</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleApprove}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Issue Ticket</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
