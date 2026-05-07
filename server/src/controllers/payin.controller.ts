import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as payinService from '../services/payin.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, description } = z.object({
      amount:      z.number().min(1).max(500000),
      description: z.string().max(200).optional(),
    }).parse(req.body);

    const result = await payinService.createPayInOrder(req.user.userId, amount, description);
    sendSuccess(res, result, 'Order created', 201);
  } catch (err) { next(err); }
};

export const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId, paymentId, signature } = z.object({
      orderId:   z.string(),
      paymentId: z.string(),
      signature: z.string(),
    }).parse(req.body);

    // Log for debugging in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[Pay-In Confirm]', { orderId, paymentId, signatureLength: signature.length });
    }

    const result = await payinService.confirmPayment(orderId, paymentId, signature);
    sendSuccess(res, result, result.message);
  } catch (err) {
    // Log the actual error before passing to handler
    console.error('[Pay-In Confirm Error]', (err as Error).message);
    next(err);
  }
};

// Webhook — raw body for HMAC
export const webhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) return res.status(400).json({ error: 'Missing signature' });
    const rawBody = (req as any).rawBody as string;
    const result = await payinService.handleWebhook(rawBody, signature);
    res.json({ status: 'ok', ...result });
  } catch (err) { next(err); }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt((req.query.page  as string) || '1');
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const result = await payinService.getPayInHistory(req.user.userId, page, limit);
    sendSuccess(res, result.transactions, undefined, 200, result.meta);
  } catch (err) { next(err); }
};