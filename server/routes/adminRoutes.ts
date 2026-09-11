import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';

export const adminRoutes = Router();

// Publicly readable event settings for main site
adminRoutes.get('/event-settings', adminController.getSettings);

// Protected administrative routes (strictly admin role)
adminRoutes.use(authenticate, requireRole('admin'));

adminRoutes.get('/stats', adminController.getStats);
adminRoutes.get('/submissions', adminController.getSubmissions);
adminRoutes.put('/event-settings', adminController.updateSettings);
adminRoutes.get('/users', adminController.getUsers);
adminRoutes.post('/users', adminController.createUser);
adminRoutes.delete('/users/:id', adminController.deleteUser);
adminRoutes.get('/logs', adminController.getActivityLogs);
