import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as superAdminController from '../controllers/superadmin.controller';
import { authenticate, isAdmin, isSuperAdmin } from '../middlewares/auth';

export const adminRouter = Router();
adminRouter.use(authenticate as any);

// Admin routes (Admin + Super Admin)
adminRouter.get('/stats', isAdmin as any, adminController.getDashboardStats as any);
adminRouter.get('/audit-logs', isAdmin as any, adminController.getAuditLogs as any);
adminRouter.get('/reports/transactions', isAdmin as any, adminController.getTransactionReport as any);
adminRouter.get('/health', isAdmin as any, adminController.getSystemHealth as any);

// Super Admin only routes
adminRouter.get('/super/stats', isSuperAdmin as any, superAdminController.getSystemStats as any);
adminRouter.get('/super/master-wallet', isSuperAdmin as any, superAdminController.getMasterWallet as any);
adminRouter.get('/super/flags', isSuperAdmin as any, superAdminController.getFlags as any);
adminRouter.post('/super/flags', isSuperAdmin as any, superAdminController.setFlag as any);
adminRouter.post('/super/admins', isSuperAdmin as any, superAdminController.createAdmin as any);
adminRouter.patch('/super/users/:userId/toggle', isSuperAdmin as any, superAdminController.forceToggleUser as any);