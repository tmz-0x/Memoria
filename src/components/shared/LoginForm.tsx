import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, Sparkles, CheckCircle } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      const { user } = useAuthStore.getState();
      if (user?.role === 'admin') navigate('/admin');
      else if (user?.role === 'approver') navigate('/approve');
      else if (user?.role === 'staff') navigate('/checkin');
      else navigate('/');
    } else {
      setError(res.message || 'Authentication failed');
    }
  };

  const fillCredentials = (role: 'admin' | 'approver' | 'staff') => {
    if (role === 'admin') {
      setEmail('admin@memoria.lk');
      setPassword('admin123');
    } else if (role === 'approver') {
      setEmail('approver@memoria.lk');
      setPassword('approve123');
    } else if (role === 'staff') {
      setEmail('staff@memoria.lk');
      setPassword('staff123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white font-heading">
          Management Portal Login
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Neutral administrative gateway for Admin, Approver, and Gate Staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-6 shadow-2xl border border-slate-700 sm:rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Staff Email Address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@memoria.lk"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Click Demo Credentials to Auto-Fill:
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-center font-medium border border-slate-600 transition-colors"
              >
                <strong className="block text-white text-[11px]">Admin</strong>
                <span className="text-[9px] text-blue-400">admin@memoria.lk</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('approver')}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-center font-medium border border-slate-600 transition-colors"
              >
                <strong className="block text-white text-[11px]">Approver</strong>
                <span className="text-[9px] text-amber-400">approver@memoria.lk</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('staff')}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-center font-medium border border-slate-600 transition-colors"
              >
                <strong className="block text-white text-[11px]">Staff</strong>
                <span className="text-[9px] text-emerald-400">staff@memoria.lk</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
              &larr; Return to Public Experience
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
