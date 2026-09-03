import React, { useState } from 'react';
import { Submission } from '../../api/mockApi';
import { Search, Eye, CheckCircle2, Clock, XCircle, QrCode, Filter } from 'lucide-react';

interface SubmissionsTableProps {
  submissions: Submission[];
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ submissions }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [activeSlip, setActiveSlip] = useState<string | null>(null);

  const filtered = submissions.filter((s) => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const term = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.ticketId && s.ticketId.toLowerCase().includes(term)) ||
      s.id.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">All Ticket Submissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filtered.length} of {submissions.length} total registrations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or ticket ID..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-64 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                  filter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Submission ID</th>
              <th className="px-6 py-3.5">Attendee</th>
              <th className="px-6 py-3.5">Contact</th>
              <th className="px-6 py-3.5">Qty</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Ticket ID</th>
              <th className="px-6 py-3.5">Gate Status</th>
              <th className="px-6 py-3.5 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-slate-700">{sub.id}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-slate-900 block">{sub.name}</span>
                  <span className="text-[11px] text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="block text-slate-700">{sub.email}</span>
                  <span className="text-[11px] text-slate-400">{sub.phone}</span>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-900">{sub.quantity}</td>
                <td className="px-6 py-4">
                  {sub.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Approved
                    </span>
                  )}
                  {sub.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                  {sub.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                      <XCircle className="w-3 h-3" />
                      Rejected
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono font-medium">
                  {sub.ticketId ? (
                    <span className="text-blue-600 font-semibold">{sub.ticketId}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {sub.checkedIn ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <QrCode className="w-3.5 h-3.5" />
                      Admitted
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Not Checked In</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setActiveSlip(sub.paymentSlipUrl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Slip</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Slip Modal */}
      {activeSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">Uploaded Bank Transfer Proof</h4>
              <button
                onClick={() => setActiveSlip(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="my-4 max-h-[70vh] overflow-y-auto rounded-lg bg-slate-100 flex items-center justify-center p-2">
              <img
                src={activeSlip}
                alt="Payment Slip Proof"
                className="max-h-[60vh] object-contain rounded"
              />
            </div>
            <div className="text-right">
              <button
                onClick={() => setActiveSlip(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
