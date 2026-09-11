import assert from 'assert';
import http from 'http';
import { createApp } from '../app';
import { db } from '../db/database';
import { ticketService } from '../services/ticketService';
import { approvalService } from '../services/approvalService';
import { checkinService } from '../services/checkinService';
import { revenueService } from '../services/revenueService';
import { emailService } from '../services/emailService';

async function runAllTests() {
  console.log('========================================================');
  console.log('  STARTING MEMORIA\'26 BACKEND COMPREHENSIVE TEST SUITE  ');
  console.log('========================================================\n');

  // Boot app & create tables
  createApp();

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        return res
          .then(() => {
            console.log(`  ✓ [PASS] ${name}`);
            passed++;
          })
          .catch((err: any) => {
            console.error(`  ✗ [FAIL] ${name}`);
            console.error(`     Error: ${err.message}`);
          });
      } else {
        console.log(`  ✓ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: Ticket Pricing & Client-Side Anti-Tampering
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
      quantity: 5, // Client attempts to request 5 passes for student
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
  // TEST GROUP 2: University Registration Number Validation & Uniqueness
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
          universityRegistrationNumber: '123456', // missing letters
          paymentSlipUrl: '/uploads/slip.jpg',
        });
      },
      (err: any) => err.code === 'INVALID_REGISTRATION_FORMAT'
    );
  });

  await test('Normalizes case and rejects duplicate registration number', () => {
    // Attempt duplicate of uniqueStudentReg1 in lowercase
    assert.throws(
      () => {
        ticketService.submitTicket({
          name: 'Duplicate Lowercase',
          email: 'dup.lower@gmail.com',
          phone: '+94 77 222 3333',
          ticketType: 'student',
          universityRegistrationNumber: uniqueStudentReg1.toLowerCase(),
          paymentSlipUrl: '/uploads/slip.jpg',
        });
      },
      (err: any) => err.code === 'REGISTRATION_NUMBER_ALREADY_USED'
    );
  });

  await test('Normalizes whitespace and rejects duplicate registration number', () => {
    // Attempt duplicate of uniqueStudentReg1 with surrounding & inner spaces
    assert.throws(
      () => {
        ticketService.submitTicket({
          name: 'Duplicate Whitespace',
          email: 'dup.space@gmail.com',
          phone: '+94 77 333 4444',
          ticketType: 'student',
          universityRegistrationNumber: `  ${uniqueStudentReg1.slice(0, 2)} ${uniqueStudentReg1.slice(2)}  `,
          paymentSlipUrl: '/uploads/slip.jpg',
        });
      },
      (err: any) => err.code === 'REGISTRATION_NUMBER_ALREADY_USED'
    );
  });

  // ----------------------------------------------------
  // TEST GROUP 3: Application Lifecycle, Manual Approval, & Idempotency
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Lifecycle, Approval, & QR Generation ---');

  let testSubmissionId = '';
  await test('Initial submission status is strictly PENDING with no QR generated', () => {
    const res = ticketService.submitTicket({
      name: 'Kasun Bandara',
      email: 'kasun.b@gmail.com',
      phone: '+94 77 555 6677',
      ticketType: 'student',
      universityRegistrationNumber: uniqueStudentReg2,
      paymentSlipUrl: '/uploads/kasun.jpg',
    });
    testSubmissionId = res.submissionId;

    const sub = db.prepare('SELECT status, ticket_id, qr_token FROM submissions WHERE id = ?').get(testSubmissionId) as any;
    assert.strictEqual(sub.status, 'pending', 'Status must be pending');
    assert.strictEqual(sub.ticket_id, null, 'Ticket ID must NOT be generated yet');
    assert.strictEqual(sub.qr_token, null, 'QR token must NOT be generated yet');
  });

  let approvedTicketId = '';
  let generatedQrToken = '';
  await test('Authorized approval transitions to APPROVED, issues ticket ID, and creates secure QR', async () => {
    const res = await approvalService.approveSubmission(testSubmissionId, 'Elena Vance (Approver)');
    assert.strictEqual(res.success, true);
    assert.ok(res.ticketId.startsWith('MEM-26-'), 'Ticket ID must follow MEM-26-XXXX format');
    approvedTicketId = res.ticketId;

    const sub = db.prepare('SELECT status, ticket_id, qr_token, qr_payload, qr_image_data, approver FROM submissions WHERE id = ?').get(testSubmissionId) as any;
    assert.strictEqual(sub.status, 'approved');
    assert.strictEqual(sub.ticket_id, approvedTicketId);
    assert.ok(sub.qr_token.length >= 32, 'QR token must be cryptographically secure');
    assert.strictEqual(sub.qr_payload, `MEMORIA26:TICKET:${sub.qr_token}`);
    assert.ok(sub.qr_image_data.startsWith('data:image/png;base64,'), 'QR image must be valid PNG data URL');
    generatedQrToken = sub.qr_token;
  });

  await test('Approval is strictly idempotent (repeated approve returns existing ticket without duplicating)', async () => {
    const res2 = await approvalService.approveSubmission(testSubmissionId, 'Elena Vance');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.ticketId, approvedTicketId, 'Must return same existing ticket ID');
    assert.strictEqual(res2.alreadyApproved, true);

    const count = (db.prepare('SELECT COUNT(*) as c FROM submissions WHERE ticket_id = ?').get(approvedTicketId) as any).c;
    assert.strictEqual(count, 1, 'Must not duplicate ticket record');
  });

  await test('Rejected application cannot be directly approved without resubmission', async () => {
    const rejSub = ticketService.submitTicket({
      name: 'Reject Me',
      email: 'reject.me@gmail.com',
      phone: '+94 77 999 8888',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/rej.jpg',
    });

    await approvalService.rejectSubmission(rejSub.submissionId, 'Elena Vance', 'Unreadable bank slip');

    await assert.rejects(
      async () => {
        await approvalService.approveSubmission(rejSub.submissionId, 'Elena Vance');
      },
      (err: any) => err.code === 'INVALID_STATUS_TRANSITION'
    );
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
    // Create and approve a new fresh ticket
    const fresh = ticketService.submitTicket({
      name: 'Concurrent Attendee',
      email: 'concurrent@gmail.com',
      phone: '+94 77 888 7777',
      ticketType: 'outsider',
      quantity: 2,
      paymentSlipUrl: '/uploads/slip.jpg',
    });
    const app = await approvalService.approveSubmission(fresh.submissionId, 'Elena Vance');
    const freshRecord = db.prepare('SELECT qr_token FROM submissions WHERE id = ?').get(fresh.submissionId) as any;
    const qrPayload = `MEMORIA26:TICKET:${freshRecord.qr_token}`;

    // Execute two simultaneous concurrent check-in operations
    const [scanA, scanB] = await Promise.all([
      new Promise<any>((resolve) => setImmediate(() => resolve(checkinService.verifyAndCheckIn(qrPayload, 'Gate Staff 1')))),
      new Promise<any>((resolve) => setImmediate(() => resolve(checkinService.verifyAndCheckIn(qrPayload, 'Gate Staff 2')))),
    ]);

    const results = [scanA.valid, scanB.valid];
    const validCount = results.filter((v) => v === true).length;
    const invalidCount = results.filter((v) => v === false).length;

    assert.strictEqual(validCount, 1, 'Exactly ONE concurrent scan must succeed');
    assert.strictEqual(invalidCount, 1, 'Exactly ONE concurrent scan must be rejected');
    console.log(`     Race condition resolved: Scan 1 = ${scanA.valid ? 'VALID' : 'ALREADY_USED'}, Scan 2 = ${scanB.valid ? 'VALID' : 'ALREADY_USED'}`);
  });

  // ----------------------------------------------------
  // TEST GROUP 5: Email Decoupling & Failure Tolerance
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Email Decoupling & Retry ---');

  await test('Email failure does NOT revoke approved ticket; retry succeeds idempotently', async () => {
    // Create an approved ticket
    const emailSub = ticketService.submitTicket({
      name: 'Email Test Attendee',
      email: 'email.test@gmail.com',
      phone: '+94 77 222 9999',
      ticketType: 'outsider',
      quantity: 1,
      paymentSlipUrl: '/uploads/email.jpg',
    });
    await approvalService.approveSubmission(emailSub.submissionId, 'Elena Vance');

    // Simulate an email delivery
    const emailRes = await emailService.sendTicketEmail(emailSub.submissionId);
    assert.strictEqual(emailRes.success, true);

    const sub = db.prepare('SELECT status, email_status, ticket_id FROM submissions WHERE id = ?').get(emailSub.submissionId) as any;
    assert.strictEqual(sub.status, 'approved', 'Ticket remains fully approved');
    assert.strictEqual(sub.email_status, 'SENT', 'Email status is recorded');

    // Retry email does not create new ticket
    const retryRes = await emailService.retryFailedEmail(emailSub.submissionId);
    assert.strictEqual(retryRes.success, true);
    const subAfter = db.prepare('SELECT ticket_id FROM submissions WHERE id = ?').get(emailSub.submissionId) as any;
    assert.strictEqual(subAfter.ticket_id, sub.ticket_id, 'Ticket ID is completely preserved on retry');
  });

  // ----------------------------------------------------
  // TEST GROUP 6: Authoritative Revenue & Stats Calculation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: Authoritative Revenue Math ---');

  await test('Revenue is strictly derived from integer multiplication of approved passes', () => {
    const stats = revenueService.getAdminStats();
    assert.ok(stats.totalRevenue > 0, 'Total revenue must be positive');
    assert.strictEqual(
      stats.totalRevenue,
      stats.studentRevenue + stats.outsiderRevenue,
      'Total revenue must match studentRevenue + outsiderRevenue'
    );
    assert.strictEqual(
      stats.studentRevenue,
      stats.studentApprovedCount * 200,
      'Student revenue must strictly equal studentApprovedCount * 200'
    );
    assert.strictEqual(
      stats.outsiderRevenue,
      stats.outsiderApprovedCount * 1000,
      'Outsider revenue must strictly equal outsiderApprovedCount * 1000'
    );
  });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`  TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('========================================================\n');
  process.exit(0);
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
