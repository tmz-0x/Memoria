import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/database';
import { revenueService } from '../services/revenueService';
import { emailService } from '../services/emailService';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';
import { config } from '../config/env';

function formatSubmission(s: any) {
  return {
    id: s.id,
    ticketId: s.ticket_id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    quantity: s.quantity,
    ticketType: s.ticket_type,
    universityRegistrationNumber: s.university_registration_number,
    normalizedRegNumber: s.normalized_reg_number,
    totalPrice: s.total_price,
    unitPrice: s.unit_price,
    paymentSlipUrl: s.payment_slip_url,
    status: s.status,
    rejectionReason: s.rejection_reason,
    submittedAt: s.submitted_at,
    createdAt: s.created_at || s.submitted_at,
    approvedAt: s.approved_at,
    approver: s.approver,
    checkedIn: Boolean(s.checked_in),
    checkedInAt: s.checked_in_at,
    checkedInBy: s.checked_in_by,
    emailStatus: s.email_status,
    emailAttemptCount: s.email_attempt_count || 0,
    emailLastAttemptAt: s.email_last_attempt_at,
    emailLastError: s.email_last_error,
    qrToken: s.qr_token,
    qrPayload: s.qr_payload,
    qrImageData: s.qr_image_data,
    deletedAt: s.deleted_at,
    deletedBy: s.deleted_by,
    deleteReason: s.delete_reason,
  };
}

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
      const {
        status,
        ticketType,
        search,
        sort = 'desc',
        startDate,
        endDate,
        includeDeleted,
        page,
        limit,
        format,
      } = req.query;

      let whereConditions: string[] = ['1=1'];
      const params: any[] = [];

      // By default, exclude soft-deleted records unless explicitly requested
      if (includeDeleted !== 'true') {
        whereConditions.push('deleted_at IS NULL');
      }

      // Status filter
      if (status && status !== 'all') {
        if (status === 'checked_in') {
          whereConditions.push("status = 'approved' AND checked_in = 1");
        } else {
          whereConditions.push('status = ?');
          params.push(status);
        }
      }

      // Ticket Type filter (supports 'student'/'university' and 'outsider'/'general')
      if (ticketType && ticketType !== 'all') {
        const typeStr = String(ticketType).toLowerCase();
        if (typeStr === 'university' || typeStr === 'student') {
          whereConditions.push("(ticket_type = 'student' OR ticket_type = 'university')");
        } else if (typeStr === 'outsider' || typeStr === 'general') {
          whereConditions.push("(ticket_type = 'outsider' OR ticket_type = 'general')");
        } else {
          whereConditions.push('ticket_type = ?');
          params.push(typeStr);
        }
      }

      // Date Range filters
      if (startDate) {
        whereConditions.push('submitted_at >= ?');
        params.push(String(startDate));
      }

      if (endDate) {
        let endVal = String(endDate);
        if (endVal.length === 10) {
          endVal += 'T23:59:59.999Z';
        }
        whereConditions.push('submitted_at <= ?');
        params.push(endVal);
      }

      // Search across name, email, phone, ticketId, normalized reg, id
      if (search) {
        const term = `%${String(search).trim()}%`;
        whereConditions.push(`(
          name LIKE ? OR email LIKE ? OR phone LIKE ? OR ticket_id LIKE ? OR normalized_reg_number LIKE ? OR id LIKE ?
        )`);
        params.push(term, term, term, term, term, term);
      }

      const whereClause = whereConditions.join(' AND ');

      // Total count query for pagination
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM submissions WHERE ${whereClause}`).get(...params) as any;
      const total = Number(countRow?.count) || 0;

      // Sorting
      const sortDirection = String(sort).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      let sql = `SELECT * FROM submissions WHERE ${whereClause} ORDER BY submitted_at ${sortDirection}`;

      // Pagination calculation
      const pageNum = Math.max(1, parseInt(String(page || 1), 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || 50), 10)));
      const offset = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum) || 1;

      sql += ' LIMIT ? OFFSET ?';
      const rows = db.prepare(sql).all(...params, limitNum, offset);

      const formatted = rows.map(formatSubmission);

      res.setHeader('X-Total-Count', total.toString());
      res.setHeader('X-Page', pageNum.toString());
      res.setHeader('X-Limit', limitNum.toString());
      res.setHeader('X-Total-Pages', totalPages.toString());

      if (format === 'paginated') {
        res.status(200).json({
          data: formatted,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
          },
        });
      } else {
        res.status(200).json(formatted);
      }
    } catch (err) {
      next(err);
    }
  },

  getSubmissionById: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT * FROM submissions WHERE id = ? OR ticket_id = ?').get(id, id) as any;
      if (!sub) {
        throw new AppError('Submission record not found.', 404, 'NOT_FOUND');
      }
      res.status(200).json(formatSubmission(sub));
    } catch (err) {
      next(err);
    }
  },

  updateSubmission: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any;
      if (!sub) {
        throw new AppError('Submission record not found.', 404, 'NOT_FOUND');
      }

      const { name, email, phone, universityRegistrationNumber, ticketType } = req.body;

      const newName = name !== undefined ? String(name).trim() : sub.name;
      const newEmail = email !== undefined ? String(email).trim().toLowerCase() : sub.email;
      const newPhone = phone !== undefined ? String(phone).trim() : sub.phone;
      const newType = ticketType !== undefined ? String(ticketType).toLowerCase() : sub.ticket_type;

      let newReg = sub.university_registration_number;
      let newNormReg = sub.normalized_reg_number;

      if (universityRegistrationNumber !== undefined) {
        newReg = String(universityRegistrationNumber).trim();
        if (newReg) {
          newNormReg = newReg.replace(/\s+/g, '').toUpperCase();
          // Check collision
          const collision = db.prepare(`
            SELECT id FROM submissions
            WHERE normalized_reg_number = ? AND id != ? AND deleted_at IS NULL
          `).get(newNormReg, id) as any;
          if (collision) {
            throw new AppError(`Registration number ${newNormReg} is already used by another record.`, 409, 'REG_EXISTS');
          }
        } else {
          newNormReg = null;
        }
      }

      db.prepare(`
        UPDATE submissions
        SET name = ?, email = ?, phone = ?, ticket_type = ?,
            university_registration_number = ?, normalized_reg_number = ?
        WHERE id = ?
      `).run(newName, newEmail, newPhone, newType, newReg, newNormReg, id);

      auditService.logActivity(req.user?.name || 'admin', 'SUBMISSION_UPDATED', 'SUCCESS', id, {
        name: newName,
        email: newEmail,
        ticketType: newType,
      });

      const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any;
      res.status(200).json(formatSubmission(updated));
    } catch (err) {
      next(err);
    }
  },

  deleteSubmission: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';

      if (!confirm) {
        throw new AppError(
          'Warning: This is a permanent administrative action. Deleting this submission may affect the associated application, ticket, QR record, revenue statistics, and audit history. Confirm only if you are certain this record should be removed. Explicit confirmation required: pass { confirm: true } in the request body.',
          400,
          'CONFIRMATION_REQUIRED'
        );
      }

      const sub = db.prepare('SELECT id, name, ticket_id, deleted_at FROM submissions WHERE id = ?').get(id) as any;
      if (!sub) {
        throw new AppError('Submission record not found.', 404, 'NOT_FOUND');
      }

      if (sub.deleted_at) {
        throw new AppError('Submission record has already been deleted.', 400, 'ALREADY_DELETED');
      }

      const now = new Date().toISOString();
      const adminName = req.user?.name || 'admin';
      const reason = req.body?.reason ? String(req.body.reason).trim() : 'Administrative deletion';

      db.prepare(`
        UPDATE submissions
        SET deleted_at = ?, deleted_by = ?, delete_reason = ?
        WHERE id = ?
      `).run(now, adminName, reason, id);

      auditService.logActivity(adminName, 'SUBMISSION_DELETED', 'SUCCESS', id, {
        ticketId: sub.ticket_id,
        attendeeName: sub.name,
        reason,
        deletedBy: adminName,
      });

      res.status(200).json({
        success: true,
        message: 'Submission successfully soft-deleted and archived.',
        id,
      });
    } catch (err) {
      next(err);
    }
  },

  retryEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await emailService.retryFailedEmail(id);
      auditService.logActivity(req.user?.name || 'admin', 'EMAIL_RETRY_REQUESTED', 'SUCCESS', id, result);
      res.status(200).json(result);
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

  updateUserRole: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'approver', 'staff'].includes(role)) {
        throw new AppError('Role must be one of: admin, approver, staff.', 400, 'INVALID_ROLE');
      }

      const target = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id) as any;
      if (!target) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      if (target.role === 'admin' && role !== 'admin') {
        const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;
        if (adminCount <= 1) {
          throw new AppError('Cannot demote the last remaining system administrator.', 400, 'LAST_ADMIN');
        }
      }

      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
      auditService.logActivity(req.user?.name || 'admin', 'USER_ROLE_UPDATED', 'SUCCESS', id, {
        oldRole: target.role,
        newRole: role,
      });

      res.status(200).json({
        success: true,
        id,
        role,
        message: `User role successfully updated to ${role}.`,
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

  getAlerts: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const rows = db.prepare(`
        SELECT a.id, a.submission_id as submissionId, a.triggered_by as triggeredBy,
               a.reason, a.created_at as createdAt, a.status, a.resolved_by as resolvedBy,
               a.resolved_at as resolvedAt, a.resolution_note as resolutionNote,
               s.name as attendeeName, s.ticket_id as ticketId, s.ticket_type as ticketType,
               s.status as submissionStatus
        FROM admin_alerts a
        LEFT JOIN submissions s ON a.submission_id = s.id
        ORDER BY a.created_at DESC
      `).all();

      res.status(200).json(rows);
    } catch (err) {
      next(err);
    }
  },

  resolveAlert: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const alert = db.prepare('SELECT id, status FROM admin_alerts WHERE id = ?').get(id) as any;
      if (!alert) {
        throw new AppError('Admin alert not found.', 404, 'NOT_FOUND');
      }

      const now = new Date().toISOString();
      const adminName = req.user?.name || 'admin';
      const resolutionNote = note ? String(note).trim() : 'Reviewed and resolved by administrator.';

      db.prepare(`
        UPDATE admin_alerts
        SET status = 'resolved',
            resolved_by = ?,
            resolved_at = ?,
            resolution_note = ?
        WHERE id = ?
      `).run(adminName, now, resolutionNote, id);

      auditService.logActivity(adminName, 'ADMIN_ALERT_RESOLVED', 'SUCCESS', id, { resolutionNote });

      res.status(200).json({
        success: true,
        id,
        status: 'resolved',
        resolvedBy: adminName,
        resolvedAt: now,
      });
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
