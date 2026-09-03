// Mock API with realistic 500-800ms delay and LocalStorage persistence

export interface Submission {
  id: string;
  ticketId?: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  paymentSlipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  approver?: string;
  checkedIn: boolean;
  checkedInAt?: string;
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

const STORAGE_KEY_SUBMISSIONS = 'memoria_submissions_v1';
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
  eventDate: 'Saturday, November 14, 2026',
  eventVenue: 'Nelum Pokuna Mahinda Rajapaksa Theatre, Colombo',
  totalCapacity: 800,
  remainingAllocation: 142,
  ticketPrice: 1000,
  cutoffDate: 'November 10, 2026',
  bankName: 'Bank of Ceylon',
  accountName: 'JPURA Voiceclub Memoria Account',
  accountNumber: '8942-0012-3841-992',
  branch: 'Colombo Fort Branch',
  announcement: 'Online ticket allocations are filling rapidly. Verification turnaround is currently under 24 hours.',
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
    return item ? JSON.parse(item) : fallback;
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
if (!localStorage.getItem(STORAGE_KEY_SUBMISSIONS)) setStored(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
if (!localStorage.getItem(STORAGE_KEY_USERS)) setStored(STORAGE_KEY_USERS, initialUsers);
if (!localStorage.getItem(STORAGE_KEY_SETTINGS)) setStored(STORAGE_KEY_SETTINGS, initialSettings);
if (!localStorage.getItem(STORAGE_KEY_HISTORY)) setStored(STORAGE_KEY_HISTORY, initialHistory);

export const api = {
  // POST /api/submissions
  submitTicket: async (data: {
    name: string;
    email: string;
    phone: string;
    quantity: number;
    paymentSlip: File | string;
  }): Promise<{ success: boolean; submissionId: string; message: string }> => {
    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    
    // Create base64 or fallback preview
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
      quantity: data.quantity,
      paymentSlipUrl: slipUrl,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      checkedIn: false,
    };

    subs.unshift(newSub);
    setStored(STORAGE_KEY_SUBMISSIONS, subs);

    // Update remaining allocation
    const settings = getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);
    settings.remainingAllocation = Math.max(0, settings.remainingAllocation - data.quantity);
    setStored(STORAGE_KEY_SETTINGS, settings);

    return {
      success: true,
      submissionId: newSub.id,
      message: 'Your registration was submitted successfully. Our team will verify your transfer within 24–48 hours.',
    };
  },

  // GET /api/admin/stats
  getAdminStats: async () => {
    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const settings = getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);

    const approved = subs.filter((s) => s.status === 'approved');
    const pending = subs.filter((s) => s.status === 'pending');
    const rejected = subs.filter((s) => s.status === 'rejected');
    const checkedIn = approved.filter((s) => s.checkedIn);

    const ticketsSold = approved.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalRevenue = ticketsSold * settings.ticketPrice;
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
    await delay();
    return getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);
  },

  // PUT /api/admin/event-settings
  updateEventSettings: async (newSettings: Partial<EventSettings>): Promise<EventSettings> => {
    await delay();
    const current = getStored<EventSettings>(STORAGE_KEY_SETTINGS, initialSettings);
    const updated = { ...current, ...newSettings };
    setStored(STORAGE_KEY_SETTINGS, updated);
    return updated;
  },

  // GET /api/admin/users
  getUsers: async (): Promise<User[]> => {
    await delay();
    return getStored<User[]>(STORAGE_KEY_USERS, initialUsers);
  },

  // POST /api/admin/users
  createUser: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
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
    await delay();
    const users = getStored<User[]>(STORAGE_KEY_USERS, initialUsers);
    const filtered = users.filter((u) => u.id !== id);
    setStored(STORAGE_KEY_USERS, filtered);
    return true;
  },

  // GET /api/admin/submissions
  getAllSubmissions: async (statusFilter?: 'all' | 'pending' | 'approved' | 'rejected'): Promise<Submission[]> => {
    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    if (!statusFilter || statusFilter === 'all') return subs;
    return subs.filter((s) => s.status === statusFilter);
  },

  // GET /api/approve/pending
  getPendingSubmissions: async (): Promise<Submission[]> => {
    await delay();
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    return subs.filter((s) => s.status === 'pending');
  },

  // POST /api/approve/:id
  approveSubmission: async (id: string, approverName: string): Promise<{ success: boolean; ticketId: string }> => {
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
    await delay();
    return getStored<ApprovalHistoryItem[]>(STORAGE_KEY_HISTORY, initialHistory);
  },

  // GET /api/checkin/stats
  getCheckinStats: async () => {
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

  // POST /api/checkin/qr-code or verify ticket
  verifyAndCheckIn: async (query: string): Promise<{
    valid: boolean;
    reason?: string;
    submission?: Submission;
  }> => {
    await delay(400, 600);
    const subs = getStored<Submission[]>(STORAGE_KEY_SUBMISSIONS, initialSubmissions);
    const normalized = query.trim().toUpperCase();

    const sub = subs.find(
      (s) =>
        (s.ticketId && s.ticketId.toUpperCase() === normalized) ||
        s.id.toUpperCase() === normalized ||
        s.name.toUpperCase().includes(normalized) ||
        s.email.toUpperCase() === normalized
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
};
