import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PayoutMode } from '@prisma/client';
import * as payoutService from '../services/payout.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

// Optional string fields — empty string treated as undefined
const optStr = z.string().optional().transform(v => v === '' ? undefined : v);

const payoutSchema = z.object({
  amount:          z.number().positive().max(200000),
  mode:            z.enum([PayoutMode.IMPS, PayoutMode.NEFT, PayoutMode.UPI]),
  beneficiaryName: z.string().min(2).max(100),
  accountNumber:   optStr,
  ifscCode:        optStr,
  bankName:        optStr,
  upiId:           optStr,
  remarks:         optStr,
});

export const initiatePayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = payoutSchema.parse(req.body);
    const result = await payoutService.initiatePayout(req.user.userId, payload as any);
    sendSuccess(res, result, result.message, 202);
  } catch (err) { next(err); }
};

export const getStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transaction = await payoutService.checkPayoutStatus(req.params.id);
    sendSuccess(res, transaction);
  } catch (err) { next(err); }
};

export const retryPayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await payoutService.retryPayout(req.params.id, req.user.userId);
    sendSuccess(res, result, 'Payout retried');
  } catch (err) { next(err); }
};

export const verifyUpi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { upiId } = z.object({ upiId: z.string().min(3) }).parse(req.body);
    const result = await payoutService.verifyUpiId(upiId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt((req.query.page  as string) || '1');
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const result = await payoutService.getPayOutHistory(req.user.userId, page, limit);
    sendSuccess(res, result.transactions, undefined, 200, result.meta);
  } catch (err) { next(err); }
};

export const webhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    if (!signature || !timestamp) return res.status(400).json({ error: 'Missing headers' });
    const rawBody = (req as any).rawBody as string;
    const result = await payoutService.handleWebhook(rawBody, signature, timestamp);
    res.json({ status: 'ok', ...result });
  } catch (err) { next(err); }
};