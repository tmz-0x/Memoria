import { db } from '../db/database';

export interface AttendanceStats {
  totalTicketsIssued: number;
  totalValidTickets: number;
  totalCheckedIn: number;
  totalNotCheckedIn: number;
  totalApprovedTickets: number;
  totalPendingTickets: number;
  totalRejectedScans: number;
  totalDuplicateScanAttempts: number;
  checkedInCount: number; // legacy compatibility
  percentage: number;
  attendanceRate: number;
  lastUpdated: string;
}

export const attendanceService = {
  /**
   * Centralized Authoritative Gate Attendance Statistics (BACKENDFIXES4 Section 10 & 13)
   * Calculates values directly from the current SQLite database state.
   */
  getAttendanceStatistics: (): AttendanceStats => {
    // Consolidated query strictly on active non-deleted submissions
    const subStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END), 0) as totalApprovedTickets,
        COALESCE(SUM(CASE WHEN status = 'approved' AND checked_in = 1 THEN quantity ELSE 0 END), 0) as totalCheckedIn,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN quantity ELSE 0 END), 0) as totalPendingTickets
      FROM submissions
      WHERE deleted_at IS NULL
    `).get() as any;

    const totalApprovedTickets = Number(subStats?.totalApprovedTickets) || 0;
    const totalCheckedIn = Number(subStats?.totalCheckedIn) || 0;
    const totalNotCheckedIn = Math.max(0, totalApprovedTickets - totalCheckedIn);
    const totalPendingTickets = Number(subStats?.totalPendingTickets) || 0;

    // Scan audit statistics directly from scan_audit_logs
    const scanStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN result = 'INVALID' THEN 1 ELSE 0 END), 0) as totalRejectedScans,
        COALESCE(SUM(CASE WHEN result = 'ALREADY_USED' THEN 1 ELSE 0 END), 0) as totalDuplicateScanAttempts
      FROM scan_audit_logs
    `).get() as any;

    const totalRejectedScans = Number(scanStats?.totalRejectedScans) || 0;
    const totalDuplicateScanAttempts = Number(scanStats?.totalDuplicateScanAttempts) || 0;

    const percentage = totalApprovedTickets > 0
      ? Math.round((totalCheckedIn / totalApprovedTickets) * 100)
      : 0;

    const lastUpdated = new Date().toISOString();

    return {
      totalTicketsIssued: totalApprovedTickets,
      totalValidTickets: totalApprovedTickets,
      totalCheckedIn,
      totalNotCheckedIn,
      totalApprovedTickets,
      totalPendingTickets,
      totalRejectedScans,
      totalDuplicateScanAttempts,
      checkedInCount: totalCheckedIn,
      percentage,
      attendanceRate: percentage,
      lastUpdated,
    };
  },
};
