/**
 * Hierarchy-based User Creation Routes
 * Protected endpoints for creating users at each hierarchy level
 */

import { Router } from 'express';
import { Role } from '@prisma/client';
import * as hierarchyController from '../controllers/hierarchy.controller';
import { authenticate, authorize } from '../middlewares/auth';

export const hierarchyRouter = Router();

/**
 * POST /hierarchy/admins/create
 * Create ADMIN user
 * Access: SUPER_ADMIN only
 */
hierarchyRouter.post(
  '/admins/create',
  authenticate as any,
  authorize(Role.SUPER_ADMIN) as any,
  hierarchyController.createAdmin as any
);

/**
 * POST /hierarchy/clients/create
 * Create CLIENT user
 * Access: ADMIN or SUPER_ADMIN
 */
hierarchyRouter.post(
  '/clients/create',
  authenticate as any,
  authorize(Role.ADMIN, Role.SUPER_ADMIN) as any,
  hierarchyController.createClient as any
);

/**
 * POST /hierarchy/agents/create
 * Create AGENT user
 * Access: CLIENT, ADMIN, or SUPER_ADMIN
 */
hierarchyRouter.post(
  '/agents/create',
  authenticate as any,
  authorize(Role.CLIENT, Role.ADMIN, Role.SUPER_ADMIN) as any,
  hierarchyController.createAgent as any
);
