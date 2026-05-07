import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { creditWallet } from './wallet.service';

// ─── Commission hierarchy: Agent earns, then % flows up to Client → Admin → Super Admin ──
const ROLE_CHAIN: Role[] = [Role.AGENT, Role.CLIENT, Role.ADMIN, Role.SUPER_ADMIN];

// ─── Calculate commission amount ──────────────────────────────────────────────
const calcCommission = (transactionAmount: number, rule: { isPercentage: boolean; value: number }): number => {
  if (rule.isPercentage) return Math.round((transactionAmount * rule.value) / 100 * 100) / 100;
  return rule.value; // flat amount
};

// ─── Distribute commissions up the hierarchy ─────────────────────────────────
export const distributeCommissions = async (
  agentId: string,
  transactionId: string,
  transactionAmountRupees: number,
  serviceType: string
) => {
  // 1. Walk up the hierarchy: Agent → Client → Admin → Super Admin
  const hierarchy: Array<{ userId: string; role: Role }> = [];

  let currentUser = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, role: true, parentId: true },
  });

  while (currentUser) {
    hierarchy.push({ userId: currentUser.id, role: currentUser.role });
    if (!currentUser.parentId) break;
    currentUser = await prisma.user.findUnique({
      where: { id: currentUser.parentId },
      select: { id: true, role: true, parentId: true },
    });
  }

  // 2. Fetch applicable commission rules
  const rules = await prisma.commissionRule.findMany({
    where: {
      serviceType,
      isActive: true,
      role: { in: hierarchy.map((h) => h.role) },
    },
  });

  const ruleMap = new Map(rules.map((r) => [r.role, r]));

  // 3. Distribute to each level
  const distributions: Array<{ userId: string; role: Role; amount: number }> = [];

  for (const { userId, role } of hierarchy) {
    const rule = ruleMap.get(role);
    if (!rule) continue;

    const commissionAmount = calcCommission(transactionAmountRupees, rule);
    if (commissionAmount <= 0) continue;

    distributions.push({ userId, role, amount: commissionAmount });
  }

  // 4. Credit wallets and record in DB atomically
  const commissionRecords = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const dist of distributions) {
      const amountPaise = BigInt(Math.round(dist.amount * 100));

      // Credit wallet
      const wallet = await tx.$queryRaw<Array<{ id: string; primaryBalance: bigint }>>`
        SELECT id, "primaryBalance" FROM "Wallet" WHERE "userId" = ${dist.userId} FOR UPDATE`;

      if (wallet[0]) {
        const newBalance = wallet[0].primaryBalance + amountPaise;
        await tx.wallet.update({ where: { userId: dist.userId }, data: { primaryBalance: newBalance } });
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet[0].id,
            type: 'CREDIT',
            amount: amountPaise,
            balanceAfter: newBalance,
            description: `Commission: ${serviceType} transaction`,
            transactionId,
            metadata: { type: 'COMMISSION', role: dist.role, serviceType } as any,
          },
        });
      }

      // Record commission
      const commission = await tx.commission.create({
        data: {
          transactionId,
          recipientId: dist.userId,
          role: dist.role,
          amount: BigInt(Math.round(dist.amount * 100)),
        },
      });
      created.push({ ...commission, amountRupees: dist.amount });
    }
    return created;
  });

  return commissionRecords;
};

// ─── Get commission rules ─────────────────────────────────────────────────────
export const getCommissionRules = async () => {
  return prisma.commissionRule.findMany({
    orderBy: [{ serviceType: 'asc' }, { role: 'asc' }],
  });
};

// ─── Create or update a commission rule ──────────────────────────────────────
export const upsertCommissionRule = async (
  role: Role,
  serviceType: string,
  isPercentage: boolean,
  value: number,
  isActive: boolean
) => {
  return prisma.commissionRule.upsert({
    where: { role_serviceType: { role, serviceType } },
    create: { role, serviceType, isPercentage, value, isActive },
    update: { isPercentage, value, isActive },
  });
};

// ─── Toggle a rule active/inactive ───────────────────────────────────────────
export const toggleCommissionRule = async (id: string) => {
  const rule = await prisma.commissionRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('Rule not found', 404, 'NOT_FOUND');
  return prisma.commissionRule.update({ where: { id }, data: { isActive: !rule.isActive } });
};

// ─── Get user's earned commissions ───────────────────────────────────────────
export const getMyCommissions = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const where = { recipientId: userId };

  const [commissions, total, stats] = await prisma.$transaction([
    prisma.commission.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: { type: true, amount: true, status: true, createdAt: true },
        },
      },
    }),
    prisma.commission.count({ where }),
    prisma.commission.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    commissions: commissions.map((c) => ({
      ...c,
      amount: Number(c.amount) / 100,
      transaction: c.transaction
        ? { ...c.transaction, amount: Number(c.transaction.amount) / 100 }
        : null,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    totalEarned: Number(stats._sum.amount ?? 0n) / 100,
  };
};

// ─── Admin: commission report ─────────────────────────────────────────────────
export const getCommissionReport = async (from?: string, to?: string) => {
  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to + 'T23:59:59') }),
    },
  } : {};

  const [byRole, byService] = await prisma.$transaction([
    prisma.commission.groupBy({
      by: ['role'],
      where: dateFilter,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.groupBy({
      by: ['transactionId'],
      where: dateFilter,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalPaid = byRole.reduce((sum, r) => sum + Number(r._sum.amount ?? 0n), 0) / 100;

  return {
    totalPaid,
    byRole: byRole.map((r) => ({
      role: r.role,
      count: r._count,
      total: Number(r._sum.amount ?? 0n) / 100,
    })),
    totalTransactions: byService.length,
  };
};