import React from 'react';
import { ApprovalHistoryItem } from '../../api/mockApi';
import { CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';

interface HistoryTableProps {
  history: ApprovalHistoryItem[];
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900">Audit & Decision Trail</h3>
        <p className="text-xs text-slate-500 mt-0.5">Chronological log of approver actions.</p>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
