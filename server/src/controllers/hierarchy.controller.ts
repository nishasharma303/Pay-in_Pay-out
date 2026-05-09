/**
 * Hierarchy-based User Creation Controllers
 * Handles creation of ADMIN, CLIENT, and AGENT users
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';
import * as hierarchyService from '../services/hierarchy.service';

/**
 * POST /admins/create
 * Only SUPER_ADMIN can create ADMIN users
 */
export const createAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = await hierarchyService.createAdmin(req.body, req.user.userId);
    sendSuccess(res, admin, 'Admin user created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /clients/create
 * Only ADMIN can create CLIENT users
 */
export const createClient = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const client = await hierarchyService.createClient(req.body, req.user.userId);
    sendSuccess(res, client, 'Client user created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /agents/create
 * Only CLIENT can create AGENT users
 */
export const createAgent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const agent = await hierarchyService.createAgent(req.body, req.user.userId);
    sendSuccess(res, agent, 'Agent user created successfully', 201);
  } catch (err) {
    next(err);
  }
};
