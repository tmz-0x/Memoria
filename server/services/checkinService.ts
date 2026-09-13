import { db } from '../db/database';
import { auditService } from './auditService';
import { attendanceService } from './attendanceService';

export interface CheckinResult {
  valid: boolean;
  reason?: string;
  submission?: any;
}

export const checkinService = {
  /**
   * Concurrency-safe atomic check-in.
   * Prevents race conditions and double check-in under simultaneous scans.
   */
  verifyAndCheckIn: async (query: string, staffName: string): Promise<CheckinResult> => {
    const raw = query?.trim();
    if (!raw) {
      await auditService.logScan('', 'INVALID', staffName, null, null, 'Empty query');
      return { valid: false, reason: 'Empty QR code or ticket query provided.' };
    }

    // Extract token if full payload was scanned
    let tokenQuery = raw;
    if (raw.startsWith('MEMORIA26:TICKET:')) {
      tokenQuery = raw.replace('MEMORIA26:TICKET:', '').trim();
    }

    const normalizedUpper = raw.toUpperCase();
    const normalizedToken = tokenQuery.toLowerCase();

    // Find submission by token, payload, ticketId, id, email, or student reg
    const sub = await db.prepare(`
      SELECT * FROM submissions
      WHERE qr_token = ?
         OR qr_payload = ?
         OR UPPER(ticket_id) = ?
         OR UPPER(id) = ?
         OR UPPER(email) = ?
         OR UPPER(normalized_reg_number) = ?
    `).get(tokenQuery, raw, normalizedUpper, normalizedUpper, normalizedUpper, normalizedUpper) as any;

    if (!sub) {
      const revoked = await db.prepare(`
        SELECT * FROM revoked_qr_tokens WHERE token = ? OR token = ?
      `).get(tokenQuery, raw) as any;

      if (revoked) {
        await auditService.logScan(raw, 'INVALID', staffName, revoked.ticket_id, revoked.submission_id, 'Scanned invalidated/regenerated QR credential');
        await auditService.logSystemEvent({
          severity: 'WARNING',
          eventType: 'INVALID_QR_SCAN',
          action: 'CHECKIN_SCAN',
          module: 'CHECKIN',
          message: `Attempted scan of invalidated/regenerated QR credential for ticket ${revoked.ticket_id}`,
          targetType: 'ticket',
          targetId: revoked.ticket_id,
          username: staffName,
        });
        return {
          valid: false,
          reason: 'INVALID TICKET: This QR credential was invalidated and replaced by an administrator. Please use the newly issued QR code.',
        };
      }

      await auditService.logScan(raw, 'INVALID', staffName, null, null, 'Ticket not found');
      await auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'INVALID_QR_SCAN',
        action: 'CHECKIN_SCAN',
        module: 'CHECKIN',
        message: `Scanned query did not match any active ticket: ${raw.slice(0, 30)}`,
        username: staffName,
      });
      return { valid: false, reason: 'Invalid Ticket: No matching record found.' };
    }

    // Check status
    if (sub.status === 'rejected') {
      await auditService.logScan(raw, 'INVALID', staffName, sub.ticket_id, sub.id, 'Application rejected');
      await auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'INVALID_QR_SCAN',
        action: 'CHECKIN_SCAN',
        module: 'CHECKIN',
        message: `Scan rejected: Application for ticket ${sub.ticket_id} was rejected (${sub.rejection_reason || 'Declined'})`,
        targetType: 'ticket',
        targetId: sub.ticket_id,
        username: staffName,
      });
      return {
        valid: false,
        reason: `Invalid Ticket: Application was rejected (${sub.rejection_reason || 'Declined'}).`,
        submission: sub,
      };
    }

    if (sub.status === 'pending') {
      await auditService.logScan(raw, 'INVALID', staffName, sub.ticket_id, sub.id, 'Pending verification');
      await auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'INVALID_QR_SCAN',
        action: 'CHECKIN_SCAN',
        module: 'CHECKIN',
        message: `Scan rejected: Ticket ${sub.ticket_id} is still pending verification`,
        targetType: 'ticket',
        targetId: sub.ticket_id,
        username: staffName,
      });
      return {
        valid: false,
        reason: 'Invalid Ticket: Payment transfer is still PENDING verification desk review.',
        submission: sub,
      };
    }

    // If already marked checked in before atomic attempt
    if (sub.checked_in === 1) {
      const formattedTime = sub.checked_in_at ? new Date(sub.checked_in_at).toLocaleTimeString() : 'Earlier';
      await auditService.logScan(raw, 'ALREADY_USED', staffName, sub.ticket_id, sub.id, `First admitted at ${formattedTime}`);
      await auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'DUPLICATE_CHECKIN_ATTEMPT',
        action: 'CHECKIN_SCAN',
        module: 'CHECKIN',
        message: `Duplicate check-in attempt for ticket ${sub.ticket_id}. Previously admitted at ${formattedTime} by ${sub.checked_in_by || 'Staff'}`,
        targetType: 'ticket',
        targetId: sub.ticket_id,
        username: staffName,
      });
      return {
        valid: false,
        reason: `TICKET ALREADY USED: Admitted at ${formattedTime} by ${sub.checked_in_by || 'Staff'}.`,
        submission: sub,
      };
    }

    const now = new Date().toISOString();

    // ATOMIC UPDATE: PostgreSQL row-level lock. Only updates if checked_in is strictly 0 at the instant of execution
    const updateResult = await db.run(`
      UPDATE submissions
      SET checked_in = 1,
          checked_in_at = ?,
          checked_in_by = ?
      WHERE id = ? AND checked_in = 0 AND status = 'approved'
    `, [now, staffName, sub.id]);

    if (updateResult.changes === 0) {
      // A concurrent scan executed at the exact same millisecond won the race!
      const current = await db.prepare('SELECT * FROM submissions WHERE id = ?').get(sub.id) as any;
      const formattedTime = current?.checked_in_at ? new Date(current.checked_in_at).toLocaleTimeString() : 'Just now';
      await auditService.logScan(raw, 'ALREADY_USED', staffName, sub.ticket_id, sub.id, 'Concurrent scan race lost');
      await auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'DUPLICATE_CHECKIN_ATTEMPT',
        action: 'CHECKIN_SCAN',
        module: 'CHECKIN',
        message: `Concurrent scan race lost on ticket ${sub.ticket_id}. Admitted at ${formattedTime} by ${current?.checked_in_by || 'Staff'}`,
        targetType: 'ticket',
        targetId: sub.ticket_id,
        username: staffName,
      });
      return {
        valid: false,
        reason: `TICKET ALREADY USED: Admitted at ${formattedTime} by ${current?.checked_in_by || 'Staff'}.`,
        submission: current,
      };
    }

    // Single-winner successful check-in
    await auditService.logScan(raw, 'VALID', staffName, sub.ticket_id, sub.id, 'Entry granted');
    await auditService.logActivity(staffName, 'TICKET_CHECKED_IN', 'SUCCESS', sub.id, {
      ticketId: sub.ticket_id,
      attendeeName: sub.name,
      checkInTime: now,
    });
    await auditService.logSystemEvent({
      severity: 'INFO',
      eventType: 'TICKET_CHECKED_IN',
      action: 'CHECKIN_SCAN',
      module: 'CHECKIN',
      message: `Admission granted for ticket ${sub.ticket_id} (${sub.name}) by ${staffName}`,
      targetType: 'ticket',
      targetId: sub.ticket_id,
      username: staffName,
      metadata: {
        ticketType: sub.ticket_type,
        quantity: sub.quantity,
        checkedInAt: now,
      },
    });

    return {
      valid: true,
      submission: {
        ...sub,
        checked_in: 1,
        checked_in_at: now,
        checked_in_by: staffName,
      },
    };
  },

  /**
   * Get Gate Admission statistics via centralized attendance service.
   */
  getCheckinStats: async () => {
    return attendanceService.getAttendanceStatistics();
  },
};
