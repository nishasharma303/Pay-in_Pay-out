import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { creditWallet, debitWallet } from './wallet.service';

// ─── In-memory API feature flags (in prod, store in Redis or DB) ──────────────
// We persist them in DB via AuditLog metadata for simplicity
const DEFAULT_FLAGS = {
  RAZORPAY_PAYIN: true,
  CASHFREE_PAYOUT: true,
  KYC_REQUIRED: false,
  AGENT_REGISTRATION: true,
  MAINTENANCE_MODE: false,
};

let featureFlags: Record<string, boolean> = { ...DEFAULT_FLAGS };

export const getFeatureFlags = () => ({ ...featureFlags });

export const setFeatureFlag = async (key: string, value: boolean, adminId: string) => {
  if (!(key in DEFAULT_FLAGS)) {
    throw new AppError(`Unknown feature flag: ${key}`, 400, 'UNKNOWN_FLAG');
  }
  featureFlags[key] = value;
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: 'FEATURE_FLAG_CHANGED',
      entity: 'System',
      metadata: { flag: key, value, previous: featureFlags[key] },
    },
  });
  return featureFlags;
};

// ─── Master wallet operations ─────────────────────────────────────────────────
export const getMasterWalletStats = async () => {
  const superAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
    include: { wallet: true },
  });

  const [totalUsersBalance, pendingPayouts] = await prisma.$transaction([
    prisma.wallet.aggregate({ _sum: { primaryBalance: true, secondaryBalance: true, holdBalance: true } }),
    prisma.transaction.aggregate({
      where: { status: 'PENDING', type: 'PAY_OUT' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    masterBalance: superAdmin?.wallet ? Number(superAdmin.wallet.primaryBalance) / 100 : 0,
    masterSecondary: superAdmin?.wallet ? Number(superAdmin.wallet.secondaryBalance) / 100 : 0,
    platformTotalPrimary: Number(totalUsersBalance._sum.primaryBalance ?? 0n) / 100,
    platformTotalSecondary: Number(totalUsersBalance._sum.secondaryBalance ?? 0n) / 100,
    platformHeld: Number(totalUsersBalance._sum.holdBalance ?? 0n) / 100,
    pendingPayoutsAmount: Number(pendingPayouts._sum.amount ?? 0n) / 100,
    pendingPayoutsCount: pendingPayouts._count,
  };
};

// ─── Create an Admin user ─────────────────────────────────────────────────────
export const createAdmin = async (
  superAdminId: string,
  data: { name: string; email: string; phone: string; password: string }
) => {
  const bcrypt = await import('bcryptjs');
  const existing = await prisma.user.findFirst({ where: { OR: [{ email: data.email }, { phone: data.phone }] } });
  if (existing) throw new AppError('Email or phone already registered', 409, 'DUPLICATE');

  const admin = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: Role.ADMIN,
      isActive: true,
      isVerified: true,
      parentId: superAdminId,
      wallet: { create: { primaryBalance: 0n } },
    },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: { userId: superAdminId, action: 'ADMIN_CREATED', entity: 'User', entityId: admin.id, metadata: { name: data.name, email: data.email } },
  });

  return admin;
};

// ─── Global commission override ───────────────────────────────────────────────
export const setGlobalCommissionMultiplier = async (multiplier: number, adminId: string) => {
  if (multiplier < 0 || multiplier > 5) throw new AppError('Multiplier must be between 0 and 5', 400, 'INVALID_VALUE');

  // Update all percentage rules
  await prisma.commissionRule.updateMany({
    where: { isPercentage: true },
    data: { value: { multiply: multiplier } },
  });

  await prisma.auditLog.create({
    data: { userId: adminId, action: 'COMMISSION_MULTIPLIER_SET', entity: 'CommissionRule', metadata: { multiplier } },
  });

  return { multiplier, message: `All percentage commission rules multiplied by ${multiplier}` };
};

// ─── System-wide stats (super admin only) ────────────────────────────────────
export const getSystemStats = async () => {
  const [
    totalUsers, totalTransactions, totalVolume,
    totalCommissions, activeWallets,
    userGrowth,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.transaction.count({ where: { status: 'SUCCESS' } }),
    prisma.transaction.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
    prisma.commission.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.wallet.count({ where: { primaryBalance: { gt: 0n } } }),
    // Users registered each of last 7 days
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt")::text AS date, COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ]);

  return {
    users: totalUsers,
    transactions: totalTransactions,
    totalVolume: Number(totalVolume._sum.amount ?? 0n) / 100,
    totalCommissions: Number(totalCommissions._sum.amount ?? 0n) / 100,
    commissionsCount: totalCommissions._count,
    activeWallets,
    userGrowth: (userGrowth as any[]).map((d) => ({ date: d.date, count: Number(d.count) })),
  };
};

// ─── Toggle user active status ────────────────────────────────────────────────
export const forceToggleUser = async (userId: string, adminId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (user.role === Role.SUPER_ADMIN) throw new AppError('Cannot modify Super Admin', 403, 'FORBIDDEN');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: { userId: adminId, action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entity: 'User', entityId: userId },
  });

  return updated;
};
