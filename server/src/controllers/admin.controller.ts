import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import * as adminService from '../services/admin.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats(req.user.userId, req.user.role);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
};

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = Math.min(50, parseInt((req.query.limit as string) || '30'));
    const action = req.query.action as string | undefined;
    const result = await adminService.getAuditLogs(page, limit, action);
    sendSuccess(res, result.logs, undefined, 200, result.meta);
  } catch (err) { next(err); }
};

export const getTransactionReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, type } = req.query as { from?: string; to?: string; type?: string };
    const result = await adminService.getTransactionReport(from, to, type as TransactionType | undefined);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getSystemHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await adminService.getSystemHealth());
  } catch (err) { next(err); }
};
