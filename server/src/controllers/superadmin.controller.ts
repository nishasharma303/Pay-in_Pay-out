import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as superAdminService from '../services/superadmin.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const getSystemStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await superAdminService.getSystemStats());
  } catch (err) { next(err); }
};

export const getMasterWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await superAdminService.getMasterWalletStats());
  } catch (err) { next(err); }
};

export const getFlags = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, superAdminService.getFeatureFlags());
  } catch (err) { next(err); }
};

export const setFlag = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, value } = z.object({ key: z.string(), value: z.boolean() }).parse(req.body);
    const flags = await superAdminService.setFeatureFlag(key, value, req.user.userId);
    sendSuccess(res, flags, `Flag ${key} set to ${value}`);
  } catch (err) { next(err); }
};

export const createAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().regex(/^[6-9]\d{9}$/),
      password: z.string().min(8),
    }).parse(req.body);
    const admin = await superAdminService.createAdmin(req.user.userId, data);
    sendSuccess(res, admin, 'Admin created', 201);
  } catch (err) { next(err); }
};

export const forceToggleUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await superAdminService.forceToggleUser(req.params.userId, req.user.userId);
    sendSuccess(res, result, `User ${result.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
};
