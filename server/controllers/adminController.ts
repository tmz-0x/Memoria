import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { revenueService } from '../services/revenueService';
import { emailService } from '../services/emailService';
import { qrService } from '../services/qrService';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';
import { attendanceService } from '../services/attendanceService';
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

      // Exclude soft-deleted records unless explicitly requested
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

      // Ticket Type filter
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

      // Search
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

      // Sorting: default newest-first
      const sortDirection = String(sort).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      let sql = `SELECT * FROM submissions WHERE ${whereClause} ORDER BY submitted_at ${sortDirection}`;

      // Pagination
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

  /**
   * Admin Full Submission Editing (Sections 1-4)
   * Allows editing both pending and approved submissions.
   * Revalidates all fields, enforces student reg uniqueness and authoritative pricing.
   * Preserves ticket ID, existing QR, approval history, and does not create duplicates.
   */
  updateSubmission: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT * FROM submissions WHERE (id = ? OR ticket_id = ?) AND deleted_at IS NULL').get(id, id) as any;
      if (!sub) {
        throw new AppError('Submission record not found.', 404, 'NOT_FOUND');
      }

      const { name, email, phone, universityRegistrationNumber, ticketType, quantity } = req.body;

      // Validate name if provided
      let newName = sub.name;
      if (name !== undefined) {
        newName = String(name).trim();
        if (newName.length < 2 || newName.length > 100) {
          throw new AppError('Full name must be between 2 and 100 characters.', 400, 'INVALID_NAME');
        }
      }

      // Validate email if provided
      let newEmail = sub.email;
      if (email !== undefined) {
        newEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          throw new AppError('Please enter a valid email address.', 400, 'INVALID_EMAIL');
        }
      }

      // Validate phone if provided
      let newPhone = sub.phone;
      if (phone !== undefined) {
        newPhone = String(phone).trim();
        if (newPhone.length < 7 || newPhone.length > 25) {
          throw new AppError('Phone number must be between 7 and 25 characters.', 400, 'INVALID_PHONE');
        }
      }

      // Determine ticket type
      let newType = sub.ticket_type;
      if (ticketType !== undefined) {
        const typeStr = String(ticketType).toLowerCase();
        if (typeStr === 'university' || typeStr === 'student') {
          newType = 'student';
        } else if (typeStr === 'outsider' || typeStr === 'general') {
          newType = 'outsider';
        } else {
          throw new AppError('Invalid ticket type. Must be student or outsider.', 400, 'INVALID_TICKET_TYPE');
        }
      }

      let newReg = sub.university_registration_number;
      let newNormReg = sub.normalized_reg_number;
      let newQuantity = sub.quantity;
      let newUnitPrice = sub.unit_price;
      let newTotalPrice = sub.total_price;

      if (newType === 'student') {
        const rawReg = universityRegistrationNumber !== undefined
          ? String(universityRegistrationNumber).trim()
          : (sub.university_registration_number || '');

        if (!rawReg) {
          throw new AppError('University student registration number is required for Student admission passes.', 400, 'MISSING_REGISTRATION_NUMBER');
        }

        newReg = rawReg;
        newNormReg = rawReg.replace(/\s+/g, '').toUpperCase();

        if (!config.studentRegRegex.test(newNormReg)) {
          throw new AppError('Invalid university registration number format (e.g. FC122716, AS104921).', 400, 'INVALID_REGISTRATION_FORMAT');
        }

        // Strict uniqueness check against any other active submission
        const collision = db.prepare(`
          SELECT id, ticket_id FROM submissions
          WHERE normalized_reg_number = ? AND id != ? AND deleted_at IS NULL
        `).get(newNormReg, sub.id) as any;

        if (collision) {
          throw new AppError(`University registration number ${newNormReg} is already used by record ${collision.ticket_id || collision.id}.`, 409, 'REGISTRATION_NUMBER_ALREADY_USED');
        }

        newQuantity = 1;
        newUnitPrice = config.pricing.student; // 200
        newTotalPrice = config.pricing.student;
      } else {
        // Outsider
        newReg = null;
        newNormReg = null;

        if (quantity !== undefined) {
          const q = Number(quantity);
          if (isNaN(q) || q < 1 || q > 5 || !Number.isInteger(q)) {
            throw new AppError('Outsider pass reservation must be between 1 and 5 tickets.', 400, 'INVALID_QUANTITY');
          }
          newQuantity = q;
        }

        newUnitPrice = config.pricing.outsider; // 1000
        newTotalPrice = newQuantity * config.pricing.outsider;
      }

      db.prepare(`
        UPDATE submissions
        SET name = ?, email = ?, phone = ?, ticket_type = ?,
            university_registration_number = ?, normalized_reg_number = ?,
            quantity = ?, unit_price = ?, total_price = ?
        WHERE id = ?
      `).run(newName, newEmail, newPhone, newType, newReg, newNormReg, newQuantity, newUnitPrice, newTotalPrice, sub.id);

      auditService.logActivity(req.user?.name || 'admin', 'SUBMISSION_UPDATED', 'SUCCESS', sub.id, {
        name: newName,
        email: newEmail,
        ticketType: newType,
        quantity: newQuantity,
        totalPrice: newTotalPrice,
        regNumber: newNormReg,
      });

      const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(sub.id) as any;
      res.status(200).json(formatSubmission(updated));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin-Only View of Individual Ticket QR Code (Fixes 3 Sections 11-14)
   * Strictly retrieves existing persisted QR code and attendee details.
   * Does NOT generate a new QR, does NOT create duplicate tickets, and never resets check-in state.
   */
  getTicketQR: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT * FROM submissions WHERE (id = ? OR ticket_id = ?) AND deleted_at IS NULL').get(id, id) as any;
      if (!sub) {
        throw new AppError('Submission record not found.', 404, 'NOT_FOUND');
      }

      if (sub.status !== 'approved' || !sub.ticket_id) {
        throw new AppError('This registration has not been approved or does not have a ticket issued yet.', 400, 'NO_TICKET_ISSUED');
      }

      const qrStatus = sub.checked_in ? 'USED' : 'ACTIVE';

      res.status(200).json({
        success: true,
        ticketId: sub.ticket_id,
        submissionId: sub.id,
        name: sub.name,
        email: sub.email,
        phone: sub.phone,
        ticketType: sub.ticket_type,
        universityRegistrationNumber: sub.university_registration_number,
        quantity: sub.quantity,
        unitPrice: sub.unit_price,
        totalPrice: sub.total_price,
        status: sub.status,
        checkedIn: Boolean(sub.checked_in),
        checkedInAt: sub.checked_in_at,
        checkedInBy: sub.checked_in_by,
        qrStatus,
        qrToken: sub.qr_token,
        qrPayload: sub.qr_payload,
        qrImageData: sub.qr_image_data,
        issuedAt: sub.approved_at || sub.created_at,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin-Only QR Code Regeneration (Sections 5-8)
   * Explicit administrative action. Invalidates the old QR and issues a new secure QR
   * associated with the same ticket without creating duplicate tickets or altering pricing.
   */
  regenerateQR: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';

      if (!confirm) {
        throw new AppError(
          'Warning: Regenerating this QR will invalidate the currently active QR credential. The new QR must be used for future check-in. Explicit confirmation required: pass { confirm: true }.',
          400,
          'CONFIRMATION_REQUIRED'
        );
      }

      const sub = db.prepare('SELECT * FROM submissions WHERE (id = ? OR ticket_id = ?) AND deleted_at IS NULL').get(id, id) as any;
      if (!sub) {
        throw new AppError('Application record not found.', 404, 'NOT_FOUND');
      }

      if (sub.status !== 'approved' || !sub.ticket_id) {
        throw new AppError('Cannot regenerate QR for an application that has not been approved with an issued ticket.', 400, 'TICKET_NOT_APPROVED');
      }

      const oldToken = sub.qr_token || '';
      const newToken = qrService.generateSecureToken();
      const newPayload = qrService.formatPayload(newToken);
      const newQrImageData = await qrService.generateQRCodeDataUrl(newPayload);
      const now = new Date().toISOString();
      const adminName = req.user?.name || 'admin';
      const reason = req.body?.reason ? String(req.body.reason).trim() : 'Administrative QR replacement';

      const regenTx = db.transaction(() => {
        // Record revoked token so any future scan of the old token is explicitly rejected
        if (oldToken) {
          const revokedId = `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          db.prepare(`
            INSERT INTO revoked_qr_tokens (id, submission_id, ticket_id, token, revoked_at, revoked_by, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(revokedId, sub.id, sub.ticket_id, oldToken, now, adminName, reason);
        }

        // Update submission with new QR credentials
        db.prepare(`
          UPDATE submissions
          SET qr_token = ?,
              qr_payload = ?,
              qr_image_data = ?,
              email_status = 'PENDING'
          WHERE id = ?
        `).run(newToken, newPayload, newQrImageData, sub.id);
      });

      regenTx();

      // Dispatch dedicated regenerated QR email (BACKENDFIXES5 Sections 1-3)
      const emailResult = await emailService.sendRegeneratedQrEmail(sub.id);

      auditService.logActivity(adminName, 'QR_REGENERATED', 'SUCCESS', sub.id, {
        ticketId: sub.ticket_id,
        attendeeName: sub.name,
        previousTokenPrefix: oldToken ? oldToken.slice(0, 8) : 'none',
        emailSent: emailResult.success,
        emailError: emailResult.error,
        reason,
      });

      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'QR_REGENERATED',
        action: 'REGENERATE_QR',
        module: 'ADMIN',
        message: `Administrator ${adminName} regenerated QR code for ticket ${sub.ticket_id} (${sub.name}). Previous QR invalidated. Email delivery: ${emailResult.success ? 'SENT' : 'FAILED'}.`,
        targetType: 'ticket',
        targetId: sub.ticket_id,
        userId: req.user?.id,
        username: adminName,
        metadata: {
          ticketId: sub.ticket_id,
          attendeeName: sub.name,
          email: sub.email,
          previousTokenPrefix: oldToken ? oldToken.slice(0, 8) : 'none',
          emailSent: emailResult.success,
          emailError: emailResult.error,
          reason,
        },
      });

      res.status(200).json({
        success: true,
        message: emailResult.success
          ? 'QR credential successfully regenerated, previous QR invalidated, and updated pass emailed to attendee.'
          : 'QR credential successfully regenerated and previous QR invalidated. Note: Outbound email delivery failed (SMTP unavailable).',
        id: sub.id,
        ticketId: sub.ticket_id,
        qrToken: newToken,
        qrImageData: newQrImageData,
        emailSent: emailResult.success,
        emailError: emailResult.error,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resend regenerated QR pass email strictly for Admin users (BACKENDFIXES5 Section 3)
   */
  resendRegeneratedQrEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT id, ticket_id, name, email FROM submissions WHERE (id = ? OR ticket_id = ?) AND deleted_at IS NULL').get(id, id) as any;
      if (!sub) throw new AppError('Ticket record not found.', 404, 'NOT_FOUND');

      const result = await emailService.sendRegeneratedQrEmail(sub.id);
      auditService.logActivity(req.user?.name || 'admin', 'REGENERATED_QR_EMAIL_RESENT', result.success ? 'SUCCESS' : 'FAILURE', sub.id, {
        ticketId: sub.ticket_id,
        email: sub.email,
        result,
      });

      res.status(200).json({
        success: result.success,
        message: result.success
          ? `Regenerated QR pass successfully dispatched to ${sub.email}.`
          : `Dispatch attempted but delivery failed: ${result.error || 'SMTP server unavailable'}.`,
        error: result.error,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resend standard ticket pass email strictly for Admin users
   */
  resendTicketEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const sub = db.prepare('SELECT id, ticket_id, name, email, status FROM submissions WHERE (id = ? OR ticket_id = ?) AND deleted_at IS NULL').get(id, id) as any;
      if (!sub) throw new AppError('Ticket record not found.', 404, 'NOT_FOUND');
      if (sub.status !== 'approved' || !sub.ticket_id) {
        throw new AppError('Cannot send ticket pass email for non-approved application.', 400, 'TICKET_NOT_APPROVED');
      }

      const result = await emailService.sendTicketEmail(sub.id);
      auditService.logActivity(req.user?.name || 'admin', 'TICKET_EMAIL_RESENT', result.success ? 'SUCCESS' : 'FAILURE', sub.id, {
        ticketId: sub.ticket_id,
        email: sub.email,
        result,
      });

      res.status(200).json({
        success: result.success,
        message: result.success
          ? `Official ticket pass email successfully dispatched to ${sub.email} (${sub.ticket_id}).`
          : `Dispatch attempted but delivery failed: ${result.error || 'SMTP server unavailable'}.`,
        error: result.error,
        emailStatus: result.success ? 'SENT' : 'FAILED',
        recipientEmail: sub.email,
        ticketId: sub.ticket_id,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Safe Individual Deletion with Confirmation & Auditing (Sections 5-10)
   * Supports both soft-archival and permanent database deletion.
   */
  deleteSubmission: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';

      if (!confirm) {
        throw new AppError(
          'Warning: You are about to delete this submission. This is a destructive administrative action. Explicit confirmation required: pass { confirm: true }.',
          400,
          'CONFIRMATION_REQUIRED'
        );
      }

      const sub = db.prepare('SELECT id, name, email, ticket_id, deleted_at FROM submissions WHERE (id = ? OR ticket_id = ?)').get(id, id) as any;
      if (!sub) {
        throw new AppError('Submission record not found.', 404, 'NOT_FOUND');
      }

      const permanent = req.body?.permanent === true || req.query?.permanent === 'true';
      if (!permanent && sub.deleted_at) {
        throw new AppError('Submission record has already been deleted.', 400, 'ALREADY_DELETED');
      }

      const now = new Date().toISOString();
      const adminName = req.user?.name || 'admin';
      const reason = req.body?.reason ? String(req.body.reason).trim() : 'Administrative deletion';

      const delTx = db.transaction(() => {
        if (permanent) {
          // Cascade child operational records
          db.prepare('DELETE FROM admin_alerts WHERE submission_id = ?').run(sub.id);
          db.prepare('DELETE FROM approval_history WHERE submission_id = ?').run(sub.id);
          db.prepare('DELETE FROM revoked_qr_tokens WHERE submission_id = ?').run(sub.id);
          // Preserve scan audit trail by decoupling foreign key link
          db.prepare('UPDATE scan_audit_logs SET submission_id = NULL WHERE submission_id = ?').run(sub.id);
          // Real database deletion: actually remove the record from submissions (BACKENDFIXES5 Section 5)
          db.prepare('DELETE FROM submissions WHERE id = ?').run(sub.id);
        } else {
          // Soft delete submission
          db.prepare(`
            UPDATE submissions
            SET deleted_at = ?, deleted_by = ?, delete_reason = ?
            WHERE id = ?
          `).run(now, adminName, reason, sub.id);

          // Resolve any open admin alerts for this submission
          db.prepare(`
            UPDATE admin_alerts
            SET status = 'resolved',
                resolved_by = ?,
                resolved_at = ?,
                resolution_note = 'Record deleted by administrator'
            WHERE submission_id = ? AND status = 'pending'
          `).run(adminName, now, sub.id);
        }
      });

      delTx();

      auditService.logActivity(adminName, 'SUBMISSION_DELETED', 'SUCCESS', sub.id, {
        ticketId: sub.ticket_id,
        attendeeName: sub.name,
        reason,
        deletedBy: adminName,
        permanent,
      });

      auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: permanent ? 'SUBMISSION_PERMANENTLY_DELETED' : 'SUBMISSION_SOFT_DELETED',
        action: 'DELETE_SUBMISSION',
        module: 'ADMIN',
        message: `Administrator ${adminName} ${permanent ? 'permanently deleted' : 'soft-deleted'} record for ${sub.name} (${sub.email}, Ticket: ${sub.ticket_id || 'none'}). Reason: ${reason}`,
        targetType: 'submission',
        targetId: sub.id,
        userId: req.user?.id,
        username: adminName,
        metadata: {
          ticketId: sub.ticket_id,
          attendeeName: sub.name,
          email: sub.email,
          permanent,
          reason,
        },
      });

      res.status(200).json({
        success: true,
        message: permanent
          ? 'Submission permanently deleted from database.'
          : 'Submission successfully soft-deleted and archived.',
        id: sub.id,
        permanent,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Complete Database Reset with Admin Password Verification (Sections 14-21)
   * Atomically resets operational data while strictly preserving the primary Admin account.
   */
  resetDatabase: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { password, confirm } = req.body;

      if (confirm !== true) {
        throw new AppError(
          '⚠️ DANGER — RESET ENTIRE DATABASE: This operation will permanently remove all application and ticket data in the database. Explicit confirmation required: pass { confirm: true }.',
          400,
          'CONFIRMATION_REQUIRED'
        );
      }

      if (!password) {
        throw new AppError('Administrator password is required to execute a complete database reset.', 400, 'PASSWORD_REQUIRED');
      }

      // Fetch the logged-in admin user to verify credentials server-side
      const adminUser = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE id = ?').get(req.user?.id) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        throw new AppError('Forbidden: Only an authenticated administrator may perform a database reset.', 403, 'FORBIDDEN');
      }

      if (!bcrypt.compareSync(String(password).trim(), adminUser.password_hash)) {
        throw new AppError('Incorrect administrator password. Database reset operation was rejected.', 401, 'INVALID_ADMIN_PASSWORD');
      }

      const now = new Date().toISOString();

      // Atomic Reset: Clears operational tables while preserving Admin account
      const resetTx = db.transaction(() => {
        db.prepare('DELETE FROM submissions').run();
        db.prepare('DELETE FROM admin_alerts').run();
        db.prepare('DELETE FROM approval_history').run();
        db.prepare('DELETE FROM scan_audit_logs').run();
        db.prepare('DELETE FROM revoked_qr_tokens').run();

        // Reset remaining allocation in event settings back to total capacity
        db.prepare('UPDATE event_settings SET remaining_allocation = total_capacity, updated_at = ? WHERE id = 1').run(now);

        // Record the system reset event in activity_logs
        const logId = `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        db.prepare(`
          INSERT INTO activity_logs (id, timestamp, actor, action, entity_id, result, metadata)
          VALUES (?, ?, ?, 'RESET_DATABASE', 'database', 'SUCCESS', ?)
        `).run(logId, now, adminUser.name, JSON.stringify({
          resetBy: adminUser.name,
          email: adminUser.email,
          preservedAdmin: 'Thisal Methwidu (admin@memoria.lk)',
        }));
      });

      resetTx();

      const freshStats = revenueService.getAdminStats();

      res.status(200).json({
        success: true,
        message: 'Database has been successfully reset. Operational tables cleared. Primary administrator account preserved.',
        stats: freshStats,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin-Only Creation of New Admin Accounts (Sections 31-33)
   */
  createAdmin: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email) {
        throw new AppError('Name and email are required fields for creating an administrator.', 400, 'MISSING_FIELDS');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new AppError('Please provide a valid email address for the new administrator.', 400, 'INVALID_EMAIL');
      }

      const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
      if (existing) {
        throw new AppError('An account with this email address already exists.', 409, 'USER_EXISTS');
      }

      const rawPass = password ? String(password).trim() : 'admin2026';
      if (rawPass.length < 6) {
        throw new AppError('Password must be at least 6 characters.', 400, 'WEAK_PASSWORD');
      }

      const hash = bcrypt.hashSync(rawPass, 10);
      const id = `usr-adm-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, 'admin', ?)
      `).run(id, String(name).trim(), normalizedEmail, hash, now);

      auditService.logActivity(req.user?.name || 'admin', 'ADMIN_ACCOUNT_CREATED', 'SUCCESS', id, {
        createdBy: req.user?.name,
        newAdmin: String(name).trim(),
        email: normalizedEmail,
      });

      res.status(201).json({
        success: true,
        user: {
          id,
          name: String(name).trim(),
          email: normalizedEmail,
          role: 'admin',
          createdAt: now,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin Password Management (Sections 28-29)
   */
  updatePassword: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required.', 400, 'MISSING_PASSWORD_FIELDS');
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        throw new AppError('New password and confirmation password do not match.', 400, 'PASSWORD_MISMATCH');
      }

      if (String(newPassword).trim().length < 6) {
        throw new AppError('New password must be at least 6 characters long.', 400, 'WEAK_PASSWORD');
      }

      const adminUser = db.prepare('SELECT id, name, password_hash FROM users WHERE id = ?').get(req.user?.id) as any;
      if (!adminUser) {
        throw new AppError('Administrator account not found.', 404, 'USER_NOT_FOUND');
      }

      if (!bcrypt.compareSync(String(currentPassword).trim(), adminUser.password_hash)) {
        throw new AppError('Current password provided does not match our records.', 400, 'INVALID_CURRENT_PASSWORD');
      }

      if (bcrypt.compareSync(String(newPassword).trim(), adminUser.password_hash)) {
        throw new AppError('New password cannot be the same as your current password.', 400, 'SAME_PASSWORD');
      }

      const newHash = bcrypt.hashSync(String(newPassword).trim(), 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, adminUser.id);

      auditService.logActivity(adminUser.name, 'PASSWORD_CHANGED', 'SUCCESS', adminUser.id);
      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'PASSWORD_CHANGED',
        action: 'UPDATE_OWN_PASSWORD',
        module: 'AUTH',
        message: `Administrator ${adminUser.name} changed their password successfully`,
        userId: adminUser.id,
        username: adminUser.name,
      });

      res.status(200).json({
        success: true,
        message: 'Administrator password updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin Profile Information Management (Section 30)
   */
  updateProfile: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { name, email } = req.body;
      const adminUser = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user?.id) as any;
      if (!adminUser) {
        throw new AppError('User not found.', 404, 'NOT_FOUND');
      }

      const newName = name !== undefined ? String(name).trim() : adminUser.name;
      let newEmail = adminUser.email;

      if (email !== undefined) {
        newEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          throw new AppError('Please enter a valid email address.', 400, 'INVALID_EMAIL');
        }

        const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(newEmail, adminUser.id);
        if (existing) {
          throw new AppError('Email address is already in use by another account.', 409, 'EMAIL_EXISTS');
        }
      }

      db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(newName, newEmail, adminUser.id);

      auditService.logActivity(newName, 'PROFILE_UPDATED', 'SUCCESS', adminUser.id, {
        oldName: adminUser.name,
        newName,
        oldEmail: adminUser.email,
        newEmail,
      });

      const updatedPayload = {
        id: adminUser.id,
        name: newName,
        email: newEmail,
        role: adminUser.role,
      };

      const freshToken = jwt.sign(updatedPayload, config.jwtSecret, { expiresIn: '7d' });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: updatedPayload,
        token: freshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Diagnostic Test Email Dispatch (Section 25)
   */
  sendTestEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recipientEmail } = req.body;
      const target = recipientEmail || req.user?.email || 'admin@memoria.lk';
      const result = await emailService.sendTestEmail(target);

      auditService.logActivity(req.user?.name || 'admin', 'EMAIL_TEST_SENT', result.success ? 'SUCCESS' : 'FAILURE', null, {
        recipient: target,
        error: result.error,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          message: 'Test email failed to send. Please check your SMTP configuration.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Test email successfully dispatched and accepted by SMTP server.',
        messageId: result.messageId,
      });
    } catch (err) {
      next(err);
    }
  },

  retryEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await emailService.retryFailedEmail(id);
      auditService.logActivity(req.user?.name || 'admin', 'EMAIL_RETRY_REQUESTED', result.success ? 'SUCCESS' : 'FAILURE', id, result);
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
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';

      if (!confirm) {
        throw new AppError(
          'Warning: You are about to permanently delete this user account. Explicit confirmation required: pass { confirm: true }.',
          400,
          'CONFIRMATION_REQUIRED'
        );
      }

      if (req.user?.id === id) {
        throw new AppError('You cannot delete your own administrative account.', 400, 'CANNOT_DELETE_SELF');
      }

      const target = db.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(id) as any;
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
      const adminName = req.user?.name || 'admin';
      auditService.logActivity(adminName, 'USER_DELETED', 'SUCCESS', id, {
        targetEmail: target.email,
        targetRole: target.role,
        targetName: target.name,
      });

      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'USER_DELETED',
        action: 'DELETE_USER',
        module: 'USER',
        message: `Administrator ${adminName} permanently deleted user ${target.name} (${target.email}, ${target.role}).`,
        targetType: 'user',
        targetId: id,
        userId: req.user?.id,
        username: adminName,
        metadata: {
          targetEmail: target.email,
          targetRole: target.role,
          targetName: target.name,
        },
      });

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

  /**
   * System Audit Logs with pagination and filtering (BACKENDFIXES4 Section 4)
   */
  getAuditLogs: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { page, limit, severity, eventType, module, userId, requestId, startDate, endDate, search } = req.query;
      const result = auditService.querySystemLogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
        severity: severity as string,
        eventType: eventType as string,
        module: module as string,
        userId: userId as string,
        requestId: requestId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Destructive audit log clearing with accountability logging (BACKENDFIXES4 Section 5)
   */
  clearAuditLogs: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { confirm, reason, beforeDate } = req.body;
      if (confirm !== true) {
        throw new AppError('Explicit confirmation is required to clear system audit logs.', 400, 'CONFIRMATION_REQUIRED');
      }

      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const result = auditService.clearSystemLogs(adminUser, { confirm, reason, beforeDate });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin Resets / Changes Another User's Password (BACKENDFIXES4 Section 7)
   */
  resetUserPassword: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const { newPassword, password, confirmPassword } = req.body;

      const target = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id) as any;
      if (!target) {
        throw new AppError('User account not found.', 404, 'USER_NOT_FOUND');
      }

      const rawPass = newPassword || password;
      const passToSet = rawPass ? String(rawPass).trim() : crypto.randomBytes(6).toString('hex');
      if (passToSet.length < 6) {
        throw new AppError('New password must be at least 6 characters long.', 400, 'WEAK_PASSWORD');
      }

      if (confirmPassword && passToSet !== String(confirmPassword).trim()) {
        throw new AppError('New password and confirmation do not match.', 400, 'PASSWORD_MISMATCH');
      }

      const newHash = bcrypt.hashSync(passToSet, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, id);

      const adminName = req.user?.name || 'admin';
      auditService.logActivity(adminName, 'ADMIN_PASSWORD_RESET', 'SUCCESS', id, {
        targetUser: target.name,
        targetEmail: target.email,
        targetRole: target.role,
      });

      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'ADMIN_PASSWORD_RESET',
        action: 'RESET_USER_PASSWORD',
        module: 'ADMIN',
        message: `Administrator ${adminName} reset password for user ${target.name} (${target.email})`,
        userId: req.user?.id,
        username: adminName,
        targetType: 'user',
        targetId: id,
        metadata: {
          targetUser: target.name,
          targetEmail: target.email,
          targetRole: target.role,
        },
      });

      res.status(200).json({
        success: true,
        message: `Password for ${target.name} (${target.email}) was updated successfully.`,
        temporaryPassword: rawPass ? undefined : passToSet,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get safe runtime SMTP configuration (password masked) (BACKENDFIXES4 Section 17-18)
   */
  getSmtpConfig: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const safeConfig = emailService.getSafeConfig();
      res.status(200).json({
        ...safeConfig,
        config: safeConfig,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update runtime SMTP configuration without server restart (BACKENDFIXES4 Section 19)
   */
  updateSmtpConfig: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const updated = emailService.saveConfig(req.body, adminUser);
      res.status(200).json({
        success: true,
        message: 'SMTP configuration saved and mail transport reloaded successfully.',
        config: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Test SMTP Connectivity (BACKENDFIXES4 Section 20)
   */
  testSmtpConnection: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await emailService.testConnection(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Send test email to verify transactional delivery (BACKENDFIXES4 Section 21)
   */
  sendSmtpTestEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const recipient = req.body.recipientEmail || req.body.email || req.body.to;
      if (!recipient) {
        throw new AppError('A valid recipient email address is required.', 400, 'MISSING_RECIPIENT');
      }
      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const result = await emailService.sendTestEmail(recipient, adminUser);
      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Diagnostic test email sent successfully to ${recipient}`,
          messageId: result.messageId,
        });
      } else {
        res.status(400).json({
          success: false,
          code: 'EMAIL_SEND_FAILED',
          message: result.error || 'SMTP delivery failed.',
        });
      }
    } catch (err) {
      next(err);
    }
  },

  /**
   * Authoritative Gate Attendance Statistics (BACKENDFIXES4 Section 10 & 13)
   */
  getAttendanceStats: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const stats = attendanceService.getAttendanceStatistics();
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Dedicated System Errors query endpoint (BACKENDFIXES5 Sections 26-29)
   */
  getSystemErrors: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = auditService.querySystemErrors(req.query as any);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update error operational resolution status (BACKENDFIXES5 Section 29)
   */
  updateSystemErrorStatus: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      if (!status) {
        throw new AppError('Status is required ("open", "investigating", "resolved", or "ignored")', 400, 'MISSING_STATUS');
      }
      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const updated = auditService.updateErrorStatus(id, status, note, adminUser);
      res.status(200).json({
        success: true,
        message: `Error status updated to ${status}.`,
        error: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reset runtime and persisted SMTP configuration to unconfigured default (BACKENDFIXES6 Sections 1-5)
   */
  resetSmtpConfig: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const safeConfig = emailService.resetConfig(adminUser);
      res.status(200).json({
        success: true,
        message: 'SMTP settings successfully reset to unconfigured default.',
        config: safeConfig,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Clear error logs with administrator confirmation and auditing (BACKENDFIXES6 Sections 17, 19-21)
   */
  clearSystemErrors: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { confirm, reason, beforeDate, module } = req.body;
      if (confirm !== true) {
        throw new AppError('Explicit confirmation is required to clear error logs.', 400, 'CONFIRMATION_REQUIRED');
      }
      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const result = auditService.clearSystemErrors(adminUser, {
        confirm,
        reason,
        beforeDate,
        module,
        requestId: (req as any).id || (req.headers['x-request-id'] as string) || undefined,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Clear submission logs with administrator confirmation and auditing (BACKENDFIXES6 Sections 18-21)
   */
  clearSubmissionLogs: (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { confirm, reason, beforeDate } = req.body;
      if (confirm !== true) {
        throw new AppError('Explicit confirmation is required to clear submission logs.', 400, 'CONFIRMATION_REQUIRED');
      }
      const adminUser = {
        id: req.user?.id,
        name: req.user?.name || 'admin',
      };
      const result = auditService.clearSubmissionLogs(adminUser, {
        confirm,
        reason,
        beforeDate,
        requestId: (req as any).id || (req.headers['x-request-id'] as string) || undefined,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};

