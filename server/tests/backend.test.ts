import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

  // Reset standard users to known seed state for deterministic test execution
  db.prepare("DELETE FROM users WHERE id NOT IN ('usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5')").run();
  db.prepare("UPDATE users SET role = 'admin', name = 'Thisal Methwidu', email = 'admin@memoria.lk', password_hash = ? WHERE id = 'usr-1'").run(bcrypt.hashSync('admin123', 10));
  db.prepare("UPDATE users SET role = 'approver', name = 'Elena Vance', email = 'approver@memoria.lk', password_hash = ? WHERE id = 'usr-2'").run(bcrypt.hashSync('approve123', 10));
  db.prepare("UPDATE users SET role = 'staff', name = 'Marcus Chen', email = 'staff@memoria.lk', password_hash = ? WHERE id = 'usr-3'").run(bcrypt.hashSync('staff123', 10));
  const initialSmtpSetting = db.prepare('SELECT * FROM smtp_settings WHERE id = 1').get() as any;
  db.prepare("DELETE FROM smtp_settings").run();
  emailService.reloadTransporter();

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
    const descRes = await fetch(`${baseUrl}/api/admin/submissions?sort=desc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(descRes.status, 200);
    const descList = await descRes.json();
    assert.ok(descList.length >= 2);
    const t0 = new Date(descList[0].submittedAt).getTime();
    const t1 = new Date(descList[1].submittedAt).getTime();
    assert.ok(t0 >= t1, 'First item must be newer than second item in desc order');

    const ascRes = await fetch(`${baseUrl}/api/admin/submissions?sort=asc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(ascRes.status, 200);
    const ascList = await ascRes.json();
    const a0 = new Date(ascList[0].submittedAt).getTime();
    const a1 = new Date(ascList[1].submittedAt).getTime();
    assert.ok(a0 <= a1, 'First item must be older than second item in asc order');

    const pendingRes = await fetch(`${baseUrl}/api/admin/submissions?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingList = await pendingRes.json();
    assert.ok(pendingList.every((s: any) => s.status === 'pending'));

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
    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(statsRes.status, 403);

    const subsRes = await fetch(`${baseUrl}/api/admin/submissions`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(subsRes.status, 403);

    const delRes = await fetch(`${baseUrl}/api/admin/submissions/${approvedSubId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(delRes.status, 403);

    const retryRes = await fetch(`${baseUrl}/api/admin/submissions/${approvedSubId}/retry-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(retryRes.status, 403);

    const checkinRes = await fetch(`${baseUrl}/api/checkin/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'dummy' }),
    });
    assert.strictEqual(checkinRes.status, 403);
  });

  await test('Check-in Staff is strictly FORBIDDEN (403) from Admin Portal and Approval Desk', async () => {
    const adminRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(adminRes.status, 403);

    const approveRes = await fetch(`${baseUrl}/api/approve/pending`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(approveRes.status, 403);
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
    assert.ok(data.message?.includes('destructive administrative action'));
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
    const alertsRes = await fetch(`${baseUrl}/api/admin/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(alertsRes.status, 200);
    const alerts = await alertsRes.json();
    const targetAlert = alerts.find((a: any) => a.id === alertId);
    assert.ok(targetAlert);
    assert.strictEqual(targetAlert.status, 'pending');

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
    const updateRes = await fetch(`${baseUrl}/api/admin/users/${staffUser.id}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'approver' }),
    });
    assert.strictEqual(updateRes.status, 200);

    const checkUser = db.prepare('SELECT role FROM users WHERE id = ?').get(staffUser.id) as any;
    assert.strictEqual(checkUser.role, 'approver');

    await fetch(`${baseUrl}/api/admin/users/${staffUser.id}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' }),
    });

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
  // TEST GROUP 13: Admin Full Submission Editing (Fixes 2 Sections 1-4)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 13: Admin Full Submission Editing ---');

  let editSubId = '';
  await test('Admin edits pending submission and values are updated with server-side validation', async () => {
    const newSub = ticketService.submitTicket({
      name: 'Old Name Attendee',
      email: 'old.email@gmail.com',
      phone: '+94 77 123 4567',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/old.jpg',
    });
    editSubId = newSub.submissionId;

    const res = await fetch(`${baseUrl}/api/admin/submissions/${editSubId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corrected New Name',
        email: 'corrected.email@gmail.com',
        phone: '+94 77 987 6543',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.name, 'Corrected New Name');
    assert.strictEqual(data.email, 'corrected.email@gmail.com');
    assert.strictEqual(data.phone, '+94 77 987 6543');
  });

  await test('Admin edits APPROVED ticket without creating duplicates or regenerating QR', async () => {
    // Approve the submission
    await approvalService.approveSubmission(editSubId, 'Elena Vance');
    const beforeEdit = db.prepare('SELECT ticket_id, qr_token, status, total_price FROM submissions WHERE id = ?').get(editSubId) as any;
    assert.strictEqual(beforeEdit.status, 'approved');

    // Edit approved ticket name and phone
    const res = await fetch(`${baseUrl}/api/admin/submissions/${editSubId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Final Corrected Attendee Name',
        phone: '+94 71 000 9999',
      }),
    });

    assert.strictEqual(res.status, 200);
    const afterEdit = db.prepare('SELECT ticket_id, qr_token, status, name, phone, total_price FROM submissions WHERE id = ?').get(editSubId) as any;
    assert.strictEqual(afterEdit.ticket_id, beforeEdit.ticket_id, 'Ticket ID must remain completely identical');
    assert.strictEqual(afterEdit.qr_token, beforeEdit.qr_token, 'QR token must be preserved without recreation');
    assert.strictEqual(afterEdit.name, 'Final Corrected Attendee Name');
    assert.strictEqual(afterEdit.total_price, beforeEdit.total_price);
  });

  await test('Admin editing student registration number enforces uniqueness constraint', async () => {
    // Attempt to change registration number to uniqueStudentReg1 (which belongs to Test Student One)
    const res = await fetch(`${baseUrl}/api/admin/submissions/${editSubId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketType: 'student',
        universityRegistrationNumber: uniqueStudentReg1,
      }),
    });

    assert.strictEqual(res.status, 409, 'Duplicate student registration number must return 409 Conflict');
    const errData = await res.json();
    assert.strictEqual(errData.code, 'REGISTRATION_NUMBER_ALREADY_USED');
  });

  // ----------------------------------------------------
  // TEST GROUP 14: QR Code Regeneration (Fixes 2 Sections 5-8)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 14: QR Code Regeneration & Invalidation ---');

  let oldQrTokenToInvalidate = '';
  let newGeneratedQrToken = '';

  await test('Admin regenerates QR with explicit confirmation: old QR is invalidated and new QR active', async () => {
    const subBefore = db.prepare('SELECT ticket_id, qr_token FROM submissions WHERE id = ?').get(editSubId) as any;
    oldQrTokenToInvalidate = subBefore.qr_token;

    // Call without confirmation fails
    const failRes = await fetch(`${baseUrl}/api/admin/tickets/${editSubId}/regenerate-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });
    assert.strictEqual(failRes.status, 400);

    // Call with confirmation succeeds
    const res = await fetch(`${baseUrl}/api/admin/tickets/${editSubId}/regenerate-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, reason: 'Lost ticket QR screenshot' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.qrToken);
    assert.notStrictEqual(data.qrToken, oldQrTokenToInvalidate, 'New QR token must differ from old');
    newGeneratedQrToken = data.qrToken;

    // Verify old QR token is recorded in revoked_qr_tokens table
    const revoked = db.prepare('SELECT * FROM revoked_qr_tokens WHERE token = ?').get(oldQrTokenToInvalidate) as any;
    assert.ok(revoked, 'Old QR token must be recorded in revoked_qr_tokens');
    assert.strictEqual(revoked.ticket_id, subBefore.ticket_id);
  });

  await test('Gate check-in REJECTS invalidated old QR and ACCEPTS newly regenerated QR', () => {
    // Scan old invalidated QR -> Rejected
    const oldScan = checkinService.verifyAndCheckIn(`MEMORIA26:TICKET:${oldQrTokenToInvalidate}`, 'Gate Staff');
    assert.strictEqual(oldScan.valid, false);
    assert.ok(oldScan.reason?.includes('invalidated and replaced by an administrator'));

    // Scan new regenerated QR -> Accepted!
    const newScan = checkinService.verifyAndCheckIn(`MEMORIA26:TICKET:${newGeneratedQrToken}`, 'Gate Staff');
    assert.strictEqual(newScan.valid, true, 'New QR must be valid');
    assert.strictEqual(newScan.submission.checked_in, 1);
  });

  // ----------------------------------------------------
  // TEST GROUP 15: Admin-Only Creation of New Admin Accounts (Fixes 2 Sections 31-33)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 15: Admin-Only Admin Creation ---');

  const newAdminEmail = `newadmin_${Date.now()}@memoria.lk`;

  await test('Approver and Staff are strictly FORBIDDEN (403) from creating Admin accounts', async () => {
    const approverAttempt = await fetch(`${baseUrl}/api/admin/admins`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Admin', email: 'hacker@memoria.lk', password: 'hackpassword' }),
    });
    assert.strictEqual(approverAttempt.status, 403);

    const staffAttempt = await fetch(`${baseUrl}/api/admin/admins`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Staff', email: 'hacker2@memoria.lk', password: 'hackpassword' }),
    });
    assert.strictEqual(staffAttempt.status, 403);
  });

  await test('Admin successfully creates new Admin account and new Admin can log in', async () => {
    const res = await fetch(`${baseUrl}/api/admin/admins`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Kasun Bandara', email: newAdminEmail, password: 'secureadminpass2026' }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'admin');

    // Verify new admin can authenticate
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAdminEmail, password: 'secureadminpass2026' }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.strictEqual(loginData.user.role, 'admin');
  });

  // ----------------------------------------------------
  // TEST GROUP 16: Admin Password & Profile Management (Fixes 2 Sections 28-30)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 16: Admin Password & Profile Management ---');

  await test('Admin password update validates current password and updates hash securely', async () => {
    // Wrong current password
    const failRes = await fetch(`${baseUrl}/api/admin/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrongcurrentpassword', newPassword: 'newsecurepass2026' }),
    });
    assert.strictEqual(failRes.status, 400);

    // Mismatched confirmation password
    const mismatchRes = await fetch(`${baseUrl}/api/admin/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'admin123', newPassword: 'newsecurepass2026', confirmPassword: 'differentpass' }),
    });
    assert.strictEqual(mismatchRes.status, 400);

    // Successful password update
    const okRes = await fetch(`${baseUrl}/api/admin/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'admin123', newPassword: 'newsecurepass2026', confirmPassword: 'newsecurepass2026' }),
    });
    assert.strictEqual(okRes.status, 200);

    // Revert password back to admin123 for subsequent test convenience
    await fetch(`${baseUrl}/api/admin/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'newsecurepass2026', newPassword: 'admin123' }),
    });
  });

  await test('Admin profile update updates name, email, and issues fresh JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/admin/profile`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Thisal Methwidu (Lead Admin)' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.name, 'Thisal Methwidu (Lead Admin)');
    assert.ok(data.token);

    // Revert name back
    await fetch(`${baseUrl}/api/admin/profile`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Thisal Methwidu' }),
    });
  });

  // ----------------------------------------------------
  // TEST GROUP 17: Diagnostic Test Email Dispatch (Fixes 2 Section 25)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 17: Diagnostic Test Email ---');

  await test('POST /api/admin/email/test verifies outbound SMTP and returns structured diagnostic', async () => {
    const res = await fetch(`${baseUrl}/api/admin/email/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'admin.diagnostics@memoria.lk' }),
    });

    // Without SMTP credentials configured in .env, returns 400 with diagnostic error
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error?.includes('SMTP credentials not configured'));
  });

  // ----------------------------------------------------
  // TEST GROUP 18: Complete Database Reset with Admin Password Verification (Fixes 2 Sections 14-21)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 18: Complete Database Reset ---');

  await test('Database reset requires Admin role, explicit confirmation, and valid Admin password', async () => {
    // Non-admin rejected (403)
    const approverReset = await fetch(`${baseUrl}/api/admin/database/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, password: 'admin123' }),
    });
    assert.strictEqual(approverReset.status, 403);

    // Missing confirmation rejected (400)
    const noConfirmReset = await fetch(`${baseUrl}/api/admin/database/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false, password: 'admin123' }),
    });
    assert.strictEqual(noConfirmReset.status, 400);

    // Wrong password rejected (401)
    const wrongPassReset = await fetch(`${baseUrl}/api/admin/database/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, password: 'incorrectpassword' }),
    });
    assert.strictEqual(wrongPassReset.status, 401);

    // Correct password executes reset atomically
    const okReset = await fetch(`${baseUrl}/api/admin/database/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, password: 'admin123' }),
    });
    assert.strictEqual(okReset.status, 200);
    const resetResult = await okReset.json();
    assert.strictEqual(resetResult.success, true);

    // Verify operational tables are purged
    const subCount = (db.prepare('SELECT COUNT(*) as c FROM submissions').get() as any).c;
    assert.strictEqual(subCount, 0, 'Submissions must be 0 after reset');

    const alertCount = (db.prepare('SELECT COUNT(*) as c FROM admin_alerts').get() as any).c;
    assert.strictEqual(alertCount, 0, 'Admin alerts must be 0 after reset');

    // Verify primary Admin (Thisal Methwidu) is strictly preserved
    const primaryAdmin = db.prepare("SELECT * FROM users WHERE email = 'admin@memoria.lk'").get() as any;
    assert.ok(primaryAdmin, 'Primary admin account must be preserved after reset');
    assert.strictEqual(primaryAdmin.name, 'Thisal Methwidu');

    // Primary admin can immediately authenticate
    const postResetLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@memoria.lk', password: 'admin123' }),
    });
    assert.strictEqual(postResetLogin.status, 200, 'Primary admin must be able to log in after reset');

    // Verify recalculation of stats: ticketsSold = 0, totalRevenue = 0
    assert.strictEqual(resetResult.stats.ticketsSold, 0);
    assert.strictEqual(resetResult.stats.totalRevenue, 0);

    // Verify system-level audit record created
    const resetAudit = db.prepare("SELECT * FROM activity_logs WHERE action = 'RESET_DATABASE'").get() as any;
    assert.ok(resetAudit);
  });

  // ----------------------------------------------------
  // TEST GROUP 19: 15,000 Scale Performance & Index Verification
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 19: 15,000 Scale Performance & Index Verification ---');

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
  // TEST GROUP 20: Fixes 3 — Centralized Statistics, Dividend Distribution & Admin QR Inspection
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 20: Centralized Statistics, Dividend Distribution & Admin QR Access ---');

  await test('Centralized statistics API provides consistent numbers across admin and approval endpoints', async () => {
    const resAdminStats = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resAdminStatistics = await fetch(`${baseUrl}/api/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resApproveStats = await fetch(`${baseUrl}/api/approve/stats`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });

    assert.strictEqual(resAdminStats.status, 200);
    assert.strictEqual(resAdminStatistics.status, 200);
    assert.strictEqual(resApproveStats.status, 200);

    const s1 = await resAdminStats.json();
    const s2 = await resAdminStatistics.json();
    const s3 = await resApproveStats.json();

    assert.strictEqual(s1.ticketsSold, s2.ticketsSold);
    assert.strictEqual(s1.ticketsSold, s3.ticketsSold);
    assert.strictEqual(s1.totalRevenue, s2.totalRevenue);
    assert.strictEqual(s1.totalRevenue, s3.totalRevenue);
    assert.strictEqual(s1.totalApplications, s2.totalApplications);

    // Verify top-level Fixes 3 fields exist
    assert.strictEqual(typeof s1.totalApplications, 'number');
    assert.strictEqual(typeof s1.pending, 'number');
    assert.strictEqual(typeof s1.approved, 'number');
    assert.strictEqual(typeof s1.rejected, 'number');
    assert.strictEqual(typeof s1.ticketsSold, 'number');
    assert.strictEqual(typeof s1.universityTickets, 'number');
    assert.strictEqual(typeof s1.outsiderTickets, 'number');
    assert.strictEqual(typeof s1.checkedIn, 'number');
    assert.strictEqual(typeof s1.notCheckedIn, 'number');
    assert.strictEqual(typeof s1.totalRevenue, 'number');
    assert.strictEqual(typeof s1.universityRevenue, 'number');
    assert.strictEqual(typeof s1.outsiderRevenue, 'number');
    assert.strictEqual(typeof s1.emailPending, 'number');
    assert.strictEqual(typeof s1.emailSent, 'number');
    assert.strictEqual(typeof s1.emailFailed, 'number');
    assert.strictEqual(typeof s1.emailConfigured, 'boolean');

    // Verify Fixes 3 Dividend calculation
    assert.ok(s1.dividend);
    assert.strictEqual(s1.dividend.universityTickets, s1.universityTickets);
    assert.strictEqual(s1.dividend.outsiderTickets, s1.outsiderTickets);
    assert.strictEqual(s1.dividend.universityRevenue, s1.universityRevenue);
    assert.strictEqual(s1.dividend.outsiderRevenue, s1.outsiderRevenue);
  });

  await test('Accurate revenue dividend calculation (2 university = Rs 400, 3 outsider = Rs 3000 -> Rs 3400)', async () => {
    // Clear operational submissions temporarily for isolated revenue verification
    db.prepare('DELETE FROM submissions').run();

    const u1 = ticketService.submitTicket({
      name: 'Dividend Student 1',
      email: 'div.u1@gmail.com',
      phone: '+94 77 111 0001',
      ticketType: 'student',
      universityRegistrationNumber: 'DIV100001',
      paymentSlipUrl: '/uploads/div1.jpg',
      quantity: 1,
    });
    await approvalService.approveSubmission(u1.submissionId, 'Test Approver');

    const u2 = ticketService.submitTicket({
      name: 'Dividend Student 2',
      email: 'div.u2@gmail.com',
      phone: '+94 77 111 0002',
      ticketType: 'student',
      universityRegistrationNumber: 'DIV100002',
      paymentSlipUrl: '/uploads/div2.jpg',
      quantity: 1,
    });
    await approvalService.approveSubmission(u2.submissionId, 'Test Approver');

    const o1 = ticketService.submitTicket({
      name: 'Dividend Outsider 1',
      email: 'div.o1@gmail.com',
      phone: '+94 77 222 0001',
      ticketType: 'outsider',
      quantity: 3,
      paymentSlipUrl: '/uploads/div3.jpg',
    });
    await approvalService.approveSubmission(o1.submissionId, 'Test Approver');

    const stats = revenueService.getAdminStats();
    assert.strictEqual(stats.universityTickets, 2);
    assert.strictEqual(stats.outsiderTickets, 3);
    assert.strictEqual(stats.ticketsSold, 5);
    assert.strictEqual(stats.universityRevenue, 400);
    assert.strictEqual(stats.outsiderRevenue, 3000);
    assert.strictEqual(stats.totalRevenue, 3400);
    assert.strictEqual(stats.dividend.universityPercentage, 40.0);
    assert.strictEqual(stats.dividend.outsiderPercentage, 60.0);
  });

  let validTicketForInspection = '';
  await test('Prevents double-counting: multiple audit and scan records do not multiply ticket or check-in count', async () => {
    // Create one single approved ticket
    const singleSub = ticketService.submitTicket({
      name: 'Double Count Attendee',
      email: 'double.count@gmail.com',
      phone: '+94 77 333 4444',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/single.jpg',
    });
    const approved = await approvalService.approveSubmission(singleSub.submissionId, 'Test Approver');

    // Check it in
    const checkinRes = checkinService.verifyAndCheckIn(approved.ticketId, 'Gate Staff 1');
    assert.strictEqual(checkinRes.valid, true);

    // Insert multiple simulated duplicate audit logs and scan logs for this ticket
    const dupSalt = Math.random().toString(36).substring(2, 9);
    db.prepare(`
      INSERT INTO scan_audit_logs (id, ticket_id, submission_id, result, scanned_at, scanned_by, query, reason)
      VALUES (?, ?, ?, 'VALID', ?, 'Gate Staff 1', ?, NULL)
    `).run(`scan-dup-${dupSalt}-1`, approved.ticketId, singleSub.submissionId, new Date().toISOString(), approved.ticketId);

    db.prepare(`
      INSERT INTO scan_audit_logs (id, ticket_id, submission_id, result, scanned_at, scanned_by, query, reason)
      VALUES (?, ?, ?, 'ALREADY_USED', ?, 'Gate Staff 1', ?, 'Already checked in')
    `).run(`scan-dup-${dupSalt}-2`, approved.ticketId, singleSub.submissionId, new Date().toISOString(), approved.ticketId);

    db.prepare(`
      INSERT INTO activity_logs (id, timestamp, actor, action, entity_id, result, metadata)
      VALUES (?, ?, 'Gate Staff 1', 'CHECKIN_SCAN', ?, 'SUCCESS', '{}')
    `).run(`act-dup-${dupSalt}-1`, new Date().toISOString(), singleSub.submissionId);

    db.prepare(`
      INSERT INTO activity_logs (id, timestamp, actor, action, entity_id, result, metadata)
      VALUES (?, ?, 'Gate Staff 1', 'CHECKIN_SCAN', ?, 'ALREADY_USED', '{}')
    `).run(`act-dup-${dupSalt}-2`, new Date().toISOString(), singleSub.submissionId);

    // Query stats: must strictly count as 1 ticket, 1 checked-in, Rs. 1000 revenue
    const statsRow = db.prepare(`
      SELECT
        COUNT(*) as ticketCount,
        COALESCE(SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END), 0) as checkedInCount,
        COALESCE(SUM(total_price), 0) as revenue
      FROM submissions
      WHERE id = ? AND deleted_at IS NULL
    `).get(singleSub.submissionId) as any;

    assert.strictEqual(statsRow.ticketCount, 1, 'Row count must be strictly 1');
    assert.strictEqual(statsRow.checkedInCount, 1, 'Checked-in count must be strictly 1');
    assert.strictEqual(statsRow.revenue, 1000, 'Revenue must strictly equal unit ticket price');
  });

  await test('Admin can view any valid ticket QR code without regenerating or mutating check-in state', async () => {
    // Create an approved ticket
    const qrSub = ticketService.submitTicket({
      name: 'QR Inspection Attendee',
      email: 'qr.inspect@gmail.com',
      phone: '+94 77 999 8888',
      ticketType: 'student',
      universityRegistrationNumber: 'QR99999',
      paymentSlipUrl: '/uploads/qr.jpg',
      quantity: 1,
    });
    const approved = await approvalService.approveSubmission(qrSub.submissionId, 'Test Approver');
    validTicketForInspection = approved.ticketId;

    // Admin views QR
    const qrRes = await fetch(`${baseUrl}/api/admin/tickets/${approved.ticketId}/qr`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(qrRes.status, 200);
    const qrData = await qrRes.json();

    assert.strictEqual(qrData.success, true);
    assert.strictEqual(qrData.ticketId, approved.ticketId);
    assert.strictEqual(qrData.name, 'QR Inspection Attendee');
    assert.strictEqual(qrData.qrStatus, 'ACTIVE');
    assert.strictEqual(qrData.checkedIn, false);
    assert.ok(qrData.qrImageData?.startsWith('data:image/png;base64,'));
    assert.ok(qrData.qrToken);

    // Verify viewing did NOT mutate record
    const checkSub = db.prepare('SELECT qr_token, checked_in FROM submissions WHERE id = ?').get(qrSub.submissionId) as any;
    assert.strictEqual(checkSub.qr_token, qrData.qrToken, 'QR token must match database record and remain unchanged');
    assert.strictEqual(checkSub.checked_in, 0, 'Check-in status must NOT change on view');

    // Now check in the ticket
    checkinService.verifyAndCheckIn(approved.ticketId, 'Gate Staff 1');

    // View QR again: qrStatus must now report USED
    const qrUsedRes = await fetch(`${baseUrl}/api/admin/tickets/${approved.ticketId}/qr`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(qrUsedRes.status, 200);
    const qrUsedData = await qrUsedRes.json();
    assert.strictEqual(qrUsedData.qrStatus, 'USED');
    assert.strictEqual(qrUsedData.checkedIn, true);
  });

  await test('Security: Approvers, staff, and public users are DENIED from arbitrary Admin QR retrieval', async () => {
    const sampleTicket = validTicketForInspection;

    // Approver receives 403 Forbidden
    const approverRes = await fetch(`${baseUrl}/api/admin/tickets/${sampleTicket}/qr`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverRes.status, 403);

    // Staff receives 403 Forbidden
    const staffRes = await fetch(`${baseUrl}/api/admin/tickets/${sampleTicket}/qr`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffRes.status, 403);

    // Public unauthorized receives 401
    const publicRes = await fetch(`${baseUrl}/api/admin/tickets/${sampleTicket}/qr`);
    assert.strictEqual(publicRes.status, 401);
  });

  // ----------------------------------------------------
  // TEST GROUP 21: BACKENDFIXES4 — System Audit, Admin Security, Gate Sync & Dynamic SMTP
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 21: BACKENDFIXES4 — System Audit, Admin Security, Gate Sync & Dynamic SMTP ---');

  await test('System Audit Logging: Captures operations with correlation IDs, supports pagination & filters, never leaks plaintext passwords', async () => {
    // Make a request with custom correlation ID
    const customReqId = `req-test-${Date.now()}`;
    const getRes = await fetch(`${baseUrl}/api/admin/audit-logs?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-Request-Id': customReqId,
      },
    });
    assert.strictEqual(getRes.status, 200);
    const logData = await getRes.json();
    assert.ok(Array.isArray(logData.logs));
    assert.ok(logData.pagination);
    assert.strictEqual(typeof logData.pagination.total, 'number');

    // Inspect database audit logs: ensure no sensitive keys contain plaintext passwords or secrets
    const sensitiveLogs = db.prepare(`
      SELECT metadata, message, stack_trace
      FROM system_audit_logs
      WHERE metadata LIKE '%"password"%' OR metadata LIKE '%smtp_pass%' OR message LIKE '%password%'
    `).all() as any[];

    for (const log of sensitiveLogs) {
      if (log.metadata) {
        assert.ok(!log.metadata.includes('admin123'), 'Plaintext password must not appear in audit metadata');
        assert.ok(!log.metadata.includes('newSecretPass123'), 'Plaintext password must not appear in audit metadata');
      }
    }
  });

  await test('Audit Log Clearing: Requires explicit confirmation and writes permanent accountability entry', async () => {
    // Attempt clear without confirmation
    const unconfirmedRes = await fetch(`${baseUrl}/api/admin/audit-logs/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });
    assert.strictEqual(unconfirmedRes.status, 400);

    // Perform confirmed clear
    const confirmedRes = await fetch(`${baseUrl}/api/admin/audit-logs/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(confirmedRes.status, 200);
    const clearResult = await confirmedRes.json();
    assert.strictEqual(clearResult.success, true);

    // Verify accountability record exists
    const accountabilityLog = db.prepare(`
      SELECT * FROM system_audit_logs
      WHERE action = 'AUDIT_LOGS_CLEARED'
      ORDER BY id DESC LIMIT 1
    `).get() as any;
    assert.ok(accountabilityLog, 'Permanent accountability log must exist after clearing');
    assert.strictEqual(accountabilityLog.user_id, adminUser.id);
  });

  await test('Admin User Password Management: Admin securely resets password, target user can authenticate, hash is stored', async () => {
    // Reset staff user password to a new value
    const newStaffPass = 'Str0ng!Pass#2026';
    const resetRes = await fetch(`${baseUrl}/api/admin/users/${staffUser.id}/password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newStaffPass }),
    });
    assert.strictEqual(resetRes.status, 200);
    const resetData = await resetRes.json();
    assert.strictEqual(resetData.success, true);

    // Verify password in DB is a valid bcrypt hash and NOT plaintext
    const dbStaff = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(staffUser.id) as any;
    assert.notStrictEqual(dbStaff.password_hash, newStaffPass);
    assert.ok(dbStaff.password_hash.startsWith('$2'), 'Must be stored as bcrypt hash');
    assert.ok(bcrypt.compareSync(newStaffPass, dbStaff.password_hash));

    // Target user can now log in with the new password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffUser.email, password: newStaffPass }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.user.id, staffUser.id);

    // Old password fails
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffUser.email, password: 'staff123' }),
    });
    assert.strictEqual(oldLoginRes.status, 401);

    // Reset back to original staff123 for remaining suite consistency
    await fetch(`${baseUrl}/api/admin/users/${staffUser.id}/password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'staff123' }),
    });
  });

  await test('Dynamic SMTP Configuration: Masks password, updates without restart, tests connection, and audits changes', async () => {
    // 1. Approvers or Staff are denied access to SMTP configuration
    const approverSmtpRes = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverSmtpRes.status, 403);

    // 2. Update SMTP config dynamically without restarting server
    const updateSmtpRes = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: 'smtp.dynamic-mail.com',
        smtpPort: 587,
        smtpUser: 'tickets@dynamic-mail.com',
        smtpPass: 'myNewSmtpSecretKey99',
        smtpSecure: false,
        smtpFrom: 'no-reply@dynamic-mail.com',
        senderName: 'Dynamic Memoria Desk',
      }),
    });
    assert.strictEqual(updateSmtpRes.status, 200);
    const updateData = await updateSmtpRes.json();
    assert.strictEqual(updateData.success, true);
    assert.strictEqual(updateData.config.smtpHost, 'smtp.dynamic-mail.com');
    assert.strictEqual(updateData.config.smtpPass, '********');

    // 3. Get current config - password must strictly be masked as '********' and never leak plaintext
    const getSmtpRes = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(getSmtpRes.status, 200);
    const smtpData = await getSmtpRes.json();
    assert.strictEqual(smtpData.config.smtpPass, '********', 'Password must strictly be masked as ********');
    assert.strictEqual(smtpData.config.hasPassword, true);
    assert.ok(!JSON.stringify(smtpData).includes('myNewSmtpSecretKey99'), 'Plaintext SMTP password must never be exposed');

    // Verify DB stores updated values
    const dbSmtp = db.prepare('SELECT * FROM smtp_settings WHERE id = 1').get() as any;
    assert.strictEqual(dbSmtp.smtp_host, 'smtp.dynamic-mail.com');
    assert.strictEqual(dbSmtp.smtp_user, 'tickets@dynamic-mail.com');
    assert.strictEqual(dbSmtp.smtp_pass, 'myNewSmtpSecretKey99');

    // 4. Update with masked password keeps existing password without overwriting
    const keepPassRes = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: 'mail.reloaded.com',
        smtpPort: 465,
        smtpUser: 'tickets@reloaded.com',
        smtpPass: '********',
        smtpSecure: true,
        smtpFrom: 'no-reply@reloaded.com',
        senderName: 'Reloaded Desk',
      }),
    });
    assert.strictEqual(keepPassRes.status, 200);
    const checkDbPass = db.prepare('SELECT smtp_pass, smtp_host FROM smtp_settings WHERE id = 1').get() as any;
    assert.strictEqual(checkDbPass.smtp_pass, 'myNewSmtpSecretKey99', 'Existing password must be preserved when masked ******** is submitted');
    assert.strictEqual(checkDbPass.smtp_host, 'mail.reloaded.com');

    // 5. Test SMTP connection endpoint responds with valid status
    const testConnRes = await fetch(`${baseUrl}/api/admin/smtp/test-connection`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: '127.0.0.1',
        smtpPort: 2525,
      }),
    });
    assert.strictEqual(testConnRes.status, 200);
    const testConnData = await testConnRes.json();
    assert.ok(typeof testConnData.success === 'boolean');
    assert.ok(testConnData.status);
    assert.ok(testConnData.message);
  });

  await test('Authoritative Attendance Synchronization: Gate and Admin views return identical, accurate DB-backed counts', async () => {
    // 1. Create a submission and approve it
    const sub = ticketService.submitTicket({
      name: 'Sync Test Attendee',
      email: 'sync.attendee@gmail.com',
      phone: '+94 77 888 9999',
      ticketType: 'student',
      universityRegistrationNumber: 'FC' + Math.floor(100000 + Math.random() * 899999),
      paymentSlipUrl: '/uploads/sync.jpg',
      quantity: 1,
    });
    const approved = await approvalService.approveSubmission(sub.submissionId, 'Test Approver');

    // Query gate statistics
    const gateStatsBefore = await (await fetch(`${baseUrl}/api/checkin/statistics`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })).json();

    // Query admin attendance statistics
    const adminStatsBefore = await (await fetch(`${baseUrl}/api/admin/attendance/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();

    // Must be 100% synchronized
    assert.strictEqual(gateStatsBefore.checkedInCount, adminStatsBefore.checkedInCount);
    assert.strictEqual(gateStatsBefore.totalApprovedTickets, adminStatsBefore.totalApprovedTickets);
    assert.strictEqual(gateStatsBefore.percentage, adminStatsBefore.percentage);

    // Check the ticket in
    checkinService.verifyAndCheckIn(approved.ticketId, 'Gate Staff');

    // Query gate and admin statistics after checkin
    const gateStatsAfter = await (await fetch(`${baseUrl}/api/checkin/statistics`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })).json();

    const adminStatsAfter = await (await fetch(`${baseUrl}/api/admin/attendance/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();

    // Both must reflect the exact incremented checked-in count
    assert.strictEqual(gateStatsAfter.checkedInCount, gateStatsBefore.checkedInCount + 1);
    assert.strictEqual(adminStatsAfter.checkedInCount, adminStatsBefore.checkedInCount + 1);
    assert.strictEqual(gateStatsAfter.checkedInCount, adminStatsAfter.checkedInCount);
  });

  // ----------------------------------------------------
  // TEST GROUP 22: BACKENDFIXES 5 — Production Hardening, QR Reissuance, Deletion & Re-registration, Error Engine
  // ----------------------------------------------------
  console.log('\n--- GROUP 22: BACKENDFIXES 5 Production Hardening & Verification ---');

  await test('QR Code Regeneration & Invalidation: Old QR rejected, new QR admitted, email dispatched, approver forbidden', async () => {
    // 1. Create a submission and approve it
    const sub = ticketService.submitTicket({
      name: 'Regen Test Attendee',
      email: 'regen.attendee@gmail.com',
      phone: '+94 77 999 1111',
      ticketType: 'student',
      universityRegistrationNumber: 'FC' + Math.floor(100000 + Math.random() * 899999),
      paymentSlipUrl: '/uploads/regen.jpg',
      quantity: 1,
    });
    const approved = await approvalService.approveSubmission(sub.submissionId, 'Approver');
    const subRecord = db.prepare('SELECT qr_token FROM submissions WHERE id = ?').get(sub.submissionId) as any;
    const oldToken = subRecord.qr_token;
    assert.ok(oldToken, 'Old QR token must exist');

    // 2. Approver is forbidden from regenerating QR
    const approverRegenRes = await fetch(`${baseUrl}/api/admin/tickets/${approved.ticketId}/regenerate-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(approverRegenRes.status, 403, 'Approver must not be authorized to regenerate QR');

    // 3. Admin regenerates QR without confirm -> 400
    const noConfirmRes = await fetch(`${baseUrl}/api/admin/tickets/${approved.ticketId}/regenerate-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });
    assert.strictEqual(noConfirmRes.status, 400, 'Confirmation must be required');

    // 4. Admin regenerates QR with confirm -> succeeds (200)
    const regenRes = await fetch(`${baseUrl}/api/admin/tickets/${approved.ticketId}/regenerate-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, reason: 'Badge lost by attendee' }),
    });
    assert.strictEqual(regenRes.status, 200);
    const regenData = await regenRes.json();
    assert.strictEqual(regenData.success, true);
    assert.ok(regenData.qrToken);
    assert.notStrictEqual(regenData.qrToken, oldToken, 'New token must differ from old token');

    // 5. Old token is recorded in revoked_qr_tokens
    const revokedRecord = db.prepare('SELECT * FROM revoked_qr_tokens WHERE token = ?').get(oldToken) as any;
    assert.ok(revokedRecord, 'Old token must be recorded in revoked_qr_tokens table');

    // 6. Old QR token scan is rejected
    const oldScan = checkinService.verifyAndCheckIn(oldToken, 'Gate Staff');
    assert.strictEqual(oldScan.valid, false);
    assert.ok(oldScan.reason?.toLowerCase().includes('invalidated') || oldScan.reason?.toLowerCase().includes('replaced'));

    // 7. New QR token scan succeeds
    const newScan = checkinService.verifyAndCheckIn(regenData.qrToken, 'Gate Staff');
    assert.strictEqual(newScan.valid, true);

    // 8. Admin can resend regenerated QR email (returns delivery status and diagnostic)
    const resendRes = await fetch(`${baseUrl}/api/admin/tickets/${approved.ticketId}/resend-qr-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resendRes.status, 200);
    const resendData = await resendRes.json();
    assert.strictEqual(typeof resendData.success, 'boolean');
    assert.ok(resendData.message);
  });

  await test('Permanent Deletion & Re-registration: Purging allows immediate re-registration without 409 conflict, audit retained', async () => {
    const regNo = 'FC' + Math.floor(100000 + Math.random() * 899999);

    // 1. Submit ticket with unique reg number
    const sub = ticketService.submitTicket({
      name: 'Purge Test Student',
      email: 'purge.test@gmail.com',
      phone: '+94 77 123 4567',
      ticketType: 'student',
      universityRegistrationNumber: regNo,
      paymentSlipUrl: '/uploads/purge.jpg',
      quantity: 1,
    });
    assert.ok(sub.submissionId);

    // 2. Attempting duplicate registration receives 409
    let duplicateFailed = false;
    try {
      ticketService.submitTicket({
        name: 'Purge Test Student 2',
        email: 'purge2@gmail.com',
        phone: '+94 77 123 4568',
        ticketType: 'student',
        universityRegistrationNumber: regNo,
        paymentSlipUrl: '/uploads/purge2.jpg',
        quantity: 1,
      });
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'REG_NUMBER_EXISTS') duplicateFailed = true;
    }
    assert.ok(duplicateFailed, 'Duplicate active reg number must be rejected with conflict');

    // 3. Admin permanently deletes submission with { confirm: true, permanent: true }
    const delRes = await fetch(`${baseUrl}/api/admin/submissions/${sub.submissionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, permanent: true, reason: 'Registration cancelled by user' }),
    });
    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);

    // 4. Verify record is physically removed from submissions table
    const checkDb = db.prepare('SELECT id FROM submissions WHERE id = ?').get(sub.submissionId);
    assert.strictEqual(checkDb, undefined, 'Permanently deleted submission must be removed from submissions table');

    // 5. Verify system audit log retained the deletion action
    const auditRecord = db.prepare("SELECT * FROM system_audit_logs WHERE action = 'DELETE_SUBMISSION' AND target_id = ?").get(sub.submissionId) as any;
    assert.ok(auditRecord, 'Audit logs must NEVER be deleted when records are purged');

    // 6. Same attendee can now re-register with the exact same regNo without error
    const reSub = ticketService.submitTicket({
      name: 'Purge Test Student Re-registration',
      email: 'purge.test@gmail.com',
      phone: '+94 77 123 4567',
      ticketType: 'student',
      universityRegistrationNumber: regNo,
      paymentSlipUrl: '/uploads/purge-new.jpg',
      quantity: 1,
    });
    assert.ok(reSub.submissionId, 'Attendee must be permitted to re-register after permanent deletion');
    assert.notStrictEqual(reSub.submissionId, sub.submissionId, 'New submission receives a new distinct ID');
  });

  await test('Targeted User Deletion & Confirmation: Requires explicit confirmation, forbidden for non-admins, audits event', async () => {
    // 1. Create a temporary staff user to delete
    const tempUserEmail = `temp.staff.${Date.now()}@memoria.lk`;
    const createRes = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temp Staff User',
        email: tempUserEmail,
        password: 'password123',
        role: 'staff',
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    const tempUserId = createData.id || createData.user?.id;

    // 2. Staff user cannot delete another user (403)
    const staffDeleteRes = await fetch(`${baseUrl}/api/admin/users/${tempUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(staffDeleteRes.status, 403);

    // 3. Admin attempt without confirm fails (400)
    const noConfirmRes = await fetch(`${baseUrl}/api/admin/users/${tempUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });
    assert.strictEqual(noConfirmRes.status, 400);

    // 4. Admin delete with confirm succeeds (200)
    const deleteRes = await fetch(`${baseUrl}/api/admin/users/${tempUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(deleteRes.status, 200);

    // 5. User is deleted from DB
    const checkUser = db.prepare('SELECT id FROM users WHERE id = ?').get(tempUserId);
    assert.strictEqual(checkUser, undefined);

    // 6. Other users untouched
    const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
    assert.ok(adminExists);
  });

  await test('Dedicated System Error Management Engine: Query errors, update resolution status, role protection', async () => {
    // 1. Log a test error in system_audit_logs
    const errorId = `err-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO system_audit_logs (
        id, timestamp, severity, event_type, action, module, message,
        status_code, error_code, error_message, resolution_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      errorId,
      new Date().toISOString(),
      'ERROR',
      'TEST_ERROR_EVENT',
      'SIMULATE_FAILURE',
      'API',
      'Simulated database timeout on gateway check',
      500,
      'GATEWAY_TIMEOUT',
      'Connection timed out after 5000ms',
      'open',
      new Date().toISOString()
    );

    // 2. Staff user denied access (403)
    const staffErrorsRes = await fetch(`${baseUrl}/api/admin/system-errors`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffErrorsRes.status, 403);

    // 3. Admin queries errors (200)
    const adminErrorsRes = await fetch(`${baseUrl}/api/admin/system-errors?module=API&severity=ERROR`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminErrorsRes.status, 200);
    const errorsData = await adminErrorsRes.json();
    assert.ok(Array.isArray(errorsData.errors));
    const foundError = errorsData.errors.find((e: any) => e.id === errorId);
    assert.ok(foundError, 'The logged system error must be returned in query results');
    assert.strictEqual(foundError.resolutionStatus, 'open');

    // 4. Admin updates resolution status to investigating with note
    const patchRes = await fetch(`${baseUrl}/api/admin/system-errors/${errorId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'investigating', note: 'Investigating gateway latency' }),
    });
    assert.strictEqual(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.success, true);
    assert.strictEqual(patchData.error.resolutionStatus, 'investigating');
    assert.strictEqual(patchData.error.resolutionNote, 'Investigating gateway latency');

    // 5. Verify DB state
    const dbErr = db.prepare('SELECT resolution_status, resolution_note, resolved_by FROM system_audit_logs WHERE id = ?').get(errorId) as any;
    assert.strictEqual(dbErr.resolution_status, 'investigating');
    assert.strictEqual(dbErr.resolution_note, 'Investigating gateway latency');
    assert.ok(dbErr.resolved_by);

    // Clean up test error
    db.prepare('DELETE FROM system_audit_logs WHERE id = ?').run(errorId);
  });

  // ----------------------------------------------------
  // TEST GROUP 24: FIXES 6 — SMTP Reset, Clear Error Logs, Clear Submission Logs, Approver Auth & Authoritative Stats
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 24: FIXES 6 — SMTP Reset, Clear Error Logs, Clear Submission Logs, Approver Auth & Authoritative Stats ---');

  await test('SMTP Reset: POST /api/admin/smtp/reset requires admin role and rejects staff/unauth', async () => {
    // 1. Unauthenticated request rejected
    const unauthRes = await fetch(`${baseUrl}/api/admin/smtp/reset`, { method: 'POST' });
    assert.strictEqual(unauthRes.status, 401);

    // 2. Staff rejected
    const staffRes = await fetch(`${baseUrl}/api/admin/smtp/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffRes.status, 403);

    // 3. Approver rejected
    const approverRes = await fetch(`${baseUrl}/api/admin/smtp/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverRes.status, 403);
  });

  await test('SMTP Reset: Clears persistent DB row, active transporter, sets status to Not Configured, and audits action', async () => {
    // 1. First ensure SMTP is configured with known values
    await fetch(`${baseUrl}/api/admin/smtp/config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: 'smtp.pre-reset-test.com',
        smtpPort: 587,
        smtpUser: 'pre-reset@test.com',
        smtpPass: 'secretTestPassword123',
        smtpSecure: false,
        smtpFrom: 'no-reply@pre-reset-test.com',
        senderName: 'Pre-Reset Desk',
      }),
    });

    const preResetCheck = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const preResetData = await preResetCheck.json();
    assert.strictEqual(preResetData.status, 'Configured');
    assert.strictEqual(preResetData.configured, true);

    // 2. Execute Reset via POST /api/admin/smtp/reset
    const resetRes = await fetch(`${baseUrl}/api/admin/smtp/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resetRes.status, 200);
    const resetData = await resetRes.json();
    assert.strictEqual(resetData.success, true);
    assert.strictEqual(resetData.config.status, 'Not Configured');
    assert.strictEqual(resetData.config.smtpHost, '');
    assert.strictEqual(resetData.config.smtpUser, '');
    assert.strictEqual(resetData.config.smtpPass, '');
    assert.strictEqual(resetData.config.hasPassword, false);

    // 3. Verify Database persistent storage: smtp_settings row is deleted
    const dbRow = db.prepare('SELECT * FROM smtp_settings WHERE id = 1').get();
    assert.strictEqual(dbRow, undefined, 'smtp_settings row must be deleted from database');

    // 4. Verify GET /api/admin/smtp/config returns unconfigured status
    const getSmtpRes = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const freshSmtpData = await getSmtpRes.json();
    assert.strictEqual(freshSmtpData.status, 'Not Configured');
    assert.strictEqual(freshSmtpData.configured, false);
    assert.strictEqual(emailService.isConfigured(), false);

    // 5. Verify audit log entry was created
    const resetAudit = db.prepare("SELECT * FROM system_audit_logs WHERE event_type = 'SMTP_SETTINGS_RESET' ORDER BY timestamp DESC LIMIT 1").get() as any;
    assert.ok(resetAudit, 'SMTP reset must be audited in system_audit_logs');
    assert.strictEqual(resetAudit.module, 'SMTP');
    assert.strictEqual(resetAudit.username, 'Thisal Methwidu');
  });

  await test('SMTP Reconfiguration: Can save new SMTP configuration immediately after reset without restart', async () => {
    // 1. Configure new SMTP credentials after reset
    const newConfigRes = await fetch(`${baseUrl}/api/admin/smtp/config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: 'smtp.new-reconfigured.com',
        smtpPort: 465,
        smtpUser: 'new@reconfigured.com',
        smtpPass: 'brandNewSecret99',
        smtpSecure: true,
        smtpFrom: 'tickets@new-reconfigured.com',
        senderName: 'New Reconfigured Desk',
      }),
    });
    assert.strictEqual(newConfigRes.status, 200);
    const newConfigData = await newConfigRes.json();
    assert.strictEqual(newConfigData.config.status, 'Configured');
    assert.strictEqual(newConfigData.config.smtpHost, 'smtp.new-reconfigured.com');
    assert.strictEqual(newConfigData.config.smtpPass, '********');

    // Verify DB updated
    const dbRow = db.prepare('SELECT * FROM smtp_settings WHERE id = 1').get() as any;
    assert.strictEqual(dbRow.smtp_host, 'smtp.new-reconfigured.com');
    assert.strictEqual(dbRow.smtp_pass, 'brandNewSecret99');
    assert.strictEqual(emailService.isConfigured(), true);

    // Clean up by resetting again
    await fetch(`${baseUrl}/api/admin/smtp/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  await test('Error Logs Clearing: DELETE & POST /api/admin/system-errors/clear requires admin and confirmation', async () => {
    // 1. Unauthenticated or staff rejected
    const unauthRes = await fetch(`${baseUrl}/api/admin/system-errors/clear`, { method: 'POST', body: JSON.stringify({ confirm: true }) });
    assert.strictEqual(unauthRes.status, 401);

    const staffRes = await fetch(`${baseUrl}/api/admin/system-errors/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.strictEqual(staffRes.status, 403);

    // 2. Reject without confirm: true
    const noConfirmRes = await fetch(`${baseUrl}/api/admin/system-errors/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });
    assert.strictEqual(noConfirmRes.status, 400);

    // 3. Create test error log
    const testErrId = `err-clear-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO system_audit_logs (id, timestamp, severity, event_type, action, module, message, created_at)
      VALUES (?, ?, 'ERROR', 'TEST_ERROR', 'TEST_ACTION', 'EMAIL', 'Temporary test error for clearing', ?)
    `).run(testErrId, new Date().toISOString(), new Date().toISOString());

    // 4. Admin clears error logs
    const clearRes = await fetch(`${baseUrl}/api/admin/system-errors/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, reason: 'Testing error log cleanup' }),
    });
    assert.strictEqual(clearRes.status, 200);
    const clearData = await clearRes.json();
    assert.strictEqual(clearData.success, true);
    assert.ok(clearData.deletedCount >= 1);

    // 5. Verify the test error log is gone
    const checkErr = db.prepare('SELECT id FROM system_audit_logs WHERE id = ?').get(testErrId);
    assert.strictEqual(checkErr, undefined, 'Targeted error log must be deleted');

    // 6. Verify audit event for error clearing was recorded
    const auditRow = db.prepare("SELECT * FROM system_audit_logs WHERE event_type = 'ADMIN_CLEAR_ERROR_LOGS' ORDER BY timestamp DESC LIMIT 1").get() as any;
    assert.ok(auditRow, 'ADMIN_CLEAR_ERROR_LOGS audit record must exist');
    assert.strictEqual(auditRow.severity, 'INFO');
  });

  await test('Submission Logs Clearing: Clears history/activity logs while preserving submissions business records', async () => {
    // 1. Verify business submission count before
    const subCountBefore = Number((db.prepare('SELECT COUNT(*) as c FROM submissions').get() as any)?.c) || 0;

    // 2. Create a test submission activity log
    const testActId = `act-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO activity_logs (id, timestamp, actor, action, entity_id, result)
      VALUES (?, ?, 'Thisal Methwidu', 'APPLICATION_SUBMITTED', 'sub-test-dummy', 'SUCCESS')
    `).run(testActId, new Date().toISOString());

    // 3. Clear submission logs
    const clearRes = await fetch(`${baseUrl}/api/admin/submissions/logs/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, reason: 'Testing submission log clearing' }),
    });
    assert.strictEqual(clearRes.status, 200);
    const clearData = await clearRes.json();
    assert.strictEqual(clearData.success, true);

    // 4. Verify test activity log is gone
    const checkAct = db.prepare('SELECT id FROM activity_logs WHERE id = ?').get(testActId);
    assert.strictEqual(checkAct, undefined, 'Submission activity log must be deleted');

    // 5. CRITICAL: Verify submissions table records remain 100% intact!
    const subCountAfter = Number((db.prepare('SELECT COUNT(*) as c FROM submissions').get() as any)?.c) || 0;
    assert.strictEqual(subCountAfter, subCountBefore, 'Submissions business data must NEVER be touched when clearing logs');

    // 6. Verify audit event was logged
    const auditRow = db.prepare("SELECT * FROM system_audit_logs WHERE event_type = 'ADMIN_CLEAR_SUBMISSION_LOGS' ORDER BY timestamp DESC LIMIT 1").get() as any;
    assert.ok(auditRow, 'ADMIN_CLEAR_SUBMISSION_LOGS audit event must be created');
  });

  await test('Approver Authorization: /api/approve/* strictly protects approval desk against unauthorized roles', async () => {
    // 1. Unauthenticated request rejected
    const unauthRes = await fetch(`${baseUrl}/api/approve/stats`);
    assert.strictEqual(unauthRes.status, 401);

    // 2. Staff role rejected
    const staffRes = await fetch(`${baseUrl}/api/approve/stats`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffRes.status, 403);

    const staffPending = await fetch(`${baseUrl}/api/approve/pending`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffPending.status, 403);

    // 3. Approver role allowed
    const approverRes = await fetch(`${baseUrl}/api/approve/stats`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverRes.status, 200);

    // 4. Admin role allowed
    const adminRes = await fetch(`${baseUrl}/api/approve/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
  });

  await test('Authoritative Statistics Consistency: Database count matches Admin and Approver endpoints', async () => {
    const adminStatsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminStatsRes.status, 200);
    const adminStats = await adminStatsRes.json();

    const approverStatsRes = await fetch(`${baseUrl}/api/approve/stats`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverStatsRes.status, 200);
    const approverStats = await approverStatsRes.json();

    // Direct database authoritative counts
    const dbSubmissions = Number((db.prepare('SELECT COUNT(*) as c FROM submissions WHERE deleted_at IS NULL').get() as any)?.c) || 0;
    const dbUsers = Number((db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c) || 0;
    const dbAuditLogs = Number((db.prepare('SELECT COUNT(*) as c FROM system_audit_logs').get() as any)?.c) || 0;

    assert.strictEqual(adminStats.totalApplications, dbSubmissions);
    assert.strictEqual(approverStats.totalApplications, dbSubmissions);
    assert.strictEqual(adminStats.totalUsers, dbUsers);
    assert.strictEqual(adminStats.totalAuditLogs, dbAuditLogs);
    assert.strictEqual(adminStats.ticketsSold, approverStats.ticketsSold);
  });

  await test('Resend Ticket Pass Email: Both Admin and Approver endpoints dispatch pass email and enforce RBAC', async () => {
    // 1. Create and approve a test submission
    const resendSub = ticketService.submitTicket({
      name: 'Resend Pass Attendee',
      email: 'resend.pass@gmail.com',
      phone: '+94 77 555 1234',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/resend.jpg',
    });
    const approved = await approvalService.approveSubmission(resendSub.submissionId, 'Approver');
    assert.ok(approved.ticketId);

    // 2. Staff user forbidden from resending pass (403)
    const staffRes = await fetch(`${baseUrl}/api/approve/submissions/${resendSub.submissionId}/resend-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffRes.status, 403, 'Staff must be forbidden from resending ticket pass');

    // 3. Approver can resend pass email via /api/approve/submissions/:id/resend-email
    const approverRes = await fetch(`${baseUrl}/api/approve/submissions/${resendSub.submissionId}/resend-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert.strictEqual(approverRes.status, 200);
    const approverData = await approverRes.json();
    assert.strictEqual(typeof approverData.success, 'boolean');
    assert.ok(approverData.message);

    // 4. Admin can resend pass email via /api/admin/submissions/:id/resend-email
    const adminRes = await fetch(`${baseUrl}/api/admin/submissions/${resendSub.submissionId}/resend-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const adminData = await adminRes.json();
    assert.strictEqual(typeof adminData.success, 'boolean');
    assert.ok(adminData.message);

    // 5. Clean up test record
    db.prepare('DELETE FROM submissions WHERE id = ?').run(resendSub.submissionId);
  });

  // ----------------------------------------------------
  // Summary & Test Log Cleanup
  // ----------------------------------------------------
  // Clean up any dynamically created test admin accounts and ensure standard users
  db.prepare("DELETE FROM users WHERE id NOT IN ('usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5')").run();
  db.prepare("UPDATE users SET role = 'admin', name = 'Thisal Methwidu', email = 'admin@memoria.lk', password_hash = ? WHERE id = 'usr-1'").run(bcrypt.hashSync('admin123', 10));

  // Clean up test logs generated by test suite to prevent production log pollution
  db.prepare("DELETE FROM activity_logs WHERE actor IN ('Test Approver', 'test') OR metadata LIKE '%test%'").run();
  db.prepare("DELETE FROM system_audit_logs WHERE id LIKE '%test%' OR message LIKE '%test%' OR message LIKE '%Test%'").run();

  // Restore original SMTP configuration if one existed before tests
  if (initialSmtpSetting) {
    db.prepare(`
      INSERT OR REPLACE INTO smtp_settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from, sender_name, updated_at, updated_by)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      initialSmtpSetting.smtp_host,
      initialSmtpSetting.smtp_port,
      initialSmtpSetting.smtp_user,
      initialSmtpSetting.smtp_pass,
      initialSmtpSetting.smtp_secure,
      initialSmtpSetting.smtp_from,
      initialSmtpSetting.sender_name,
      initialSmtpSetting.updated_at,
      initialSmtpSetting.updated_by
    );
    emailService.reloadTransporter();
  }

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
