import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as servicesService from '../services/services.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

const optStr = z.string().optional().transform(v => v === '' ? undefined : v);

const processSchema = z.object({
  serviceType:     z.string().min(1),
  amount:          z.number().positive().max(100000),
  mobile:          optStr,
  accountNumber:   optStr,
  ifscCode:        optStr,
  beneficiaryName: optStr,
  operatorCode:    optStr,
  billerName:      optStr,
  consumerNumber:  optStr,
  remarks:         optStr,
});

export const processService = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = processSchema.parse(req.body);
    const result = await servicesService.processService(req.user.userId, payload as any);
    sendSuccess(res, result, result.message, 201);
  } catch (err) { next(err); }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const serviceType = req.query.serviceType as string | undefined;
    const page  = parseInt((req.query.page  as string) || '1');
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const result = await servicesService.getServiceHistory(req.user.userId, serviceType, page, limit);
    sendSuccess(res, result.transactions, undefined, 200, result.meta);
  } catch (err) { next(err); }
};