import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { db } from '../db/database';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'approver' | 'staff';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Development fallback for quick tests if demo user header supplied
      const demoUserHeader = req.headers['x-demo-user'] as string;
      if (config.nodeEnv !== 'production' && demoUserHeader) {
        const user = await db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(demoUserHeader) as AuthenticatedUser | undefined;
        if (user) {
          req.user = user;
          return next();
        }
      }
      throw new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let decoded: AuthenticatedUser;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    } catch {
      throw new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN');
    }

    const user = await db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id) as AuthenticatedUser | undefined;
    if (!user) {
      throw new AppError('User session is invalid or user no longer exists.', 401, 'UNAUTHORIZED');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Array<'admin' | 'approver' | 'staff'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: ${roles.join(', ')}`,
        403,
        'FORBIDDEN'
      );
    }
    next();
  };
}
