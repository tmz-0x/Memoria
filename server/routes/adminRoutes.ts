import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';

export const adminRoutes = Router();

// Publicly readable event settings for main site
adminRoutes.get('/event-settings', adminController.getSettings);

// Protected administrative routes (strictly admin role, Section 35 & 36)
adminRoutes.use(authenticate, requireRole('admin'));

// Consistent Statistics Snapshot (Section 14 & 20)
adminRoutes.get('/stats', adminController.getStats);
adminRoutes.get('/statistics', adminController.getStats);

// Submissions & Applications Listing & Single Record Inspection
adminRoutes.get('/submissions', adminController.getSubmissions);
adminRoutes.get('/applications', adminController.getSubmissions);
adminRoutes.get('/submissions/:id', adminController.getSubmissionById);
adminRoutes.get('/applications/:id', adminController.getSubmissionById);

// Admin Full Submission Editing (Sections 1-4, 36)
adminRoutes.put('/submissions/:id', adminController.updateSubmission);
adminRoutes.patch('/submissions/:id', adminController.updateSubmission);
adminRoutes.patch('/applications/:id', adminController.updateSubmission);

// Admin Individual Submission Safe Deletion (Sections 10-13, 36)
adminRoutes.delete('/submissions/:id', adminController.deleteSubmission);
adminRoutes.delete('/applications/:id', adminController.deleteSubmission);

// Admin-Only View Ticket QR Code (Fixes 3 Sections 11-14)
adminRoutes.get('/tickets/:id/qr', adminController.getTicketQR);
adminRoutes.get('/submissions/:id/qr', adminController.getTicketQR);

// Admin QR Code Regeneration (Sections 5-8, 36)
adminRoutes.post('/tickets/:id/regenerate-qr', adminController.regenerateQR);
adminRoutes.post('/submissions/:id/regenerate-qr', adminController.regenerateQR);

// Complete Database Reset with Admin Password Verification (Sections 14-21, 36)
adminRoutes.post('/database/reset', adminController.resetDatabase);

// Admin-Only Creation of New Admin Accounts (Sections 31-33, 36)
adminRoutes.post('/admins', adminController.createAdmin);

// Admin Profile & Password Management (Sections 28-30, 36)
adminRoutes.patch('/profile', adminController.updateProfile);
adminRoutes.patch('/password', adminController.updatePassword);
adminRoutes.post('/password', adminController.updatePassword);

// Diagnostic Test Email Dispatch (Section 25, 36)
adminRoutes.post('/email/test', adminController.sendTestEmail);

// Admin-Only Email Retries (Sections 27, 36)
adminRoutes.post('/emails/:id/retry', adminController.retryEmail);
adminRoutes.post('/submissions/:id/retry-email', adminController.retryEmail);

// Administrative Settings
adminRoutes.put('/event-settings', adminController.updateSettings);

// User Management & Privilege Review
adminRoutes.get('/users', adminController.getUsers);
adminRoutes.post('/users', adminController.createUser);
adminRoutes.put('/users/:id/role', adminController.updateUserRole);
adminRoutes.delete('/users/:id', adminController.deleteUser);

// Admin Alerts from Approvers
adminRoutes.get('/alerts', adminController.getAlerts);
adminRoutes.post('/alerts/:id/resolve', adminController.resolveAlert);

// Activity / Audit Logs
adminRoutes.get('/logs', adminController.getActivityLogs);
