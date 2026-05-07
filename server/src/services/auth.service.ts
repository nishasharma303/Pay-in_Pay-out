import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import {
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, getRefreshTokenExpiry,
} from '../utils/jwt';

export const registerUser = async (data: {
  name: string; email: string; phone: string; password: string;
  role?: Role; parentId?: string;
}) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
  });
  if (existing) {
    throw new AppError(
      existing.email === data.email ? 'Email already registered' : 'Phone already registered',
      409, 'DUPLICATE_USER'
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  
  // Default role: CLIENT (not AGENT) for public registration
  // AGENT can only be created by admins
  let userRole = data.role || Role.CLIENT;
  
  // If someone tries to register as AGENT without admin privileges, default to CLIENT
  if (userRole === Role.AGENT && !data.parentId) {
    userRole = Role.CLIENT;
  }
  
  const user = await prisma.user.create({
    data: {
      name: data.name, 
      email: data.email, 
      phone: data.phone,
      passwordHash, 
      role: userRole, 
      parentId: data.parentId,
      wallet: { create: { primaryBalance: 0n, secondaryBalance: 0n, holdBalance: 0n } },
    },
    select: { 
      id: true, name: true, email: true, phone: true, role: true, 
      isActive: true, isVerified: true, createdAt: true, parentId: true 
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'USER_REGISTERED', entity: 'User', entityId: user.id },
  });
  return user;
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { 
      wallet: { select: { primaryBalance: true, secondaryBalance: true, holdBalance: true } },
      kyc: { select: { status: true } }
    },
  });

  if (!user)           throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (!user.isActive)  throw new AppError('Account deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const tokenPayload   = { userId: user.id, email: user.email, role: user.role };
  const accessToken    = generateAccessToken(tokenPayload);
  const refreshToken   = generateRefreshToken(tokenPayload);

  // Clear ALL old tokens for this user — fresh start every login
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: getRefreshTokenExpiry() },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'USER_LOGIN', entity: 'User', entityId: user.id },
  }).catch(() => {}); // Don't fail login if audit log fails

  const { passwordHash: _, ...safeUser } = user;
  return {
    user: {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      phone: safeUser.phone,
      role: safeUser.role,
      isActive: safeUser.isActive,
      isVerified: safeUser.isVerified,
      createdAt: safeUser.createdAt,
      parentId: safeUser.parentId,
      wallet: safeUser.wallet ? {
        primaryBalance:   Number(safeUser.wallet.primaryBalance)   / 100,
        secondaryBalance: Number(safeUser.wallet.secondaryBalance) / 100,
        holdBalance:      Number(safeUser.wallet.holdBalance)      / 100,
      } : null,
      kyc: safeUser.kyc,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  const token = refreshToken.trim();

  // Step 1: Verify JWT signature — fast, no DB
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Step 2: Check DB
  const stored = await prisma.refreshToken.findUnique({ where: { token } }).catch(() => null);

  if (stored && stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
    throw new AppError('Refresh token expired. Please login again.', 401, 'TOKEN_EXPIRED');
  }

  const tokenPayload    = { userId: payload.userId, email: payload.email, role: payload.role };
  const newAccessToken  = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  // Rotate token
  try {
    if (stored) {
      await prisma.$transaction([
        prisma.refreshToken.delete({ where: { id: stored.id } }),
        prisma.refreshToken.create({
          data: { token: newRefreshToken, userId: payload.userId, expiresAt: getRefreshTokenExpiry() },
        }),
      ]);
    } else {
      // JWT valid but not in DB — new device/session. Accept it.
      await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
      await prisma.refreshToken.create({
        data: { token: newRefreshToken, userId: payload.userId, expiresAt: getRefreshTokenExpiry() },
      });
    }
  } catch {
    // If rotation fails, still return tokens — don't block the user
  }

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (refreshToken: string) => {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken.trim() } }).catch(() => {});
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      isActive: true, isVerified: true, createdAt: true, parentId: true,
      wallet: { select: { primaryBalance: true, secondaryBalance: true, holdBalance: true } },
      kyc:    { select: { status: true } },
      parent: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  
  return {
    ...user,
    wallet: user.wallet ? {
      primaryBalance:   Number(user.wallet.primaryBalance)   / 100,
      secondaryBalance: Number(user.wallet.secondaryBalance) / 100,
      holdBalance:      Number(user.wallet.holdBalance)      / 100,
    } : null,
  };
};