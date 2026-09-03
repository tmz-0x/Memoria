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
  Zap,
  ArrowRight,
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

  const fetchStats = async () => {
    const s = await api.getCheckinStats();
    setStats(s);
  };

  useEffect(() => {
    fetchStats();
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
                    placeholder="Enter Ticket ID or Name..."
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

            {/* Quick Demo Simulator Buttons for instantaneous testing */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Sample Barcode Scans:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleVerify('MEM-26-9042')}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-emerald-300 transition-colors"
                >
                  <strong className="block text-white">MEM-26-9042</strong>
                  <span>Valid Pass (Dilhara)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('MEM-26-9041')}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-rose-300 transition-colors"
                >
                  <strong className="block text-white">MEM-26-9041</strong>
                  <span>Already Admitted</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('sub-006')}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-rose-300 transition-colors"
                >
                  <strong className="block text-white">sub-006</strong>
                  <span>Rejected Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('MEM-INVALID-999')}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-amber-300 transition-colors"
                >
                  <strong className="block text-white">Unknown Code</strong>
                  <span>Invalid Ticket</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
