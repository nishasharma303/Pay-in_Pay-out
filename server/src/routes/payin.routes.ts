import { Router, raw } from 'express';
import * as payinController from '../controllers/payin.controller';
import { authenticate, isAnyRole } from '../middlewares/auth';

export const payinRouter = Router();

// ─── Webhook: MUST use raw body for HMAC signature verification ────────────────
// This route is intentionally BEFORE authenticate — webhooks come from Razorpay, not users
payinRouter.post(
  '/webhook',
  raw({ type: 'application/json' }),
  (req, res, next) => {
    // Store raw body string for signature verification
    (req as any).rawBody = req.body.toString('utf8');
    next();
  },
  payinController.webhook as any
);

// ─── Protected routes ─────────────────────────────────────────────────────────
payinRouter.use(authenticate as any);

payinRouter.post('/order', isAnyRole as any, payinController.createOrder as any);
payinRouter.post('/confirm', isAnyRole as any, payinController.confirmPayment as any);
payinRouter.get('/history', isAnyRole as any, payinController.getHistory as any);