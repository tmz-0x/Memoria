import crypto from 'crypto';
import { db } from '../db/database';

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface SystemLogParams {
  severity: AuditSeverity;
  eventType: string;
  action: string;
  module: string;
  message: string;
  userId?: string | null;
  username?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  httpMethod?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  stackTrace?: string | null;
  metadata?: Record<string, any> | null;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  severity?: string;
  eventType?: string;
  module?: string;
  userId?: string;
  requestId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  resolutionStatus?: string;
}

function sanitizeDetails(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    return data.replace(/(password|token|secret|smtp_pass|smtpPass|key)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  if (typeof data === 'object') {
    const copy: any = Array.isArray(data) ? [] : {};
    for (const [key, val] of Object.entries(data)) {
      if (/password|token|secret|smtp_pass|smtppass|hash/i.test(key)) {
        copy[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        copy[key] = sanitizeDetails(val);
      } else {
        copy[key] = val;
      }
    }
    return copy;
  }
  return data;
}

export const auditService = {
  /**
   * Log to persistent dedicated system_audit_logs table.
   * Never stores plaintext passwords, tokens, or sensitive secrets.
   */
  logSystemEvent: async (params: SystemLogParams): Promise<string> => {
    try {
      const id = `syslog-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const sanitizedMeta = params.metadata ? sanitizeDetails(params.metadata) : null;
      const sanitizedMsg = typeof params.message === 'string' ? sanitizeDetails(params.message) : '';

      await db.prepare(`
        INSERT INTO system_audit_logs (
          id, timestamp, severity, event_type, action, module, message,
          user_id, username, target_type, target_id, request_id,
          ip_address, user_agent, endpoint, http_method, status_code,
          error_code, error_message, stack_trace, metadata, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        id,
        now,
        params.severity,
        params.eventType,
        params.action,
        params.module,
        sanitizedMsg,
        params.userId || null,
        params.username || null,
        params.targetType || null,
        params.targetId || null,
        params.requestId || null,
        params.ipAddress || null,
        params.userAgent || null,
        params.endpoint || null,
        params.httpMethod || null,
        params.statusCode || null,
        params.errorCode || null,
        params.errorMessage ? sanitizeDetails(params.errorMessage) : null,
        params.stackTrace || null,
        sanitizedMeta ? JSON.stringify(sanitizedMeta) : null,
        now
      );

      return id;
    } catch (err) {
      console.error('[System Audit Log Error]:', err);
      return '';
    }
  },

  /**
   * Query system audit logs with backend pagination and filtering.
   */
  querySystemLogs: async (params: AuditQueryParams) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.severity && params.severity !== 'all') {
      whereConditions.push('severity = ?');
      sqlParams.push(params.severity.toUpperCase());
    }

    if (params.eventType && params.eventType !== 'all') {
      whereConditions.push('event_type = ?');
      sqlParams.push(params.eventType);
    }

    if (params.module && params.module !== 'all') {
      whereConditions.push('module = ?');
      sqlParams.push(params.module);
    }

    if (params.userId) {
      whereConditions.push('(user_id = ? OR username = ?)');
      sqlParams.push(params.userId, params.userId);
    }

    if (params.requestId) {
      whereConditions.push('request_id = ?');
      sqlParams.push(params.requestId);
    }

    if (params.startDate) {
      whereConditions.push('timestamp >= ?');
      sqlParams.push(params.startDate);
    }

    if (params.endDate) {
      let endVal = params.endDate;
      if (endVal.length === 10) endVal += 'T23:59:59.999Z';
      whereConditions.push('timestamp <= ?');
      sqlParams.push(endVal);
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      whereConditions.push('(message LIKE ? OR action LIKE ? OR event_type LIKE ? OR username LIKE ? OR endpoint LIKE ? OR request_id LIKE ?)');
      sqlParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.join(' AND ');

    const countRow = (await db.prepare(`SELECT COUNT(*) as total FROM system_audit_logs WHERE ${whereClause}`).get(...sqlParams)) as any;
    const total = Number(countRow?.total) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const rows = (await db.prepare(`
      SELECT * FROM system_audit_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(...sqlParams, limit, offset)) as any[];

    const formattedLogs = rows.map((r) => {
      let meta = null;
      try {
        if (r.metadata) meta = JSON.parse(r.metadata);
      } catch {}

      return {
        id: r.id,
        timestamp: r.timestamp,
        severity: r.severity,
        eventType: r.event_type,
        action: r.action,
        module: r.module,
        message: r.message,
        userId: r.user_id,
        username: r.username,
        targetType: r.target_type,
        targetId: r.target_id,
        requestId: r.request_id,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        endpoint: r.endpoint,
        httpMethod: r.http_method,
        statusCode: r.status_code,
        errorCode: r.error_code,
        errorMessage: r.error_message,
        stackTrace: r.stack_trace,
        metadata: meta,
        createdAt: r.created_at,
      };
    });

    return {
      logs: formattedLogs,
      total,
      page,
      limit,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  },

  /**
   * Dedicated Error Handling query engine (BACKENDFIXES5 Sections 26-29)
   * Queries failures, exceptions, and rejected operations with safe sanitization.
   */
  querySystemErrors: async (params: AuditQueryParams) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ["(severity IN ('ERROR', 'CRITICAL') OR status_code >= 400 OR error_code IS NOT NULL)"];
    const sqlParams: any[] = [];

    if (params.severity && params.severity !== 'all') {
      whereConditions.push('severity = ?');
      sqlParams.push(params.severity.toUpperCase());
    }

    if (params.module && params.module !== 'all') {
      whereConditions.push('module = ?');
      sqlParams.push(params.module);
    }

    if (params.resolutionStatus && params.resolutionStatus !== 'all') {
      whereConditions.push("COALESCE(resolution_status, 'open') = ?");
      sqlParams.push(params.resolutionStatus.toLowerCase());
    }

    if (params.requestId) {
      whereConditions.push('request_id = ?');
      sqlParams.push(params.requestId);
    }

    if (params.startDate) {
      whereConditions.push('timestamp >= ?');
      sqlParams.push(params.startDate);
    }

    if (params.endDate) {
      let endVal = params.endDate;
      if (endVal.length === 10) endVal += 'T23:59:59.999Z';
      whereConditions.push('timestamp <= ?');
      sqlParams.push(endVal);
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      whereConditions.push('(message LIKE ? OR error_message LIKE ? OR error_code LIKE ? OR endpoint LIKE ? OR request_id LIKE ? OR resolution_note LIKE ?)');
      sqlParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.join(' AND ');

    const countRow = (await db.prepare(`SELECT COUNT(*) as total FROM system_audit_logs WHERE ${whereClause}`).get(...sqlParams)) as any;
    const total = Number(countRow?.total) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const rows = (await db.prepare(`
      SELECT * FROM system_audit_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(...sqlParams, limit, offset)) as any[];

    const formattedErrors = rows.map((r) => {
      let meta = null;
      try {
        if (r.metadata) meta = JSON.parse(r.metadata);
      } catch {}

      return {
        id: r.id,
        timestamp: r.timestamp,
        severity: r.severity,
        eventType: r.event_type,
        action: r.action,
        module: r.module,
        message: r.message,
        userId: r.user_id,
        username: r.username,
        targetType: r.target_type,
        targetId: r.target_id,
        requestId: r.request_id,
        ipAddress: r.ip_address,
        endpoint: r.endpoint,
        httpMethod: r.http_method,
        statusCode: r.status_code,
        errorCode: r.error_code,
        errorMessage: r.error_message,
        stackTrace: r.stack_trace,
        metadata: meta,
        resolutionStatus: r.resolution_status || 'open',
        resolutionNote: r.resolution_note || null,
        resolvedBy: r.resolved_by || null,
        resolvedAt: r.resolved_at || null,
        createdAt: r.created_at,
      };
    });

    return {
      errors: formattedErrors,
      total,
      page,
      limit,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  },

  /**
   * Updates error operational resolution status (BACKENDFIXES5 Section 29).
   */
  updateErrorStatus: async (
    errorId: string,
    status: 'open' | 'investigating' | 'resolved' | 'ignored',
    note?: string,
    adminUser?: { id?: string; name: string }
  ) => {
    const validStatuses = ['open', 'investigating', 'resolved', 'ignored'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid resolution status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const errorRow = (await db.prepare('SELECT id, severity, module, message FROM system_audit_logs WHERE id = ?').get(errorId)) as any;
    if (!errorRow) {
      throw new Error('System error record not found.');
    }

    const now = new Date().toISOString();
    const adminName = adminUser?.name || 'admin';

    await db.prepare(`
      UPDATE system_audit_logs
      SET resolution_status = ?,
          resolution_note = ?,
          resolved_by = ?,
          resolved_at = ?
      WHERE id = ?
    `).run(status, note || null, adminName, now, errorId);

    // Audit the operational status change
    await auditService.logSystemEvent({
      severity: 'INFO',
      eventType: 'ERROR_RESOLUTION_UPDATED',
      action: 'UPDATE_ERROR_STATUS',
      module: 'AUDIT',
      message: `Administrator ${adminName} updated error ${errorId} status to '${status}'`,
      userId: adminUser?.id,
      username: adminName,
      targetType: 'system_audit_log',
      targetId: errorId,
      metadata: {
        previousStatus: errorRow.resolution_status || 'open',
        newStatus: status,
        resolutionNote: note,
      },
    });

    return {
      success: true,
      id: errorId,
      resolutionStatus: status,
      resolutionNote: note || null,
      resolvedBy: adminName,
      resolvedAt: now,
    };
  },

  /**
   * Safe, confirmed clearing of audit logs preserving accountability.
   */
  clearSystemLogs: async (
    adminUser: { id?: string; name: string },
    options: { confirm: boolean; reason?: string; beforeDate?: string }
  ) => {
    if (!options.confirm) {
      throw new Error('Confirmation is required to clear audit logs.');
    }

    const now = new Date().toISOString();
    let countToDelete = 0;
    let deleteStmt = '';
    const params: any[] = [];

    if (options.beforeDate) {
      const countRow = (await db.prepare('SELECT COUNT(*) as count FROM system_audit_logs WHERE timestamp < ?').get(options.beforeDate)) as any;
      countToDelete = Number(countRow?.count) || 0;
      deleteStmt = 'DELETE FROM system_audit_logs WHERE timestamp < ?';
      params.push(options.beforeDate);
    } else {
      const countRow = (await db.prepare('SELECT COUNT(*) as count FROM system_audit_logs').get()) as any;
      countToDelete = Number(countRow?.count) || 0;
      deleteStmt = 'DELETE FROM system_audit_logs';
    }

    // Execute deletion
    if (params.length > 0) {
      await db.prepare(deleteStmt).run(...params);
    } else {
      await db.prepare(deleteStmt).run();
    }

    // Record the clearing action itself AFTER deletion so accountability is permanently preserved
    const clearLogId = `syslog-clear-${Date.now()}`;
    const clearMessage = options.beforeDate
      ? `Administrator ${adminUser.name} cleared ${countToDelete} audit logs dated prior to ${options.beforeDate}. Reason: ${options.reason || 'Routine archival'}`
      : `Administrator ${adminUser.name} cleared all ${countToDelete} system audit logs. Reason: ${options.reason || 'Manual log rotation'}`;

    await db.prepare(`
      INSERT INTO system_audit_logs (
        id, timestamp, severity, event_type, action, module, message,
        user_id, username, created_at, metadata
      ) VALUES (?, ?, 'CRITICAL', 'AUDIT_LOGS_CLEARED', 'AUDIT_LOGS_CLEARED', 'AUDIT', ?, ?, ?, ?, ?)
    `).run(
      clearLogId,
      now,
      clearMessage,
      adminUser.id || null,
      adminUser.name,
      now,
      JSON.stringify({
        deletedCount: countToDelete,
        reason: options.reason || 'Not specified',
        beforeDate: options.beforeDate || 'ALL',
      })
    );

    return {
      success: true,
      deletedCount: countToDelete,
      message: clearMessage,
    };
  },

  /**
   * Safe, targeted clearing of error logs (BACKENDFIXES6 Sections 17-21).
   */
  clearSystemErrors: async (
    adminUser: { id?: string; name: string },
    options: { confirm: boolean; reason?: string; beforeDate?: string; module?: string; requestId?: string }
  ) => {
    if (!options.confirm) {
      throw new Error('Confirmation is required to clear error logs.');
    }

    const whereConditions = ["(severity IN ('ERROR', 'CRITICAL') OR status_code >= 400 OR error_code IS NOT NULL)"];
    const params: any[] = [];

    if (options.beforeDate) {
      whereConditions.push('timestamp < ?');
      params.push(options.beforeDate);
    }

    if (options.module && options.module !== 'all') {
      whereConditions.push('module = ?');
      params.push(options.module);
    }

    const whereClause = whereConditions.join(' AND ');
    const countRow = (await db.prepare(`SELECT COUNT(*) as count FROM system_audit_logs WHERE ${whereClause}`).get(...params)) as any;
    const countToDelete = Number(countRow?.count) || 0;

    // Execute deletion of error records
    await db.prepare(`DELETE FROM system_audit_logs WHERE ${whereClause}`).run(...params);

    const now = new Date().toISOString();
    const clearMessage = options.beforeDate
      ? `Administrator ${adminUser.name} cleared ${countToDelete} error log records dated prior to ${options.beforeDate}. Reason: ${options.reason || 'Manual error log cleanup'}`
      : `Administrator ${adminUser.name} cleared all ${countToDelete} system error log records. Reason: ${options.reason || 'Manual error log cleanup'}`;

    // Record audit event in remaining audit trail (INFO severity so it is not treated as an error)
    const auditId = `syslog-clear-err-${Date.now()}`;
    await db.prepare(`
      INSERT INTO system_audit_logs (
        id, timestamp, severity, event_type, action, module, message,
        user_id, username, request_id, created_at, metadata
      ) VALUES (?, ?, 'INFO', 'ADMIN_CLEAR_ERROR_LOGS', 'CLEAR_ERROR_LOGS', 'AUDIT', ?, ?, ?, ?, ?)
    `).run(
      auditId,
      now,
      clearMessage,
      adminUser.id || null,
      adminUser.name,
      options.requestId || null,
      now,
      JSON.stringify({
        deletedCount: countToDelete,
        reason: options.reason || 'Manual error log cleanup',
        beforeDate: options.beforeDate || 'ALL',
        module: options.module || 'ALL',
        logType: 'ERROR_LOGS',
      })
    );

    await auditService.logActivity(adminUser.name, 'ADMIN_CLEAR_ERROR_LOGS', 'SUCCESS', null, {
      deletedCount: countToDelete,
      reason: options.reason,
    });

    return {
      success: true,
      deletedCount: countToDelete,
      message: clearMessage,
    };
  },

  /**
   * Safe, targeted clearing of submission history/activity logs (BACKENDFIXES6 Sections 18-21).
   */
  clearSubmissionLogs: async (
    adminUser: { id?: string; name: string },
    options: { confirm: boolean; reason?: string; beforeDate?: string; requestId?: string }
  ) => {
    if (!options.confirm) {
      throw new Error('Confirmation is required to clear submission logs.');
    }

    // 1. Delete from activity_logs matching submission/ticket events
    const actConditions = ["(action LIKE '%SUBMISSION%' OR action LIKE '%APPLICATION%' OR action LIKE '%QR%' OR action LIKE '%TICKET%')"];
    const actParams: any[] = [];
    if (options.beforeDate) {
      actConditions.push('timestamp < ?');
      actParams.push(options.beforeDate);
    }
    const actWhere = actConditions.join(' AND ');
    const actCountRow = (await db.prepare(`SELECT COUNT(*) as count FROM activity_logs WHERE ${actWhere}`).get(...actParams)) as any;
    const actDeleted = Number(actCountRow?.count) || 0;
    await db.prepare(`DELETE FROM activity_logs WHERE ${actWhere}`).run(...actParams);

    // 2. Delete from system_audit_logs matching ticket/submission module
    const sysConditions = [
      "(module IN ('TICKETS', 'APPROVAL') OR target_type IN ('submission', 'ticket') OR event_type LIKE '%TICKET%' OR event_type LIKE '%SUBMISSION%' OR event_type LIKE '%APPLICATION%')",
      "event_type NOT IN ('ADMIN_CLEAR_SUBMISSION_LOGS', 'ADMIN_CLEAR_ERROR_LOGS', 'AUDIT_LOGS_CLEARED')"
    ];
    const sysParams: any[] = [];
    if (options.beforeDate) {
      sysConditions.push('timestamp < ?');
      sysParams.push(options.beforeDate);
    }
    const sysWhere = sysConditions.join(' AND ');
    const sysCountRow = (await db.prepare(`SELECT COUNT(*) as count FROM system_audit_logs WHERE ${sysWhere}`).get(...sysParams)) as any;
    const sysDeleted = Number(sysCountRow?.count) || 0;
    await db.prepare(`DELETE FROM system_audit_logs WHERE ${sysWhere}`).run(...sysParams);

    const totalDeleted = actDeleted + sysDeleted;
    const now = new Date().toISOString();
    const clearMessage = `Administrator ${adminUser.name} cleared ${totalDeleted} submission history log records (${actDeleted} activity logs, ${sysDeleted} system audit events). Actual business records in submissions table remain completely intact. Reason: ${options.reason || 'Manual log cleanup'}`;

    // Record audit event of the clearing operation
    const auditId = `syslog-clear-sub-${Date.now()}`;
    await db.prepare(`
      INSERT INTO system_audit_logs (
        id, timestamp, severity, event_type, action, module, message,
        user_id, username, request_id, created_at, metadata
      ) VALUES (?, ?, 'INFO', 'ADMIN_CLEAR_SUBMISSION_LOGS', 'CLEAR_SUBMISSION_LOGS', 'AUDIT', ?, ?, ?, ?, ?)
    `).run(
      auditId,
      now,
      clearMessage,
      adminUser.id || null,
      adminUser.name,
      options.requestId || null,
      now,
      JSON.stringify({
        deletedCount: totalDeleted,
        activityLogsDeleted: actDeleted,
        systemAuditLogsDeleted: sysDeleted,
        reason: options.reason || 'Manual log cleanup',
        beforeDate: options.beforeDate || 'ALL',
        logType: 'SUBMISSION_LOGS',
      })
    );

    await auditService.logActivity(adminUser.name, 'ADMIN_CLEAR_SUBMISSION_LOGS', 'SUCCESS', null, {
      deletedCount: totalDeleted,
      reason: options.reason,
    });

    return {
      success: true,
      deletedCount: totalDeleted,
      message: clearMessage,
    };
  },

  logActivity: async (
    actor: string,
    action: string,
    result: string,
    entityId?: string | null,
    metadata?: Record<string, any>
  ): Promise<void> => {
    try {
      const id = `act-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      await db.prepare(`
        INSERT INTO activity_logs (id, timestamp, actor, action, entity_id, result, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        new Date().toISOString(),
        actor,
        action,
        entityId || null,
        result,
        metadata ? JSON.stringify(sanitizeDetails(metadata)) : null
      );
    } catch (err) {
      console.error('[Audit Log Error]:', err);
    }
  },

  logScan: async (
    query: string,
    result: 'VALID' | 'ALREADY_USED' | 'INVALID',
    scannedBy: string,
    ticketId?: string | null,
    submissionId?: string | null,
    reason?: string | null
  ): Promise<void> => {
    try {
      const id = `scan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      await db.prepare(`
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
