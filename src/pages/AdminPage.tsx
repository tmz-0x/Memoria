import React, { useState, useEffect } from 'react';
import { api, Submission, User, EventSettings } from '../api/mockApi';
import { useAuthStore } from '../store/authStore';
import { StatCard } from '../components/admin/StatCard';
import { SubmissionsTable } from '../components/admin/SubmissionsTable';
import { UserTable } from '../components/admin/UserTable';
import { EventSettingsForm } from '../components/admin/EventSettingsForm';
import {
  LayoutDashboard,
  Users,
  Settings,
  ListOrdered,
  LogOut,
  ExternalLink,
  DollarSign,
  Ticket,
  Clock,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'users' | 'settings'>('overview');

  const [stats, setStats] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, subData, uData, setts] = await Promise.all([
        api.getAdminStats(),
        api.getAllSubmissions(),
        api.getUsers(),
        api.getEventSettings(),
      ]);
      setStats(sData);
      setSubmissions(subData);
      setUsers(uData);
      setSettings(setts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Professional Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Event Operations Console
              </h1>
              <span className="text-[11px] text-slate-500">
                Administration & Ledger System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Logged as:</span>
              <strong className="text-slate-800 font-semibold">{user?.name}</strong>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                {user?.role}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/approve"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                <span>Approver View</span>
              </Link>
              <Link
                to="/checkin"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                <span>Check-in App</span>
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

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 border-t border-slate-100 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'submissions', label: 'All Submissions', icon: ListOrdered },
            { id: 'users', label: 'User Roles', icon: Users },
            { id: 'settings', label: 'Event Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 flex items-center gap-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Administrative Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm">
            Synchronizing administrative records...
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard
                    title="Gross Revenue"
                    value={`Rs. ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
                    subtitle={`${stats?.ticketsSold ?? 0} tickets sold`}
                    icon={DollarSign}
                    trend="Reconciled Funds"
                    colorScheme="emerald"
                  />
                  <StatCard
                    title="Tickets Sold"
                    value={stats?.ticketsSold ?? 0}
                    subtitle={`${stats?.approvedCount ?? 0} approved orders`}
                    icon={Ticket}
                    trend="Capacity Confirmed"
                    colorScheme="blue"
                  />
                  <StatCard
                    title="Pending Queue"
                    value={stats?.pendingCount ?? 0}
                    subtitle={`${stats?.pendingTickets ?? 0} tickets awaiting review`}
                    icon={Clock}
                    colorScheme="amber"
                  />
                  <StatCard
                    title="Admitted at Gate"
                    value={stats?.checkedInCount ?? 0}
                    subtitle={`Out of ${stats?.ticketsSold ?? 0} sold`}
                    icon={QrCode}
                    colorScheme="indigo"
                  />
                </div>

                {/* Fixes 3 Section 6: Sales & Revenue Dividend Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Ticket Sales & Revenue Dividend Distribution</h4>
                      <p className="text-xs text-slate-500">
                        Authoritative breakdown by admission tier and student registration category
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total Authoritative Revenue:</span>
                      <span className="font-mono font-bold text-emerald-600 text-base ml-2">
                        Rs. {(stats?.totalRevenue ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* University Students */}
                    <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                          University Students (Rs. 200/pass)
                        </span>
                        <span className="font-mono font-bold text-xs bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded">
                          {stats?.dividend?.universityPercentage ?? stats?.universityTicketPercentage ?? 0}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <div>
                          <span className="text-2xl font-extrabold font-mono text-purple-950">
                            {stats?.dividend?.universityTickets ?? stats?.universityTickets ?? stats?.studentApprovedCount ?? 0}
                          </span>
                          <span className="text-xs text-purple-700 ml-1.5">tickets sold</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-purple-800">
                          Rs. {(stats?.dividend?.universityRevenue ?? stats?.universityRevenue ?? stats?.studentRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-purple-200/70 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{
                            width: `${stats?.dividend?.universityPercentage ?? stats?.universityTicketPercentage ?? 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Outsider General Attendees */}
                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                          General Attendees (Rs. 1,000/pass)
                        </span>
                        <span className="font-mono font-bold text-xs bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded">
                          {stats?.dividend?.outsiderPercentage ?? stats?.outsiderTicketPercentage ?? 0}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <div>
                          <span className="text-2xl font-extrabold font-mono text-blue-950">
                            {stats?.dividend?.outsiderTickets ?? stats?.outsiderTickets ?? stats?.outsiderApprovedCount ?? 0}
                          </span>
                          <span className="text-xs text-blue-700 ml-1.5">tickets sold</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-blue-800">
                          Rs. {(stats?.dividend?.outsiderRevenue ?? stats?.outsiderRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-blue-200/70 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{
                            width: `${stats?.dividend?.outsiderPercentage ?? stats?.outsiderTicketPercentage ?? 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capacity Summary Progress Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Event Registration Progress</h4>
                      <p className="text-xs text-slate-500">
                        {stats?.remainingAllocation} passes remaining of {stats?.totalCapacity} target passes.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">
                      {Math.round(((stats?.totalCapacity - stats?.remainingAllocation) / (stats?.totalCapacity || 1)) * 100)}% Booked
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          ((stats?.totalCapacity - stats?.remainingAllocation) / (stats?.totalCapacity || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Recent Submissions Snippet */}
                <SubmissionsTable submissions={submissions.slice(0, 8)} onRefresh={loadData} />
              </div>
            )}

            {activeTab === 'submissions' && (
              <SubmissionsTable submissions={submissions} onRefresh={loadData} />
            )}

            {activeTab === 'users' && (
              <UserTable users={users} onRefresh={loadData} />
            )}

            {activeTab === 'settings' && settings && (
              <EventSettingsForm
                initialSettings={settings}
                onUpdated={(s) => setSettings(s)}
                onRefresh={loadData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
