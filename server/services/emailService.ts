import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { db } from '../db/database';
import { auditService } from './auditService';

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure: boolean;
  smtpFrom: string;
  senderName: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

let activeTransporter: nodemailer.Transporter | null = null;
let activeConfigHash = '';

function getConfigHash(cfg: SmtpConfig): string {
  return `${cfg.smtpHost}:${cfg.smtpPort}:${cfg.smtpUser}:${cfg.smtpPass}:${cfg.smtpSecure}:${cfg.smtpFrom}:${cfg.senderName}`;
}

function getActiveConfig(): SmtpConfig {
  try {
    const row = db.prepare('SELECT * FROM smtp_settings WHERE id = 1').get() as any;
    if (row && (row.smtp_host || row.smtp_user || row.smtp_pass)) {
      return {
        smtpHost: row.smtp_host || '',
        smtpPort: Number(row.smtp_port) || 587,
        smtpUser: row.smtp_user !== null && row.smtp_user !== undefined ? row.smtp_user : '',
        smtpPass: row.smtp_pass !== null && row.smtp_pass !== undefined ? row.smtp_pass : '',
        smtpSecure: Boolean(row.smtp_secure),
        smtpFrom: row.smtp_from || config.email.from,
        senderName: row.sender_name || "Memoria'26 Ticketing Desk",
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      };
    }
  } catch {}

  // Fallback to environment configuration only if environment variables actually provide valid credentials
  const hasEnvCredentials = Boolean(config.email.smtpUser && config.email.smtpPass);
  return {
    smtpHost: hasEnvCredentials ? config.email.smtpHost : '',
    smtpPort: config.email.smtpPort || 587,
    smtpUser: config.email.smtpUser || '',
    smtpPass: config.email.smtpPass || '',
    smtpSecure: config.email.smtpSecure || false,
    smtpFrom: config.email.from || '',
    senderName: "Memoria'26 Ticketing Desk",
    updatedAt: null,
    updatedBy: null,
  };
}

