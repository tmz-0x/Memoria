import React, { useState, useEffect } from 'react';
import { EventSettings, SmtpConfigSettings, api } from '../../api/mockApi';
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
  Server,
  ShieldCheck,
  Check,
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

  // Dynamic Runtime SMTP State (BACKENDFIXES4 Sections 17-23)
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    hasPassword: false,
    smtpSecure: false,
    smtpFrom: '',
    senderName: "Memoria'26 Ticketing Desk",
    status: 'Not Configured',
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaveMessage, setSmtpSaveMessage] = useState<string | null>(null);
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; status: string; message: string } | null>(null);

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

  // SMTP Reset state (BACKENDFIXES6 Sections 1-5)
  const [showSmtpResetModal, setShowSmtpResetModal] = useState(false);
  const [smtpResetLoading, setSmtpResetLoading] = useState(false);
  const [smtpResetFeedback, setSmtpResetFeedback] = useState<string | null>(null);

  const handleExecuteSmtpReset = async () => {
    setSmtpResetLoading(true);
    setSmtpResetFeedback(null);
    try {
      const res = await api.resetSmtpConfig();
      setSmtpConfig(res.config);
      setSmtpResetFeedback('✓ SMTP configuration successfully reset to unconfigured default.');
      setShowSmtpResetModal(false);
      onRefresh?.();
      setTimeout(() => setSmtpResetFeedback(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to reset SMTP configuration');
    } finally {
      setSmtpResetLoading(false);
    }
  };

  useEffect(() => {
    setFormData(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    const loadSmtp = async () => {
      try {
        const cfg = await api.getSmtpConfig();
        setSmtpConfig(cfg);
      } catch (err) {
        console.error('Failed to load SMTP configuration:', err);
      }
    };
    loadSmtp();
  }, []);

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

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSmtpConfig((prev) => ({
      ...prev,
      [name]: name === 'smtpPort'
        ? Number(value)
        : name === 'smtpSecure'
        ? value === 'true'
        : value,
    }));
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    setSmtpSaveMessage(null);
    try {
      const res = await api.updateSmtpConfig(smtpConfig);
      setSmtpConfig(res.config);
      setSmtpSaveMessage('✓ SMTP settings saved and mail transport dynamically reloaded.');
      setTimeout(() => setSmtpSaveMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save SMTP configuration');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setSmtpTestLoading(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtpConnection(smtpConfig);
      setSmtpTestResult(res);
      setSmtpConfig((prev) => ({ ...prev, status: res.status as any }));
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        status: 'Connection Failed',
        message: err.message || 'SMTP connection verification failed',
      });
    } finally {
      setSmtpTestLoading(false);
    }
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

      {/* Dynamic Runtime SMTP Configuration Card (BACKENDFIXES4 Sections 17-23) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="pb-4 border-b border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Email & SMTP Configuration</h3>
              <p className="text-xs text-slate-500">Configure real-time outgoing mail dispatch without restarting the server.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                smtpConfig.status === 'Configured'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : smtpConfig.status === 'Authentication Failed' || smtpConfig.status === 'Connection Failed'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  smtpConfig.status === 'Configured'
                    ? 'bg-emerald-500 animate-pulse'
                    : smtpConfig.status === 'Authentication Failed' || smtpConfig.status === 'Connection Failed'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              {smtpConfig.status || 'Not Configured'}
            </span>
          </div>
        </div>

        {smtpSaveMessage && (
          <div className="mb-4 p-3 rounded-lg text-xs flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{smtpSaveMessage}</span>
          </div>
        )}

        {smtpTestResult && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              smtpTestResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {smtpTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{smtpTestResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSaveSmtp} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Host</label>
              <input
                type="text"
                name="smtpHost"
                value={smtpConfig.smtpHost}
                onChange={handleSmtpChange}
                placeholder="e.g. smtp.gmail.com or mail.privateemail.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Port</label>
              <input
                type="number"
                name="smtpPort"
                value={smtpConfig.smtpPort}
                onChange={handleSmtpChange}
                placeholder="587"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Security / Encryption Mode</label>
              <select
                name="smtpSecure"
                value={smtpConfig.smtpSecure ? 'true' : 'false'}
                onChange={handleSmtpChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="false">STARTTLS / Opportunistic TLS (Port 587)</option>
                <option value="true">SSL / TLS Direct (Port 465)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Username</label>
              <input
                type="text"
                name="smtpUser"
                value={smtpConfig.smtpUser}
                onChange={handleSmtpChange}
                placeholder="e.g. desk@memoria26.lk"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                SMTP Password / App Password
              </label>
              <input
                type="password"
                name="smtpPass"
                value={smtpConfig.smtpPass}
                onChange={handleSmtpChange}
                placeholder={smtpConfig.hasPassword ? '••••••••' : 'Enter SMTP password...'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                {smtpConfig.hasPassword
                  ? 'Password stored securely. Leave blank or •••••••• to keep current credentials.'
                  : 'Enter mailbox password or 16-character Google App Password.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sender Email Address</label>
              <input
                type="email"
                name="smtpFrom"
                value={smtpConfig.smtpFrom}
                onChange={handleSmtpChange}
                placeholder="e.g. no-reply@memoria26.lk"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Sender Display Name</label>
            <input
              type="text"
              name="senderName"
              value={smtpConfig.senderName}
              onChange={handleSmtpChange}
              placeholder="e.g. Memoria'26 Ticketing Desk"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {smtpResetFeedback && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{smtpResetFeedback}</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSmtpConnection}
                disabled={smtpTestLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {smtpTestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{smtpTestLoading ? 'Verifying Host & Auth...' : 'Test SMTP Connection'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSmtpResetModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Reset SMTP configuration to unconfigured default"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset SMTP</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={smtpSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {smtpSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{smtpSaving ? 'Saving Configuration...' : 'Save SMTP Configuration'}</span>
            </button>
          </div>
        </form>

        {/* Diagnostic Test Email Dispatch */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-800">Dispatch Diagnostic Test Email</h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Send an actual verification email to an inbox to verify that outbound port forwarding and DNS SPF/DKIM accept your dispatched mail.
          </p>

          {testEmailResult && (
            <div
              className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testEmailResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
              <span>{testEmailResult.message}</span>
            </div>
          )}

          <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              placeholder="Enter destination email address to receive test mail..."
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
              <span>{testEmailLoading ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </form>
        </div>
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

      {/* Password Confirmation Modal for Reset Database */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Authorize Database Reset</h3>
                <span className="text-[11px] text-slate-500">Security Challenge Required</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              You are about to reset the entire ticketing database. Please enter your administrator password to authorize this destructive operation.
            </p>

            {resetError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {resetError}
              </div>
            )}

            <form onSubmit={handleExecuteReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter your administrator password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setAdminPassword('');
                    setResetError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !adminPassword}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resetLoading ? 'Purging Database...' : 'Confirm & Wipe Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset SMTP (BACKENDFIXES6 Sections 1-5) */}
      {showSmtpResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-700">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reset SMTP Configuration?</h3>
                <span className="text-[11px] text-slate-500">Destructive administrative operation</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Reset SMTP configuration? Email sending will stop until valid SMTP settings are configured again.
              This removes persisted mail server credentials from the database and closes active transporter connections immediately.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSmtpResetModal(false)}
                disabled={smtpResetLoading}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSmtpReset}
                disabled={smtpResetLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {smtpResetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{smtpResetLoading ? 'Resetting SMTP...' : 'Confirm Reset SMTP'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
