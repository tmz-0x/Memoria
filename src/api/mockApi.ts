// Mock API with realistic 500-800ms delay and LocalStorage persistence

export interface Submission {
  id: string;
  ticketId?: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  ticketType: 'student' | 'outsider';
  universityRegistrationNumber?: string | null;
  totalPrice: number;
  paymentSlipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  approver?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  emailStatus?: string;
  emailSentAt?: string | null;
  emailLastError?: string | null;
  emailAttemptCount?: number;
  qrToken?: string;
  qrPayload?: string;
  qrImageData?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'approver' | 'staff';
  createdAt: string;
}

export interface EventSettings {
  eventName: string;
  tagline: string;
  eventDate: string;
  eventVenue: string;
  totalCapacity: number;
  remainingAllocation: number;
  ticketPrice: number;
  cutoffDate: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  announcement: string;
}

export interface ApprovalHistoryItem {
  id: string;
  submissionId: string;
  attendeeName: string;
  action: 'approved' | 'rejected';
  approver: string;
  timestamp: string;
  reason?: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  eventType: string;
  action: string;
  module: string;
  message: string;
  userId?: string | null;
  username?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  httpMethod?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  stackTrace?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface SystemError extends SystemAuditLog {
  resolutionStatus: 'open' | 'investigating' | 'resolved' | 'ignored';
  resolutionNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
}

export interface SmtpConfigSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  hasPassword?: boolean;
  smtpSecure: boolean;
  smtpFrom: string;
  senderName: string;
  status: 'Configured' | 'Not Configured' | 'Connection Failed' | 'Authentication Failed';
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface AttendanceStatistics {
  totalTicketsIssued: number;
  totalValidTickets: number;
  totalCheckedIn: number;
  totalNotCheckedIn: number;
  totalApprovedTickets: number;
  totalPendingTickets: number;
  totalRejectedScans: number;
  totalDuplicateScanAttempts: number;
  checkedInCount: number;
  percentage: number;
  attendanceRate: number;
  lastUpdated: string;
}

const STORAGE_KEY_SUBMISSIONS = 'memoria_submissions_v2';
const STORAGE_KEY_USERS = 'memoria_users_v1';
const STORAGE_KEY_SETTINGS = 'memoria_settings_v1';
const STORAGE_KEY_HISTORY = 'memoria_history_v1';

const delay = (min = 500, max = 800) =>
  new Promise((res) => setTimeout(res, Math.floor(Math.random() * (max - min + 1)) + min));

// Initial seed data
const initialSubmissions: Submission[] = [
  {
    id: 'sub-001',
    ticketId: 'MEM-26-9041',
    name: 'Kavinda Perera',
    email: 'kavinda.p@gmail.com',
    phone: '+94 77 123 4567',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'approved',
    submittedAt: '2026-10-18T10:14:00Z',
    approvedAt: '2026-10-18T14:30:00Z',
    approver: 'Elena Vance',
    checkedIn: true,
    checkedInAt: '2026-11-14T17:45:00Z',
  },
  {
    id: 'sub-002',
    name: 'Ananya Jayawardena',
    email: 'ananya.j@outlook.com',
    phone: '+94 71 987 6543',
    quantity: 1,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 1000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-20T09:12:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-003',
    name: 'Nuwan Senanayake',
    email: 'nuwan.sena@gmail.com',
    phone: '+94 76 543 2198',
    quantity: 4,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 4000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-20T11:45:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-004',
    ticketId: 'MEM-26-9042',
    name: 'Dilhara Fernando',
    email: 'dilhara.f@gmail.com',
    phone: '+94 70 334 5566',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'approved',
    submittedAt: '2026-10-19T13:20:00Z',
    approvedAt: '2026-10-19T16:00:00Z',
    approver: 'Alexander Cross',
    checkedIn: false,
  },
  {
    id: 'sub-005',
    name: 'Sanduni Wickramasinghe',
    email: 'sanduni.w@yahoo.com',
    phone: '+94 77 889 0011',
    quantity: 1,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 1000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-21T08:30:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-006',
    name: 'Sahan Rajapaksha',
    email: 'sahan.r@gmail.com',
    phone: '+94 75 112 2334',
    quantity: 3,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 3000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'rejected',
    rejectionReason: 'Invalid bank transaction reference. Amount mismatched.',
    submittedAt: '2026-10-17T15:00:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-007',
    name: 'Minoli De Silva',
    email: 'minoli.ds@gmail.com',
    phone: '+94 71 445 5667',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-21T14:10:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-008',
    ticketId: 'MEM-26-9043',
    name: 'Harsha Bandara',
    email: 'harsha.b@gmail.com',
    phone: '+94 78 223 3445',
    quantity: 1,
    ticketType: 'student',
    universityRegistrationNumber: 'FC119402',
    totalPrice: 200,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'approved',
    submittedAt: '2026-10-19T17:15:00Z',
    approvedAt: '2026-10-20T09:40:00Z',
    approver: 'Elena Vance',
    checkedIn: true,
    checkedInAt: '2026-11-14T18:02:00Z',
  },
  {
    id: 'sub-009',
    name: 'Tharindu Alwis',
    email: 'tharindu.alwis@gmail.com',
    phone: '+94 77 667 7889',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-22T07:50:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-010',
    ticketId: 'MEM-26-9044',
    name: 'Ruwanthi Karunaratne',
    email: 'ruwanthi.k@gmail.com',
    phone: '+94 76 990 0112',
    quantity: 1,
    ticketType: 'student',
    universityRegistrationNumber: 'AS104921',
    totalPrice: 200,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'approved',
    submittedAt: '2026-10-18T18:40:00Z',
    approvedAt: '2026-10-19T10:00:00Z',
    approver: 'Elena Vance',
    checkedIn: false,
  },
  {
    id: 'sub-011',
    name: 'Nipuna Madushanka',
    email: 'nipuna.m@gmail.com',
    phone: '+94 72 332 2110',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-22T10:05:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-012',
    ticketId: 'MEM-26-9045',
    name: 'Chamari Atapattu',
    email: 'chamari.a@gmail.com',
    phone: '+94 77 554 4332',
    quantity: 4,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 4000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'approved',
    submittedAt: '2026-10-18T09:20:00Z',
    approvedAt: '2026-10-18T11:00:00Z',
    approver: 'Alexander Cross',
    checkedIn: false,
  },
  {
    id: 'sub-013',
    name: 'Dasun Shanaka',
    email: 'dasun.s@gmail.com',
    phone: '+94 70 887 7665',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-22T12:30:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-014',
    name: 'Gayathri Liyanage',
    email: 'gayathri.l@gmail.com',
    phone: '+94 71 223 3441',
    quantity: 1,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 1000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'pending',
    submittedAt: '2026-10-22T13:15:00Z',
    checkedIn: false,
  },
  {
    id: 'sub-015',
    ticketId: 'MEM-26-9046',
    name: 'Praveen Jayasuriya',
    email: 'praveen.j@gmail.com',
    phone: '+94 78 119 9882',
    quantity: 2,
    ticketType: 'outsider',
    universityRegistrationNumber: null,
    totalPrice: 2000,
    paymentSlipUrl: '/assets/candlelit-venue.jpg',
    status: 'approved',
    submittedAt: '2026-10-17T12:00:00Z',
    approvedAt: '2026-10-17T16:20:00Z',
    approver: 'Elena Vance',
    checkedIn: true,
    checkedInAt: '2026-11-14T17:30:00Z',
  },
];

const initialUsers: User[] = [
  { id: 'usr-1', name: 'Alexander Cross', email: 'admin@memoria.lk', role: 'admin', createdAt: '2026-09-01T08:00:00Z' },
  { id: 'usr-2', name: 'Elena Vance', email: 'approver@memoria.lk', role: 'approver', createdAt: '2026-09-05T09:30:00Z' },
  { id: 'usr-3', name: 'Marcus Chen', email: 'staff@memoria.lk', role: 'staff', createdAt: '2026-09-10T11:00:00Z' },
  { id: 'usr-4', name: 'Devon Samarasinghe', email: 'devon@memoria.lk', role: 'approver', createdAt: '2026-09-12T14:15:00Z' },
  { id: 'usr-5', name: 'Samadhi Jayakody', email: 'samadhi@memoria.lk', role: 'staff', createdAt: '2026-09-15T16:00:00Z' },
];

const initialSettings: EventSettings = {
  eventName: "Memoria'26",
  tagline: 'The Eclipse of Memories',
  eventDate: 'Tuesday, October 13, 2026',
  eventVenue: 'Gal Pittaniya premises, University of Sri Jayewardenepura',
  totalCapacity: 800,
  remainingAllocation: 142,
  ticketPrice: 1000,
  cutoffDate: 'October 13, 2026',
  bankName: 'Bank of Ceylon',
  accountName: 'JPURA Voiceclub Memoria Account',
  accountNumber: '8942-0012-3841-992',
  branch: 'Colombo Fort Branch',
  announcement: 'Online registrations are open. Verification turnaround is currently under 24 hours.',
};

const initialHistory: ApprovalHistoryItem[] = [
  {
    id: 'hist-1',
    submissionId: 'sub-001',
    attendeeName: 'Kavinda Perera',
    action: 'approved',
    approver: 'Elena Vance',
    timestamp: '2026-10-18T14:30:00Z',
  },
  {
    id: 'hist-2',
    submissionId: 'sub-004',
    attendeeName: 'Dilhara Fernando',
    action: 'approved',
    approver: 'Alexander Cross',
    timestamp: '2026-10-19T16:00:00Z',
  },
  {
    id: 'hist-3',
    submissionId: 'sub-006',
    attendeeName: 'Sahan Rajapaksha',
    action: 'rejected',
    approver: 'Elena Vance',
    timestamp: '2026-10-18T10:10:00Z',
    reason: 'Invalid bank transaction reference. Amount mismatched.',
  },
  {
    id: 'hist-4',
    submissionId: 'sub-008',
    attendeeName: 'Harsha Bandara',
    action: 'approved',
    approver: 'Elena Vance',
    timestamp: '2026-10-20T09:40:00Z',
  },
  {
    id: 'hist-5',
    submissionId: 'sub-010',
    attendeeName: 'Ruwanthi Karunaratne',
    action: 'approved',
    approver: 'Elena Vance',
    timestamp: '2026-10-19T10:00:00Z',
  },
  {
    id: 'hist-6',
    submissionId: 'sub-015',
    attendeeName: 'Praveen Jayasuriya',
    action: 'approved',
    approver: 'Elena Vance',
    timestamp: '2026-10-17T16:20:00Z',
  },
];

// LocalStorage helpers
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (key === STORAGE_KEY_SUBMISSIONS && Array.isArray(parsed)) {
      return parsed.map((s: any) => ({
        ...s,
        ticketType: s.ticketType || 'outsider',
        universityRegistrationNumber: s.universityRegistrationNumber || null,
        totalPrice: s.totalPrice ?? (s.ticketType === 'student' ? 200 : (s.quantity || 1) * 1000),
      })) as unknown as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// Ensure initial state exists
if (!localStorage.getItem(STORAGE_KEY_SUBMISSIONS)) {
  const oldV1 = localStorage.getItem('memoria_submissions_v1');
  if (oldV1) {
    try {
      const parsed = JSON.parse(oldV1);
      const migrated = parsed.map((s: any) => ({
        ...s,
        ticketType: s.ticketType || 'outsider',
        universityRegistrationNumber: s.universityRegistrationNumber || null,
        totalPrice: s.totalPrice ?? (s.ticketType === 'student' ? 200 : (s.quantity || 1) * 1000),
      }));
      setStored(STORAGE_KEY_SUBMISSIONS, migrated);
    } catch {
      setStored(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    }
  } else {
    setStored(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
  }
}
if (!localStorage.getItem(STORAGE_KEY_USERS)) setStored(STORAGE_KEY_USERS, initialUsers);
if (!localStorage.getItem(STORAGE_KEY_SETTINGS)) setStored(STORAGE_KEY_SETTINGS, initialSettings);
if (!localStorage.getItem(STORAGE_KEY_HISTORY)) setStored(STORAGE_KEY_HISTORY, initialHistory);

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = localStorage.getItem('memoria_auth_token_v1');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
};

export const api = {
  // POST /api/tickets
  submitTicket: async (data: {
    name: string;
    email: string;
    phone: string;
    quantity?: number;
    paymentSlip: File | string;
    ticketType: 'student' | 'outsider';
    universityRegistrationNumber?: string | null;
  }): Promise<{ success: boolean; submissionId: string; message: string }> => {
    try {
      let res: Response;
      if (data.paymentSlip instanceof File) {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('email', data.email);
        formData.append('phone', data.phone);
        formData.append('ticketType', data.ticketType);
        if (data.quantity) formData.append('quantity', String(data.quantity));
        if (data.universityRegistrationNumber) {
          formData.append('universityRegistrationNumber', data.universityRegistrationNumber);
        }
        formData.append('paymentSlip', data.paymentSlip);

        res = await fetch('/api/tickets', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone,
            ticketType: data.ticketType,
            quantity: data.quantity,
            universityRegistrationNumber: data.universityRegistrationNumber,
            paymentSlipUrl: data.paymentSlip,
          }),
        });
      }

      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || 'Ticket submission failed.');
    } catch (err: any) {
      // If error came from backend with structured message, throw it
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      // Offline fallback
      await delay();
      const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);