function getTransporter(customConfig?: SmtpConfig): nodemailer.Transporter {
  if (customConfig) {
    return nodemailer.createTransport({
      host: customConfig.smtpHost,
      port: customConfig.smtpPort,
      secure: customConfig.smtpSecure,
      auth: (customConfig.smtpUser && customConfig.smtpPass) ? {
        user: customConfig.smtpUser,
        pass: customConfig.smtpPass,
      } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }

  const cfg = getActiveConfig();
  const hash = getConfigHash(cfg);

  if (!activeTransporter || activeConfigHash !== hash) {
    if (activeTransporter) {
      try {
        activeTransporter.close();
      } catch {}
      activeTransporter = null;
    }
    activeConfigHash = hash;
    activeTransporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      auth: (cfg.smtpUser && cfg.smtpPass) ? {
        user: cfg.smtpUser,
        pass: cfg.smtpPass,
      } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return activeTransporter;
}

export const emailService = {
  getActiveConfig,

  /**
   * Reload active SMTP transporter dynamically without server restart.
   */
  reloadTransporter: () => {
    if (activeTransporter) {
      try {
        activeTransporter.close();
      } catch {}
      activeTransporter = null;
    }
    return getTransporter();
  },

  /**
   * Returns safe SMTP configuration for frontend (masks password as '********', never returns plaintext).
   */
  getSafeConfig: () => {
    const cfg = getActiveConfig();
    const hasPassword = Boolean(cfg.smtpPass && cfg.smtpPass.length > 0);
    const configured = Boolean(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);

    return {
      smtpHost: cfg.smtpHost,
      smtpPort: cfg.smtpPort,
      smtpUser: cfg.smtpUser || '',
      smtpPass: hasPassword ? '********' : '',
      hasPassword,
      smtpSecure: cfg.smtpSecure,
      smtpFrom: cfg.smtpFrom,
      senderName: cfg.senderName,
      status: configured ? 'Configured' : 'Not Configured',
      configured,
      updatedAt: cfg.updatedAt,
      updatedBy: cfg.updatedBy,
    };
  },

  /**
   * Save dynamic runtime SMTP configuration directly from Admin Panel.
   * Takes effect immediately without restarting node. Audited with password excluded.
   */
  saveConfig: (
    newConfig: Partial<SmtpConfig>,
    adminUser: { id?: string; name: string }
  ) => {
    const current = getActiveConfig();
    const host = newConfig.smtpHost ? String(newConfig.smtpHost).trim() : current.smtpHost;
    const port = newConfig.smtpPort ? Number(newConfig.smtpPort) : current.smtpPort;
    const user = newConfig.smtpUser !== undefined ? String(newConfig.smtpUser).trim() : current.smtpUser;
    
    // Masked password preservation: if '********' or empty, retain current password
    let pass = current.smtpPass;
    const rawPass = newConfig.smtpPass !== undefined ? String(newConfig.smtpPass).trim() : undefined;
    if (rawPass && rawPass !== '********') {
      pass = rawPass;
    }

    const secure = newConfig.smtpSecure !== undefined ? Boolean(newConfig.smtpSecure) : current.smtpSecure;
    const from = newConfig.smtpFrom ? String(newConfig.smtpFrom).trim() : current.smtpFrom;
    const senderName = newConfig.senderName ? String(newConfig.senderName).trim() : current.senderName;
    const now = new Date().toISOString();

    const changedFields: string[] = [];
    if (host !== current.smtpHost) changedFields.push('smtpHost');
    if (port !== current.smtpPort) changedFields.push('smtpPort');
    if (user !== current.smtpUser) changedFields.push('smtpUser');
    if (pass !== current.smtpPass) changedFields.push('smtpPass');
    if (secure !== current.smtpSecure) changedFields.push('smtpSecure');
    if (from !== current.smtpFrom) changedFields.push('smtpFrom');
    if (senderName !== current.senderName) changedFields.push('senderName');

    db.prepare(`
      INSERT INTO smtp_settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from, sender_name, updated_at, updated_by)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        smtp_host = excluded.smtp_host,
        smtp_port = excluded.smtp_port,
        smtp_user = excluded.smtp_user,
        smtp_pass = excluded.smtp_pass,
        smtp_secure = excluded.smtp_secure,
        smtp_from = excluded.smtp_from,
        sender_name = excluded.sender_name,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).run(
      host,
      port,
      user || '',
      pass || '',
      secure ? 1 : 0,
      from,
      senderName,
      now,
      adminUser.name
    );

    // Dynamic reload without restarting Node
    emailService.reloadTransporter();

    // Audit log without plaintext password
    auditService.logActivity(adminUser.name, 'SMTP_CONFIGURATION_UPDATED', 'SUCCESS', '1', {
      changedFields,
      smtpHost: host,
      smtpPort: port,
      smtpSecure: secure,
      smtpFrom: from,
      senderName,
    });

    auditService.logSystemEvent({
      severity: 'INFO',
      eventType: 'SMTP_CONFIGURATION_UPDATED',
      action: 'UPDATE_SMTP_CONFIG',
      module: 'SMTP',
      message: `Administrator ${adminUser.name} updated SMTP configuration (${changedFields.join(', ')})`,
      userId: adminUser.id,
      username: adminUser.name,
      metadata: {
        changedFields,
        smtpHost: host,
        smtpPort: port,
        smtpSecure: secure,
        smtpFrom: from,
      },
    });

    return emailService.getSafeConfig();
  },

  /**
   * Reset persistent and runtime SMTP configuration to unconfigured default (BACKENDFIXES6 Section 1-5).
   * Deletes persistent DB record, shuts down active transporter pool, and logs audit event.
   */
  resetConfig: (adminUser: { id?: string; name: string }) => {
    const current = getActiveConfig();

    // 1. Delete persisted database configuration
    db.prepare('DELETE FROM smtp_settings WHERE id = 1').run();

    // 2. Shut down and destroy active nodemailer transporter
    if (activeTransporter) {
      try {
        activeTransporter.close();
      } catch {}
      activeTransporter = null;
    }

    // 3. Audit trail (destructive administrative action)
    auditService.logActivity(adminUser.name, 'SMTP_SETTINGS_RESET', 'SUCCESS', '1', {
      previousHost: current.smtpHost,
      previousFrom: current.smtpFrom,
    });

    auditService.logSystemEvent({
      severity: 'WARNING',
      eventType: 'SMTP_SETTINGS_RESET',
      action: 'RESET_SMTP_CONFIG',
      module: 'SMTP',
      message: `Administrator ${adminUser.name} reset persistent runtime SMTP configuration to unconfigured default`,
      userId: adminUser.id,
      username: adminUser.name,
      metadata: {
        previousHost: current.smtpHost,
        previousPort: current.smtpPort,
        previousFrom: current.smtpFrom,
      },
    });

    return emailService.getSafeConfig();
  },

  /**
   * Test SMTP Connectivity & Credentials.
   */
  testConnection: async (customConfig?: Partial<SmtpConfig>): Promise<{ success: boolean; status: string; message: string }> => {
    let testTransporter: nodemailer.Transporter;
    if (customConfig && customConfig.smtpHost) {
      const current = getActiveConfig();
      const cfg: SmtpConfig = {
        smtpHost: customConfig.smtpHost || current.smtpHost,
        smtpPort: customConfig.smtpPort ? Number(customConfig.smtpPort) : current.smtpPort,
        smtpUser: customConfig.smtpUser !== undefined ? customConfig.smtpUser : current.smtpUser,
        smtpPass: customConfig.smtpPass && customConfig.smtpPass !== '********' ? customConfig.smtpPass : current.smtpPass,
        smtpSecure: customConfig.smtpSecure !== undefined ? Boolean(customConfig.smtpSecure) : current.smtpSecure,
        smtpFrom: customConfig.smtpFrom || current.smtpFrom,
        senderName: customConfig.senderName || current.senderName,
      };
      testTransporter = getTransporter(cfg);
    } else {
      testTransporter = getTransporter();
    }

    try {
      await testTransporter.verify();
      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'SMTP_CONNECTION_TEST',
        action: 'TEST_SMTP_CONNECTION',
        module: 'SMTP',
        message: 'SMTP connection verification succeeded',
      });
      return {
        success: true,
        status: 'Configured',
        message: '✓ SMTP connection and authentication verified successfully.',
      };
    } catch (err: any) {
      const errMsg = err?.message || 'SMTP connection verification failed';
      let status = 'Connection Failed';
      if (err?.code === 'EAUTH' || errMsg.toLowerCase().includes('auth') || errMsg.toLowerCase().includes('credential')) {
        status = 'Authentication Failed';
      }

      auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'SMTP_CONNECTION_TEST_FAILED',
        action: 'TEST_SMTP_CONNECTION',
        module: 'SMTP',
        message: `SMTP test connection failed: ${errMsg}`,
        errorMessage: errMsg,
        errorCode: err?.code,
      });

      return {
        success: false,
        status,
        message: `✕ ${status}: ${errMsg}`,
      };
    }
  },

  /**
   * Checks whether outbound SMTP credentials are configured.
   */
  isConfigured: (): boolean => {
    const cfg = getActiveConfig();
    return Boolean(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);
  },

  /**
   * Returns current outbound mail service status overview.
   */
  getDiagnostics: () => {
    const cfg = getActiveConfig();
    const configured = Boolean(cfg.smtpUser && cfg.smtpPass);
    return {
      configured,
      smtpHost: cfg.smtpHost,
      smtpPort: cfg.smtpPort,
      smtpSecure: cfg.smtpSecure,
      fromAddress: cfg.smtpFrom,
      userConfigured: Boolean(cfg.smtpUser),
      status: configured ? 'OPERATIONAL' : 'UNAVAILABLE',
      message: configured
        ? 'SMTP transactional transport is configured.'
        : 'SMTP credentials not configured (SMTP_USER/SMTP_PASS missing). Email delivery is unavailable.',
    };
  },

  /**
   * Dispatches ticket email for an approved application.
   * Completely decoupled from ticket approval: failures never invalidate the approved ticket.
   * Does NOT fake success: if credentials are missing or SMTP fails, records FAILED with the exact reason.
   */
  sendTicketEmail: async (submissionId: string): Promise<{ success: boolean; error?: string }> => {
    const sub = db.prepare(`
      SELECT *
      FROM submissions
      WHERE id = ?
    `).get(submissionId) as any;

    if (!sub || !sub.ticket_id) {
      return { success: false, error: 'Submission not found or ticket not yet issued' };
    }

    const now = new Date().toISOString();
    const nextAttemptCount = (sub.email_attempt_count || 0) + 1;
    const activeCfg = getActiveConfig();

    // Check if SMTP is configured
    if (!activeCfg.smtpUser || !activeCfg.smtpPass) {
      const errorMsg = 'SMTP credentials not configured (SMTP_USER/SMTP_PASS missing). Configure SMTP in Admin Settings.';
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

      auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'EMAIL_SEND_FAILED',
        action: 'SEND_TICKET_EMAIL',
        module: 'EMAIL',
        message: `Email delivery unavailable for ticket ${sub.ticket_id}: ${errorMsg}`,
        targetType: 'submission',
        targetId: submissionId,
      });

      return { success: false, error: errorMsg };
    }

    try {
      // Extract base64 buffer from data URL for standard file attachment
      let qrBuffer: Buffer | null = null;
      if (sub.qr_image_data && sub.qr_image_data.startsWith('data:image/png;base64,')) {
        const base64Data = sub.qr_image_data.replace('data:image/png;base64,', '');
        qrBuffer = Buffer.from(base64Data, 'base64');
      }

      const emailHtml = `
        <div style="background-color: #0D0518; color: #F0E6FA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 36px 20px; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 1px solid rgba(212,175,55,0.4);">
          <div style="text-align: center; margin-bottom: 28px;">
            <span style="color: #D4AF37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: bold;">Admission Confirmation</span>
            <h1 style="color: #FFF; margin: 8px 0; font-size: 32px; letter-spacing: 0.08em; font-weight: 800;">MEMORIA'26</h1>
            <p style="color: #FF8FC7; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.25em;">The Eclipse Of Memories</p>
          </div>

          <div style="background: rgba(26,13,46,0.85); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 22px; margin-bottom: 24px;">
            <p style="margin: 0 0 10px; font-size: 15px; color: #FFF;">Dear <strong>${sub.name}</strong>,</p>
            <p style="margin: 0 0 16px; font-size: 13px; color: #F0E6FA; opacity: 0.9; line-height: 1.6;">
              Your ticket application for <strong>Memoria'26</strong> has been verified and confirmed! Below are your event admission details.
            </p>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Ticket ID:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #D4AF37; font-size: 14px;">${sub.ticket_id}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Category:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.ticket_type === 'student' ? 'University Student Pass' : 'General Attendee Pass'}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Quantity:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.quantity} Pass(es)</td>
              </tr>
              ${sub.university_registration_number ? `
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Student Reg No:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.university_registration_number}</td>
              </tr>` : ''}
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Event Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">Tuesday, October 13, 2026<br><span style="color: #FF8FC7; font-size: 11px;">Gates: 4:30 PM &bull; Show: 6:30 PM</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Venue:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">Gal Pittaniya premises,<br><span style="font-size: 11px; opacity: 0.8;">University of Sri Jayewardenepura</span></td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0; padding: 22px 18px; background: #FFFFFF; border-radius: 16px; border: 2px solid #D4AF37;">
            <div style="color: #0D0518; font-family: monospace, Courier, monospace; font-size: 20px; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 4px;">${sub.ticket_id}</div>
            <div style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">Admit One &bull; Single-Use Entry Pass</div>
            <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 14px 16px; text-align: left;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #1E293B;">
                🎟️ Entry QR Pass Attached
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                Your entrance QR pass is attached to this email as <strong>Memoria26-Ticket-${sub.ticket_id}.png</strong>.<br>
                Please download or save the attached image to your smartphone to present at the gate scanners.
              </p>
            </div>
          </div>

          <div style="background: rgba(13,5,24,0.6); border-left: 3px solid #D4AF37; padding: 14px 16px; font-size: 12px; color: rgba(240,230,250,0.8); line-height: 1.6; border-radius: 4px;">
            <strong style="color: #D4AF37;">Admission Instructions:</strong><br>
            &bull; Please display the attached QR pass image on your mobile screen or bring a clear printout.<br>
            &bull; Each pass is single-use and valid for one entry.<br>
            ${sub.ticket_type === 'student' ? '&bull; Please have your university student ID card ready upon entry.<br>' : ''}
            &bull; If you have any questions, reply directly to this email.
          </div>
        </div>
      `;

      const client = getTransporter();
      const senderDisplayName = activeCfg.senderName || "Memoria'26 Ticketing Desk";
      const formattedFrom = activeCfg.smtpFrom.includes('<')
        ? activeCfg.smtpFrom
        : `"${senderDisplayName}" <${activeCfg.smtpFrom}>`;

      const plainText = `Dear ${sub.name},

Your ticket application for Memoria'26 has been verified and confirmed!

==================================================
  MEMORIA'26 - ADMISSION CONFIRMATION
==================================================

- Ticket ID:       ${sub.ticket_id}
- Attendee Name:   ${sub.name}
- Category:        ${sub.ticket_type === 'student' ? 'University Student Pass' : 'General Attendee Pass'}
- Quantity:        ${sub.quantity} Pass(es)
${sub.university_registration_number ? `- Student Reg No:  ${sub.university_registration_number}\n` : ''}- Event Date:      Tuesday, October 13, 2026
- Event Schedule:  Gates open: 4:30 PM | Show starts: 6:30 PM
- Event Venue:     Gal Pittaniya premises, University of Sri Jayewardenepura

ADMISSION PASS ATTACHMENT:
Your entrance QR pass is attached to this email as 'Memoria26-Ticket-${sub.ticket_id}.png'.
Please download or screenshot this image on your mobile phone to present at the entrance gate scanners.
${sub.ticket_type === 'student' ? 'Note: University students must present a valid student ID matching this registration.\n' : ''}
We look forward to welcoming you to Memoria'26!

Best regards,
${senderDisplayName}
${activeCfg.smtpFrom}
`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: formattedFrom,
        replyTo: activeCfg.smtpFrom,
        to: sub.email,
        subject: `Memoria'26 Ticket Confirmation - ${sub.ticket_id}`,
        text: plainText,
        html: emailHtml,
        attachments: qrBuffer ? [
          {
            filename: `Memoria26-Ticket-${sub.ticket_id}.png`,
            content: qrBuffer,
            contentType: 'image/png',
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

      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'EMAIL_SENT',
        action: 'SEND_TICKET_EMAIL',
        module: 'EMAIL',
        message: `Ticket pass delivered successfully to ${sub.email} (${sub.ticket_id})`,
        targetType: 'submission',
        targetId: submissionId,
        metadata: {
          ticketId: sub.ticket_id,
          recipient: sub.email,
          messageId: info.messageId,
        },
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

      auditService.logSystemEvent({
        severity: 'ERROR',
        eventType: 'EMAIL_SEND_FAILED',
        action: 'SEND_TICKET_EMAIL',
        module: 'EMAIL',
        message: `Ticket pass delivery failed for ${sub.email} (${sub.ticket_id}): ${errorMsg}`,
        targetType: 'submission',
        targetId: submissionId,
        errorMessage: errorMsg,
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
   * Dispatches dedicated QR code reissuance email to attendee (BACKENDFIXES5 Sections 1-3).
   * Clearly informs attendee that their previous QR code is revoked and invalid.
   */
  sendRegeneratedQrEmail: async (submissionId: string): Promise<{ success: boolean; error?: string }> => {
    const sub = db.prepare(`
      SELECT *
      FROM submissions
      WHERE id = ?
    `).get(submissionId) as any;

    if (!sub || !sub.ticket_id) {
      return { success: false, error: 'Submission not found or ticket not yet issued' };
    }

    const now = new Date().toISOString();
    const nextAttemptCount = (sub.email_attempt_count || 0) + 1;
    const activeCfg = getActiveConfig();

    if (!activeCfg.smtpUser || !activeCfg.smtpPass) {
      const errorMsg = 'SMTP credentials not configured. Regenerated QR saved in database, but email delivery is unavailable.';
      db.prepare(`
        UPDATE submissions
        SET email_status = 'FAILED',
            email_last_error = ?,
            email_last_attempt_at = ?,
            email_attempt_count = ?
        WHERE id = ?
      `).run(errorMsg, now, nextAttemptCount, submissionId);

      auditService.logActivity('system', 'QR_REGENERATION_EMAIL_FAILED', 'FAILURE', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
        reason: errorMsg,
      });

      auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'EMAIL_SEND_FAILED',
        action: 'SEND_REGENERATED_QR_EMAIL',
        module: 'EMAIL',
        message: `Regenerated QR email delivery unavailable for ticket ${sub.ticket_id}: ${errorMsg}`,
        targetType: 'submission',
        targetId: submissionId,
      });

      return { success: false, error: errorMsg };
    }

    try {
      let qrBuffer: Buffer | null = null;
      if (sub.qr_image_data && sub.qr_image_data.startsWith('data:image/png;base64,')) {
        const base64Data = sub.qr_image_data.replace('data:image/png;base64,', '');
        qrBuffer = Buffer.from(base64Data, 'base64');
      }

      const emailHtml = `
        <div style="background-color: #0D0518; color: #F0E6FA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 36px 20px; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 2px solid #E11D48;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #E11D48; color: #FFF; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 8px;">
              Updated Ticket Pass
            </div>
            <h1 style="color: #FFF; margin: 8px 0; font-size: 32px; letter-spacing: 0.08em; font-weight: 800;">MEMORIA'26</h1>
            <p style="color: #FF8FC7; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.25em;">The Eclipse Of Memories</p>
          </div>

          <!-- Revocation Alert Notice -->
          <div style="background: rgba(225,29,72,0.15); border: 1px solid #E11D48; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: bold; color: #FDA4AF;">
              Notice of QR Pass Replacement
            </p>
            <p style="margin: 0; font-size: 13px; color: #FFF; line-height: 1.6;">
              Your event QR pass has been reissued by event administration. Please use the <strong>new pass attached to this email</strong> for entrance. <strong>Any older QR code is now revoked and will not scan at the gates.</strong>
            </p>
          </div>

          <div style="background: rgba(26,13,46,0.85); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 22px; margin-bottom: 26px;">
            <p style="margin: 0 0 10px; font-size: 15px; color: #FFF;">Dear <strong>${sub.name}</strong>,</p>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Ticket ID:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #D4AF37; font-size: 14px;">${sub.ticket_id}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Category:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.ticket_type === 'student' ? 'University Student Pass' : 'General Attendee Pass'}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Quantity:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">${sub.quantity} Pass(es)</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(212,175,55,0.15);">
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Event Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">Tuesday, October 13, 2026</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(240,230,250,0.6);">Venue:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFF;">Gal Pittaniya premises, USJ</td>
              </tr>
            </table>
          </div>

          <!-- New QR Code Card -->
          <div style="text-align: center; margin: 24px 0; padding: 22px 18px; background: #FFFFFF; border-radius: 16px; border: 2px solid #D4AF37;">
            <div style="background: #10B981; color: #FFF; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 3px 8px; border-radius: 10px; display: inline-block; margin-bottom: 10px;">
              Active Replacement Pass
            </div>
            <div style="color: #0D0518; font-family: monospace, Courier, monospace; font-size: 20px; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 4px;">${sub.ticket_id}</div>
            <div style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">Single-Use Replacement Pass</div>
            <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 14px 16px; text-align: left;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #1E293B;">
                🎟️ Updated QR Pass Attached
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                Your newly issued QR pass is attached to this email as <strong>Memoria26-Updated-Ticket-${sub.ticket_id}.png</strong>.<br>
                Please save this file to your smartphone for entrance gate scanning.
              </p>
            </div>
          </div>

          <div style="background: rgba(13,5,24,0.6); border-left: 3px solid #D4AF37; padding: 14px 16px; font-size: 12px; color: rgba(240,230,250,0.8); line-height: 1.6; border-radius: 4px;">
            <strong style="color: #D4AF37;">Admission Instructions:</strong><br>
            &bull; Discard or delete any older QR codes previously received for this ticket.<br>
            &bull; Present the newly attached QR pass image on your mobile device or as a clean physical printout.<br>
            &bull; Contact support: memoria.26.event@gmail.com
          </div>
        </div>
      `;

      const client = getTransporter();
      const senderDisplayName = activeCfg.senderName || "Memoria'26 Ticketing Desk";
      const formattedFrom = activeCfg.smtpFrom.includes('<')
        ? activeCfg.smtpFrom
        : `"${senderDisplayName}" <${activeCfg.smtpFrom}>`;

      const plainText = `Dear ${sub.name},

Please find your replacement admission pass for Memoria'26 below.

IMPORTANT SECURITY NOTICE:
Your previous QR code has been revoked and will no longer scan at the entrance gates.
Please use ONLY this newly reissued pass.

- Ticket ID:      ${sub.ticket_id}
- Attendee Name:  ${sub.name}
- Category:       ${sub.ticket_type === 'student' ? 'University Student Pass' : 'General Attendee Pass'}
- Quantity:       ${sub.quantity} Pass(es)
- Event Date:     Tuesday, October 13, 2026 (Gates: 4:30 PM | Show: 6:30 PM)
- Event Venue:    Gal Pittaniya premises, University of Sri Jayewardenepura

Your updated QR code is attached to this email as 'Memoria26-Updated-Ticket-${sub.ticket_id}.png'.
Please discard or delete any earlier passes.

Best regards,
${senderDisplayName}
${activeCfg.smtpFrom}
`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: formattedFrom,
        replyTo: activeCfg.smtpFrom,
        to: sub.email,
        subject: `Memoria'26 Updated Ticket Pass - ${sub.ticket_id}`,
        text: plainText,
        html: emailHtml,
        attachments: qrBuffer ? [
          {
            filename: `Memoria26-Updated-Ticket-${sub.ticket_id}.png`,
            content: qrBuffer,
            contentType: 'image/png',
          },
        ] : undefined,
      };

      const info = await client.sendMail(mailOptions);

      if (!info || (info.rejected && info.rejected.length > 0 && info.accepted.length === 0)) {
        throw new Error(`Email rejected by recipient server: ${(info.rejected || []).join(', ')}`);
      }

      db.prepare(`
        UPDATE submissions
        SET email_status = 'SENT',
            email_sent_at = ?,
            email_last_error = NULL,
            email_last_attempt_at = ?,
            email_attempt_count = ?
        WHERE id = ?
      `).run(now, now, nextAttemptCount, submissionId);

      auditService.logActivity('system', 'QR_REGENERATION_EMAIL_SENT', 'SUCCESS', submissionId, {
        email: sub.email,
        ticketId: sub.ticket_id,
        messageId: info.messageId,
      });

      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'QR_REGENERATION_EMAIL_SENT',
        action: 'SEND_REGENERATED_QR_EMAIL',
        module: 'EMAIL',
        message: `Regenerated QR email successfully delivered to ${sub.email} for ticket ${sub.ticket_id}`,
        targetType: 'submission',
        targetId: submissionId,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'SMTP delivery failed for regenerated QR';
      db.prepare(`
        UPDATE submissions
        SET email_status = 'FAILED',
            email_last_error = ?,
            email_last_attempt_at = ?,
            email_attempt_count = ?
        WHERE id = ?
      `).run(errorMsg, now, nextAttemptCount, submissionId);

      auditService.logSystemEvent({
        severity: 'ERROR',
        eventType: 'EMAIL_SEND_FAILED',
        action: 'SEND_REGENERATED_QR_EMAIL',
        module: 'EMAIL',
        message: `Failed to deliver regenerated QR email to ${sub.email} (${sub.ticket_id}): ${errorMsg}`,
        targetType: 'submission',
        targetId: submissionId,
        errorMessage: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  },

  /**
   * Diagnostic test email dispatch strictly for Admin verification.
   */
  sendTestEmail: async (recipientEmail: string, adminUser?: { id?: string; name: string }): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const email = recipientEmail?.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'A valid recipient email address is required.' };
    }

    const activeCfg = getActiveConfig();
    if (!activeCfg.smtpUser || !activeCfg.smtpPass) {
      const errorMsg = 'SMTP credentials not configured (SMTP_USER/SMTP_PASS missing). Configure SMTP in Admin Settings.';
      return { success: false, error: errorMsg };
    }

    try {
      const client = getTransporter();
      const senderDisplayName = activeCfg.senderName || "Memoria'26 Ticketing Desk";
      const formattedFrom = activeCfg.smtpFrom.includes('<')
        ? activeCfg.smtpFrom
        : `"${senderDisplayName}" <${activeCfg.smtpFrom}>`;

      const plainText = `Memoria'26 Email Delivery Test

This diagnostic message confirms that your SMTP transactional mail transport is operational.
Timestamp: ${new Date().toISOString()}

Best regards,
${senderDisplayName}
${activeCfg.smtpFrom}
`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: formattedFrom,
        replyTo: activeCfg.smtpFrom,
        to: email,
        subject: "Memoria'26 — Diagnostic Test Email",
        text: plainText,
        html: `
          <div style="font-family: sans-serif; padding: 24px; background: #0D0518; color: #F0E6FA; border-radius: 12px; border: 1px solid rgba(212,175,55,0.4);">
            <h2 style="color: #D4AF37; margin: 0 0 12px;">Memoria'26 Email Delivery Test</h2>
            <p style="margin: 0 0 10px; font-size: 14px;">This diagnostic message confirms that your SMTP transactional mail transport is operational.</p>
            <p style="color: #A090B8; font-size: 12px; margin: 0;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
      };

      const info = await client.sendMail(mailOptions);

      auditService.logActivity(adminUser?.name || 'admin', 'TEST_EMAIL_SENT', 'SUCCESS', null, {
        recipientEmail: email,
        messageId: info.messageId,
      });

      auditService.logSystemEvent({
        severity: 'INFO',
        eventType: 'TEST_EMAIL_SENT',
        action: 'SEND_TEST_EMAIL',
        module: 'SMTP',
        message: `Diagnostic test email dispatched successfully to ${email}`,
        userId: adminUser?.id,
        username: adminUser?.name || 'admin',
        metadata: {
          recipientEmail: email,
          messageId: info.messageId,
        },
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      const errorMsg = err.message || 'SMTP connection failed';
      auditService.logSystemEvent({
        severity: 'WARNING',
        eventType: 'EMAIL_SEND_FAILED',
        action: 'SEND_TEST_EMAIL',
        module: 'SMTP',
        message: `Diagnostic test email failed to ${email}: ${errorMsg}`,
        userId: adminUser?.id,
        username: adminUser?.name || 'admin',
        errorMessage: errorMsg,
      });
      return { success: false, error: errorMsg };
    }
  },
};
