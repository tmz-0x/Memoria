import { Router } from 'express';
import { checkinController } from '../controllers/checkinController';
import { authenticate, requireRole } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimit';

export const checkinRoutes = Router();

// Only Admin and Check-in Staff can access gate check-in scanner (Section 32)
checkinRoutes.use(authenticate, requireRole('admin', 'staff'));

// Rate limited verify scans: max 120 per minute per client
checkinRoutes.post('/verify', rateLimiter({ windowMs: 60 * 1000, maxRequests: 120 }), checkinController.verify);
checkinRoutes.get('/stats', checkinController.getStats);
