import React, { useState, useEffect } from 'react';
import { api, Submission } from '../api/mockApi';
import { useAuthStore } from '../store/authStore';
import { RunningCounter } from '../components/checkin/RunningCounter';
import { QRScanner } from '../components/checkin/QRScanner';
import { StatusScreen } from '../components/checkin/StatusScreen';
import {
  QrCode,
  Search,
  LogOut,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CheckinPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<{ checkedInCount: number; totalApprovedTickets: number; percentage: number }>({
    checkedInCount: 0,
    totalApprovedTickets: 0,
    percentage: 0,
  });

  const [scanResult, setScanResult] = useState<{
    status: 'valid' | 'invalid';
    submission?: Submission;
    reason?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const s = await api.getAttendanceStats();
      setStats({
        checkedInCount: s.checkedInCount ?? s.totalCheckedIn,
        totalApprovedTickets: s.totalApprovedTickets ?? s.totalTicketsIssued,
        percentage: s.percentage ?? s.attendanceRate,
      });
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to sync gate attendance statistics:', err);
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => fetchStats(), 30000); // 30s periodic background sync
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await api.verifyAndCheckIn(query);
    setLoading(false);

    if (res.valid) {
      setScanResult({
        status: 'valid',
        submission: res.submission,
      });
      fetchStats();
    } else {
      setScanResult({
        status: 'invalid',
        submission: res.submission,
        reason: res.reason,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      {/* Mobile-first Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white uppercase tracking-wider">
              Gate Admissions Staff
            </h1>
            <span className="text-[10px] text-slate-400">
              {user?.name} &bull; {user?.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1"
            >
              Admin
            </Link>
          )}
          {user?.role !== 'staff' && (
            <Link
              to="/approve"
              className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1"
            >
              Approver
            </Link>
          )}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container - max-w-md centered for perfect mobile app experience */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 space-y-4 flex-1">
        {/* Authoritative Gate Synchronization Bar (BACKENDFIXES4 Section 14) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{lastUpdated ? `Last updated: ${lastUpdated}` : 'Live database sync'}</span>
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
            title="Fetch fresh attendance data directly from database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Persistent Running Counter (Section 35) */}
        <RunningCounter
          checkedIn={stats.checkedInCount}
          totalApproved={stats.totalApprovedTickets}
          percentage={stats.percentage}
        />

        {/* Verification View: Either Scanner or Result Screen */}
        {scanResult ? (
          <StatusScreen
            status={scanResult.status}
            submission={scanResult.submission}
            reason={scanResult.reason}
            onReset={() => setScanResult(null)}
          />
        ) : (
          <div className="space-y-4">
            {/* Live Camera Scanner */}
            <QRScanner onScanResult={handleVerify} />

            {/* Manual Search Fallback */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Manual Verification Fallback
              </span>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify(searchQuery);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Ticket ID, Reg No (e.g. FC122716), or Name..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
