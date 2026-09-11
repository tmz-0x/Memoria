import React, { useState } from 'react';
import { Submission, api } from '../../api/mockApi';
import {
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Mail,
  Loader2,
} from 'lucide-react';

interface SubmissionsTableProps {
  submissions: Submission[];
  onRefresh?: () => void;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ submissions, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [activeSlip, setActiveSlip] = useState<string | null>(null);

  // Edit modal state
  const [editingSub, setEditingSub] = useState<Submission | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    ticketType: 'student' as 'student' | 'outsider',
    universityRegistrationNumber: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [deletingSub, setDeletingSub] = useState<Submission | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // QR Regenerate modal state
  const [regenSub, setRegenSub] = useState<Submission | null>(null);
  const [regenReason, setRegenReason] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);

  // View QR modal state (Fixes 3 Sections 11-14)
  const [viewingQRSub, setViewingQRSub] = useState<Submission | null>(null);
  const [qrDetails, setQrDetails] = useState<any | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const handleOpenQR = async (sub: Submission) => {
    setViewingQRSub(sub);
    setQrLoading(true);
    setQrError(null);
    setQrDetails(null);
    try {
      const data = await api.getTicketQR(sub.ticketId || sub.id);
      setQrDetails(data);
    } catch (err: any) {
      setQrError(err.message || 'Failed to load QR code credentials');
    } finally {
      setQrLoading(false);
    }
  };

  const filtered = submissions.filter((s) => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const term = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.universityRegistrationNumber && s.universityRegistrationNumber.toLowerCase().includes(term)) ||
      (s.ticketId && s.ticketId.toLowerCase().includes(term)) ||
      s.id.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const handleStartEdit = (sub: Submission) => {
    setEditingSub(sub);
    setEditForm({
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
      ticketType: sub.ticketType,
      universityRegistrationNumber: sub.universityRegistrationNumber || '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await api.updateSubmission(editingSub.id, editForm);
      setEditingSub(null);
      setNotification(`Successfully updated record for ${editForm.name}`);
      onRefresh?.();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update record');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSub) return;
    setDeleteLoading(true);
    try {
      await api.deleteSubmission(deletingSub.id, deleteReason);
      setDeletingSub(null);
      setDeleteReason('');
      setNotification(`Record for ${deletingSub.name} deleted successfully.`);
      onRefresh?.();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!regenSub) return;
    setRegenLoading(true);
    try {
      await api.regenerateQR(regenSub.id, regenReason);
      setRegenSub(null);
      setRegenReason('');
      setNotification(`QR credential successfully regenerated for ${regenSub.name}. Previous QR invalidated.`);
      onRefresh?.();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate QR');
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toast Notification */}
      {notification && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-white hover:opacity-80">✕</button>
        </div>
      )}

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
              placeholder="Search by name, email, reg no, ticket ID..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-68 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Submission ID</th>
              <th className="px-6 py-3.5">Attendee Info</th>
              <th className="px-6 py-3.5">Type & Reg</th>
              <th className="px-6 py-3.5">Qty / Total</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Ticket ID</th>
              <th className="px-6 py-3.5">Admission</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  No ticket submissions match your current filters.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                    {sub.id}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900 block">{sub.name}</span>
                    <span className="text-[11px] text-slate-400">{sub.email} &bull; {sub.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    {sub.ticketType === 'student' ? (
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                          Student
                        </span>
                        {sub.universityRegistrationNumber && (
                          <span className="block font-mono text-[11px] font-bold text-slate-700 mt-0.5">
                            {sub.universityRegistrationNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        Outsider
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900 block">
                      {sub.quantity} {sub.quantity > 1 ? 'Passes' : 'Pass'}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 font-bold">
                      Rs. {(sub.totalPrice ?? (sub.ticketType === 'student' ? 200 : sub.quantity * 1000)).toLocaleString()}
                    </span>
                  </td>
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
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setActiveSlip(sub.paymentSlipUrl)}
                        className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="View Bank Slip"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {sub.status === 'approved' && (
                        <button
                          onClick={() => handleOpenQR(sub)}
                          className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="View Ticket QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(sub)}
                        className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                        title="Edit Submission"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {sub.status === 'approved' && (
                        <button
                          onClick={() => setRegenSub(sub)}
                          className="p-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                          title="Regenerate QR Code"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setDeletingSub(sub)}
                        className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                        title="Delete Submission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Submission Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Edit Submission Details</h4>
                <p className="text-[11px] text-slate-500">ID: {editingSub.id} {editingSub.ticketId ? `• ${editingSub.ticketId}` : ''}</p>
              </div>
              <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendee Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Category</label>
                <select
                  value={editForm.ticketType}
                  onChange={(e) => setEditForm({ ...editForm, ticketType: e.target.value as 'student' | 'outsider' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="student">University Student (Rs. 200)</option>
                  <option value="outsider">General Attendee (Rs. 1,000)</option>
                </select>
              </div>

              {editForm.ticketType === 'student' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">University Registration Number</label>
                  <input
                    type="text"
                    value={editForm.universityRegistrationNumber}
                    onChange={(e) => setEditForm({ ...editForm, universityRegistrationNumber: e.target.value })}
                    placeholder="e.g. FC122716"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono uppercase"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Regenerate Modal */}
      {regenSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-purple-600 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Regenerate QR Credential</h4>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-4">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Warning: Invalidation of Active QR
              </p>
              <p>
                Regenerating this QR will immediately invalidate the currently active QR code for{' '}
                <strong>{regenSub.name}</strong> ({regenSub.ticketId}). The new QR credential must be used for event-day admission.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Replacement (Optional)</label>
              <input
                type="text"
                value={regenReason}
                onChange={(e) => setRegenReason(e.target.value)}
                placeholder="e.g. Attendee lost QR or security revocation"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRegenSub(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={regenLoading}
                onClick={handleConfirmRegenerate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {regenLoading ? 'Regenerating...' : 'Confirm & Invalidate Old QR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Modal */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Confirm Record Deletion</h4>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs mb-4">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Permanent Administrative Action
              </p>
              <p>
                You are about to delete the registration for <strong>{deletingSub.name}</strong> ({deletingSub.email}).
                This will archive the record, remove it from active lists, and preserve an audit log.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Reason</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate submission or request by attendee"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSub(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* View QR Code Modal (Fixes 3 Sections 11-14) */}
      {viewingQRSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Admission Ticket Pass & QR</h4>
                <p className="text-[11px] text-slate-500">
                  Ticket ID: <span className="font-mono font-bold text-blue-600">{viewingQRSub.ticketId || '—'}</span>
                </p>
              </div>
              <button
                onClick={() => { setViewingQRSub(null); setQrDetails(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {qrLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span>Retrieving verified ticket credentials...</span>
              </div>
            ) : qrError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs text-center">
                {qrError}
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code Presentation Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  {(qrDetails?.qrImageData || viewingQRSub.qrImageData) ? (
                    <img
                      src={qrDetails?.qrImageData || viewingQRSub.qrImageData}
                      alt="Ticket Admission QR"
                      className="w-52 h-52 mx-auto rounded-lg shadow-sm border border-slate-200 bg-white p-2"
                    />
                  ) : (
                    <div className="w-52 h-52 mx-auto rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      QR Image Unavailable
                    </div>
                  )}

                  <div className="mt-3">
                    <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                      {qrDetails?.ticketId || viewingQRSub.ticketId}
                    </span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                      Encrypted Gate Admission Token
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium">Gate QR Status:</span>
                  {(qrDetails?.checkedIn || viewingQRSub.checkedIn) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                      USED &bull; Already Checked In
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      ACTIVE &bull; Unused
                    </span>
                  )}
                </div>

                {/* Attendee Details Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Attendee</span>
                    <span className="font-semibold text-slate-800 truncate block">{qrDetails?.name || viewingQRSub.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Tier</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {viewingQRSub.ticketType === 'student' ? 'University Student' : 'General Attendee'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Passes</span>
                    <span className="font-semibold text-slate-800">{viewingQRSub.quantity} Pass(es)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Total Amount</span>
                    <span className="font-mono font-bold text-emerald-600">
                      Rs. {(qrDetails?.totalPrice ?? viewingQRSub.totalPrice ?? (viewingQRSub.ticketType === 'student' ? 200 : viewingQRSub.quantity * 1000)).toLocaleString()}
                    </span>
                  </div>
                  {viewingQRSub.universityRegistrationNumber && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase">Student Reg Number</span>
                      <span className="font-mono font-semibold text-purple-700">{viewingQRSub.universityRegistrationNumber}</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  Notice: Viewing this credential does not modify check-in status or create a new QR code.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setViewingQRSub(null); setQrDetails(null); }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Close QR Viewer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
