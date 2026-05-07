import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import * as commissionService from '../services/commission.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const getRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await commissionService.getCommissionRules());
  } catch (err) { next(err); }
};

export const upsertRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      role: z.enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CLIENT, Role.AGENT]),
      serviceType: z.string().min(1).max(50),
      isPercentage: z.boolean(),
      value: z.number().positive().max(100),
      isActive: z.boolean().default(true),
    });
    const { role, serviceType, isPercentage, value, isActive } = schema.parse(req.body);
    const rule = await commissionService.upsertCommissionRule(role, serviceType, isPercentage, value, isActive);
    sendSuccess(res, rule, 'Commission rule saved');
  } catch (err) { next(err); }
};

export const toggleRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await commissionService.toggleCommissionRule(req.params.id);
    sendSuccess(res, rule, `Rule ${rule.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
};

export const getMyCommissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const result = await commissionService.getMyCommissions(req.user.userId, page, limit);
    sendSuccess(res, result, undefined, 200, result.meta);
  } catch (err) { next(err); }
};

export const getReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    sendSuccess(res, await commissionService.getCommissionReport(from, to));
  } catch (err) { next(err); }
};
