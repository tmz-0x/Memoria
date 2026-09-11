import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { db } from '../db/database';
import { auditService } from './auditService';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && !config.email.simulate) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPass,
      },
    });
  }
  return transporter;
}

export const emailService = {
  /**
   * Dispatches ticket email for an approved application.
   * Completely decoupled from ticket approval so failures never revoke the approved ticket.
   */
  sendTicketEmail: async (submissionId: string): Promise<{ success: boolean; error?: string }> => {
    const sub = db.prepare(`
      SELECT id, ticket_id, name, email, ticket_type, quantity,
             qr_payload, qr_image_data, email_status
      FROM submissions
      WHERE id = ?
    `).get(submissionId) as any;

    if (!sub || !sub.ticket_id) {
      return { success: false, error: 'Submission not found or ticket not yet issued' };
    }

    try {
      const emailHtml = `
        <div style="background-color: #0D0518; color: #F0E6FA; font-family: sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid rgba(212,175,55,0.4);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="color: #D4AF37; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: bold;">Official E-Ticket Pass</span>
            <h1 style="color: #FFF; margin: 8px 0; font-size: 32px; letter-spacing: 0.1em;">MEMORIA'26</h1>
            <p style="color: #FF8FC7; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em;">The Eclipse Of Memories</p>
          </div>

          <div style="background: rgba(26,13,46,0.8); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 10px; font-size: 14px;">Dear <strong>${sub.name}</strong>,</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #F0E6FA; opacity: 0.9; line-height: 1.5;">
              Your ticket reservation has been verified and confirmed! Below is your official encrypted admission credential.
            </p>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 10px;">
              <tr>
                <td style="padding: 6px 0; color: rgba(240,230,250,0.6);">Ticket ID:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #D4AF37;">${sub.ticket_id}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(240,230,250,0.6);">Category:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #FFF; text-transform: uppercase;">${sub.ticket_type === 'student' ? 'University Student Pass' : 'General Attendee Pass'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(240,230,250,0.6);">Quantity:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.quantity} Pass(es)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(240,230,250,0.6);">Date & Time:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #FFF;">Tue, October 13, 2026 • Gates: 4:30 PM</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(240,230,250,0.6);">Venue:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #FFF;">Gal Pittaniya premises, USJ</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0; padding: 20px; background: #FFF; border-radius: 16px; display: inline-block; width: calc(100% - 40px);">
            <img src="${sub.qr_image_data}" alt="Admission QR Code" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />
            <span style="display: block; color: #0D0518; font-family: monospace; font-size: 11px; margin-top: 10px; font-weight: bold;">${sub.ticket_id}</span>
          </div>

          <div style="background: rgba(13,5,24,0.5); border-left: 3px solid #D4AF37; padding: 12px; font-size: 11px; color: rgba(240,230,250,0.7); line-height: 1.5; margin-top: 20px;">
            <strong>Check-in Instructions:</strong> Please present this QR code on your mobile device or printed copy at the entrance gate scanners. Each QR code is single-use and invalidates immediately upon entry scan.
          </div>
        </div>
      `;

      if (config.email.simulate) {
        // Simulated email delivery (always succeeds, logged cleanly)
        console.log(`[Email Simulation] Ticket email successfully queued for ${sub.email} (${sub.ticket_id})`);
      } else {
        const client = getTransporter();
        if (!client) {
          throw new Error('SMTP client initialization failed.');
        }

        await client.sendMail({
          from: config.email.from,
          to: sub.email,
          subject: `Your Official Pass for Memoria'26 — [${sub.ticket_id}]`,
          html: emailHtml,
        });
      }

      // Mark email status as SENT
      db.prepare(`
        UPDATE submissions
        SET email_status = 'SENT', email_sent_at = ?, email_error = NULL
        WHERE id = ?
      `).run(new Date().toISOString(), submissionId);

      auditService.logActivity('system', 'EMAIL_SENT', 'SUCCESS', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Email delivery failed';
      console.error(`[Email Delivery Error for ${sub.email}]:`, errorMsg);

      // Mark email status as FAILED without altering ticket validity
      db.prepare(`
        UPDATE submissions
        SET email_status = 'FAILED', email_error = ?
        WHERE id = ?
      `).run(errorMsg, submissionId);

      auditService.logActivity('system', 'EMAIL_FAILED', 'FAILURE', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
        error: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  },

  /**
   * Safe retry for failed email deliveries (idempotent).
   * Reuses existing ticket and QR code.
   */
  retryFailedEmail: async (submissionId: string) => {
    return await emailService.sendTicketEmail(submissionId);
  },
};
