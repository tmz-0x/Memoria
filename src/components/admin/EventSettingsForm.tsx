import React, { useState, useEffect } from 'react';
import { EventSettings, api } from '../../api/mockApi';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Settings,
  Mail,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react';

interface EventSettingsFormProps {
  initialSettings: EventSettings;
  onUpdated: (s: EventSettings) => void;
  onRefresh?: () => void;
}

export const EventSettingsForm: React.FC<EventSettingsFormProps> = ({
  initialSettings,
  onUpdated,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<EventSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Email test state
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Reset database state
  const [showResetModal, setShowResetModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialSettings);
  }, [initialSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'totalCapacity' || name === 'remainingAllocation' || name === 'ticketPrice'
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    const updated = await api.updateEventSettings(formData);
    setSaving(false);
    setSavedSuccess(true);
    onUpdated(updated);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await api.sendTestEmail(testEmail);
      if (res.success) {
        setTestEmailResult({ success: true, message: res.message || 'Test email dispatched successfully.' });
      } else {
        setTestEmailResult({ success: false, message: res.error || 'SMTP delivery rejected' });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'Failed to send test email' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await api.resetDatabase(adminPassword);
      if (res.success) {
        setResetSuccess(res.message);
        setShowResetModal(false);
        setAdminPassword('');
        onRefresh?.();
      } else {
        setResetError('Reset rejected by server');
      }
    } catch (err: any) {
      setResetError(err.message || 'Database reset failed. Check administrator password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="pb-4 border-b border-slate-200 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Event Configuration & Pricing</h3>
              <p className="text-xs text-slate-500">Live configuration parameters for ticketing rules.</p>
            </div>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Saved to Ledger
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Name</label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date (Full Display)</label>
              <input
                type="text"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Location</label>
              <input
                type="text"
                name="eventVenue"
                value={formData.eventVenue}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Target Capacity</label>
              <input
                type="number"
                name="totalCapacity"
                value={formData.totalCapacity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remaining Pass Allocation</label>
              <input
                type="number"
                name="remainingAllocation"
                value={formData.remainingAllocation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-blue-600 font-bold"
              />
            </div>
          </div>

          {/* Bank Credentials Section */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Bank Transfer Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Email Delivery Diagnostics Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="pb-4 border-b border-slate-200 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Email Server Diagnostics</h3>
              <p className="text-xs text-slate-500">Test actual outbound SMTP delivery to verify ticket mail dispatch.</p>
            </div>
          </div>
        </div>

        {testEmailResult && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              testEmailResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testEmailResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{testEmailResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="email"
            placeholder="Enter destination email address to verify SMTP..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full sm:flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={testEmailLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {testEmailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{testEmailLoading ? 'Testing SMTP...' : 'Send Test Email'}</span>
          </button>
        </form>
      </div>

      {/* DANGER ZONE: Reset Entire Database Card */}
      <div className="bg-rose-50/50 rounded-xl border-2 border-rose-200 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-900">⚠️ DANGER ZONE — Reset Entire Database</h3>
              <p className="text-xs text-rose-700 mt-1 max-w-2xl leading-relaxed">
                Permanently purge all operational registrations, tickets, QR credentials, check-in records, and test data in the SQLite database.
                The primary administrator account (<strong>Thisal Methwidu</strong>) will be strictly preserved. This action requires administrator password verification.
              </p>
              {resetSuccess && (
                <div className="mt-3 p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resetSuccess}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
          >
            Reset Database...
          </button>
        </div>
      </div>

      {/* Password Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Administrator Password Verification</h4>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              You are about to reset the entire ticketing database. Please enter your administrator password to authorize this destructive operation.
            </p>

            {resetError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                {resetError}
              </div>
            )}

            <form onSubmit={handleExecuteReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter administrator password..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setAdminPassword('');
                    setResetError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !adminPassword}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {resetLoading ? 'Purging Database...' : 'Confirm & Wipe Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
