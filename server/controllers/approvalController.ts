import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { approvalService } from '../services/approvalService';
import { auditService } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';

function formatSubmission(s: any) {
  return {
    id: s.id,
    ticketId: s.ticket_id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    quantity: s.quantity,
    ticketType: s.ticket_type,
    universityRegistrationNumber: s.university_registration_number,
    normalizedRegNumber: s.normalized_reg_number,
    totalPrice: s.total_price,
    paymentSlipUrl: s.payment_slip_url,
    status: s.status,
    rejectionReason: s.rejection_reason,
    submittedAt: s.submitted_at,
    createdAt: s.created_at || s.submitted_at,
    approvedAt: s.approved_at,
    approver: s.approver,
    checkedIn: Boolean(s.checked_in),
    checkedInAt: s.checked_in_at,
    checkedInBy: s.checked_in_by,
    emailStatus: s.email_status,
    emailAttemptCount: s.email_attempt_count || 0,
    emailLastAttemptAt: s.email_last_attempt_at,
    emailLastError: s.email_last_error,
    qrToken: s.qr_token,
    qrPayload: s.qr_payload,
    qrImageData: s.qr_image_data,
  };
}

export const approvalController = {
  getPending: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const list = approvalService.getPendingSubmissions();
      const formatted = list.map(formatSubmission);
      res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  },

  getSubmissionById: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT * FROM submissions WHERE id = ? AND deleted_at IS NULL').get(id) as any;
      if (!sub) {
        throw new AppError('Application record not found.', 404, 'NOT_FOUND');
      }
      res.status(200).json(formatSubmission(sub));
    } catch (err) {
      next(err);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const approverName = req.user?.name || req.body.approverName || 'Authorized Approver';
      const result = await approvalService.approveSubmission(id, approverName);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const approverName = req.user?.name || req.body.approverName || 'Authorized Approver';
      const reason = req.body.reason || 'Payment transfer slip was rejected by review desk.';
      const result = await approvalService.rejectSubmission(id, approverName, reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  triggerAlert: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { submissionId, reason } = req.body;
      if (!submissionId || !reason) {
        throw new AppError('submissionId and reason are required to trigger an admin alert.', 400, 'MISSING_FIELDS');
      }

      const sub = db.prepare('SELECT id, name, ticket_id FROM submissions WHERE id = ? AND deleted_at IS NULL').get(submissionId) as any;
      if (!sub) {
        throw new AppError('Referenced application record not found.', 404, 'SUBMISSION_NOT_FOUND');
      }

      const alertId = `alrt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();
      const approverName = req.user?.name || 'Approver';
      const trimmedReason = String(reason).trim();

      db.prepare(`
        INSERT INTO admin_alerts (id, submission_id, triggered_by, reason, created_at, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(alertId, submissionId, approverName, trimmedReason, now);

      auditService.logActivity(approverName, 'ADMIN_ALERT_TRIGGERED', 'SUCCESS', submissionId, {
        alertId,
        reason: trimmedReason,
        attendeeName: sub.name,
      });

      res.status(201).json({
        success: true,
        alertId,
        message: 'Admin alert triggered successfully. The application has been flagged for administrator review.',
      });
    } catch (err) {
      next(err);
    }
  },

  getHistory: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const history = approvalService.getApprovalHistory();
      const formatted = history.map((h: any) => ({
        id: h.id,
        submissionId: h.submission_id,
        attendeeName: h.attendee_name,
        action: h.action,
        approver: h.approver,
        timestamp: h.timestamp,
        reason: h.reason,
      }));
      res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  },
};
