import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthRequest, JwtPayload } from '../types';
import { AppError } from './error';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }
};

// Role-Based Access Control
export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
};

// Convenience guards
export const isSuperAdmin = authorize(Role.SUPER_ADMIN);
export const isAdmin = authorize(Role.SUPER_ADMIN, Role.ADMIN);
export const isClient = authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.CLIENT);
export const isAnyRole = authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.CLIENT, Role.AGENT);
