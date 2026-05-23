import { TransactionStatus, TransactionType, Role } from '@prisma/client';
import { prisma } from '../config/database';

// ─── Main dashboard stats ─────────────────────────────────────────────────────
export const getDashboardStats = async (adminId: string, role: Role) => {
  const isSuper = role === Role.SUPER_ADMIN;

  // Build scope filter — super admin sees everything, admin sees their subtree
  const userScope = isSuper ? {} : { parentId: adminId };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const [
    totalUsers, activeUsers, pendingKyc, approvedKyc,
    todayTxCount, todayVolume, monthTxCount, monthVolume,
    lastMonthVolume, totalWalletBalance,
    recentTransactions,
    usersByRole,
    dailyVolume,
  ] = await prisma.$transaction([
    // Users
    prisma.user.count({ where: { ...userScope, role: { not: Role.SUPER_ADMIN } } }),
    prisma.user.count({ where: { ...userScope, isActive: true, role: { not: Role.SUPER_ADMIN } } }),
    prisma.kycDetail.count({ where: { status: 'PENDING' } }),
    prisma.kycDetail.count({ where: { status: 'APPROVED' } }),

    // Today's transactions
    prisma.transaction.count({ where: { createdAt: { gte: today }, status: TransactionStatus.SUCCESS } }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: today }, status: TransactionStatus.SUCCESS },
      _sum: { amount: true },
    }),

    // This month
    prisma.transaction.count({ where: { createdAt: { gte: monthStart }, status: TransactionStatus.SUCCESS } }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: monthStart }, status: TransactionStatus.SUCCESS },
      _sum: { amount: true },
    }),

    // Last month (for comparison)
    prisma.transaction.aggregate({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: TransactionStatus.SUCCESS },
      _sum: { amount: true },
    }),

    // Total wallet balances
    prisma.wallet.aggregate({ _sum: { primaryBalance: true, secondaryBalance: true } }),

    // Recent 10 transactions
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: { status: TransactionStatus.SUCCESS },
      select: {
        id: true, type: true, amount: true, status: true,
        createdAt: true, payoutMode: true,
        user: { select: { name: true, role: true } },
      },
    }),

    // Users by role breakdown
    (prisma.user.groupBy({
      by: ['role'],
      _count: true,
      where: userScope as any,
    }) as any),

    // Daily volume — last 30 days
prisma.$queryRaw<Array<{ date: string; credit: bigint; debit: bigint; count: bigint }>>`
  SELECT
    DATE(createdAt) AS date,
    SUM(CASE WHEN type = 'PAY_IN' THEN amount ELSE 0 END) AS credit,
    SUM(CASE WHEN type = 'PAY_OUT' THEN amount ELSE 0 END) AS debit,
    COUNT(*) AS count
  FROM \`Transaction\`
  WHERE createdAt >= NOW() - INTERVAL 30 DAY
    AND status = 'SUCCESS'
  GROUP BY DATE(createdAt)
  ORDER BY date ASC
`,
  ]);

  const thisMonthVol = Number(monthVolume._sum.amount ?? 0n) / 100;
  const lastMonthVol = Number(lastMonthVolume._sum.amount ?? 0n) / 100;
  const volumeChange = lastMonthVol > 0 ? ((thisMonthVol - lastMonthVol) / lastMonthVol) * 100 : 0;

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
    },
    kyc: { pending: pendingKyc, approved: approvedKyc },
    transactions: {
      todayCount: todayTxCount,
      todayVolume: Number(todayVolume._sum.amount ?? 0n) / 100,
      monthCount: monthTxCount,
      monthVolume: thisMonthVol,
      volumeChange: parseFloat(volumeChange.toFixed(1)),
    },
    wallet: {
      totalPrimary: Number(totalWalletBalance._sum.primaryBalance ?? 0n) / 100,
      totalSecondary: Number(totalWalletBalance._sum.secondaryBalance ?? 0n) / 100,
    },
    recent: recentTransactions.map((t) => ({
      ...t, amount: Number(t.amount) / 100,
    })),
    chart: {
      daily: dailyVolume.map((d) => ({
        date: d.date,
        credit: Number(d.credit) / 100,
        debit: Number(d.debit) / 100,
        count: Number(d.count),
      })),
    },
  };
};

// ─── Audit log viewer ────────────────────────────────────────────────────────
export const getAuditLogs = async (page = 1, limit = 30, action?: string) => {
  const skip = (page - 1) * limit;
  const where = action ? { action: { contains: action } } : {};

  const [logs, total] = await prisma.$transaction([
  prisma.auditLog.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.auditLog.count({ where }),
]);

  // Hydrate user names
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    logs: logs.map((l) => ({ ...l, user: l.userId ? userMap.get(l.userId) : null })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Transaction report ──────────────────────────────────────────────────────
export const getTransactionReport = async (from?: string, to?: string, type?: TransactionType) => {
  const where: any = {
    ...(from || to ? {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59') }),
      },
    } : {}),
    ...(type && { type }),
    status: TransactionStatus.SUCCESS,
  };

  const [byType, byStatus, totals] = await prisma.$transaction([
    (prisma.transaction.groupBy({
      by: ['type'],
      where: where as any,
      _sum: { amount: true },
      _count: true,
    }) as any),
    (prisma.transaction.groupBy({
      by: ['status'],
      _count: true,
      where: {
        ...(from || to ? { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to + 'T23:59:59') }) } } : {}),
      } as any,
    }) as any),
    prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    total: { amount: Number(totals._sum.amount ?? 0n) / 100, count: totals._count },
    byType: byType.map((t) => ({ type: t.type, count: t._count, amount: Number(t._sum.amount ?? 0n) / 100 })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
  };
};

// ─── System health check ─────────────────────────────────────────────────────
export const getSystemHealth = async () => {
  const start = Date.now();

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}

  const [pendingPayouts, failedPayouts, unprocessedWebhooks] = await prisma.$transaction([
    prisma.transaction.count({ where: { type: TransactionType.PAY_OUT, status: TransactionStatus.PENDING } }),
    prisma.transaction.count({ where: { type: TransactionType.PAY_OUT, status: TransactionStatus.FAILED } }),
    prisma.transaction.count({ where: { status: TransactionStatus.PENDING, type: TransactionType.PAY_IN } }),
  ]);

  return {
    status: dbOk ? 'healthy' : 'degraded',
    latency: Date.now() - start,
    db: dbOk,
    pendingPayouts,
    failedPayouts,
    unprocessedWebhooks,
    timestamp: new Date().toISOString(),
  };
};
