import { Router } from 'express';
import * as commissionController from '../controllers/commission.controller';
import { authenticate, isAdmin, isAnyRole } from '../middlewares/auth';

export const commissionRouter = Router();
commissionRouter.use(authenticate as any);

// All roles: view own commissions
commissionRouter.get('/my', isAnyRole as any, commissionController.getMyCommissions as any);

// Admin only
commissionRouter.get('/rules', isAdmin as any, commissionController.getRules as any);
commissionRouter.post('/rules', isAdmin as any, commissionController.upsertRule as any);
commissionRouter.patch('/rules/:id/toggle', isAdmin as any, commissionController.toggleRule as any);
commissionRouter.get('/report', isAdmin as any, commissionController.getReport as any);