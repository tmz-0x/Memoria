import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticketService';
import { db } from '../db/database';
import { AppError } from '../middleware/errorHandler';

export const ticketController = {
  submit: (req: Request, res: Response, next: NextFunction): void => {
    try {
      let slipUrl = req.body.paymentSlipUrl || req.body.paymentSlip;

      // If file uploaded via Multer
      if (req.file) {
        slipUrl = `/uploads/${req.file.filename}`;
      }

      const result = ticketService.submitTicket({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        ticketType: req.body.ticketType,
        universityRegistrationNumber: req.body.universityRegistrationNumber,
        quantity: req.body.quantity ? parseInt(req.body.quantity, 10) : undefined,
        paymentSlipUrl: slipUrl || '/assets/candlelit-venue.jpg',
        idempotencyKey: req.body.idempotencyKey || (req.headers['x-idempotency-key'] as string),
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  lookup: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const query = String(req.query.q || req.params.query || '').trim();
      if (!query) {
        throw new AppError('Search query (application ID, ticket ID, or registration number) is required.', 400, 'MISSING_QUERY');
      }

      const sub = db.prepare(`
        SELECT id, ticket_id, name, email, ticket_type, quantity, status, rejection_reason,
               submitted_at, approved_at, checked_in, checked_in_at, email_status,
               qr_token, qr_image_data
        FROM submissions
        WHERE (UPPER(id) = UPPER(?) OR UPPER(ticket_id) = UPPER(?) OR UPPER(normalized_reg_number) = UPPER(?))
          AND deleted_at IS NULL
      `).get(query, query, query) as any;

      if (!sub) {
        throw new AppError('No application or ticket found matching your query.', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        id: sub.id,
        ticketId: sub.ticket_id,
        name: sub.name,
        email: sub.email,
        ticketType: sub.ticket_type,
        quantity: sub.quantity,
        status: sub.status,
        rejectionReason: sub.status === 'rejected' ? sub.rejection_reason : undefined,
        submittedAt: sub.submitted_at,
        approvedAt: sub.approved_at,
        checkedIn: Boolean(sub.checked_in),
        checkedInAt: sub.checked_in_at,
        emailStatus: sub.email_status,
        qrImageData: sub.status === 'approved' ? sub.qr_image_data : undefined,
      });
    } catch (err) {
      next(err);
    }
  },
};
