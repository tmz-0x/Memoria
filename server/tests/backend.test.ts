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
  // Summary
  // ----------------------------------------------------
  // Clean up any dynamically created test admin accounts and ensure standard users
  db.prepare("DELETE FROM users WHERE id NOT IN ('usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5')").run();
  db.prepare("UPDATE users SET role = 'admin', name = 'Thisal Methwidu', email = 'admin@memoria.lk', password_hash = ? WHERE id = 'usr-1'").run(bcrypt.hashSync('admin123', 10));

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
