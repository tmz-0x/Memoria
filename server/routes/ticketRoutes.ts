import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { uploadSlip } from '../middleware/upload';
import { rateLimiter } from '../middleware/rateLimit';

export const ticketRoutes = Router();

// Public submission: max 15 submissions per 5 minutes per IP
ticketRoutes.post(
  '/',
  rateLimiter({ windowMs: 5 * 60 * 1000, maxRequests: 15, message: 'Too many submissions. Please wait a moment.' }),
  uploadSlip.single('paymentSlip'),
  ticketController.submit
);

// Public status / ticket lookup (Section 32: Public can view own application)
ticketRoutes.get('/lookup', ticketController.lookup);
