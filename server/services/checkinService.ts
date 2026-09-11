import { db } from '../db/database';
import { auditService } from './auditService';

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
  verifyAndCheckIn: (query: string, staffName: string): CheckinResult => {
    const raw = query?.trim();
    if (!raw) {
      auditService.logScan('', 'INVALID', staffName, null, null, 'Empty query');
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
    const sub = db.prepare(`
      SELECT * FROM submissions
      WHERE qr_token = ?
         OR qr_payload = ?
         OR UPPER(ticket_id) = ?
         OR UPPER(id) = ?
         OR UPPER(email) = ?
         OR UPPER(normalized_reg_number) = ?
    `).get(tokenQuery, raw, normalizedUpper, normalizedUpper, normalizedUpper, normalizedUpper) as any;

    if (!sub) {
      auditService.logScan(raw, 'INVALID', staffName, null, null, 'Ticket not found');
      return { valid: false, reason: 'Invalid Ticket: No matching record found.' };
    }

    // Check status
    if (sub.status === 'rejected') {
      auditService.logScan(raw, 'INVALID', staffName, sub.ticket_id, sub.id, 'Application rejected');
      return {
        valid: false,
        reason: `Invalid Ticket: Application was rejected (${sub.rejection_reason || 'Declined'}).`,
        submission: sub,
      };
    }

    if (sub.status === 'pending') {
      auditService.logScan(raw, 'INVALID', staffName, sub.ticket_id, sub.id, 'Pending verification');
      return {
        valid: false,
        reason: 'Invalid Ticket: Payment transfer is still PENDING verification desk review.',
        submission: sub,
      };
    }

    // If already marked checked in before atomic attempt
    if (sub.checked_in === 1) {
      const formattedTime = sub.checked_in_at ? new Date(sub.checked_in_at).toLocaleTimeString() : 'Earlier';
      auditService.logScan(raw, 'ALREADY_USED', staffName, sub.ticket_id, sub.id, `First admitted at ${formattedTime}`);
      return {
        valid: false,
        reason: `TICKET ALREADY USED: Admitted at ${formattedTime} by ${sub.checked_in_by || 'Staff'}.`,
        submission: sub,
      };
    }

    const now = new Date().toISOString();

    // ATOMIC UPDATE: Only updates if checked_in is strictly 0 at the instant of execution
    const updateResult = db.prepare(`
      UPDATE submissions
      SET checked_in = 1,
          checked_in_at = ?,
          checked_in_by = ?
      WHERE id = ? AND checked_in = 0 AND status = 'approved'
    `).run(now, staffName, sub.id);

    if (updateResult.changes === 0) {
      // A concurrent scan executed at the exact same millisecond won the race!
      const current = db.prepare('SELECT * FROM submissions WHERE id = ?').get(sub.id) as any;
      const formattedTime = current?.checked_in_at ? new Date(current.checked_in_at).toLocaleTimeString() : 'Just now';
      auditService.logScan(raw, 'ALREADY_USED', staffName, sub.ticket_id, sub.id, 'Concurrent scan race lost');
      return {
        valid: false,
        reason: `TICKET ALREADY USED: Admitted at ${formattedTime} by ${current?.checked_in_by || 'Staff'}.`,
        submission: current,
      };
    }

    // Single-winner successful check-in
    auditService.logScan(raw, 'VALID', staffName, sub.ticket_id, sub.id, 'Entry granted');
    auditService.logActivity(staffName, 'TICKET_CHECKED_IN', 'SUCCESS', sub.id, {
      ticketId: sub.ticket_id,
      attendeeName: sub.name,
      checkInTime: now,
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
   * Get Gate Admission statistics.
   */
  getCheckinStats: () => {
    const row = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'approved' AND checked_in = 1 THEN quantity ELSE 0 END), 0) as checkedInCount,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END), 0) as totalApprovedTickets
      FROM submissions
    `).get() as any;

    const checkedInCount = Number(row?.checkedInCount) || 0;
    const totalApprovedTickets = Number(row?.totalApprovedTickets) || 0;
    const percentage = totalApprovedTickets > 0 ? Math.round((checkedInCount / totalApprovedTickets) * 100) : 0;

    return {
      checkedInCount,
      totalApprovedTickets,
      percentage,
    };
  },
};
