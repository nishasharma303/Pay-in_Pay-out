import { Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import * as superAdminService from '../services/superadmin.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const getSystemStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    sendSuccess(res, await superAdminService.getSystemStats());
  } catch (err) { next(err); }
};

export const getMasterWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    sendSuccess(res, await superAdminService.getMasterWalletStats());
  } catch (err) { next(err); }
};

export const getFlags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, superAdminService.getFeatureFlags());
  } catch (err) { next(err); }
};

export const setFlag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { key, value } = z.object({ key: z.string(), value: z.boolean() }).parse(req.body);
    const flags = await superAdminService.setFeatureFlag(key, value, authReq.user.userId);
    sendSuccess(res, flags, `Flag ${key} set to ${value}`);
  } catch (err) { next(err); }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const data = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().regex(/^[6-9]\d{9}$/),
      password: z.string().min(8),
    }).parse(req.body);
    
    // Pass all required fields explicitly
    const admin = await superAdminService.createAdmin(
      authReq.user.userId,
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password
      }
    );
    sendSuccess(res, admin, 'Admin created', 201);
  } catch (err) { next(err); }
};

export const forceToggleUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const result = await superAdminService.forceToggleUser(req.params.userId, authReq.user.userId);
    sendSuccess(res, result, `User ${result.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
};