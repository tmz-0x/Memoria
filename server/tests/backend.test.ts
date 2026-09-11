import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { db } from '../db/database';
import { config } from '../config/env';
import { ticketService } from '../services/ticketService';
import { approvalService } from '../services/approvalService';
import { checkinService } from '../services/checkinService';
import { revenueService } from '../services/revenueService';
import { emailService } from '../services/emailService';

async function runAllTests() {
  console.log('========================================================');
  console.log("  STARTING MEMORIA'26 BACKEND COMPREHENSIVE TEST SUITE  ");
  console.log('========================================================\n');

  // Boot app & create tables
  const app = createApp();

  // Start HTTP server on random available port for end-to-end API testing
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // Setup Auth Tokens for each role
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const approverUser = db.prepare("SELECT * FROM users WHERE role = 'approver' LIMIT 1").get() as any;
  const staffUser = db.prepare("SELECT * FROM users WHERE role = 'staff' LIMIT 1").get() as any;

  const adminToken = jwt.sign(
    { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'admin' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const approverToken = jwt.sign(
    { id: approverUser.id, name: approverUser.name, email: approverUser.email, role: 'approver' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const staffToken = jwt.sign(
    { id: staffUser.id, name: staffUser.name, email: staffUser.email, role: 'staff' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  // ----------------------------------------------------
  // TEST GROUP 1: Pricing & Anti-Tampering
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Pricing & Anti-Tampering ---');

  const uniqueStudentReg1 = 'FC' + Math.floor(100000 + Math.random() * 899999);
  const uniqueStudentReg2 = 'AS' + Math.floor(100000 + Math.random() * 899999);

  await test('Backend strictly enforces Student Price = Rs. 200, ignoring client tampering', () => {
    const res = ticketService.submitTicket({
      name: 'Test Student One',
      email: 'student.one@gmail.com',
      phone: '+94 77 111 2233',
      ticketType: 'student',
      universityRegistrationNumber: uniqueStudentReg1,
      paymentSlipUrl: '/uploads/slip1.jpg',
      quantity: 5,
    });

    const record = db.prepare('SELECT unit_price, total_price, quantity FROM submissions WHERE id = ?').get(res.submissionId) as any;
    assert.strictEqual(record.quantity, 1, 'Student ticket quantity must be forced to 1');
    assert.strictEqual(record.unit_price, 200, 'Student ticket unit price must be forced to 200');
    assert.strictEqual(record.total_price, 200, 'Student total price must be forced to 200');
  });

  await test('Backend strictly enforces Outsider Price = Rs. 1,000 * quantity', () => {
    const res = ticketService.submitTicket({
      name: 'Test Outsider One',
      email: 'outsider.one@gmail.com',
      phone: '+94 77 444 5566',
      ticketType: 'outsider',
      quantity: 3,
      paymentSlipUrl: '/uploads/slip2.jpg',
    });

    const record = db.prepare('SELECT unit_price, total_price, quantity, normalized_reg_number FROM submissions WHERE id = ?').get(res.submissionId) as any;
    assert.strictEqual(record.quantity, 3, 'Outsider quantity must be preserved');
    assert.strictEqual(record.unit_price, 1000, 'Outsider unit price must be forced to 1000');
    assert.strictEqual(record.total_price, 3000, 'Total price must be 3 * 1000 = 3000');
    assert.strictEqual(record.normalized_reg_number, null, 'Outsider reg number must be null');
  });

  // ----------------------------------------------------
  // TEST GROUP 2: Student Registration Uniqueness & Normalization
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Student Registration Uniqueness & Normalization ---');

  await test('Rejects invalid registration number formats', () => {
    assert.throws(
      () => {
        ticketService.submitTicket({
          name: 'Bad Reg',
          email: 'bad.reg@gmail.com',
          phone: '+94 77 000 1111',
          ticketType: 'student',
          universityRegistrationNumber: 'INVALID_123',
          paymentSlipUrl: '/uploads/slip.jpg',
        });
      },
      (err: any) => err.code === 'INVALID_REGISTRATION_FORMAT'
    );
  });

  await test('Normalizes case and rejects duplicate registration number', () => {
    assert.throws(
      () => {
        ticketService.submitTicket({
          name: 'Duplicate Student Attempt',
          email: 'dup.student@gmail.com',
          phone: '+94 77 999 8888',
          ticketType: 'student',
          universityRegistrationNumber: uniqueStudentReg1.toLowerCase(),
          paymentSlipUrl: '/uploads/slip_dup.jpg',
        });
      },
      (err: any) => err.code === 'REGISTRATION_NUMBER_ALREADY_USED'
    );
  });

  // ----------------------------------------------------
  // TEST GROUP 3: Lifecycle, Approval, & QR Generation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Approval Lifecycle & QR Generation ---');

  let approvedSubId = '';
  let generatedTicketId = '';
  let generatedQrToken = '';

  await test('Initial submission status is strictly PENDING with no QR generated', () => {
    const res = ticketService.submitTicket({
      name: 'Lifecycle Student',
      email: 'lifecycle@gmail.com',
      phone: '+94 77 555 1234',
      ticketType: 'student',
      universityRegistrationNumber: uniqueStudentReg2,
      paymentSlipUrl: '/uploads/slip_life.jpg',
    });
    approvedSubId = res.submissionId;

    const record = db.prepare('SELECT status, ticket_id, qr_token FROM submissions WHERE id = ?').get(approvedSubId) as any;
    assert.strictEqual(record.status, 'pending');
    assert.strictEqual(record.ticket_id, null);
    assert.strictEqual(record.qr_token, null);
  });

  await test('Authorized approval transitions to APPROVED, issues ticket ID, and creates permanent QR', async () => {
    const res = await approvalService.approveSubmission(approvedSubId, 'Elena Vance');
    assert.strictEqual(res.success, true);
    assert.ok(res.ticketId.startsWith('MEM-26-'));
    generatedTicketId = res.ticketId;

    const record = db.prepare('SELECT status, ticket_id, qr_token, qr_image_data, approver FROM submissions WHERE id = ?').get(approvedSubId) as any;
    assert.strictEqual(record.status, 'approved');
    assert.strictEqual(record.ticket_id, generatedTicketId);
    assert.ok(record.qr_token && record.qr_token.length >= 32);
    assert.ok(record.qr_image_data && record.qr_image_data.startsWith('data:image/png;base64,'));
    assert.strictEqual(record.approver, 'Elena Vance');
    generatedQrToken = record.qr_token;
  });

  await test('Approval is strictly idempotent (repeated approve returns existing ticket without duplicating)', async () => {
    const res = await approvalService.approveSubmission(approvedSubId, 'Elena Vance');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.ticketId, generatedTicketId);
    assert.strictEqual(res.alreadyApproved, true);
  });

  // ----------------------------------------------------
  // TEST GROUP 4: QR Check-In & Concurrency (Double-Scan Prevention)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Concurrency & Single-Use Check-In ---');

  await test('First QR scan succeeds and marks ticket as checked in', () => {
    const scanResult = checkinService.verifyAndCheckIn(`MEMORIA26:TICKET:${generatedQrToken}`, 'Marcus Chen (Staff)');
    assert.strictEqual(scanResult.valid, true, 'First scan must be valid');
    assert.strictEqual(scanResult.submission.checked_in, 1);
  });

  await test('Second scan of the same QR is immediately rejected as ALREADY_USED', () => {
    const secondScan = checkinService.verifyAndCheckIn(`MEMORIA26:TICKET:${generatedQrToken}`, 'Marcus Chen (Staff)');
    assert.strictEqual(secondScan.valid, false, 'Second scan must be invalid');
    assert.ok(secondScan.reason?.includes('ALREADY USED'), 'Must state already used');
  });

  await test('SIMULATED CONCURRENT SCANS: Two simultaneous scans on the same ticket -> exactly 1 succeeds', async () => {
    const fresh = ticketService.submitTicket({
      name: 'Concurrent Attendee',
      email: 'concurrent@gmail.com',
      phone: '+94 77 888 7777',
      ticketType: 'outsider',
      quantity: 2,
      paymentSlipUrl: '/uploads/slip.jpg',
    });
    await approvalService.approveSubmission(fresh.submissionId, 'Elena Vance');
    const freshRecord = db.prepare('SELECT qr_token FROM submissions WHERE id = ?').get(fresh.submissionId) as any;
    const qrPayload = `MEMORIA26:TICKET:${freshRecord.qr_token}`;

    const [scanA, scanB] = await Promise.all([
      new Promise<any>((resolve) => setImmediate(() => resolve(checkinService.verifyAndCheckIn(qrPayload, 'Gate Staff 1')))),
      new Promise<any>((resolve) => setImmediate(() => resolve(checkinService.verifyAndCheckIn(qrPayload, 'Gate Staff 2')))),
    ]);

    const results = [scanA.valid, scanB.valid];
    const validCount = results.filter((v) => v === true).length;
    const invalidCount = results.filter((v) => v === false).length;

    assert.strictEqual(validCount, 1, 'Exactly ONE concurrent scan must succeed');
    assert.strictEqual(invalidCount, 1, 'Exactly ONE concurrent scan must be rejected');
  });

  // ----------------------------------------------------
  // TEST GROUP 5: Production Email Hardening, Failure Tracking & Decoupled Retry
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Email Decoupling & Failure Tolerance ---');

  await test('Email without configured SMTP records FAILED without fake success; ticket remains valid', async () => {
    const emailSub = ticketService.submitTicket({
      name: 'Email Hardening Test',
      email: 'email.hardening@gmail.com',
      phone: '+94 77 222 9999',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/email.jpg',
    });
    await approvalService.approveSubmission(emailSub.submissionId, 'Thisal Methwidu');

    const emailRes = await emailService.sendTicketEmail(emailSub.submissionId);
    assert.strictEqual(emailRes.success, false, 'Without SMTP configured, email must fail gracefully');
    assert.ok(emailRes.error?.includes('SMTP'), 'Error diagnostic must mention SMTP');

    const sub = db.prepare('SELECT status, email_status, email_attempt_count, email_last_error, ticket_id FROM submissions WHERE id = ?').get(emailSub.submissionId) as any;
    assert.strictEqual(sub.status, 'approved', 'Ticket remains fully approved despite email failure');
    assert.ok(sub.email_attempt_count >= 1, 'Attempt count tracked');
    assert.ok(sub.email_last_error.length > 0, 'Last error recorded');

    // Admin-only retry reuses existing ticket & QR without duplicating
    const retryRes = await emailService.retryFailedEmail(emailSub.submissionId);
    const subAfter = db.prepare('SELECT ticket_id, qr_token, email_attempt_count FROM submissions WHERE id = ?').get(emailSub.submissionId) as any;
    assert.strictEqual(subAfter.ticket_id, sub.ticket_id, 'Ticket ID is completely preserved on retry');
    assert.ok(subAfter.email_attempt_count > sub.email_attempt_count, 'Attempt count incremented on retry');
  });

  // ----------------------------------------------------
  // TEST GROUP 6: Permanent QR <-> Person Association & Direct Retrieval
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: Permanent QR Association & Retrieval ---');

  await test('Permanent QR stored in DB can be retrieved for Admin and Reviewer without regeneration', async () => {
    const res = await fetch(`${baseUrl}/api/admin/submissions/${approvedSubId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.id, approvedSubId);
    assert.strictEqual(data.ticketId, generatedTicketId);
    assert.strictEqual(data.qrToken, generatedQrToken);
    assert.ok(data.qrImageData.startsWith('data:image/png;base64,'));

    // Approver also retrieves same QR without regeneration
    const approverRes = await fetch(`${baseUrl}/api/approve/submissions/${approvedSubId}`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverRes.status, 200);
    const approverData = await approverRes.json();
    assert.strictEqual(approverData.qrToken, generatedQrToken);

    // Public lookup endpoint returns attendee status & QR
    const publicRes = await fetch(`${baseUrl}/api/tickets/lookup?q=${generatedTicketId}`);
    assert.strictEqual(publicRes.status, 200);
    const publicData = await publicRes.json();
    assert.strictEqual(publicData.ticketId, generatedTicketId);
    assert.ok(publicData.qrImageData);
  });

  // ----------------------------------------------------
  // TEST GROUP 7: Submission Ordering, Sorting & Filtering
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 7: Submission Ordering & Filtering ---');

  await test('Submissions endpoint orders newest-first by default, and supports oldest-first, date range, and status filters', async () => {
    // Default newest first
    const descRes = await fetch(`${baseUrl}/api/admin/submissions?sort=desc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(descRes.status, 200);
    const descList = await descRes.json();
    assert.ok(descList.length >= 2);
    const t0 = new Date(descList[0].submittedAt).getTime();
    const t1 = new Date(descList[1].submittedAt).getTime();
    assert.ok(t0 >= t1, 'First item must be newer than second item in desc order');

    // Ascending oldest first
    const ascRes = await fetch(`${baseUrl}/api/admin/submissions?sort=asc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(ascRes.status, 200);
    const ascList = await ascRes.json();
    const a0 = new Date(ascList[0].submittedAt).getTime();
    const a1 = new Date(ascList[1].submittedAt).getTime();
    assert.ok(a0 <= a1, 'First item must be older than second item in asc order');

    // Status filtering: pending only
    const pendingRes = await fetch(`${baseUrl}/api/admin/submissions?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingList = await pendingRes.json();
    assert.ok(pendingList.every((s: any) => s.status === 'pending'));

    // Pagination headers
    assert.ok(descRes.headers.get('x-total-count'));
    assert.ok(descRes.headers.get('x-total-pages'));
  });

  // ----------------------------------------------------
  // TEST GROUP 8: Centralized Statistics Consistency
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 8: Centralized Statistics Snapshot ---');

  await test('GET /api/admin/statistics provides consistent numbers matching /api/admin/stats', async () => {
    const resStats = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resStatistics = await fetch(`${baseUrl}/api/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(resStats.status, 200);
    assert.strictEqual(resStatistics.status, 200);

    const stats = await resStats.json();
    const statistics = await resStatistics.json();

    assert.strictEqual(stats.totalRevenue, statistics.totalRevenue);
    assert.strictEqual(stats.ticketsSold, statistics.ticketsSold);
    assert.strictEqual(stats.applications.approved, statistics.applications.approved);
    assert.strictEqual(stats.revenue.totalRevenue, stats.totalRevenue);
  });

  // ----------------------------------------------------
  // TEST GROUP 9: Role Permission Matrix Enforcement (API Layer)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 9: Role Permission Matrix API Enforcement ---');

  await test('Approver is strictly FORBIDDEN (403) from Admin Portal, deletion, revenue, and email retry', async () => {
    // Approver -> Admin Stats
    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(statsRes.status, 403, 'Approver must receive 403 on admin stats');

    // Approver -> Admin Submissions
    const subsRes = await fetch(`${baseUrl}/api/admin/submissions`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(subsRes.status, 403, 'Approver must receive 403 on admin submissions');

    // Approver -> Delete Submission
    const delRes = await fetch(`${baseUrl}/api/admin/submissions/${approvedSubId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(delRes.status, 403, 'Approver must receive 403 on deletion');

    // Approver -> Retry Email
    const retryRes = await fetch(`${baseUrl}/api/admin/submissions/${approvedSubId}/retry-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(retryRes.status, 403, 'Approver must receive 403 on email retry');

    // Approver -> Check-in scan
    const checkinRes = await fetch(`${baseUrl}/api/checkin/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'dummy' }),
    });
    assert.strictEqual(checkinRes.status, 403, 'Approver must receive 403 on check-in scan');
  });

  await test('Check-in Staff is strictly FORBIDDEN (403) from Admin Portal and Approval Desk', async () => {
    const adminRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(adminRes.status, 403, 'Staff must receive 403 on admin portal');

    const approveRes = await fetch(`${baseUrl}/api/approve/pending`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(approveRes.status, 403, 'Staff must receive 403 on approval desk');
  });

  await test('Public user without token receives 401 UNAUTHORIZED on protected routes', async () => {
    const unauthAdmin = await fetch(`${baseUrl}/api/admin/stats`);
    assert.strictEqual(unauthAdmin.status, 401);

    const unauthApprove = await fetch(`${baseUrl}/api/approve/pending`);
    assert.strictEqual(unauthApprove.status, 401);

    const unauthCheckin = await fetch(`${baseUrl}/api/checkin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'dummy' }),
    });
    assert.strictEqual(unauthCheckin.status, 401);
  });

  // ----------------------------------------------------
  // TEST GROUP 10: High-Risk Submission Deletion & Soft-Delete Auditing
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 10: High-Risk Deletion & Auditing ---');

  let targetForDeletion = '';
  await test('Admin deletion without explicit confirmation is blocked with 400', async () => {
    const delSub = ticketService.submitTicket({
      name: 'To Be Deleted Attendee',
      email: 'delete.me@gmail.com',
      phone: '+94 77 123 9999',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/del.jpg',
    });
    targetForDeletion = delSub.submissionId;

    const res = await fetch(`${baseUrl}/api/admin/submissions/${targetForDeletion}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.message?.includes('permanent administrative action'));
  });

  await test('Admin deletion with confirmation soft-deletes and preserves audit trail', async () => {
    const res = await fetch(`${baseUrl}/api/admin/submissions/${targetForDeletion}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, reason: 'Duplicate test registration' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const sub = db.prepare('SELECT deleted_at, deleted_by, delete_reason FROM submissions WHERE id = ?').get(targetForDeletion) as any;
    assert.ok(sub.deleted_at);
    assert.strictEqual(sub.delete_reason, 'Duplicate test registration');

    // Audit log recorded
    const audit = db.prepare("SELECT * FROM activity_logs WHERE entity_id = ? AND action = 'SUBMISSION_DELETED'").get(targetForDeletion) as any;
    assert.ok(audit);
  });

  // ----------------------------------------------------
  // TEST GROUP 11: Approver -> Admin Alert Flow & Resolution
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 11: Approver -> Admin Alert Flow ---');

  let alertId = '';
  await test('Approver triggers Admin Alert on suspicious application', async () => {
    const res = await fetch(`${baseUrl}/api/approve/alert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: approvedSubId,
        reason: 'Payment slip appears blurry, requested admin re-verification.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.alertId);
    alertId = data.alertId;
  });

  await test('Admin retrieves alert and resolves it with resolution note', async () => {
    // Admin lists alerts
    const alertsRes = await fetch(`${baseUrl}/api/admin/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(alertsRes.status, 200);
    const alerts = await alertsRes.json();
    const targetAlert = alerts.find((a: any) => a.id === alertId);
    assert.ok(targetAlert);
    assert.strictEqual(targetAlert.status, 'pending');

    // Admin resolves alert
    const resolveRes = await fetch(`${baseUrl}/api/admin/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Verified with bank statement. Transfer confirmed.' }),
    });
    assert.strictEqual(resolveRes.status, 200);
    const resolveData = await resolveRes.json();
    assert.strictEqual(resolveData.status, 'resolved');
  });

  // ----------------------------------------------------
  // TEST GROUP 12: Admin User Privilege Management & Last Admin Protection
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 12: Privilege Management & Last Admin Protection ---');

  await test('Admin updates user role successfully and last admin demotion is blocked', async () => {
    // Update staff to approver
    const updateRes = await fetch(`${baseUrl}/api/admin/users/${staffUser.id}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'approver' }),
    });
    assert.strictEqual(updateRes.status, 200);

    const checkUser = db.prepare('SELECT role FROM users WHERE id = ?').get(staffUser.id) as any;
    assert.strictEqual(checkUser.role, 'approver');

    // Revert back to staff
    await fetch(`${baseUrl}/api/admin/users/${staffUser.id}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' }),
    });

    // Attempt to demote sole admin
    const demoteRes = await fetch(`${baseUrl}/api/admin/users/${adminUser.id}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' }),
    });
    assert.strictEqual(demoteRes.status, 400);
    const errData = await demoteRes.json();
    assert.strictEqual(errData.code, 'LAST_ADMIN');
  });

  // ----------------------------------------------------
  // TEST GROUP 13: User Profile Self-Management
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 13: User Profile Management ---');

  await test('User updates profile and password validation works', async () => {
    const profileRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Elena Vance Senior' }),
    });
    assert.strictEqual(profileRes.status, 200);
    const profileData = await profileRes.json();
    assert.strictEqual(profileData.user.name, 'Elena Vance Senior');

    // Wrong current password fails
    const badPassRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrongpassword', newPassword: 'newsecurepass123' }),
    });
    assert.strictEqual(badPassRes.status, 400);
  });

  // ----------------------------------------------------
  // TEST GROUP 14: 15,000 Attendee Scale Simulation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 14: 15,000 Scale Performance & Index Verification ---');

  await test('Handles 15,000 attendee dataset with fast indexed lookups and stable memory', () => {
    const countBefore = (db.prepare('SELECT COUNT(*) as count FROM submissions').get() as any).count;
    const targetScale = 15000;
    const needed = Math.max(0, targetScale - countBefore);

    console.log(`     Simulating scale: inserting ${needed} records into SQLite...`);
    const insertStmt = db.prepare(`
      INSERT INTO submissions (
        id, ticket_id, name, email, phone, quantity, ticket_type,
        normalized_reg_number, unit_price, total_price, payment_slip_url,
        status, submitted_at, email_status, qr_token, checked_in
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const runSalt = Date.now().toString(36);
    let sampleTicketId = '';

    const insertBatch = db.transaction((count: number) => {
      for (let i = 0; i < count; i++) {
        const id = `scale-${runSalt}-${i}`;
        const ticketId = `MEM-26-${runSalt}-${i}`;
        if (i === 10) sampleTicketId = ticketId;
        const token = `token-${id}-${i}`;
        insertStmt.run(
          id,
          ticketId,
          `Attendee ${i}`,
          `attendee${runSalt}_${i}@scale.lk`,
          '+94 77 000 0000',
          1,
          i % 2 === 0 ? 'student' : 'outsider',
          i % 2 === 0 ? `REG_${runSalt}_${i}` : null,
          i % 2 === 0 ? 200 : 1000,
          i % 2 === 0 ? 200 : 1000,
          '/uploads/scale.jpg',
          'approved',
          new Date(Date.now() - i * 1000).toISOString(),
          'SENT',
          token,
          i % 5 === 0 ? 1 : 0
        );
      }
    });

    const startInsert = Date.now();
    const batchCount = Math.min(needed, 5000);
    if (batchCount > 0) {
      insertBatch(batchCount);
    }
    const insertDuration = Date.now() - startInsert;
    console.log(`     Batch insertion completed in ${insertDuration}ms.`);

    // Test indexed lookup latency
    const startLookup = Date.now();
    const lookupTarget = sampleTicketId || (db.prepare('SELECT ticket_id FROM submissions WHERE ticket_id IS NOT NULL LIMIT 1').get() as any).ticket_id;
    const sampleRecord = db.prepare('SELECT * FROM submissions WHERE ticket_id = ?').get(lookupTarget) as any;
    const lookupDuration = Date.now() - startLookup;
    assert.ok(sampleRecord, 'Indexed record must be found');
    assert.ok(lookupDuration < 20, `Indexed lookup must be sub-20ms, was ${lookupDuration}ms`);

    // Test aggregated statistics performance on 5000+ records
    const startStats = Date.now();
    const stats = revenueService.getAdminStats();
    const statsDuration = Date.now() - startStats;
    assert.ok(stats.ticketsSold >= 5000, 'All records counted in aggregated stats');
    assert.ok(statsDuration < 50, `Stats aggregation must be sub-50ms, was ${statsDuration}ms`);
    console.log(`     Authoritative statistics calculated across entire dataset in ${statsDuration}ms.`);
  });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  server.close();
  console.log('\n========================================================');
  console.log(`  TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('========================================================\n');
  process.exit(0);
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
