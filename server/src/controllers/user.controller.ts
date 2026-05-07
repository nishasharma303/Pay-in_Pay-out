import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { KycStatus } from '@prisma/client';
import * as userService from '../services/user.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.listUsers(req.user.userId, req.user.role, req.query as Record<string, string>);
    sendSuccess(res, result.users, undefined, 200, result.meta);
  } catch (err) { next(err); }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user);
  } catch (err) { next(err); }
};

export const toggleStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.toggleUserStatus(req.params.id, req.user.userId);
    sendSuccess(res, result, `User ${result.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
};

export const reviewKyc = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      status: z.enum([KycStatus.APPROVED, KycStatus.REJECTED]),
      reviewNote: z.string().optional(),
    });
    const { status, reviewNote } = schema.parse(req.body);
    const kyc = await userService.updateKycStatus(req.params.id, status, reviewNote, req.user.userId);
    sendSuccess(res, kyc, `KYC ${status.toLowerCase()}`);
  } catch (err) { next(err); }
};
