import { db } from '../db/database';
import { config } from '../config/env';
import { emailService } from './emailService';

export interface AdminStatistics {
  // Fixes 3 Authoritative Flat Statistics (Section 3)
  totalApplications: number;
  pending: number;
  approved: number;
  rejected: number;
  ticketsSold: number;
  universityTickets: number;
  outsiderTickets: number;
  checkedIn: number;
  notCheckedIn: number;
  totalRevenue: number;
  universityRevenue: number;
  outsiderRevenue: number;
  emailPending: number;
  emailSent: number;
  emailFailed: number;
  emailConfigured: boolean;

  // Fixes 3 Dividend & Distribution (Section 6)
  universityTicketPercentage: number;
  outsiderTicketPercentage: number;
  dividend: {
    universityTickets: number;
    universityRevenue: number;
    universityPercentage: number;
    outsiderTickets: number;
    outsiderRevenue: number;
    outsiderPercentage: number;
  };

  // Structured breakdowns
  applications: {
    totalSubmitted: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  tickets: {
    totalIssued: number;
    universityIssued: number;
    outsiderIssued: number;
  };
  checkIn: {
    totalCheckedIn: number;
    universityCheckedIn: number;
    outsiderCheckedIn: number;
    remainingNotCheckedIn: number;
  };
  revenue: {
    universityRevenue: number;
    outsiderRevenue: number;
    totalRevenue: number;
  };
  email: {
    emailsSent: number;
    emailsPending: number;
    emailsFailed: number;
  };
  // Flat legacy compatibility fields
  pendingCount: number;
  pendingTickets: number;
  approvedCount: number;
  rejectedCount: number;
  totalSubmissions: number;
  checkedInCount: number;
  studentApprovedCount: number;
  outsiderApprovedCount: number;
  studentRevenue: number;
  totalCapacity: number;
  remainingAllocation: number;
}

export const revenueService = {
  getAdminStats: (): AdminStatistics => {
    // Single consolidated authoritative query strictly on non-deleted submissions
    const statsRow = db.prepare(`
      SELECT
        -- Applications breakdown
        COUNT(*) as totalSubmitted,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pendingCount,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approvedCount,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejectedCount,

        -- Ticket pass quantities issued
        COALESCE(SUM(CASE WHEN status = 'pending' THEN quantity ELSE 0 END), 0) as pendingTickets,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END), 0) as totalTicketsIssued,
        COALESCE(SUM(CASE WHEN status = 'approved' AND ticket_type = 'student' THEN quantity ELSE 0 END), 0) as studentApprovedCount,
        COALESCE(SUM(CASE WHEN status = 'approved' AND ticket_type = 'outsider' THEN quantity ELSE 0 END), 0) as outsiderApprovedCount,

        -- Check-in quantities
        COALESCE(SUM(CASE WHEN status = 'approved' AND checked_in = 1 THEN quantity ELSE 0 END), 0) as totalCheckedIn,
        COALESCE(SUM(CASE WHEN status = 'approved' AND checked_in = 1 AND ticket_type = 'student' THEN quantity ELSE 0 END), 0) as universityCheckedIn,
        COALESCE(SUM(CASE WHEN status = 'approved' AND checked_in = 1 AND ticket_type = 'outsider' THEN quantity ELSE 0 END), 0) as outsiderCheckedIn,

        -- Email delivery breakdown
        COALESCE(SUM(CASE WHEN status = 'approved' AND email_status = 'SENT' THEN 1 ELSE 0 END), 0) as emailsSent,
        COALESCE(SUM(CASE WHEN status = 'approved' AND email_status = 'PENDING' THEN 1 ELSE 0 END), 0) as emailsPending,
        COALESCE(SUM(CASE WHEN status = 'approved' AND email_status = 'FAILED' THEN 1 ELSE 0 END), 0) as emailsFailed,

        -- Revenue strictly calculated by backend authoritative pricing (Integer LKR)
        COALESCE(SUM(CASE 
          WHEN status = 'approved' AND ticket_type = 'student' THEN quantity * ${config.pricing.student}
          WHEN status = 'approved' AND ticket_type = 'outsider' THEN quantity * ${config.pricing.outsider}
          ELSE 0 
        END), 0) as totalRevenue
      FROM submissions
      WHERE deleted_at IS NULL
    `).get() as any;

    const totalSubmitted = Number(statsRow?.totalSubmitted) || 0;
    const pendingCount = Number(statsRow?.pendingCount) || 0;
    const approvedCount = Number(statsRow?.approvedCount) || 0;
    const rejectedCount = Number(statsRow?.rejectedCount) || 0;

    const totalTicketsIssued = Number(statsRow?.totalTicketsIssued) || 0;
    const studentApprovedCount = Number(statsRow?.studentApprovedCount) || 0;
    const outsiderApprovedCount = Number(statsRow?.outsiderApprovedCount) || 0;

    const totalCheckedIn = Number(statsRow?.totalCheckedIn) || 0;
    const universityCheckedIn = Number(statsRow?.universityCheckedIn) || 0;
    const outsiderCheckedIn = Number(statsRow?.outsiderCheckedIn) || 0;
    const remainingNotCheckedIn = Math.max(0, totalTicketsIssued - totalCheckedIn);

    const studentRevenue = studentApprovedCount * config.pricing.student;
    const outsiderRevenue = outsiderApprovedCount * config.pricing.outsider;
    const totalRevenue = studentRevenue + outsiderRevenue;

    const emailsSent = Number(statsRow?.emailsSent) || 0;
    const emailsPending = Number(statsRow?.emailsPending) || 0;
    const emailsFailed = Number(statsRow?.emailsFailed) || 0;

    // Get event settings
    const settings = db.prepare('SELECT total_capacity, remaining_allocation FROM event_settings WHERE id = 1').get() as any;

    // Fixes 3 Section 6 Dividend & Percentage Distribution
    const universityTicketPercentage = totalTicketsIssued > 0
      ? Number(((studentApprovedCount / totalTicketsIssued) * 100).toFixed(1))
      : 0;
    const outsiderTicketPercentage = totalTicketsIssued > 0
      ? Number(((outsiderApprovedCount / totalTicketsIssued) * 100).toFixed(1))
      : 0;

    return {
      // Fixes 3 Top-Level Authoritative Fields (Section 3)
      totalApplications: totalSubmitted,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      ticketsSold: totalTicketsIssued,
      universityTickets: studentApprovedCount,
      outsiderTickets: outsiderApprovedCount,
      checkedIn: totalCheckedIn,
      notCheckedIn: remainingNotCheckedIn,
      totalRevenue,
      universityRevenue: studentRevenue,
      outsiderRevenue,
      emailPending: emailsPending,
      emailSent: emailsSent,
      emailFailed: emailsFailed,
      emailConfigured: emailService.isConfigured(),

      // Fixes 3 Dividend & Distribution (Section 6)
      universityTicketPercentage,
      outsiderTicketPercentage,
      dividend: {
        universityTickets: studentApprovedCount,
        universityRevenue: studentRevenue,
        universityPercentage: universityTicketPercentage,
        outsiderTickets: outsiderApprovedCount,
        outsiderRevenue,
        outsiderPercentage: outsiderTicketPercentage,
      },

      // Structured Breakdowns
      applications: {
        totalSubmitted,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      tickets: {
        totalIssued: totalTicketsIssued,
        universityIssued: studentApprovedCount,
        outsiderIssued: outsiderApprovedCount,
      },
      checkIn: {
        totalCheckedIn,
        universityCheckedIn,
        outsiderCheckedIn,
        remainingNotCheckedIn,
      },
      revenue: {
        universityRevenue: studentRevenue,
        outsiderRevenue,
        totalRevenue,
      },
      email: {
        emailsSent,
        emailsPending,
        emailsFailed,
      },

      // Flat legacy compatibility
      pendingCount,
      pendingTickets: Number(statsRow?.pendingTickets) || 0,
      approvedCount,
      rejectedCount,
      totalSubmissions: totalSubmitted,
      checkedInCount: totalCheckedIn,
      studentApprovedCount,
      outsiderApprovedCount,
      studentRevenue,
      totalCapacity: settings?.total_capacity ?? 800,
      remainingAllocation: settings?.remaining_allocation ?? 142,
    };
  },
};
