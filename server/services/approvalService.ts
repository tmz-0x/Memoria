import crypto from 'crypto';
import { db, TxRunner } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { qrService } from './qrService';
import { emailService } from './emailService';
import { auditService } from './auditService';

export const approvalService = {
  /**
   * Approves a pending ticket application.
   * Atomically issues ticketId, generates secure QR credentials, and commits status transition.
   * Idempotent: If already approved, safely returns the existing ticketId without duplication.
   */
  approveSubmission: async (
    submissionId: string,
    approverName: string
  ): Promise<{ success: boolean; ticketId: string; alreadyApproved?: boolean; emailSent?: boolean; emailStatus?: string; emailError?: string; recipientEmail?: string; attendeeName?: string }> => {
    // 1. Fetch submission
    const sub = await db.prepare(`
      SELECT id, status, ticket_id, name, email, ticket_type,
             normalized_reg_number, quantity, total_price
      FROM submissions
      WHERE id = ?
    `).get(submissionId) as any;

    if (!sub) {
      throw new AppError('Application record not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    // Idempotency: If already approved, return existing ticketId
    if (sub.status === 'approved' && sub.ticket_id) {
      return {
        success: true,
        ticketId: sub.ticket_id,
        alreadyApproved: true,
      };
    }

    // Invalid transition: Cannot approve rejected application directly
    if (sub.status === 'rejected') {
      throw new AppError(
        'Cannot approve an already rejected application without resubmission.',
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    if (sub.status !== 'pending') {
      throw new AppError(`Cannot approve application with status '${sub.status}'.`, 400, 'INVALID_STATUS');
    }

    // 2. Re-verify student registration uniqueness
    if (sub.ticket_type === 'student' && sub.normalized_reg_number) {
      const conflicting = await db.prepare(`
        SELECT id, ticket_id FROM submissions
        WHERE normalized_reg_number = ? AND status = 'approved' AND id != ?
      `).get(sub.normalized_reg_number, submissionId) as any;

      if (conflicting) {
        throw new AppError(
          `Student registration number ${sub.normalized_reg_number} is already associated with approved ticket ${conflicting.ticket_id}.`,
          409,
          'REGISTRATION_NUMBER_ALREADY_USED'
        );
      }
    }

    // 3. Generate unique Ticket ID (e.g. MEM-26-XXXX)
    let ticketId = '';
    let isUnique = false;
    while (!isUnique) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      ticketId = `MEM-26-${randNum}`;
      const existing = await db.prepare('SELECT id FROM submissions WHERE ticket_id = ?').get(ticketId);
      if (!existing) {
        isUnique = true;
      }
    }

    // 4. Generate cryptographically secure QR token and payload
    const qrToken = qrService.generateSecureToken();
    const qrPayload = qrService.formatPayload(qrToken);
    const qrImageData = await qrService.generateQRCodeDataUrl(qrPayload);
    const now = new Date().toISOString();
    const historyId = `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // 5. Execute atomic transaction
    await db.transaction(async (tx: TxRunner) => {
      // Update submission to approved
      await tx.run(`
        UPDATE submissions
        SET status = 'approved',
            ticket_id = ?,
            approved_at = ?,
            approver = ?,
            qr_token = ?,
            qr_payload = ?,
            qr_image_data = ?
        WHERE id = ? AND status = 'pending'
      `, [ticketId, now, approverName, qrToken, qrPayload, qrImageData, submissionId]);

      // Record approval history
      await tx.run(`
        INSERT INTO approval_history (id, submission_id, attendee_name, action, approver, timestamp, reason)
        VALUES (?, ?, ?, 'approved', ?, ?, NULL)
      `, [historyId, submissionId, sub.name, approverName, now]);
    });

    await auditService.logActivity(approverName, 'APPLICATION_APPROVED', 'SUCCESS', submissionId, {
      ticketId,
      attendeeName: sub.name,
      ticketType: sub.ticket_type,
      qrTokenPrefix: qrToken.slice(0, 8),
    });
    await auditService.logSystemEvent({
      severity: 'INFO',
      eventType: 'TICKET_APPROVED',
      action: 'APPROVE_TICKET',
      module: 'APPROVAL',
      message: `Ticket pass ${ticketId} approved for ${sub.name} by ${approverName}`,
      targetType: 'ticket',
      targetId: ticketId,
      username: approverName,
      metadata: {
        submissionId,
        ticketId,
        ticketType: sub.ticket_type,
        quantity: sub.quantity,
      },
    });

    // 6. Deliver ticket pass email to buyer (decoupled: failure does not invalidate approved ticket)
    let emailSent = false;
    let emailStatus = 'PENDING';
    let emailError: string | undefined;

    try {
      const emailRes = await emailService.sendTicketEmail(submissionId);
      emailSent = emailRes.success;
      emailStatus = emailRes.success ? 'SENT' : 'FAILED';
      emailError = emailRes.error;
    } catch (err: any) {
      emailSent = false;
      emailStatus = 'FAILED';
      emailError = err.message || 'Email dispatch failed';
      console.error('[Approval Email Dispatch Error]:', err);
    }

    return {
      success: true,
      ticketId,
      emailSent,
      emailStatus,
      emailError,
      recipientEmail: sub.email,
      attendeeName: sub.name,
    };
  },

  /**
   * Rejects a pending ticket application.
   */
  rejectSubmission: async (
    submissionId: string,
    approverName: string,
    reason: string
  ): Promise<{ success: boolean }> => {
    const sub = await db.prepare('SELECT id, status, name, ticket_type, normalized_reg_number FROM submissions WHERE id = ?').get(submissionId) as any;

    if (!sub) {
      throw new AppError('Application record not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    if (sub.status === 'approved') {
      throw new AppError('Cannot reject an already approved ticket with active QR credentials.', 400, 'INVALID_STATUS_TRANSITION');
    }

    const trimmedReason = reason?.trim() || 'Payment verification failed.';
    const now = new Date().toISOString();
    const historyId = `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    await db.transaction(async (tx: TxRunner) => {
      await tx.run(`
        UPDATE submissions
        SET status = 'rejected',
            rejection_reason = ?,
            approver = ?
        WHERE id = ?
      `, [trimmedReason, approverName, submissionId]);

      await tx.run(`
        INSERT INTO approval_history (id, submission_id, attendee_name, action, approver, timestamp, reason)
        VALUES (?, ?, ?, 'rejected', ?, ?, ?)
      `, [historyId, submissionId, sub.name, approverName, now, trimmedReason]);
    });

    await auditService.logActivity(approverName, 'APPLICATION_REJECTED', 'SUCCESS', submissionId, {
      reason: trimmedReason,
      attendeeName: sub.name,
    });
    await auditService.logSystemEvent({
      severity: 'INFO',
      eventType: 'TICKET_REJECTED',
      action: 'REJECT_TICKET',
      module: 'APPROVAL',
      message: `Submission ${submissionId} for ${sub.name} rejected by ${approverName}: ${trimmedReason}`,
      targetType: 'submission',
      targetId: submissionId,
      username: approverName,
      metadata: {
        reason: trimmedReason,
      },
    });

    return { success: true };
  },

  /**
   * Gets pending submissions queue.
   */
  getPendingSubmissions: async () => {
    return db.prepare(`
      SELECT * FROM submissions
      WHERE status = 'pending'
      ORDER BY submitted_at ASC
    `).all();
  },

  /**
   * Gets complete approval/rejection audit history.
   */
  getApprovalHistory: async () => {
    return db.prepare(`
      SELECT * FROM approval_history
      ORDER BY timestamp DESC
      LIMIT 100
    `).all();
  },
};
