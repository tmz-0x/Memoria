import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { db } from '../db/database';
import { auditService } from './auditService';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: config.email.smtpUser && config.email.smtpPass ? {
        user: config.email.smtpUser,
        pass: config.email.smtpPass,
      } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

export const emailService = {
  /**
   * Checks whether outbound SMTP credentials are configured in the environment.
   */
  isConfigured: (): boolean => {
    return Boolean(config.email.smtpUser && config.email.smtpPass);
  },

  /**
   * Returns current outbound mail service status overview.
   */
  getDiagnostics: () => {
    const configured = Boolean(config.email.smtpUser && config.email.smtpPass);
    return {
      configured,
      smtpHost: config.email.smtpHost,
      smtpPort: config.email.smtpPort,
      smtpSecure: config.email.smtpSecure,
      fromAddress: config.email.from,
      userConfigured: Boolean(config.email.smtpUser),
      status: configured ? 'OPERATIONAL' : 'UNAVAILABLE',
      message: configured
        ? 'SMTP transactional transport is configured.'
        : 'SMTP credentials not configured in environment (SMTP_USER/SMTP_PASS missing in .env). Email delivery is unavailable.',
    };
  },

  /**
   * Dispatches ticket email for an approved application.
   * Completely decoupled from ticket approval: failures never invalidate the approved ticket.
   * Does NOT fake success: if credentials are missing or SMTP fails, records FAILED with the exact reason.
   */
  sendTicketEmail: async (submissionId: string): Promise<{ success: boolean; error?: string }> => {
    const sub = db.prepare(`
      SELECT id, ticket_id, name, email, ticket_type, quantity,
             qr_payload, qr_image_data, email_status, email_attempt_count
      FROM submissions
      WHERE id = ?
    `).get(submissionId) as any;

    if (!sub || !sub.ticket_id) {
      return { success: false, error: 'Submission not found or ticket not yet issued' };
    }

    const now = new Date().toISOString();
    const nextAttemptCount = (sub.email_attempt_count || 0) + 1;

    // Check if SMTP is configured
    if (!config.email.smtpUser || !config.email.smtpPass) {
      const errorMsg = 'SMTP credentials not configured in environment (SMTP_USER/SMTP_PASS missing in .env).';
      db.prepare(`
        UPDATE submissions
        SET email_status = 'FAILED',
            email_last_error = ?,
            email_last_attempt_at = ?,
            email_attempt_count = ?
        WHERE id = ?
      `).run(errorMsg, now, nextAttemptCount, submissionId);

      auditService.logActivity('system', 'EMAIL_FAILED', 'FAILURE', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
        reason: errorMsg,
        attempt: nextAttemptCount,
      });

      return { success: false, error: errorMsg };
    }

    try {
      // Extract base64 buffer from data URL for CID inline attachment
      let qrBuffer: Buffer | null = null;
      if (sub.qr_image_data && sub.qr_image_data.startsWith('data:image/png;base64,')) {
        const base64Data = sub.qr_image_data.replace('data:image/png;base64,', '');
        qrBuffer = Buffer.from(base64Data, 'base64');
      }

      const emailHtml = `
        <div style="background-color: #0D0518; color: #F0E6FA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 36px 20px; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 1px solid rgba(212,175,55,0.4);">
          <div style="text-align: center; margin-bottom: 28px;">
            <span style="color: #D4AF37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: bold;">Official E-Ticket Admission Pass</span>
            <h1 style="color: #FFF; margin: 8px 0; font-size: 34px; letter-spacing: 0.1em; font-weight: 800;">MEMORIA'26</h1>
            <p style="color: #FF8FC7; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.25em;">The Eclipse Of Memories</p>
          </div>

          <div style="background: rgba(26,13,46,0.85); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 22px; margin-bottom: 26px;">
            <p style="margin: 0 0 10px; font-size: 15px; color: #FFF;">Dear <strong>${sub.name}</strong>,</p>
            <p style="margin: 0 0 16px; font-size: 13px; color: #F0E6FA; opacity: 0.9; line-height: 1.6;">
              Your ticket application has been officially verified and approved! Below is your unique admission pass for <strong>Memoria'26</strong>.
            </p>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Official Ticket ID:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #D4AF37; font-size: 14px;">${sub.ticket_id}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Admission Tier:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF; text-transform: uppercase;">${sub.ticket_type === 'student' ? 'University Student Pass (Rs. 200)' : 'General Attendee Pass (Rs. 1,000)'}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Quantity:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.quantity} Pass(es)</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Date & Schedule:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">Tuesday, October 13, 2026<br><span style="color: #FF8FC7; font-size: 11px;">Gates: 4:30 PM • Show: 6:30 PM</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Venue:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">Gal Pittaniya premises,<br><span style="font-size: 11px; opacity: 0.8;">University of Sri Jayewardenepura</span></td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0; padding: 24px; background: #FFFFFF; border-radius: 18px;">
            ${qrBuffer ? '<img src="cid:ticket_qr" alt="Admission QR Code" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />' : `<img src="${sub.qr_image_data}" alt="Admission QR Code" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />`}
            <span style="display: block; color: #0D0518; font-family: monospace; font-size: 13px; margin-top: 12px; font-weight: bold; letter-spacing: 0.1em;">${sub.ticket_id}</span>
            <span style="display: block; color: #666; font-size: 10px; margin-top: 4px; text-transform: uppercase;">Cryptographically Encrypted Single-Use Pass</span>
          </div>

          <div style="background: rgba(13,5,24,0.6); border-left: 3px solid #D4AF37; padding: 14px 16px; font-size: 12px; color: rgba(240,230,250,0.8); line-height: 1.6; border-radius: 4px;">
            <strong style="color: #D4AF37;">Gate Admission Instructions:</strong><br>
            • Please present this digital QR code on your mobile smartphone screen or a printed copy at the entrance scanners.<br>
            • Each QR code is strictly single-use and invalidates immediately upon entry scan.<br>
            • Student tickets require a matching university student ID card upon entry.
          </div>
        </div>
      `;

      const client = getTransporter();
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.email.from,
        to: sub.email,
        subject: `Your Official Pass for Memoria'26 — [${sub.ticket_id}]`,
        html: emailHtml,
        attachments: qrBuffer ? [
          {
            filename: `memoria-qr-${sub.ticket_id}.png`,
            content: qrBuffer,
            cid: 'ticket_qr',
          },
        ] : undefined,
      };

      const info = await client.sendMail(mailOptions);

      // Verify that SMTP service actually accepted the email
      if (!info || (info.rejected && info.rejected.length > 0 && info.accepted.length === 0)) {
        throw new Error(`Email rejected by recipient server: ${(info.rejected || []).join(', ')}`);
      }

      // Mark email status as SENT with exact timestamp
      db.prepare(`
        UPDATE submissions
        SET email_status = 'SENT',
            email_sent_at = ?,
            email_last_error = NULL,
            email_last_attempt_at = ?,
            email_attempt_count = ?
        WHERE id = ?
      `).run(now, now, nextAttemptCount, submissionId);

      auditService.logActivity('system', 'EMAIL_SENT', 'SUCCESS', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
        messageId: info.messageId,
        attempt: nextAttemptCount,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'SMTP connection failed';
      console.error(`[Email Delivery Failure for ${sub.email}]:`, errorMsg);

      db.prepare(`
        UPDATE submissions
        SET email_status = 'FAILED',
            email_last_error = ?,
            email_last_attempt_at = ?,
            email_attempt_count = ?
        WHERE id = ?
      `).run(errorMsg, now, nextAttemptCount, submissionId);

      auditService.logActivity('system', 'EMAIL_FAILED', 'FAILURE', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
        error: errorMsg,
        attempt: nextAttemptCount,
      });

      return { success: false, error: errorMsg };
    }
  },

  /**
   * Safe, controlled retry mechanism strictly for Admin users.
   * Reuses existing ticket, QR code, and attendee data. Never duplicates.
   */
  retryFailedEmail: async (submissionId: string) => {
    return await emailService.sendTicketEmail(submissionId);
  },

  /**
   * Diagnostic test email dispatch strictly for Admin verification.
   */
  sendTestEmail: async (recipientEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const email = recipientEmail?.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'A valid recipient email address is required.' };
    }

    if (!config.email.smtpUser || !config.email.smtpPass) {
      const errorMsg = 'SMTP credentials not configured in environment (SMTP_USER/SMTP_PASS missing in .env).';
      return { success: false, error: errorMsg };
    }

    try {
      const client = getTransporter();
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.email.from,
        to: email,
        subject: "Memoria'26 — Diagnostic Test Email",
        html: `
          <div style="font-family: sans-serif; padding: 24px; background: #0D0518; color: #F0E6FA; border-radius: 12px; border: 1px solid rgba(212,175,55,0.4);">
            <h2 style="color: #D4AF37; margin: 0 0 12px;">Memoria'26 Email Delivery Test</h2>
            <p style="margin: 0 0 10px; font-size: 14px;">This diagnostic message confirms that your SMTP transactional mail transport is operational.</p>
            <p style="color: #A090B8; font-size: 12px; margin: 0;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
      };

      const info = await client.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return { success: false, error: err.message || 'SMTP connection failed' };
    }
  },
};
