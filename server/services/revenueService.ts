import { db } from '../db/database';
import { config } from '../config/env';

export const revenueService = {
  getAdminStats: () => {
    // Authoritative calculations in Integer LKR
    const statsRow = db.prepare(`
      SELECT
        -- Counts by status
        COUNT(*) as totalSubmissions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pendingCount,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approvedCount,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejectedCount,

        -- Ticket pass quantities
        COALESCE(SUM(CASE WHEN status = 'pending' THEN quantity ELSE 0 END), 0) as pendingTickets,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END), 0) as ticketsSold,
        COALESCE(SUM(CASE WHEN status = 'approved' AND checked_in = 1 THEN quantity ELSE 0 END), 0) as checkedInCount,

        -- Revenue strictly calculated by backend authoritative pricing
        COALESCE(SUM(CASE 
          WHEN status = 'approved' AND ticket_type = 'student' THEN quantity * ${config.pricing.student}
          WHEN status = 'approved' AND ticket_type = 'outsider' THEN quantity * ${config.pricing.outsider}
          ELSE 0 
        END), 0) as totalRevenue,

        -- Breakdown by category
        COALESCE(SUM(CASE WHEN status = 'approved' AND ticket_type = 'student' THEN quantity ELSE 0 END), 0) as studentApprovedCount,
        COALESCE(SUM(CASE WHEN status = 'approved' AND ticket_type = 'outsider' THEN quantity ELSE 0 END), 0) as outsiderApprovedCount
      FROM submissions
    `).get() as any;

    // Get event settings
    const settings = db.prepare('SELECT total_capacity, remaining_allocation FROM event_settings WHERE id = 1').get() as any;

    return {
      totalRevenue: Number(statsRow?.totalRevenue) || 0,
      ticketsSold: Number(statsRow?.ticketsSold) || 0,
      pendingCount: Number(statsRow?.pendingCount) || 0,
      pendingTickets: Number(statsRow?.pendingTickets) || 0,
      approvedCount: Number(statsRow?.approvedCount) || 0,
      rejectedCount: Number(statsRow?.rejectedCount) || 0,
      totalSubmissions: Number(statsRow?.totalSubmissions) || 0,
      checkedInCount: Number(statsRow?.checkedInCount) || 0,
      studentApprovedCount: Number(statsRow?.studentApprovedCount) || 0,
      outsiderApprovedCount: Number(statsRow?.outsiderApprovedCount) || 0,
      studentRevenue: (Number(statsRow?.studentApprovedCount) || 0) * config.pricing.student,
      outsiderRevenue: (Number(statsRow?.outsiderApprovedCount) || 0) * config.pricing.outsider,
      totalCapacity: settings?.total_capacity ?? 800,
      remainingAllocation: settings?.remaining_allocation ?? 142,
    };
  },
};
