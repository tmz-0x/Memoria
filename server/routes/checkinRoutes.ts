import { Router } from 'express';
import { checkinController } from '../controllers/checkinController';
import { authenticate, requireRole } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimit';

export const checkinRoutes = Router();

// Only Admin and Check-in Staff can access gate check-in scanner (Section 32)
checkinRoutes.use(authenticate, requireRole('admin', 'staff'));

// Rate limited verify scans: per staff account, high throughput for gate queues
checkinRoutes.post(
  '/verify',
  rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 240,
    keyGenerator: (req) => req.user?.id || req.ip || '127.0.0.1',
    message: 'Gate scan rate limit exceeded for this operator. Please wait a moment.',
  }),
  checkinController.verify
);
checkinRoutes.get('/stats', checkinController.getStats);
checkinRoutes.get('/statistics', checkinController.getStats);
