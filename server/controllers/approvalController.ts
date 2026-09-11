import { Request, Response, NextFunction } from 'express';
import { approvalService } from '../services/approvalService';
import { emailService } from '../services/emailService';

export const approvalController = {
  getPending: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const list = approvalService.getPendingSubmissions();
      // Map to frontend-compatible camelCase format
      const formatted = list.map((s: any) => ({
        id: s.id,
        ticketId: s.ticket_id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        quantity: s.quantity,
        ticketType: s.ticket_type,
        universityRegistrationNumber: s.university_registration_number,
        totalPrice: s.total_price,
        paymentSlipUrl: s.payment_slip_url,
        status: s.status,
        rejectionReason: s.rejection_reason,
        submittedAt: s.submitted_at,
        approvedAt: s.approved_at,
        approver: s.approver,
        checkedIn: Boolean(s.checked_in),
        checkedInAt: s.checked_in_at,
        emailStatus: s.email_status,
      }));
      res.status(200).json(formatted);
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

  retryEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await emailService.retryFailedEmail(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
