import React, { useState, useEffect } from 'react';
import { api, Submission, ApprovalHistoryItem } from '../api/mockApi';
import { useAuthStore } from '../store/authStore';
import { PendingQueueItem } from '../components/approve/PendingQueueItem';
import { DetailPanel } from '../components/approve/DetailPanel';
import { HistoryTable } from '../components/approve/HistoryTable';
import {
  CheckCircle,
  Clock,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Inbox,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ApprovePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [pendingList, setPendingList] = useState<Submission[]>([]);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const [pending, hist] = await Promise.all([
        api.getPendingSubmissions(),
        api.getApprovalHistory(),
      ]);
      setPendingList(pending);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id: string) => {
    const approver = user?.name || 'Authorized Approver';
    // Optimistic UI update: immediately remove from pending list
    const approvedSub = pendingList.find((s) => s.id === id);
    setPendingList((prev) => prev.filter((s) => s.id !== id));
    setSelectedSub(null);

    const res = await api.approveSubmission(id, approver);
    if (res.success) {
      setNotification(`Successfully approved ${approvedSub?.name || 'registration'}! Ticket ID ${res.ticketId} issued.`);
      const updatedHistory = await api.getApprovalHistory();
      setHistory(updatedHistory);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    const approver = user?.name || 'Authorized Approver';
    // Optimistic UI update: immediately remove from pending list
    const rejectedSub = pendingList.find((s) => s.id === id);
    setPendingList((prev) => prev.filter((s) => s.id !== id));
    setSelectedSub(null);

    const res = await api.rejectSubmission(id, approver, reason);
    if (res.success) {
      setNotification(`Application for ${rejectedSub?.name || 'registration'} has been rejected.`);
      const updatedHistory = await api.getApprovalHistory();
      setHistory(updatedHistory);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold shadow-xs">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Transfer Verification Desk
              </h1>
              <span className="text-[11px] text-slate-500">
                Committee Slip Approval Queue
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Approver:</span>
              <strong className="text-slate-800 font-semibold">{user?.name}</strong>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                {user?.role}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  <span>Admin Console</span>
                </Link>
              )}
              <Link
                to="/checkin"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                <span>Gate Check-in</span>
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                <span>Public Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {notification && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center justify-between shadow-xs">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-blue-500 font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Pending Queue List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pending Verification Queue
                </h2>
                <p className="text-xs text-slate-500">
                  {pendingList.length} application{pendingList.length !== 1 ? 's' : ''} awaiting slip validation
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {pendingList.length} In Queue
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                Loading pending queue...
              </div>
            ) : pendingList.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Queue is Clear</h3>
                <p className="text-xs text-slate-500 mt-1">
                  All submitted bank slips have been reviewed and reconciled.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((sub) => (
                  <PendingQueueItem
                    key={sub.id}
                    submission={sub}
                    isSelected={selectedSub?.id === sub.id}
                    onSelect={(s) => setSelectedSub(s)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Audit History Table */}
          <div className="lg:col-span-5">
            <HistoryTable history={history} />
          </div>
        </div>

        {/* Slide-over Detail Panel when an item is selected */}
        {selectedSub && (
          <DetailPanel
            submission={selectedSub}
            approverName={user?.name || 'Authorized Approver'}
            onClose={() => setSelectedSub(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </main>
    </div>
  );
};
