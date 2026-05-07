import { Router, raw } from 'express';
import * as payoutController from '../controllers/payout.controller';
import { authenticate, isAnyRole } from '../middlewares/auth';

export const payoutRouter = Router();

// Cashfree webhook — raw body, no auth
payoutRouter.post(
  '/webhook',
  raw({ type: 'application/json' }),
  (req, res, next) => { 
    (req as any).rawBody = req.body.toString('utf8'); 
    next(); 
  },
  payoutController.webhook as any
);

payoutRouter.use(authenticate as any);

payoutRouter.post('/initiate', isAnyRole as any, payoutController.initiatePayout as any);
payoutRouter.post('/verify-upi', isAnyRole as any, payoutController.verifyUpi as any);
payoutRouter.get('/history', isAnyRole as any, payoutController.getHistory as any);
payoutRouter.get('/:id/status', isAnyRole as any, payoutController.getStatus as any);
payoutRouter.post('/:id/retry', isAnyRole as any, payoutController.retryPayout as any);