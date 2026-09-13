import React, { useState, useEffect } from 'react';
import { api, SystemError } from '../../api/mockApi';
import {
  AlertOctagon,
  Search,
  Filter,
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
  HelpCircle,
  FileCode,
  Shield,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const ErrorHandlingViewer: React.FC = () => {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const limit = 25;

  // Filters
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [resolutionFilter, setResolutionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Clear Errors Modal State (BACKENDFIXES6 Section 17)
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearReason, setClearReason] = useState('');
  const [clearBeforeDate, setClearBeforeDate] = useState('');
  const [clearModule, setClearModule] = useState('all');
  const [clearing, setClearing] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);

  // Inspector Modal State
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [newStatus, setNewStatus] = useState<'open' | 'investigating' | 'resolved' | 'ignored'>('open');
  const [resolutionNote, setResolutionNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  const fetchErrors = async (currentPage = page) => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getSystemErrors({
        page: currentPage,
        limit,
        search: search.trim() || undefined,
        severity: severity !== 'all' ? severity : undefined,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        resolutionStatus: resolutionFilter !== 'all' ? resolutionFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setErrors(data.errors || []);
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
      console.error('Failed to load system errors:', err);
      setFetchError(err?.message || 'Unable to connect to database or query error logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearErrors = async (e: React.FormEvent) => {
    e.preventDefault();
    setClearing(true);
    setClearFeedback(null);
    try {
      const res = await api.clearSystemErrors(
        clearReason.trim() || undefined,
        clearBeforeDate || undefined,
        clearModule !== 'all' ? clearModule : undefined
      );
      setClearFeedback(res.message);
      setTimeout(() => {
        setShowClearModal(false);
        setClearFeedback(null);
        setClearReason('');
        setClearBeforeDate('');
        setClearModule('all');
        fetchErrors(1);
      }, 1800);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear error logs');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchErrors(1);
  }, [severity, moduleFilter, resolutionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchErrors(1);
  };

  const openInspector = (err: SystemError) => {
    setSelectedError(err);
    setNewStatus(err.resolutionStatus || 'open');
    setResolutionNote(err.resolutionNote || '');
    setUpdateFeedback(null);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedError) return;

    setUpdatingStatus(true);
    setUpdateFeedback(null);
    try {
      const res = await api.updateSystemErrorStatus(selectedError.id, newStatus, resolutionNote.trim() || undefined);
      setUpdateFeedback(res.message);
      // Update local state
      setSelectedError((prev) => (prev ? { ...prev, resolutionStatus: newStatus, resolutionNote } : null));
      setErrors((prev) =>
        prev.map((item) =>
          item.id === selectedError.id
            ? { ...item, resolutionStatus: newStatus, resolutionNote }
            : item
        )
      );
      setTimeout(() => {
        setUpdateFeedback(null);
      }, 2500);
    } catch (err: any) {
      alert(err?.message || 'Failed to update resolution status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderSeverityBadge = (s: string) => {
    switch (s) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            CRITICAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3 h-3 text-slate-500" />
            {s}
          </span>
        );
    }
  };

  const renderResolutionBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            Resolved
          </span>
        );
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Search className="w-2.5 h-2.5 text-blue-600" />
            Investigating
          </span>
        );
      case 'ignored':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Ignored
          </span>
        );
      case 'open':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-200">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                System Error Management & Diagnostic Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Authoritative record of system exceptions, API failures, SMTP/Email errors, and attendance validation conflicts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Last updated: {lastUpdated}</span>
              </div>
            )}
            <button
              onClick={() => fetchErrors(page)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Errors</span>
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Clear recorded system error events"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Error Logs...</span>
            </button>
          </div>
        </div>

        {/* Database / Service Failure State (BACKENDFIXES6 Sections 28-29) */}
        {fetchError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 flex-shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-900">Database Diagnostic Error</h4>
                <p className="text-xs text-rose-700">{fetchError}</p>
              </div>
            </div>
            <button
              onClick={() => fetchErrors(page)}
              disabled={loading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Query */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, message, endpoint..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500"
            />
          </form>

          {/* Severity Filter */}
          <div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Modules</option>
              <option value="AUTH">Authentication</option>
              <option value="TICKET">Tickets</option>
              <option value="QR">QR Engine</option>
              <option value="ATTENDANCE">Attendance / Gate</option>
              <option value="EMAIL">Email Delivery</option>
              <option value="SMTP">SMTP Engine</option>
              <option value="ADMIN">Admin Panel</option>
              <option value="DATABASE">Database</option>
              <option value="SYSTEM">System Core</option>
            </select>
          </div>

          {/* Resolution Status Filter */}
          <div>
            <select
              value={resolutionFilter}
              onChange={(e) => setResolutionFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Resolution States</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearch('');
                setSeverity('all');
                setModuleFilter('all');
                setResolutionFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong>{errors.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> recorded system error events
          </span>
          {total > 0 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Error / Code</th>
                <th className="py-3 px-4">Endpoint / Action</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Resolution</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && errors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    <span>Loading system diagnostic errors...</span>
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-semibold text-slate-700">No system errors recorded</p>
                    <p className="text-xs text-slate-400 mt-1">All services, routes, and background jobs are operating cleanly.</p>
                  </td>
                </tr>
              ) : (
                errors.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                      {new Date(item.timestamp).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderSeverityBadge(item.severity)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 text-[11px] tracking-wide">
                        {item.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="flex flex-col">
                        <span className="font-mono text-rose-700 font-semibold text-[11px]">
                          {item.errorCode || 'EXCEPTION'}
                        </span>
                        <span className="text-slate-600 truncate text-[11px]" title={item.errorMessage || item.message}>
                          {item.errorMessage || item.message}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px] font-mono">
                      {item.httpMethod && item.endpoint ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400">{item.httpMethod}</span>
                          <span className="truncate max-w-[140px]" title={item.endpoint}>{item.endpoint}</span>
                        </span>
                      ) : (
                        item.action || 'SYSTEM'
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      {item.statusCode ? (
                        <span className={item.statusCode >= 500 ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                          {item.statusCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderResolutionBadge(item.resolutionStatus || 'open')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openInspector(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Inspect full diagnostic payload & update resolution"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <button
              onClick={() => fetchErrors(page - 1)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchErrors(page + 1)}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Inspector Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Error Diagnostic Inspector
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedError.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Primary Diagnostic Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Severity</span>
                  <div className="mt-1">{renderSeverityBadge(selectedError.severity)}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Module</span>
                  <span className="mt-1 font-semibold text-slate-800 block">{selectedError.module}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Code</span>
                  <span className="mt-1 font-mono font-bold text-rose-600 block">
                    {selectedError.statusCode || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Error Code</span>
                  <span className="mt-1 font-mono font-semibold text-slate-800 block">
                    {selectedError.errorCode || 'NONE'}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Diagnostic Message</span>
                <div className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed break-words">
                  {selectedError.errorMessage || selectedError.message}
                </div>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Timestamp:</span>{' '}
                  <span className="font-mono text-slate-700">{selectedError.timestamp}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Request ID:</span>{' '}
                  <span className="font-mono text-slate-700">{selectedError.requestId || 'Internal'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Endpoint:</span>{' '}
                  <span className="font-mono text-slate-700">
                    {selectedError.httpMethod} {selectedError.endpoint || 'N/A'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Actor:</span>{' '}
                  <span className="text-slate-700">
                    {selectedError.username || selectedError.userId || 'Anonymous / Guest'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Client IP:</span>{' '}
                  <span className="font-mono text-slate-700">{selectedError.ipAddress || '127.0.0.1'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Target Entity:</span>{' '}
                  <span className="text-slate-700">
                    {selectedError.targetType ? `${selectedError.targetType} (${selectedError.targetId})` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Stack Trace if available */}
              {selectedError.stackTrace && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stack Trace</span>
                  <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[10px] max-h-40 overflow-y-auto leading-normal">
                    {selectedError.stackTrace}
                  </pre>
                </div>
              )}

              {/* Resolution Status Management (BACKENDFIXES5 Section 29) */}
              <form onSubmit={handleStatusUpdate} className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Operational Resolution Workflow
                  </span>
                  {selectedError.resolvedBy && (
                    <span className="text-[11px] text-slate-400">
                      Last updated by {selectedError.resolvedBy}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="open">Open (Requires attention)</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="ignored">Ignored / False Positive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resolution Notes</label>
                    <input
                      type="text"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Root cause, fix applied, or verification note..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {updateFeedback && (
                  <div className="p-2 rounded bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{updateFeedback}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {updatingStatus ? 'Updating Status...' : 'Save Resolution Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Clear Error Logs Modal (BACKENDFIXES6 Section 17 & 19-21) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Clear System Error Logs</h4>
              </div>
              <button
                onClick={() => {
                  setShowClearModal(false);
                  setClearFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Destructive Operation:</strong> This will delete recorded system error log events from the database. Unrelated audit trails, submissions, user accounts, and ticket credentials will remain completely intact.
              </span>
            </div>

            {clearFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{clearFeedback}</span>
              </div>
            )}

            <form onSubmit={handleClearErrors} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Clearing <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared after staging bug resolution..."
                  value={clearReason}
                  onChange={(e) => setClearReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Module (Optional)
                </label>
                <select
                  value={clearModule}
                  onChange={(e) => setClearModule(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="all">All Modules</option>
                  <option value="EMAIL">EMAIL Delivery</option>
                  <option value="SMTP">SMTP Engine</option>
                  <option value="AUTH">AUTH</option>
                  <option value="TICKETS">TICKETS</option>
                  <option value="APPROVAL">APPROVAL</option>
                  <option value="CHECKIN">CHECKIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="DATABASE">DATABASE</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Clear Records Older Than (Optional)
                </label>
                <input
                  type="date"
                  value={clearBeforeDate}
                  onChange={(e) => setClearBeforeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none text-slate-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave empty to clear all error records in selected module.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  disabled={clearing}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearing || !clearReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {clearing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{clearing ? 'Clearing Errors...' : 'Confirm & Clear Error Logs'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