      const ticketType: 'student' | 'outsider' = data.ticketType === 'student' ? 'student' : 'outsider';
      let validatedRegNumber: string | null = null;
      let quantity = 1;
      let totalPrice = 1000;

      if (ticketType === 'student') {
        const rawReg = (data.universityRegistrationNumber || '').trim();
        if (!rawReg) {
          throw new Error('Please enter a valid university registration number.');
        }
        const normalizedReg = rawReg.toUpperCase();
        const regPattern = /^[A-Z]{2,3}\d{5,7}$/;
        if (!regPattern.test(normalizedReg)) {
          throw new Error('Please enter a valid university registration number (e.g. FC122716).');
        }

        const alreadyIssued = subs.some(
          (s) =>
            s.ticketType === 'student' &&
            s.universityRegistrationNumber?.toUpperCase() === normalizedReg &&
            s.status !== 'rejected'
        );

        if (alreadyIssued) {
          throw new Error('A university student ticket has already been issued for this registration number.');
        }

        validatedRegNumber = normalizedReg;
        quantity = 1;
        totalPrice = 200;
      } else {
        validatedRegNumber = null;
        quantity = Math.max(1, Math.min(5, Number(data.quantity) || 1));
        totalPrice = quantity * 1000;
      }

      let slipUrl = '/assets/candlelit-venue.jpg';
      if (typeof data.paymentSlip === 'string') {
        slipUrl = data.paymentSlip;
      } else if (data.paymentSlip instanceof File) {
        slipUrl = URL.createObjectURL(data.paymentSlip);
      }

