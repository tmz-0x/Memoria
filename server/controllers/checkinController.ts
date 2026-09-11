import { Request, Response, NextFunction } from 'express';
import { checkinService } from '../services/checkinService';

export const checkinController = {
  verify: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const query = req.body.query || req.body.ticketId || req.body.token || '';
      const staffName = req.user?.name || req.body.staffName || 'Admissions Staff';
      const result = checkinService.verifyAndCheckIn(query, staffName);

      if (result.submission) {
        // Format to camelCase
        const s = result.submission;
        result.submission = {
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
          checkedIn: Boolean(s.checked_in),
          checkedInAt: s.checked_in_at,
          checkedInBy: s.checked_in_by,
        };
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  getStats: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const stats = checkinService.getCheckinStats();
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  },
};
