import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';

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

      auditService.logActivity(user.name, 'USER_LOGIN', 'SUCCESS', user.id, { role: user.role });

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

  updateProfile: (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const userId = req.user.id;
      const currentUser = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE id = ?').get(userId) as any;
      if (!currentUser) {
        throw new AppError('User record not found.', 404, 'USER_NOT_FOUND');
      }

      const { name, email, currentPassword, newPassword } = req.body;

      const newName = name !== undefined ? String(name).trim() : currentUser.name;
      let newEmail = currentUser.email;

      if (email !== undefined) {
        newEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          throw new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL');
        }

        const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(newEmail, userId);
        if (existing) {
          throw new AppError('This email address is already in use by another account.', 409, 'EMAIL_EXISTS');
        }
      }

      let newPassHash = currentUser.password_hash;
      if (newPassword) {
        if (!currentPassword) {
          throw new AppError('Current password is required to set a new password.', 400, 'CURRENT_PASSWORD_REQUIRED');
        }

        if (!bcrypt.compareSync(String(currentPassword).trim(), currentUser.password_hash)) {
          throw new AppError('Current password provided does not match our records.', 400, 'INVALID_CURRENT_PASSWORD');
        }

        if (String(newPassword).trim().length < 6) {
          throw new AppError('New password must be at least 6 characters.', 400, 'WEAK_PASSWORD');
        }

        newPassHash = bcrypt.hashSync(String(newPassword).trim(), 10);
      }

      db.prepare(`
        UPDATE users
        SET name = ?, email = ?, password_hash = ?
        WHERE id = ?
      `).run(newName, newEmail, newPassHash, userId);

      auditService.logActivity(newName, 'PROFILE_UPDATED', 'SUCCESS', userId, {
        emailChanged: newEmail !== currentUser.email,
        passwordChanged: Boolean(newPassword),
      });

      const updatedUserPayload = {
        id: userId,
        name: newName,
        email: newEmail,
        role: currentUser.role,
      };

      const freshToken = jwt.sign(updatedUserPayload, config.jwtSecret, {
        expiresIn: '7d',
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: updatedUserPayload,
        token: freshToken,
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
