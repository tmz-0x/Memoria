import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';

export const authController = {
  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError('Email and password are required.', 400, 'MISSING_CREDENTIALS');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await db.prepare(`
        SELECT id, name, email, password_hash, role
        FROM users
        WHERE LOWER(email) = ?
      `).get(normalizedEmail) as any;

      if (!user || !bcrypt.compareSync(String(password).trim(), user.password_hash)) {
        await auditService.logSystemEvent({
          severity: 'WARNING',
          eventType: 'LOGIN_FAILED',
          action: 'USER_LOGIN',
          module: 'AUTH',
          message: `Authentication failed for email: ${normalizedEmail}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
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

      await auditService.logActivity(user.name, 'USER_LOGIN', 'SUCCESS', user.id, { role: user.role });
      await auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'LOGIN_SUCCESS',
        action: 'USER_LOGIN',
        module: 'AUTH',
        message: `User ${user.name} logged in successfully (${user.role})`,
        userId: user.id,
        username: user.name,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
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

  updateProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const userId = req.user.id;
      const currentUser = await db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE id = ?').get(userId) as any;
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

        const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(newEmail, userId);
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

        if (bcrypt.compareSync(String(newPassword).trim(), currentUser.password_hash)) {
          throw new AppError('New password cannot be the same as your current password.', 400, 'SAME_PASSWORD');
        }

        newPassHash = bcrypt.hashSync(String(newPassword).trim(), 10);
      }

      await db.run(`
        UPDATE users
        SET name = ?, email = ?, password_hash = ?
        WHERE id = ?
      `, [newName, newEmail, newPassHash, userId]);

      await auditService.logActivity(newName, 'PROFILE_UPDATED', 'SUCCESS', userId, {
        emailChanged: newEmail !== currentUser.email,
        passwordChanged: Boolean(newPassword),
      });

      if (newPassword) {
        await auditService.logSystemEvent({
          severity: 'INFO',
          eventType: 'PASSWORD_CHANGED',
          action: 'UPDATE_PROFILE_PASSWORD',
          module: 'AUTH',
          message: `User ${newName} changed their password`,
          userId,
          username: newName,
        });
      }

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

  logout: async (req: Request, res: Response): Promise<void> => {
    if (req.user) {
      await auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'LOGOUT',
        action: 'USER_LOGOUT',
        module: 'AUTH',
        message: `User ${req.user.name} logged out`,
        userId: req.user.id,
        username: req.user.name,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  },
};
