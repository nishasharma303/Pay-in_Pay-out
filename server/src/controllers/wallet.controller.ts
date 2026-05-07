import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as walletService from '../services/wallet.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error';
import { Role } from '@prisma/client';

export const getBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await walletService.getWalletBalance(req.user.userId));
  } catch (err) { next(err); }
};

export const getLedger = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await walletService.getLedger(req.user.userId, req.query as Record<string, string>);
    sendSuccess(res, result.entries, undefined, 200, result.meta);
  } catch (err) { next(err); }
};

export const transferSecondary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);
    const result = await walletService.transferSecondaryToPrimary(req.user.userId, BigInt(Math.round(amount * 100)));
    sendSuccess(res, result, 'Transfer successful');
  } catch (err) { next(err); }
};

export const exportLedger = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const csv = await walletService.exportLedgerCsv(req.user.userId, from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
};

export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt((req.query.days as string) || '30')));
    sendSuccess(res, await walletService.getWalletAnalytics(req.user.userId, days));
  } catch (err) { next(err); }
};

export const adminTopUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // FIXED: Cast the role to the expected type
    const allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN'> = ['SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(req.user.role as 'SUPER_ADMIN' | 'ADMIN')) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    
    const { userId, amount, note } = z.object({
      userId: z.string(),
      amount: z.number().positive().max(1000000),
      note: z.string().max(200).optional(),
    }).parse(req.body);
    
    const result = await walletService.adminTopUp(userId, req.user.userId, BigInt(Math.round(amount * 100)), note);
    sendSuccess(res, { newBalance: Number(result.newBalance) / 100 }, `Topped up ₹${amount}`);
  } catch (err) { next(err); }
};