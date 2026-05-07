import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authenticate, isAnyRole, isAdmin } from '../middlewares/auth';

export const walletRouter = Router();
walletRouter.use(authenticate as any);

walletRouter.get('/balance', isAnyRole as any, walletController.getBalance as any);
walletRouter.get('/ledger', isAnyRole as any, walletController.getLedger as any);
walletRouter.get('/ledger/export', isAnyRole as any, walletController.exportLedger as any);
walletRouter.get('/analytics', isAnyRole as any, walletController.getAnalytics as any);
walletRouter.post('/transfer-secondary', isAnyRole as any, walletController.transferSecondary as any);
walletRouter.post('/admin-topup', isAdmin as any, walletController.adminTopUp as any);