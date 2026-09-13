import React, { useState, useEffect } from 'react';
import { api, SystemAuditLog } from '../../api/mockApi';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle,
  XCircle,
  Clock,
  Eye,
  X,
  CheckCircle2,
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const limit = 25;

  // Filters
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Inspector Modal
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);

  // Clear Logs Modal (BACKENDFIXES6 Sections 17-21)
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearCategory, setClearCategory] = useState<'audit' | 'submissions'>('audit');
  const [clearReason, setClearReason] = useState('');
  const [clearBeforeDate, setClearBeforeDate] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);

  const fetchLogs = async (currentPage = page) => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getAuditLogs({
        page: currentPage,
        limit,
        search: search.trim() || undefined,
        severity: severity !== 'all' ? severity : undefined,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setLastUpdated(
        new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    } catch (err: any) {
      console.error('Failed to load system audit logs:', err);
      setFetchError(err?.message || 'Unable to connect to database or query audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [severity, moduleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleClearLogs = async (e: React.FormEvent) => {
    e.preventDefault();
    setClearing(true);
    setClearFeedback(null);
    try {
      const res = clearCategory === 'submissions'
        ? await api.clearSubmissionLogs(clearReason.trim() || undefined, clearBeforeDate || undefined)
        : await api.clearAuditLogs(clearReason.trim() || undefined, clearBeforeDate || undefined);
      setClearFeedback(res.message);
      setTimeout(() => {
        setShowClearModal(false);
        setClearFeedback(null);
        setClearReason('');
        setClearBeforeDate('');
        setClearCategory('audit');
        fetchLogs(1);
      }, 1800);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear logs');
    } finally {
      setClearing(false);
    }
  };

  const renderSeverityBadge = (s: string) => {
    switch (s) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">System Audit & Reliability Log</h3>
            <p className="text-xs text-slate-500">
              Persistent event trail of security operations, transactional state transitions, and server exceptions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs...</span>
          </button>
        </div>
      </div>

      {/* Database Diagnostic Failure Alert (BACKENDFIXES6 Sections 28-29) */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Database Diagnostic Error</h4>
              <p className="text-xs text-rose-700">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search message, request ID, user, endpoint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Modules</option>
              <option value="AUTH">AUTH</option>
              <option value="TICKETS">TICKETS</option>
              <option value="APPROVAL">APPROVAL</option>
              <option value="CHECKIN">CHECKIN</option>
              <option value="SMTP">SMTP</option>
              <option value="EMAIL">EMAIL</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DATABASE">DATABASE</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Date Start */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-600"
              title="Filter from date"
            />
          </div>

          {/* Submit Search button */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Filter
            </button>
            {(search || severity !== 'all' || moduleFilter !== 'all' || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSeverity('all');
                  setModuleFilter('all');
                  setStartDate('');
                  setEndDate('');
                  fetchLogs(1);
                }}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs"
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Event / Action</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No system audit logs found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{renderSeverityBadge(log.severity)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      <div>{log.eventType}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{log.action}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                      {log.username || log.userId || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {log.requestId ? log.requestId.slice(0, 14) + '...' : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-[11px] p-1"
                        title="View Full Audit Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong>{logs.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> audit events
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderSeverityBadge(selectedLog.severity)}
                <h4 className="text-sm font-bold text-slate-900 font-mono">{selectedLog.id}</h4>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Event Type</span>
                  <strong className="text-slate-800">{selectedLog.eventType}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Module</span>
                  <strong className="text-slate-800 font-mono">{selectedLog.module}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                  <strong className="text-slate-800 font-mono">{selectedLog.action}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">User</span>
                  <span className="text-slate-700 font-medium">{selectedLog.username || selectedLog.userId || 'Anonymous / System'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="text-slate-700 font-mono">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Code</span>
                  <span className="text-slate-700 font-mono">{selectedLog.statusCode || '—'}</span>
                </div>
              </div>

              {/* Request ID & Traceability */}
              {selectedLog.requestId && (
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block mb-1">Correlation Request ID</span>
                  <span className="font-mono text-xs font-bold text-blue-950">{selectedLog.requestId}</span>
                </div>
              )}

              {/* Message */}
              <div>
                <span className="text-slate-500 block font-semibold mb-1">Event Message</span>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 leading-relaxed font-sans">
                  {selectedLog.message}
                </div>
              </div>

              {/* Endpoint and HTTP method */}
              {selectedLog.endpoint && (
                <div>
                  <span className="text-slate-500 block font-semibold mb-1">HTTP Route</span>
                  <div className="p-2 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs">
                    <span className="text-emerald-400 mr-2">{selectedLog.httpMethod || 'GET'}</span>
                    {selectedLog.endpoint}
                  </div>
                </div>
              )}

              {/* Stack Trace if available (CRITICAL / ERROR) */}
              {selectedLog.stackTrace && (
                <div>
                  <span className="text-rose-600 block font-semibold mb-1">Server Stack Trace (Admin Diagnostic)</span>
                  <pre className="p-3 bg-slate-950 text-rose-300 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}

              {/* Metadata JSON */}
              {selectedLog.metadata && (
                <div>
                  <span className="text-slate-500 block font-semibold mb-1">Sanitized Metadata Context</span>
                  <pre className="p-3 bg-slate-100 text-slate-800 rounded-lg font-mono text-[11px] overflow-x-auto max-h-44">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Modal (Accountability Preserved) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Clear System Audit Logs</h4>
                <p className="text-xs text-slate-500">Destructive Administrative Maintenance</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 my-3 leading-relaxed">
              This action will permanently purge audit event records from the database. For accountability, an audit event recording who cleared the logs, the timestamp, and your stated reason will be permanently preserved.
            </p>

            {clearFeedback && (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{clearFeedback}</span>
              </div>
            )}

            <form onSubmit={handleClearLogs} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Log Category to Clear <span className="text-rose-500">*</span>
                </label>
                <select
                  value={clearCategory}
                  onChange={(e) => setClearCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="audit">System Audit Logs (Security & Transaction Events)</option>
                  <option value="submissions">Submission Activity Logs (Registration & Approval Events)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {clearCategory === 'submissions'
                    ? 'Targeted: Clears submission history and activity logs only. Actual submissions and attendee records remain untouched.'
                    : 'Targeted: Clears system audit logs while preserving permanent accountability record.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Clearing Logs (Required for Accountability)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Routine archival after successful event checkin..."
                  value={clearReason}
                  onChange={(e) => setClearReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clear Only Logs Prior To (Optional)
                </label>
                <input
                  type="date"
                  value={clearBeforeDate}
                  onChange={(e) => setClearBeforeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none text-slate-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Leave empty to clear all existing logs.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearModal(false);
                    setClearReason('');
                    setClearBeforeDate('');
                    setClearFeedback(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearing || !clearReason.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {clearing ? 'Clearing...' : 'Confirm & Clear Logs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