      const newSub: Submission = {
        id: `sub-${Date.now().toString().slice(-4)}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        quantity,
        ticketType,
        universityRegistrationNumber: validatedRegNumber,
        totalPrice,
        paymentSlipUrl: slipUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        checkedIn: false,
      };

      subs.unshift(newSub);
      setStored(STORAGE_KEY_SUBMISSIONS, subs);

      return {
        success: true,
        submissionId: newSub.id,
        message: 'Your registration was submitted successfully. Our team will verify your transfer within 24–48 hours.',
      };
    }
  },

  // GET /api/admin/stats
  getAdminStats: async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const settings = getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);

    const approved = subs.filter((s) => s.status === 'approved');
    const pending = subs.filter((s) => s.status === 'pending');
    const rejected = subs.filter((s) => s.status === 'rejected');
    const checkedIn = approved.filter((s) => s.checkedIn);

    const ticketsSold = approved.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalRevenue = approved.reduce(
      (acc, curr) => acc + (curr.totalPrice ?? (curr.ticketType === 'student' ? 200 : curr.quantity * 1000)),
      0
    );
    const pendingTickets = pending.reduce((acc, curr) => acc + curr.quantity, 0);

    return {
      totalRevenue,
      ticketsSold,
      pendingCount: pending.length,
      pendingTickets,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalSubmissions: subs.length,
      checkedInCount: checkedIn.reduce((acc, curr) => acc + curr.quantity, 0),
      totalCapacity: settings.totalCapacity,
      remainingAllocation: settings.remainingAllocation,
    };
  },

  // GET /api/admin/event-settings
  getEventSettings: async (): Promise<EventSettings> => {
    try {
      const res = await fetch('/api/admin/event-settings');
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    return getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);
  },

  // PUT /api/admin/event-settings
  updateEventSettings: async (newSettings: Partial<EventSettings>): Promise<EventSettings> => {
    try {
      const res = await fetch('/api/admin/event-settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSettings),
      });
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    const current = getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);
    const updated = { ...current, ...newSettings };
    setStored(STORAGE_KEY_SETTINGS, updated);
    return updated;
  },

  // GET /api/admin/users
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    return getStored<User[]>(STORAGE_KEY_USERS, initialUsers);
  },

  // POST /api/admin/users
  createUser: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to create user');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    const users = getStored<User[]>(STORAGE_KEY_USERS, initialUsers);
    const newUser: User = {
      ...user,
      id: `usr-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setStored(STORAGE_KEY_USERS, users);
    return newUser;
  },

