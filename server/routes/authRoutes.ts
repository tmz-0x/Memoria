import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimit';

export const authRoutes = Router();

// Login rate limited: max 10 attempts per minute
authRoutes.post('/login', rateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }), authController.login);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.post('/logout', authenticate, authController.logout);
