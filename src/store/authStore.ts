import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'approver' | 'staff';
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const STORAGE_AUTH_USER = 'memoria_auth_user_v1';

const DEMO_USERS: Record<string, { pass: string; user: AuthUser }> = {
  'admin@memoria.lk': {
    pass: 'admin123',
    user: { id: 'usr-1', name: 'Alexander Cross', email: 'admin@memoria.lk', role: 'admin' },
  },
  'approver@memoria.lk': {
    pass: 'approve123',
    user: { id: 'usr-2', name: 'Elena Vance', email: 'approver@memoria.lk', role: 'approver' },
  },
  'staff@memoria.lk': {
    pass: 'staff123',
    user: { id: 'usr-3', name: 'Marcus Chen', email: 'staff@memoria.lk', role: 'staff' },
  },
};

const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_AUTH_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();

const STORAGE_AUTH_TOKEN = 'memoria_auth_token_v1';

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,

  login: async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: trimmedPass }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token && data.user) {
          localStorage.setItem(STORAGE_AUTH_TOKEN, data.token);
          localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(data.user));
          set({ user: data.user, isAuthenticated: true });
          return { success: true };
        }
      }

      const errData = await res.json().catch(() => null);
      const message = errData?.message || 'Invalid credentials. Please verify your email and password.';
      return { success: false, message };
    } catch {
      // Offline / network fallback using demo users
      const account = DEMO_USERS[normalizedEmail];
      if (account && account.pass === trimmedPass) {
        localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(account.user));
        set({ user: account.user, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials or backend unavailable.' };
    }
  },

  logout: () => {
    try {
      const token = localStorage.getItem(STORAGE_AUTH_TOKEN);
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
    localStorage.removeItem(STORAGE_AUTH_TOKEN);
    localStorage.removeItem(STORAGE_AUTH_USER);
    set({ user: null, isAuthenticated: false });
  },
}));
