import { db } from './database';

export function initializeDatabase() {
  db.exec(`
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
  `);

  // Safe migrations for existing tables
  const cols = (db.pragma('table_info(submissions)') as Array<{ name: string }>).map((c) => c.name);
  if (!cols.includes('created_at')) {
    db.exec("ALTER TABLE submissions ADD COLUMN created_at TEXT");
    db.exec("UPDATE submissions SET created_at = submitted_at WHERE created_at IS NULL");
  }
  if (!cols.includes('deleted_at')) {
    db.exec("ALTER TABLE submissions ADD COLUMN deleted_at TEXT");
  }
  if (!cols.includes('deleted_by')) {
    db.exec("ALTER TABLE submissions ADD COLUMN deleted_by TEXT");
  }
  if (!cols.includes('delete_reason')) {
    db.exec("ALTER TABLE submissions ADD COLUMN delete_reason TEXT");
  }
  if (!cols.includes('email_attempt_count')) {
    db.exec("ALTER TABLE submissions ADD COLUMN email_attempt_count INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.includes('email_last_attempt_at')) {
    db.exec("ALTER TABLE submissions ADD COLUMN email_last_attempt_at TEXT");
  }
  if (!cols.includes('email_last_error')) {
    db.exec("ALTER TABLE submissions ADD COLUMN email_last_error TEXT");
  }

  // Performance Indexes for 15,000+ Crowd Scale
  db.exec(`
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
  `);
}
