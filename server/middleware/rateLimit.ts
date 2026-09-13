import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function rateLimiter(options: {
  windowMs: number;
  maxRequests?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const windowMs = options.windowMs || 60000;
  const max = options.maxRequests ?? options.max ?? 100;
  const message = options.message || 'Too many requests. Please slow down and try again later.';
  const ipMap = new Map<string, RateLimitRecord>();

  // Clean up stale IP records periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (now > record.resetTime) {
        ipMap.delete(key);
      }
    }
  }, Math.max(10000, windowMs));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1');

    const now = Date.now();
    let record = ipMap.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipMap.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
}

// Pre-configured rate limiters (BACKENDFIXES5 Section 18)
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.',
});

export const passwordRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many password update requests. Please wait 1 minute before trying again.',
});

export const ticketSubmitRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Too many ticket registrations submitted from this IP. Please wait a minute before submitting again.',
});

export const checkinRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Scan verification rate limit exceeded. Please wait a few seconds before scanning again.',
});

export const smtpRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many SMTP diagnostic requests. Please wait before testing again.',
});

