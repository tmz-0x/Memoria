import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/database';
import { revenueService } from '../services/revenueService';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';

export const adminController = {
  getStats: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const stats = revenueService.getAdminStats();
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  },

  getSubmissions: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { status, ticketType, search, page, limit } = req.query;

      let sql = 'SELECT * FROM submissions WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'all') {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (ticketType && ticketType !== 'all') {
        sql += ' AND ticket_type = ?';
        params.push(ticketType);
      }

      if (search) {
        const term = `%${String(search).trim()}%`;
        sql += ` AND (
          name LIKE ? OR email LIKE ? OR phone LIKE ? OR ticket_id LIKE ? OR normalized_reg_number LIKE ?
        )`;
        params.push(term, term, term, term, term);
      }

      sql += ' ORDER BY submitted_at DESC';

      if (page && limit) {
        const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(String(limit), 10), offset);
      }

      const rows = db.prepare(sql).all(...params);

      const formatted = rows.map((s: any) => ({
        id: s.id,
        ticketId: s.ticket_id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        quantity: s.quantity,
        ticketType: s.ticket_type,
        universityRegistrationNumber: s.university_registration_number,
        totalPrice: s.total_price,
        paymentSlipUrl: s.payment_slip_url,
        status: s.status,
        rejectionReason: s.rejection_reason,
        submittedAt: s.submitted_at,
        approvedAt: s.approved_at,
        approver: s.approver,
        checkedIn: Boolean(s.checked_in),
        checkedInAt: s.checked_in_at,
        emailStatus: s.email_status,
      }));

      res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  },

  getSettings: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const s = db.prepare('SELECT * FROM event_settings WHERE id = 1').get() as any;
      if (!s) {
        throw new AppError('Event settings not initialized.', 500, 'SETTINGS_NOT_FOUND');
      }

      res.status(200).json({
        eventName: s.event_name,
        tagline: s.tagline,
        eventDate: s.event_date,
        eventVenue: s.event_venue,
        totalCapacity: s.total_capacity,
        remainingAllocation: s.remaining_allocation,
        ticketPrice: s.ticket_price,
        cutoffDate: s.cutoff_date,
        bankName: s.bank_name,
        accountName: s.account_name,
        accountNumber: s.account_number,
        branch: s.branch,
        announcement: s.announcement,
      });
    } catch (err) {
      next(err);
    }
  },

  updateSettings: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const body = req.body;
      const current = db.prepare('SELECT * FROM event_settings WHERE id = 1').get() as any;

      const eventName = body.eventName ?? current.event_name;
      const tagline = body.tagline ?? current.tagline;
      const eventDate = body.eventDate ?? current.event_date;
      const eventVenue = body.eventVenue ?? current.event_venue;
      const totalCapacity = body.totalCapacity !== undefined ? Number(body.totalCapacity) : current.total_capacity;
      const remainingAllocation = body.remainingAllocation !== undefined ? Number(body.remainingAllocation) : current.remaining_allocation;
      const ticketPrice = body.ticketPrice !== undefined ? Number(body.ticketPrice) : current.ticket_price;
      const cutoffDate = body.cutoffDate ?? current.cutoff_date;
      const bankName = body.bankName ?? current.bank_name;
      const accountName = body.accountName ?? current.account_name;
      const accountNumber = body.accountNumber ?? current.account_number;
      const branch = body.branch ?? current.branch;
      const announcement = body.announcement ?? current.announcement;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE event_settings
        SET event_name = ?, tagline = ?, event_date = ?, event_venue = ?,
            total_capacity = ?, remaining_allocation = ?, ticket_price = ?,
            cutoff_date = ?, bank_name = ?, account_name = ?, account_number = ?,
            branch = ?, announcement = ?, updated_at = ?
        WHERE id = 1
      `).run(
        eventName, tagline, eventDate, eventVenue,
        totalCapacity, remainingAllocation, ticketPrice,
        cutoffDate, bankName, accountName, accountNumber,
        branch, announcement, now
      );

      auditService.logActivity(req.user?.name || 'admin', 'SETTINGS_UPDATED', 'SUCCESS', '1');

      res.status(200).json({
        eventName,
        tagline,
        eventDate,
        eventVenue,
        totalCapacity,
        remainingAllocation,
        ticketPrice,
        cutoffDate,
        bankName,
        accountName,
        accountNumber,
        branch,
        announcement,
      });
    } catch (err) {
      next(err);
    }
  },

  getUsers: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const rows = db.prepare(`
        SELECT id, name, email, role, created_at as createdAt
        FROM users
        ORDER BY created_at DESC
      `).all();
      res.status(200).json(rows);
    } catch (err) {
      next(err);
    }
  },

  createUser: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { name, email, role, password } = req.body;
      if (!name || !email || !role) {
        throw new AppError('Name, email, and role are required fields.', 400, 'MISSING_FIELDS');
      }

      if (!['admin', 'approver', 'staff'].includes(role)) {
        throw new AppError('Role must be one of: admin, approver, staff.', 400, 'INVALID_ROLE');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
      if (existing) {
        throw new AppError('A user with this email address already exists.', 409, 'USER_EXISTS');
      }

      const rawPass = password ? String(password).trim() : 'welcome123';
      const hash = bcrypt.hashSync(rawPass, 10);
      const id = `usr-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, String(name).trim(), normalizedEmail, hash, role, now);

      auditService.logActivity(req.user?.name || 'admin', 'USER_CREATED', 'SUCCESS', id, { role, email: normalizedEmail });

      res.status(201).json({
        id,
        name: String(name).trim(),
        email: normalizedEmail,
        role,
        createdAt: now,
      });
    } catch (err) {
      next(err);
    }
  },

  deleteUser: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        throw new AppError('You cannot delete your own administrative account.', 400, 'CANNOT_DELETE_SELF');
      }

      const target = db.prepare('SELECT role FROM users WHERE id = ?').get(id) as any;
      if (!target) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      if (target.role === 'admin') {
        const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;
        if (adminCount <= 1) {
          throw new AppError('Cannot delete the last remaining system administrator.', 400, 'LAST_ADMIN');
        }
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      auditService.logActivity(req.user?.name || 'admin', 'USER_DELETED', 'SUCCESS', id);

      res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
      next(err);
    }
  },

  getActivityLogs: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const rows = db.prepare(`
        SELECT * FROM activity_logs
        ORDER BY timestamp DESC
        LIMIT 100
      `).all();
      res.status(200).json(rows);
    } catch (err) {
      next(err);
    }
  },
};
