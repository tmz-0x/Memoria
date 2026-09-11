import crypto from 'crypto';
import { db } from '../db/database';

export const auditService = {
  logActivity: (
    actor: string,
    action: string,
    result: string,
    entityId?: string | null,
    metadata?: Record<string, any>
  ): void => {
    try {
      const id = `act-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      db.prepare(`
        INSERT INTO activity_logs (id, timestamp, actor, action, entity_id, result, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        new Date().toISOString(),
        actor,
        action,
        entityId || null,
        result,
        metadata ? JSON.stringify(metadata) : null
      );
    } catch (err) {
      console.error('[Audit Log Error]:', err);
    }
  },

  logScan: (
    query: string,
    result: 'VALID' | 'ALREADY_USED' | 'INVALID',
    scannedBy: string,
    ticketId?: string | null,
    submissionId?: string | null,
    reason?: string | null
  ): void => {
    try {
      const id = `scan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      db.prepare(`
        INSERT INTO scan_audit_logs (id, ticket_id, submission_id, result, scanned_at, scanned_by, query, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        ticketId || null,
        submissionId || null,
        result,
        new Date().toISOString(),
        scannedBy,
        query,
        reason || null
      );
    } catch (err) {
      console.error('[Scan Audit Log Error]:', err);
    }
  },
};
