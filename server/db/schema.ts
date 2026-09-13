import { db } from './database';

export async function initializeDatabase(): Promise<void> {
  await db.exec(`
    -- Users table (Role Based: admin, approver, staff)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'approver', 'staff')),
      created_at TEXT NOT NULL
    );

    -- Event Settings (Singleton row id = 1)
    CREATE TABLE IF NOT EXISTS event_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      event_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_venue TEXT NOT NULL,
      total_capacity INTEGER NOT NULL,
      remaining_allocation INTEGER NOT NULL,
      ticket_price INTEGER NOT NULL,
      cutoff_date TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      branch TEXT NOT NULL,
      announcement TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Ticket Applications / Submissions Table
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity >= 1 AND quantity <= 5),
      ticket_type TEXT NOT NULL CHECK(ticket_type IN ('student', 'outsider')),
      university_registration_number TEXT,
      normalized_reg_number TEXT,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      payment_slip_url TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      submitted_at TEXT NOT NULL,
      created_at TEXT,
      approved_at TEXT,
      approver TEXT,
      qr_token TEXT,
      qr_payload TEXT,
      qr_image_data TEXT,
      checked_in INTEGER NOT NULL DEFAULT 0 CHECK(checked_in IN (0, 1)),
      checked_in_at TEXT,
      checked_in_by TEXT,
      email_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(email_status IN ('PENDING', 'SENT', 'FAILED')),
      email_sent_at TEXT,
      email_error TEXT,
      email_attempt_count INTEGER NOT NULL DEFAULT 0,
      email_last_attempt_at TEXT,
      email_last_error TEXT,
      deleted_at TEXT,
      deleted_by TEXT,
      delete_reason TEXT,
      idempotency_key TEXT UNIQUE
    );

    -- Admin Alerts Table (Approver -> Admin Alert Workflow)
    CREATE TABLE IF NOT EXISTS admin_alerts (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved')),
      resolved_by TEXT,
      resolved_at TEXT,
      resolution_note TEXT,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    -- Approval / Rejection History Table
    CREATE TABLE IF NOT EXISTS approval_history (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      attendee_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('approved', 'rejected')),
      approver TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      reason TEXT,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    -- Scan Audit Logs (Every check-in scan attempt recorded)
    CREATE TABLE IF NOT EXISTS scan_audit_logs (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      submission_id TEXT,
      result TEXT NOT NULL CHECK(result IN ('VALID', 'ALREADY_USED', 'INVALID')),
      scanned_at TEXT NOT NULL,
      scanned_by TEXT NOT NULL,
      query TEXT NOT NULL,
      reason TEXT
    );

    -- Revoked QR Tokens (Tracks invalidated credentials when regenerated)
    CREATE TABLE IF NOT EXISTS revoked_qr_tokens (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      ticket_id TEXT NOT NULL,
      token TEXT NOT NULL,
      revoked_at TEXT NOT NULL,
      revoked_by TEXT NOT NULL,
      reason TEXT,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    -- General Activity & Audit Monitoring Log
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_id TEXT,
      result TEXT NOT NULL,
      metadata TEXT
    );

    -- Dedicated System Audit Logs (System Reliability, Exceptions & Admin Security)
    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
      event_type TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id TEXT,
      username TEXT,
      target_type TEXT,
      target_id TEXT,
      request_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      endpoint TEXT,
      http_method TEXT,
      status_code INTEGER,
      error_code TEXT,
      error_message TEXT,
      stack_trace TEXT,
      metadata TEXT,
      resolution_status TEXT DEFAULT 'open' CHECK(resolution_status IN ('open', 'investigating', 'resolved', 'ignored')),
      resolution_note TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );

    -- Dynamic Runtime SMTP Settings (Singleton row id = 1)
    CREATE TABLE IF NOT EXISTS smtp_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER NOT NULL,
      smtp_user TEXT,
      smtp_pass TEXT,
      smtp_secure INTEGER NOT NULL DEFAULT 0 CHECK(smtp_secure IN (0, 1)),
      smtp_from TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT 'Memoria 26 Ticketing Desk',
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );
  `);

  // Safe PostgreSQL migrations for existing tables
  await db.exec(`
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS created_at TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS delete_reason TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email_attempt_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email_last_attempt_at TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email_last_error TEXT;

    ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'open';
    ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS resolution_note TEXT;
    ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS resolved_by TEXT;
    ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS resolved_at TEXT;
  `);

  // Performance Indexes for 15,000+ Crowd Scale
  await db.exec(`
    -- Strict Database-Level Student Reg Uniqueness
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_reg_unique 
    ON submissions(normalized_reg_number) 
    WHERE ticket_type = 'student' AND status != 'rejected' AND deleted_at IS NULL;

    -- Fast indexed lookups for verification & check-in
    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_ticket_id 
    ON submissions(ticket_id) 
    WHERE ticket_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_qr_token 
    ON submissions(qr_token) 
    WHERE qr_token IS NOT NULL;

    -- Query optimization indexes
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_ticket_type ON submissions(ticket_type);
    CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
    CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_checked_in ON submissions(checked_in);
    CREATE INDEX IF NOT EXISTS idx_submissions_email_status ON submissions(email_status);
    CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON submissions(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_alerts_status ON admin_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON admin_alerts(created_at);

    CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket ON scan_audit_logs(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_scan_logs_time ON scan_audit_logs(scanned_at);
    CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_revoked_qr_token ON revoked_qr_tokens(token);

    -- Dedicated System Audit Indexes
    CREATE INDEX IF NOT EXISTS idx_sys_audit_time ON system_audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_severity ON system_audit_logs(severity);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_event_type ON system_audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_module ON system_audit_logs(module);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_user_id ON system_audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_request_id ON system_audit_logs(request_id);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_resolution ON system_audit_logs(resolution_status);
  `);

  // Ensure default SMTP configuration row exists from environment variables if not present
  try {
    const existingSmtp = await db.prepare('SELECT id FROM smtp_settings WHERE id = 1').get();
    if (!existingSmtp) {
      await db.prepare(`
        INSERT INTO smtp_settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from, sender_name, updated_at, updated_by)
        VALUES (1, ?, ?, ?, ?, ?, ?, 'Memoria 26 Ticketing Desk', ?, 'system')
        ON CONFLICT (id) DO NOTHING
      `).run(
        process.env.SMTP_HOST || 'smtp.gmail.com',
        parseInt(process.env.SMTP_PORT || '587', 10),
        process.env.SMTP_USER || '',
        process.env.SMTP_PASS || '',
        process.env.SMTP_SECURE === 'true' ? 1 : 0,
        process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Memoria\'26 Ticketing Desk" <tickets@memoria.lk>',
        new Date().toISOString()
      );
    }
  } catch (err) {
    console.error('[SMTP Settings Init Error]:', err);
  }
}
