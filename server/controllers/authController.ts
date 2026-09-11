import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export const authController = {
  login: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError('Email and password are required.', 400, 'MISSING_CREDENTIALS');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = db.prepare(`
        SELECT id, name, email, password_hash, role
        FROM users
        WHERE LOWER(email) = ?
      `).get(normalizedEmail) as any;

      if (!user || !bcrypt.compareSync(String(password).trim(), user.password_hash)) {
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      const tokenPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: '7d',
      });

      res.status(200).json({
        success: true,
        token,
        user: tokenPayload,
      });
    } catch (err) {
      next(err);
    }
  },

  me: (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  },

  logout: (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  },
};
