import { Role, KycStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { getPaginationParams } from '../utils/response';

export const listUsers = async (
  requesterId: string,
  requesterRole: Role,
  query: { page?: string; limit?: string; role?: string; search?: string }
) => {
  const { page, limit, skip } = getPaginationParams(query);

  // Build hierarchy filter: each role can only see their direct children
  const roleFilter: Role[] = [];
  let hierarchyFilter: any = {};

  if (requesterRole === Role.SUPER_ADMIN) {
    // SUPER_ADMIN sees all users except themselves
    roleFilter.push(Role.ADMIN, Role.CLIENT, Role.AGENT);
    hierarchyFilter = {}; // No filter needed
  } else if (requesterRole === Role.ADMIN) {
    // ADMIN sees only CLIENTs and AGENTs they created
    roleFilter.push(Role.CLIENT, Role.AGENT);
    hierarchyFilter = { parentId: requesterId };
  } else if (requesterRole === Role.CLIENT) {
    // CLIENT sees only AGENTs they created
    roleFilter.push(Role.AGENT);
    hierarchyFilter = { parentId: requesterId };
  } else if (requesterRole === Role.AGENT) {
    // AGENT cannot see any users
    return { users: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }

  const where = {
    ...hierarchyFilter,
    ...(query.role && { role: query.role as Role }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { phone: { contains: query.search } },
      ],
    }),
    role: { in: roleFilter },
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        kyc: { select: { status: true } },
        wallet: { select: { primaryBalance: true } },
        _count: { select: { children: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      ...u,
      wallet: u.wallet ? { primaryBalance: Number(u.wallet.primaryBalance) / 100 } : null,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      parent: { select: { id: true, name: true, role: true } },
      kyc: true,
      wallet: { select: { primaryBalance: true, secondaryBalance: true, holdBalance: true } },
      _count: { select: { children: true, transactions: true } },
    },
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return {
    ...user,
    wallet: user.wallet
      ? {
          primaryBalance: Number(user.wallet.primaryBalance) / 100,
          secondaryBalance: Number(user.wallet.secondaryBalance) / 100,
          holdBalance: Number(user.wallet.holdBalance) / 100,
        }
      : null,
  };
};

export const toggleUserStatus = async (id: string, requesterId: string) => {
  if (id === requesterId) throw new AppError('Cannot deactivate yourself', 400, 'SELF_ACTION');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, isActive: true },
  });
};

export const updateKycStatus = async (
  userId: string,
  status: KycStatus,
  reviewNote?: string,
  reviewedById?: string
) => {
  const kyc = await prisma.kycDetail.findUnique({ where: { userId } });
  if (!kyc) throw new AppError('KYC record not found', 404, 'NOT_FOUND');

  const updated = await prisma.$transaction(async (tx) => {
    const kycUpdated = await tx.kycDetail.update({
      where: { userId },
      data: { status, reviewNote, reviewedAt: new Date(), reviewedById },
    });
    // Auto-verify user if KYC approved
    if (status === KycStatus.APPROVED) {
      await tx.user.update({ where: { id: userId }, data: { isVerified: true } });
    }
    await tx.auditLog.create({
      data: {
        userId: reviewedById,
        action: `KYC_${status}`,
        entity: 'KycDetail',
        entityId: kycUpdated.id,
        metadata: { targetUserId: userId, reviewNote },
      },
    });
    return kycUpdated;
  });
  return updated;
};
