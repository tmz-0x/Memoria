import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';

export const adminRoutes = Router();

// Publicly readable event settings for main site
adminRoutes.get('/event-settings', adminController.getSettings);

// Protected administrative routes (strictly admin role)
adminRoutes.use(authenticate, requireRole('admin'));

// Consistent Statistics Snapshot (Section 14 & 32)
adminRoutes.get('/stats', adminController.getStats);
adminRoutes.get('/statistics', adminController.getStats);

// Submissions / Applications with sorting, date filtering, status filtering & pagination
adminRoutes.get('/submissions', adminController.getSubmissions);
adminRoutes.get('/applications', adminController.getSubmissions);
adminRoutes.get('/submissions/:id', adminController.getSubmissionById);

// Admin-only submission editing (Section 22 & 32)
adminRoutes.put('/submissions/:id', adminController.updateSubmission);

// Admin-only high-risk destructive deletion with confirmation (Section 23, 24 & 32)
adminRoutes.delete('/submissions/:id', adminController.deleteSubmission);

// Admin-only idempotent email retry (Section 2, 6, 22 & 32)
adminRoutes.post('/submissions/:id/retry-email', adminController.retryEmail);

// Administrative Settings
adminRoutes.put('/event-settings', adminController.updateSettings);

// User Management & Privilege Review (Section 25 & 32)
adminRoutes.get('/users', adminController.getUsers);
adminRoutes.post('/users', adminController.createUser);
adminRoutes.put('/users/:id/role', adminController.updateUserRole);
adminRoutes.delete('/users/:id', adminController.deleteUser);

// Admin Alerts from Approvers (Section 30 & 32)
adminRoutes.get('/alerts', adminController.getAlerts);
adminRoutes.post('/alerts/:id/resolve', adminController.resolveAlert);

// Activity / Audit Logs
adminRoutes.get('/logs', adminController.getActivityLogs);