  // DELETE /api/admin/users/:id
  deleteUser: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch {}

    await delay();
    const users = getStored<User[]>(STORAGE_KEY_USERS, initialUsers);
    const filtered = users.filter((u) => u.id !== id);
    setStored(STORAGE_KEY_USERS, filtered);
    return true;
  },

  // GET /api/admin/submissions
  getAllSubmissions: async (statusFilter?: 'all' | 'pending' | 'approved' | 'rejected'): Promise<Submission[]> => {
    try {
      const url = statusFilter && statusFilter !== 'all'
        ? `/api/admin/submissions?status=${statusFilter}`
        : '/api/admin/submissions';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    if (!statusFilter || statusFilter === 'all') return subs;
    return subs.filter((s) => s.status === statusFilter);
  },

  // GET /api/approve/pending
  getPendingSubmissions: async (): Promise<Submission[]> => {
    try {
      const res = await fetch('/api/approve/pending', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    return subs.filter((s) => s.status === 'pending');
  },

  // POST /api/approve/:id
  approveSubmission: async (id: string, approverName: string): Promise<{
    success: boolean;
    ticketId: string;
    emailSent?: boolean;
    emailStatus?: string;
    emailError?: string;
    recipientEmail?: string;
    attendeeName?: string;
  }> => {
    try {
      const res = await fetch(`/api/approve/approve/${id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approverName }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Approval failed');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const history = getStored<ApprovalHistoryItem[]>(STORAGE_KEY_HISTORY, initialHistory);

    const ticketId = `MEM-26-${Math.floor(1000 + Math.random() * 9000)}`;
    let attendee = '';

    const updatedSubs = subs.map((s) => {
      if (s.id === id) {
        attendee = s.name;
        return {
          ...s,
          status: 'approved' as const,
          ticketId,
          approvedAt: new Date().toISOString(),
          approver: approverName,
        };
      }
      return s;
    });

    setStored(STORAGE_KEY_SUBMISSIONS, updatedSubs);

    history.unshift({
      id: `hist-${Date.now()}`,
      submissionId: id,
      attendeeName: attendee,
      action: 'approved',
      approver: approverName,
      timestamp: new Date().toISOString(),
    });
    setStored(STORAGE_KEY_HISTORY, history);

    return { success: true, ticketId };
  },

  // POST /api/reject/:id
  rejectSubmission: async (id: string, approverName: string, reason: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`/api/approve/reject/${id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approverName, reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Rejection failed');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const history = getStored<ApprovalHistoryItem[]>(STORAGE_KEY_HISTORY, initialHistory);

    let attendee = '';
    const updatedSubs = subs.map((s) => {
      if (s.id === id) {
        attendee = s.name;
        return {
          ...s,
          status: 'rejected' as const,
          rejectionReason: reason,
          approver: approverName,
        };
      }
      return s;
    });

    setStored(STORAGE_KEY_SUBMISSIONS, updatedSubs);

    history.unshift({
      id: `hist-${Date.now()}`,
      submissionId: id,
      attendeeName: attendee,
      action: 'rejected',
      approver: approverName,
      timestamp: new Date().toISOString(),
      reason,
    });
    setStored(STORAGE_KEY_HISTORY, history);

    return { success: true };
  },

  // GET /api/approve/history
  getApprovalHistory: async (): Promise<ApprovalHistoryItem[]> => {
    try {
      const res = await fetch('/api/approve/history', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}

    await delay();
    return getStored<ApprovalHistoryItem[]>(STORAGE_KEY_HISTORY, initialHistory);
  },

  // GET /api/checkin/stats
  getCheckinStats: async () => {
    try {
      const res = await fetch('/api/checkin/stats', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}

    await delay(300, 500);
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const approved = subs.filter((s) => s.status === 'approved');
    const checkedIn = approved.filter((s) => s.checkedIn);

    const checkedInCount = checkedIn.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalApprovedTickets = approved.reduce((acc, curr) => acc + curr.quantity, 0);

    return {
      checkedInCount,
      totalApprovedTickets,
      percentage: totalApprovedTickets > 0 ? Math.round((checkedInCount / totalApprovedTickets) * 100) : 0,
    };
  },

  // POST /api/checkin/verify
  verifyAndCheckIn: async (query: string): Promise<{
    valid: boolean;
    reason?: string;
    submission?: Submission;
  }> => {
    try {
      const res = await fetch('/api/checkin/verify', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      return { valid: false, reason: err?.message || 'Verification failed.' };
    } catch {}

    await delay(400, 600);
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const normalized = query.trim().toUpperCase();

    const sub = subs.find(
      (s) =>
        (s.ticketId && s.ticketId.toUpperCase() === normalized) ||
        s.id.toUpperCase() === normalized ||
        s.name.toUpperCase().includes(normalized) ||
        s.email.toUpperCase() === normalized ||
        (s.universityRegistrationNumber && s.universityRegistrationNumber.toUpperCase() === normalized)
    );

    if (!sub) {
      return { valid: false, reason: 'Ticket or Attendee record not found in system.' };
    }

    if (sub.status === 'rejected') {
      return { valid: false, reason: `Ticket application was rejected (${sub.rejectionReason || 'Declined'}).` };
    }

    if (sub.status === 'pending') {
      return { valid: false, reason: 'Payment transfer verification is still PENDING.' };
    }

    if (sub.checkedIn) {
      return {
        valid: false,
        reason: `ALREADY ADMITTED at ${new Date(sub.checkedInAt || '').toLocaleTimeString()} by Staff.`,
        submission: sub,
      };
    }

    // Confirm check in
    const updated = subs.map((s) => {
      if (s.id === sub.id) {
        return {
          ...s,
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
        };
      }
      return s;
    });
    setStored(STORAGE_KEY_SUBMISSIONS, updated);

    return {
      valid: true,
      submission: { ...sub, checkedIn: true, checkedInAt: new Date().toISOString() },
    };
  },

  // PUT /api/admin/submissions/:id
  updateSubmission: async (id: string, data: Partial<Submission>): Promise<Submission> => {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to update submission');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    let updatedSub: Submission | null = null;
    const updated = subs.map((s) => {
      if (s.id === id) {
        updatedSub = { ...s, ...data };
        return updatedSub;
      }
      return s;
    });
    setStored(STORAGE_KEY_SUBMISSIONS, updated);
    return updatedSub || (data as Submission);
  },

  // DELETE /api/admin/submissions/:id
  deleteSubmission: async (id: string, reason?: string, permanent = false): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirm: true, reason, permanent }),
      });
      if (res.ok) return true;
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to delete submission');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const filtered = subs.filter((s) => s.id !== id);
    setStored(STORAGE_KEY_SUBMISSIONS, filtered);
    return true;
  },

  // POST /api/admin/tickets/:id/regenerate-qr
  regenerateQR: async (id: string, reason?: string): Promise<{ success: boolean; qrToken: string; qrImageData: string; emailSent?: boolean; emailError?: string; message?: string }> => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}/regenerate-qr`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirm: true, reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to regenerate QR');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    return {
      success: true,
      qrToken: `new_token_${Date.now()}`,
      qrImageData: '/assets/sample-qr.png',
      emailSent: true,
    };
  },

  // POST /api/admin/tickets/:id/resend-qr-email
  resendRegeneratedQrEmail: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`/api/admin/tickets/${id}/resend-qr-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to resend regenerated QR email');
  },

  // POST /api/admin/submissions/:id/resend-email
  resendTicketEmail: async (id: string): Promise<{ success: boolean; message: string; error?: string; emailStatus?: string }> => {
    const res = await fetch(`/api/admin/submissions/${id}/resend-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to resend ticket pass email');
  },

  // POST /api/admin/database/reset
  resetDatabase: async (password: string): Promise<{ success: boolean; message: string; stats?: any }> => {
    try {
      const res = await fetch('/api/admin/database/reset', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirm: true, password }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Database reset failed');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    setStored(STORAGE_KEY_SUBMISSIONS, []);
    setStored(STORAGE_KEY_HISTORY, []);
    return { success: true, message: 'Database reset successfully' };
  },

  // POST /api/admin/admins
  createAdminAccount: async (adminData: { name: string; email: string; password?: string }): Promise<User> => {
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(adminData),
      });
      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to create admin account');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
    }

    await delay();
    return {
      id: `usr-adm-${Date.now()}`,
      name: adminData.name,
      email: adminData.email,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
  },

  // PATCH /api/admin/password
  changePassword: async (currentPassword: string, newPassword: string, confirmPassword?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to update password');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
      throw err;
    }
  },

  // POST /api/admin/email/test
  sendTestEmail: async (recipientEmail: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientEmail }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send test email' };
    }
  },

  // POST /api/approve/alert
  triggerAdminAlert: async (submissionId: string, reason: string): Promise<{ success: boolean; alertId?: string }> => {
    try {
      const res = await fetch('/api/approve/alert', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ submissionId, reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to trigger alert');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
      return { success: true, alertId: `alrt-${Date.now()}` };
    }
  },

  // GET /api/admin/alerts
  getAdminAlerts: async (): Promise<any[]> => {
    try {
      const res = await fetch('/api/admin/alerts', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}
    return [];
  },

  // POST /api/admin/alerts/:id/resolve
  resolveAdminAlert: async (alertId: string, note?: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: true };
  },

  // GET /api/admin/tickets/:id/qr (Fixes 3 Sections 11-14)
  getTicketQR: async (ticketOrSubId: string): Promise<any> => {
    const res = await fetch(`/api/admin/tickets/${ticketOrSubId}/qr`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to retrieve ticket QR credentials');
  },

  // GET /api/approve/stats (Fixes 3 Sections 7 & 9)
  getApprovalStats: async (): Promise<any> => {
    try {
      const res = await fetch('/api/approve/stats', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}
    return await api.getAdminStats();
  },

  // GET /api/admin/statistics (Fixes 3 Section 3)
  getStatistics: async (): Promise<any> => {
    return await api.getAdminStats();
  },

  // Dedicated System Audit Logs (BACKENDFIXES4 Sections 4-5)
  getAuditLogs: async (params: {
    page?: number;
    limit?: number;
    severity?: string;
    eventType?: string;
    module?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ logs: SystemAuditLog[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.severity && params.severity !== 'all') query.set('severity', params.severity);
      if (params.eventType && params.eventType !== 'all') query.set('eventType', params.eventType);
      if (params.module && params.module !== 'all') query.set('module', params.module);
      if (params.search) query.set('search', params.search);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);

      const res = await fetch(`/api/admin/audit-logs?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to retrieve system audit logs');
    } catch (err: any) {
      throw err;
    }
  },

  clearAuditLogs: async (reason?: string, beforeDate?: string): Promise<{ success: boolean; deletedCount: number; message: string }> => {
    const res = await fetch('/api/admin/audit-logs/clear', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirm: true, reason, beforeDate }),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to clear audit logs');
  },

  clearSubmissionLogs: async (reason?: string, beforeDate?: string): Promise<{ success: boolean; deletedCount: number; message: string }> => {
    const res = await fetch('/api/admin/submissions/logs/clear', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirm: true, reason, beforeDate }),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to clear submission history logs');
  },

  // Dedicated System Errors Engine (BACKENDFIXES5 Sections 26-29)
  getSystemErrors: async (params: {
    page?: number;
    limit?: number;
    severity?: string;
    module?: string;
    resolutionStatus?: string;
    search?: string;
    requestId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ errors: SystemError[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.severity && params.severity !== 'all') query.set('severity', params.severity);
      if (params.module && params.module !== 'all') query.set('module', params.module);
      if (params.resolutionStatus && params.resolutionStatus !== 'all') query.set('resolutionStatus', params.resolutionStatus);
      if (params.search) query.set('search', params.search);
      if (params.requestId) query.set('requestId', params.requestId);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);

      const res = await fetch(`/api/admin/system-errors?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to retrieve system errors');
    } catch (err: any) {
      throw err;
    }
  },

  clearSystemErrors: async (reason?: string, beforeDate?: string, module?: string): Promise<{ success: boolean; deletedCount: number; message: string }> => {
    const res = await fetch('/api/admin/system-errors/clear', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirm: true, reason, beforeDate, module }),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to clear system error logs');
  },

  updateSystemErrorStatus: async (
    id: string,
    status: 'open' | 'investigating' | 'resolved' | 'ignored',
    note?: string
  ): Promise<{ success: boolean; message: string; error?: any }> => {
    const res = await fetch(`/api/admin/system-errors/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, note }),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to update error status');
  },

  // Admin Resets User Password (BACKENDFIXES4 Section 7)
  resetUserPassword: async (userId: string, newPassword?: string, confirmPassword?: string): Promise<{ success: boolean; message: string; temporaryPassword?: string }> => {
    const res = await fetch(`/api/admin/users/${userId}/password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to reset user password');
  },

  // Dynamic Runtime SMTP Settings (BACKENDFIXES4 Sections 17-23)
  getSmtpConfig: async (): Promise<SmtpConfigSettings> => {
    try {
      const res = await fetch('/api/admin/smtp/config', {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to load SMTP configuration');
    } catch (err: any) {
      if (!err.message?.includes('fetch') && !err.message?.includes('NetworkError')) throw err;
      return {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        hasPassword: false,
        smtpSecure: false,
        smtpFrom: 'tickets@memoria.lk',
        senderName: "Memoria'26 Ticketing Desk",
        status: 'Not Configured',
      };
    }
  },

  updateSmtpConfig: async (configData: Partial<SmtpConfigSettings>): Promise<{ success: boolean; message: string; config: SmtpConfigSettings }> => {
    const res = await fetch('/api/admin/smtp/config', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to save SMTP configuration');
  },

  testSmtpConnection: async (configData?: Partial<SmtpConfigSettings>): Promise<{ success: boolean; status: string; message: string }> => {
    const res = await fetch('/api/admin/smtp/test-connection', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(configData || {}),
    });
    return await res.json();
  },

  // Reset SMTP Configuration to unconfigured default (BACKENDFIXES6 Sections 1-5)
  resetSmtpConfig: async (): Promise<{ success: boolean; message: string; config: SmtpConfigSettings }> => {
    const res = await fetch('/api/admin/smtp/reset', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to reset SMTP configuration');
  },

  // Authoritative Gate Attendance Statistics (BACKENDFIXES4 Section 10 & 13)
  getAttendanceStatistics: async (): Promise<AttendanceStatistics> => {
    try {
      const res = await fetch('/api/checkin/statistics', {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}
    const checkinStats = await api.getCheckinStats();
    return {
      totalTicketsIssued: checkinStats.totalApprovedTickets,
      totalValidTickets: checkinStats.totalApprovedTickets,
      totalCheckedIn: checkinStats.checkedInCount,
      totalNotCheckedIn: Math.max(0, checkinStats.totalApprovedTickets - checkinStats.checkedInCount),
      totalApprovedTickets: checkinStats.totalApprovedTickets,
      totalPendingTickets: 0,
      totalRejectedScans: 0,
      totalDuplicateScanAttempts: 0,
      checkedInCount: checkinStats.checkedInCount,
      percentage: checkinStats.percentage,
      attendanceRate: checkinStats.percentage,
      lastUpdated: new Date().toISOString(),
    };
  },

  getAttendanceStats: async (): Promise<AttendanceStatistics> => {
    return api.getAttendanceStatistics();
  },
};
