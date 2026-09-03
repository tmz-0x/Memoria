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

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,

  login: async (email: string, password: string) => {
    // Artificial delay
    await new Promise((r) => setTimeout(r, 600));

    const normalizedEmail = email.trim().toLowerCase();
    const account = DEMO_USERS[normalizedEmail];

    if (account && account.pass === password.trim()) {
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(account.user));
      set({ user: account.user, isAuthenticated: true });
      return { success: true };
    }

    return { success: false, message: 'Invalid credentials. Use one of the demo logins.' };
  },

  logout: () => {
    localStorage.removeItem(STORAGE_AUTH_USER);
    set({ user: null, isAuthenticated: false });
  },
}));
