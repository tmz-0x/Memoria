import React, { useState } from 'react';
import { ApprovalHistoryItem, api } from '../../api/mockApi';
import { CheckCircle2, XCircle, Mail, Loader2, Check } from 'lucide-react';

interface HistoryTableProps {
  history: ApprovalHistoryItem[];
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history }) => {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleResend = async (subId: string, attendee: string) => {
    setResendingId(subId);
    try {
      const res = await api.resendTicketEmail(subId);
      setFeedback(`Email dispatched for ${attendee}: ${res.message}`);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch email');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Audit & Decision Trail</h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological log of approver actions.</p>
        </div>
        {feedback && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Timestamp</th>
              <th className="px-6 py-3.5">Attendee</th>
              <th className="px-6 py-3.5">Decision</th>
              <th className="px-6 py-3.5">Approver Identity</th>
              <th className="px-6 py-3.5">Reason / Note</th>
              <th className="px-6 py-3.5 text-right">Pass Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-3.5 font-mono text-slate-500">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-3.5 font-semibold text-slate-900">
                  {item.attendeeName}
                </td>
                <td className="px-6 py-3.5">
                  {item.action === 'approved' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="w-3 h-3" />
                      Rejected
                    </span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-slate-700 font-medium">
                  {item.approver}
                </td>
                <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                  {item.reason || 'Verified with bank receipt'}
                </td>
                <td className="px-6 py-3.5 text-right">
                  {item.action === 'approved' && (
                    <button
                      type="button"
                      disabled={resendingId === item.submissionId}
                      onClick={() => handleResend(item.submissionId, item.attendeeName)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                      title="Resend official ticket admission pass to buyer"
                    >
                      {resendingId === item.submissionId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      <span>{resendingId === item.submissionId ? 'Sending...' : 'Resend Email'}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
