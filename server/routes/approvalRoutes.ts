import { Router } from 'express';
import { approvalController } from '../controllers/approvalController';
import { authenticate, requireRole } from '../middleware/auth';

export const approvalRoutes = Router();

// Only admin and approver roles can access the approval desk
approvalRoutes.use(authenticate, requireRole('admin', 'approver'));

approvalRoutes.get('/pending', approvalController.getPending);
approvalRoutes.post('/approve/:id', approvalController.approve);
approvalRoutes.post('/reject/:id', approvalController.reject);
approvalRoutes.get('/history', approvalController.getHistory);
approvalRoutes.post('/retry-email/:id', approvalController.retryEmail);
