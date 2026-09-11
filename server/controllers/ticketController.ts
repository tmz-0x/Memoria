import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticketService';

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
};
