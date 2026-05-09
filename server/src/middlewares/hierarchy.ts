/**
 * Hierarchy-based access control middleware
 * Enforces strict hierarchical relationships:
 * SUPER_ADMIN -> ADMIN -> CLIENT -> AGENT
 */

import { Response, NextFunction, Request } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from './error';
import { prisma } from '../config/database';

/**
 * Validates that a user can create a child user of a specific role
 * Enforces the hierarchy: SUPER_ADMIN can create ADMIN, ADMIN can create CLIENT, CLIENT can create AGENT
 */
export const validateHierarchyCreation = (targetRole: Role) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const creatorRole = authReq.user.role;

    // Define who can create whom
    const canCreateMap: Record<Role, Role[]> = {
      [Role.SUPER_ADMIN]: [Role.ADMIN],
      [Role.ADMIN]: [Role.CLIENT],
      [Role.CLIENT]: [Role.AGENT],
      [Role.AGENT]: [], // AGENT cannot create anyone
    };

    if (!canCreateMap[creatorRole]?.includes(targetRole)) {
      return next(
        new AppError(
          `${creatorRole} cannot create ${targetRole} users`,
          403,
          'HIERARCHY_VIOLATION'
        )
      );
    }

    next();
  };
};

/**
 * Validates that a requester owns/manages a target user
 * Ensures users can only manage their own children
 */
export const validateOwnership = async (
  requesterId: string,
  requesterRole: Role,
  targetUserId: string
): Promise<boolean> => {
  // SUPER_ADMIN can access anyone
  if (requesterRole === Role.SUPER_ADMIN) {
    return true;
  }

  // Check if target user was created by requester
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { parentId: true },
  });

  if (!targetUser) {
    return false;
  }

  return targetUser.parentId === requesterId;
};

/**
 * Middleware to validate ownership of a target user (from route params)
 * Used before accessing/modifying specific users
 */
export const checkOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const targetUserId = req.params.id;

    const isOwner = await validateOwnership(
      authReq.user.userId,
      authReq.user.role,
      targetUserId
    );

    if (!isOwner) {
      return next(
        new AppError(
          'You do not have access to this user',
          403,
          'OWNERSHIP_VIOLATION'
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validates that a user can only access users in their hierarchy
 * Returns a Prisma where clause for filtering
 */
export const getHierarchyFilter = (
  requesterId: string,
  requesterRole: Role
): any => {
  if (requesterRole === Role.SUPER_ADMIN) {
    return {}; // SUPER_ADMIN sees everyone
  }

  // Other roles only see users created by them
  return {
    createdById: requesterId,
  };
};

/**
 * Validates that a target user's role is in the requester's accessible hierarchy
 */
export const validateRoleAccess = (requesterRole: Role, targetRole: Role): boolean => {
  const accessMap: Record<Role, Role[]> = {
    [Role.SUPER_ADMIN]: [Role.SUPER_ADMIN, Role.ADMIN, Role.CLIENT, Role.AGENT],
    [Role.ADMIN]: [Role.CLIENT, Role.AGENT],
    [Role.CLIENT]: [Role.AGENT],
    [Role.AGENT]: [],
  };

  return accessMap[requesterRole]?.includes(targetRole) ?? false;
};
