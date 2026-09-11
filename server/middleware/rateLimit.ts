import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipMap.entries()) {
    if (now > record.resetTime) {
      ipMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

export function rateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = ipMap.get(ip);
    if (!record || now > record.resetTime) {
      ipMap.set(ip, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    record.count++;
    if (record.count > options.maxRequests) {
      throw new AppError(
        options.message || 'Too many requests. Please slow down and try again later.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    next();
  };
}
