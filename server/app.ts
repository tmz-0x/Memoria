import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { ticketRoutes } from './routes/ticketRoutes';
import { approvalRoutes } from './routes/approvalRoutes';
import { checkinRoutes } from './routes/checkinRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { db } from './db/database';

export function createApp() {
  const app = express();

  // Request Correlation ID Middleware (BACKENDFIXES4 Section 3)
  app.use((req, res, next) => {
    const rawReqId = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
    const requestId = rawReqId && rawReqId.trim() ? rawReqId.trim() : `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    (req as any).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow all in dev or requests with no origin (mobile apps, curl, etc.)
        if (!origin || config.nodeEnv === 'development' || origin === config.frontendUrl) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive for local dev network access
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key', 'x-demo-user', 'x-request-id', 'x-correlation-id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory for payment slips
  app.use('/uploads', express.static(config.uploadDir));

  // 33. Health Check Endpoint
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'ok';
    try {
      await db.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      version: '1.0.0',
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/approve', approvalRoutes);
  app.use('/api/checkin', checkinRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 Route Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
