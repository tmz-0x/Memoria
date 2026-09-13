import crypto from 'crypto';
import { db } from '../db/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';

export interface SubmitTicketDTO {
  name: string;
  email: string;
  phone: string;
  ticketType: 'student' | 'outsider';
  universityRegistrationNumber?: string | null;
  quantity?: number;
  paymentSlipUrl: string;
  idempotencyKey?: string;
}

export const ticketService = {
  submitTicket: (dto: SubmitTicketDTO) => {
    // 1. Basic field presence and length validations
    const name = dto.name?.trim();
    if (!name || name.length < 2 || name.length > 100) {
      throw new AppError('Full name is required and must be between 2 and 100 characters.', 400, 'INVALID_NAME');
    }

    const email = dto.email?.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 150) {
      throw new AppError('A valid email address is required.', 400, 'INVALID_EMAIL');
    }

    const phone = dto.phone?.trim();
    if (!phone || phone.length < 7 || phone.length > 25) {
      throw new AppError('A valid phone or WhatsApp number is required.', 400, 'INVALID_PHONE');
    }

    if (!['student', 'outsider'].includes(dto.ticketType)) {
      throw new AppError('Invalid ticket category. Must be "student" or "outsider".', 400, 'INVALID_TICKET_TYPE');
    }

    if (!dto.paymentSlipUrl) {
      throw new AppError('Payment slip proof of bank transfer is required.', 400, 'MISSING_PAYMENT_SLIP');
    }

    // 2. Check idempotency key if provided
    if (dto.idempotencyKey) {
      const existingByIdempotency = db.prepare(`
        SELECT id, status FROM submissions WHERE idempotency_key = ?
      `).get(dto.idempotencyKey) as any;

      if (existingByIdempotency) {
        return {
          success: true,
          submissionId: existingByIdempotency.id,
          message: 'Your registration was previously submitted and is under review.',
          duplicate: true,
        };
      }
    }

    // 3. Category-specific rules and AUTHORITATIVE PRICE ENFORCEMENT
    let normalizedReg: string | null = null;
    let quantity = 1;
    let unitPrice = 0;

    if (dto.ticketType === 'student') {
      const rawReg = dto.universityRegistrationNumber?.trim();
      if (!rawReg) {
        throw new AppError(
          'University registration number is mandatory for Student admission passes.',
          400,
          'MISSING_REGISTRATION_NUMBER'
        );
      }

      // Normalization: strip spaces, convert to UPPERCASE
      normalizedReg = rawReg.replace(/\s+/g, '').toUpperCase();

      if (!config.studentRegRegex.test(normalizedReg)) {
        throw new AppError(
          'Invalid university registration number format (e.g. FC122716, AS104921).',
          400,
          'INVALID_REGISTRATION_FORMAT'
        );
      }

      // Strict uniqueness check against any active non-rejected application
      const existingStudent = db.prepare(`
        SELECT id FROM submissions
        WHERE normalized_reg_number = ? AND status != 'rejected' AND deleted_at IS NULL
      `).get(normalizedReg) as any;

      if (existingStudent) {
        auditService.logActivity('public', 'DUPLICATE_REGISTRATION_ATTEMPT', 'REJECTED', null, {
          regNumber: normalizedReg,
          email,
        });
        throw new AppError(
          `University registration number '${normalizedReg}' has already been submitted for a ticket pass. Each student may reserve only one ticket.`,
          409,
          'REGISTRATION_NUMBER_ALREADY_USED'
        );
      }

      // Strict enforcement: Student tickets are strictly 1 pass at Rs. 200
      quantity = 1;
      unitPrice = config.pricing.student; // 200
    } else {
      // Outsider ticket
      normalizedReg = null;
      const requestedQty = Number(dto.quantity) || 1;
      if (requestedQty < 1 || requestedQty > 5 || !Number.isInteger(requestedQty)) {
        throw new AppError('Outsider pass reservations must be between 1 and 5 tickets.', 400, 'INVALID_QUANTITY');
      }
      quantity = requestedQty;
      unitPrice = config.pricing.outsider; // 1000
    }

    const totalPrice = quantity * unitPrice; // Integer arithmetic in LKR
    const submissionId = `sub-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const now = new Date().toISOString();

    // 4. Atomic transaction to insert submission and decrement remaining allocation
    const submitTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO submissions (
          id, ticket_id, name, email, phone, quantity, ticket_type,
          university_registration_number, normalized_reg_number, unit_price, total_price,
          payment_slip_url, status, submitted_at, email_status, idempotency_key
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'PENDING', ?)
      `).run(
        submissionId,
        name,
        email,
        phone,
        quantity,
        dto.ticketType,
        dto.universityRegistrationNumber?.trim() || null,
        normalizedReg,
        unitPrice,
        totalPrice,
        dto.paymentSlipUrl,
        now,
        dto.idempotencyKey || null
      );

      // Decrement remaining allocation safely
      db.prepare(`
        UPDATE event_settings
        SET remaining_allocation = MAX(0, remaining_allocation - ?),
            updated_at = ?
        WHERE id = 1
      `).run(quantity, now);
    });

    submitTx();

    auditService.logActivity('public', 'APPLICATION_SUBMITTED', 'SUCCESS', submissionId, {
      ticketType: dto.ticketType,
      quantity,
      totalPrice,
      regNumber: normalizedReg,
    });

    auditService.logSystemEvent({
      severity: 'INFO',
      eventType: 'TICKET_CREATED',
      action: 'SUBMIT_TICKET',
      module: 'TICKETS',
      message: `New ticket application submitted for ${name} (${dto.ticketType}, ${quantity} pass)`,
      targetType: 'submission',
      targetId: submissionId,
      metadata: {
        ticketType: dto.ticketType,
        quantity,
        totalPrice,
      },
    });

    return {
      success: true,
      submissionId,
      message: 'Your registration was submitted successfully. Our team will verify your transfer within 24–48 hours.',
    };
  },
};
