import bcrypt from 'bcryptjs';
import { db } from './database';

export function seedDatabase() {
  // 1. Seed Users if empty
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const users = [
      { id: 'usr-1', name: 'Alexander Cross', email: 'admin@memoria.lk', pass: 'admin123', role: 'admin' },
      { id: 'usr-2', name: 'Elena Vance', email: 'approver@memoria.lk', pass: 'approve123', role: 'approver' },
      { id: 'usr-3', name: 'Marcus Chen', email: 'staff@memoria.lk', pass: 'staff123', role: 'staff' },
      { id: 'usr-4', name: 'Devon Samarasinghe', email: 'devon@memoria.lk', pass: 'devon123', role: 'approver' },
      { id: 'usr-5', name: 'Samadhi Jayakody', email: 'samadhi@memoria.lk', pass: 'samadhi123', role: 'staff' },
    ];

    const seedUsersTx = db.transaction(() => {
      for (const u of users) {
        const hash = bcrypt.hashSync(u.pass, 10);
        insertUser.run(u.id, u.name, u.email, hash, u.role, new Date().toISOString());
      }
    });
    seedUsersTx();
  }

  // 2. Seed Event Settings if empty
  const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM event_settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO event_settings (
        id, event_name, tagline, event_date, event_venue, total_capacity,
        remaining_allocation, ticket_price, cutoff_date, bank_name,
        account_name, account_number, branch, announcement, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      "Memoria'26",
      'The Eclipse of Memories',
      'Tuesday, October 13, 2026',
      'Gal Pittaniya premises, University of Sri Jayewardenepura',
      800,
      142,
      1000,
      'October 13, 2026',
      'Bank of Ceylon',
      'JPURA Voiceclub Memoria Account',
      '8942-0012-3841-992',
      'Colombo Fort Branch',
      'Online registrations are open. Verification turnaround is currently under 24 hours.',
      new Date().toISOString()
    );
  }

  // 3. Seed initial submissions if empty
  const subCount = (db.prepare('SELECT COUNT(*) as count FROM submissions').get() as { count: number }).count;
  if (subCount === 0) {
    const insertSub = db.prepare(`
      INSERT INTO submissions (
        id, ticket_id, name, email, phone, quantity, ticket_type,
        university_registration_number, normalized_reg_number, unit_price, total_price,
        payment_slip_url, status, rejection_reason, submitted_at, approved_at, approver,
        qr_token, qr_payload, qr_image_data, checked_in, checked_in_at, email_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialSubs = [
      {
        id: 'sub-001',
        ticketId: 'MEM-26-9041',
        name: 'Kavinda Perera',
        email: 'kavinda.p@gmail.com',
        phone: '+94 77 123 4567',
        quantity: 2,
        ticketType: 'outsider',
        regNum: null,
        unitPrice: 1000,
        totalPrice: 2000,
        paymentSlipUrl: '/assets/candlelit-venue.jpg',
        status: 'approved',
        submittedAt: '2026-10-18T10:14:00Z',
        approvedAt: '2026-10-18T14:30:00Z',
        approver: 'Elena Vance',
        qrToken: 'tok_seed_001_secure_hash',
        qrPayload: 'MEMORIA26:TICKET:tok_seed_001_secure_hash',
        checkedIn: 1,
        checkedInAt: '2026-11-14T17:45:00Z',
      },
      {
        id: 'sub-002',
        ticketId: null,
        name: 'Ananya Jayawardena',
        email: 'ananya.j@outlook.com',
        phone: '+94 71 987 6543',
        quantity: 1,
        ticketType: 'outsider',
        regNum: null,
        unitPrice: 1000,
        totalPrice: 1000,
        paymentSlipUrl: '/assets/candlelit-venue.jpg',
        status: 'pending',
        submittedAt: '2026-10-20T09:12:00Z',
        approvedAt: null,
        approver: null,
        qrToken: null,
        qrPayload: null,
        checkedIn: 0,
        checkedInAt: null,
      },
      {
        id: 'sub-008',
        ticketId: 'MEM-26-9043',
        name: 'Harsha Bandara',
        email: 'harsha.b@gmail.com',
        phone: '+94 78 223 3445',
        quantity: 1,
        ticketType: 'student',
        regNum: 'FC119402',
        unitPrice: 200,
        totalPrice: 200,
        paymentSlipUrl: '/assets/candlelit-venue.jpg',
        status: 'approved',
        submittedAt: '2026-10-19T17:15:00Z',
        approvedAt: '2026-10-20T09:40:00Z',
        approver: 'Elena Vance',
        qrToken: 'tok_seed_008_secure_hash',
        qrPayload: 'MEMORIA26:TICKET:tok_seed_008_secure_hash',
        checkedIn: 1,
        checkedInAt: '2026-11-14T18:02:00Z',
      },
      {
        id: 'sub-010',
        ticketId: 'MEM-26-9044',
        name: 'Ruwanthi Karunaratne',
        email: 'ruwanthi.k@gmail.com',
        phone: '+94 76 990 0112',
        quantity: 1,
        ticketType: 'student',
        regNum: 'AS104921',
        unitPrice: 200,
        totalPrice: 200,
        paymentSlipUrl: '/assets/candlelit-venue.jpg',
        status: 'approved',
        submittedAt: '2026-10-18T18:40:00Z',
        approvedAt: '2026-10-19T10:00:00Z',
        approver: 'Elena Vance',
        qrToken: 'tok_seed_010_secure_hash',
        qrPayload: 'MEMORIA26:TICKET:tok_seed_010_secure_hash',
        checkedIn: 0,
        checkedInAt: null,
      },
    ];

    const seedSubsTx = db.transaction(() => {
      for (const s of initialSubs) {
        insertSub.run(
          s.id,
          s.ticketId,
          s.name,
          s.email,
          s.phone,
          s.quantity,
          s.ticketType,
          s.regNum,
          s.regNum ? s.regNum.toUpperCase().trim() : null,
          s.unitPrice,
          s.totalPrice,
          s.paymentSlipUrl,
          s.status,
          null,
          s.submittedAt,
          s.approvedAt,
          s.approver,
          s.qrToken,
          s.qrPayload,
          null,
          s.checkedIn,
          s.checkedInAt,
          s.status === 'approved' ? 'SENT' : 'PENDING'
        );
      }
    });
    seedSubsTx();
  }
}
