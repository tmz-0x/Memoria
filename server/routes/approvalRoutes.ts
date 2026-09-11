import { Router } from 'express';
import { approvalController } from '../controllers/approvalController';
import { authenticate, requireRole } from '../middleware/auth';

export const approvalRoutes = Router();

// Only admin and approver roles can access the approval desk (Section 28 & 32)
approvalRoutes.use(authenticate, requireRole('admin', 'approver'));

approvalRoutes.get('/pending', approvalController.getPending);
approvalRoutes.get('/submissions/:id', approvalController.getSubmissionById);
approvalRoutes.post('/approve/:id', approvalController.approve);
approvalRoutes.post('/reject/:id', approvalController.reject);
approvalRoutes.post('/alert', approvalController.triggerAlert);
approvalRoutes.get('/history', approvalController.getHistory);
