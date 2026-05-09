import { LedgerEntryType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { getPaginationParams } from '../utils/response';

// Helper to cast metadata - Prisma JSON type is strict
const toJson = (v: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined =>
  v === undefined ? undefined : (v as Prisma.InputJsonValue);

export const creditWallet = async (
  userId: string, amountPaise: bigint, description: string,
  referenceId?: string, transactionId?: string, metadata?: Record<string, unknown>
) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.$queryRaw<Array<{ id: string; primaryBalance: bigint }>>`
      SELECT id, \`primaryBalance\` FROM \`Wallet\` WHERE \`userId\` = ${userId} FOR UPDATE`;
    if (!wallet[0]) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
    const newBalance = wallet[0].primaryBalance + amountPaise;
    await tx.wallet.update({ where: { userId }, data: { primaryBalance: newBalance } });
    const entry = await tx.ledgerEntry.create({
      data: {
        walletId: wallet[0].id, type: LedgerEntryType.CREDIT,
        amount: amountPaise, balanceAfter: newBalance,
        description, referenceId, transactionId,
        metadata: toJson(metadata),
      },
    });
    return { entry, newBalance };
  });
};

export const debitWallet = async (
  userId: string, amountPaise: bigint, description: string,
  referenceId?: string, transactionId?: string, metadata?: Record<string, unknown>
) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.$queryRaw<Array<{ id: string; primaryBalance: bigint }>>`
      SELECT id, \`primaryBalance\` FROM \`Wallet\` WHERE \`userId\` = ${userId} FOR UPDATE`;
    if (!wallet[0]) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
    if (wallet[0].primaryBalance < amountPaise) {
      throw new AppError(
        `Insufficient balance. Available: ₹${(Number(wallet[0].primaryBalance) / 100).toFixed(2)}`,
        400, 'INSUFFICIENT_BALANCE'
      );
    }
    const newBalance = wallet[0].primaryBalance - amountPaise;
    await tx.wallet.update({ where: { userId }, data: { primaryBalance: newBalance } });
    const entry = await tx.ledgerEntry.create({
      data: {
        walletId: wallet[0].id, type: LedgerEntryType.DEBIT,
        amount: amountPaise, balanceAfter: newBalance,
        description, referenceId, transactionId,
        metadata: toJson(metadata),
      },
    });
    return { entry, newBalance };
  });
};

export const holdBalance = async (userId: string, amountPaise: bigint, reason: string) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.$queryRaw<Array<{ id: string; primaryBalance: bigint; holdBalance: bigint }>>`
      SELECT id, \`primaryBalance\`, \`holdBalance\` FROM \`Wallet\` WHERE \`userId\` = ${userId} FOR UPDATE`;
    if (!wallet[0]) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
    if (wallet[0].primaryBalance < amountPaise)
      throw new AppError('Insufficient balance to hold', 400, 'INSUFFICIENT_BALANCE');
    const newPrimary = wallet[0].primaryBalance - amountPaise;
    const newHold    = wallet[0].holdBalance    + amountPaise;
    await tx.wallet.update({ where: { userId }, data: { primaryBalance: newPrimary, holdBalance: newHold } });
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet[0].id, type: LedgerEntryType.DEBIT,
        amount: amountPaise, balanceAfter: newPrimary,
        description: `Hold: ${reason}`,
        metadata: { type: 'HOLD' } as Prisma.InputJsonValue,
      },
    });
    return { primaryBalance: Number(newPrimary) / 100, holdBalance: Number(newHold) / 100 };
  });
};

export const releaseHold = async (userId: string, amountPaise: bigint, creditBack: boolean, reason: string) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.$queryRaw<Array<{ id: string; primaryBalance: bigint; holdBalance: bigint }>>`
      SELECT id, \`primaryBalance\`, \`holdBalance\` FROM \`Wallet\` WHERE \`userId\` = ${userId} FOR UPDATE`;
    if (!wallet[0]) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
    const newHold    = wallet[0].holdBalance - amountPaise < 0n ? 0n : wallet[0].holdBalance - amountPaise;
    const newPrimary = creditBack ? wallet[0].primaryBalance + amountPaise : wallet[0].primaryBalance;
    await tx.wallet.update({ where: { userId }, data: { primaryBalance: newPrimary, holdBalance: newHold } });
    if (creditBack) {
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet[0].id, type: LedgerEntryType.CREDIT,
          amount: amountPaise, balanceAfter: newPrimary,
          description: `Hold released: ${reason}`,
          metadata: { type: 'HOLD_RELEASE' } as Prisma.InputJsonValue,
        },
      });
    }
    return { primaryBalance: Number(newPrimary) / 100, holdBalance: Number(newHold) / 100 };
  });
};

export const transferSecondaryToPrimary = async (userId: string, amountPaise: bigint) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.$queryRaw<Array<{ id: string; primaryBalance: bigint; secondaryBalance: bigint }>>`
      SELECT id, \`primaryBalance\`, \`secondaryBalance\` FROM \`Wallet\` WHERE \`userId\` = ${userId} FOR UPDATE`;
    if (!wallet[0]) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
    if (wallet[0].secondaryBalance < amountPaise)
      throw new AppError(
        `Insufficient secondary balance. Available: ₹${(Number(wallet[0].secondaryBalance) / 100).toFixed(2)}`,
        400, 'INSUFFICIENT_SECONDARY'
      );
    const newPrimary   = wallet[0].primaryBalance   + amountPaise;
    const newSecondary = wallet[0].secondaryBalance - amountPaise;
    await tx.wallet.update({ where: { userId }, data: { primaryBalance: newPrimary, secondaryBalance: newSecondary } });
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet[0].id, type: LedgerEntryType.CREDIT,
        amount: amountPaise, balanceAfter: newPrimary,
        description: 'Balance Transferred from Secondary Wallet',
        metadata: { type: 'SECONDARY_TRANSFER' } as Prisma.InputJsonValue,
      },
    });
    return { primaryBalance: Number(newPrimary) / 100, secondaryBalance: Number(newSecondary) / 100 };
  });
};

// Rest of the file remains the same (adminTopUp, getWalletBalance, getLedger, etc.)
export const adminTopUp = async (targetUserId: string, adminId: string, amountPaise: bigint, note?: string) => {
  const result = await creditWallet(
    targetUserId, amountPaise,
    `Admin Top-Up${note ? `: ${note}` : ''}`,
    `ADMIN-${adminId}-${Date.now()}`,
    undefined,
    { adminId, note: note || '', type: 'ADMIN_TOPUP' }
  );
  await prisma.auditLog.create({
    data: { userId: adminId, action: 'ADMIN_WALLET_TOPUP', entity: 'Wallet', entityId: targetUserId, metadata: { amount: Number(amountPaise) / 100, note } as Prisma.InputJsonValue },
  });
  return result;
};

export const getWalletBalance = async (userId: string) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { primaryBalance: true, secondaryBalance: true, holdBalance: true },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  return {
    primaryBalance:   Number(wallet.primaryBalance)   / 100,
    secondaryBalance: Number(wallet.secondaryBalance) / 100,
    holdBalance:      Number(wallet.holdBalance)      / 100,
    totalBalance:     Number(wallet.primaryBalance + wallet.secondaryBalance) / 100,
  };
};

export const getLedger = async (
  userId: string,
  query: { page?: string; limit?: string; type?: string; from?: string; to?: string }
) => {
  const { page, limit, skip } = getPaginationParams(query);
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
  if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  const where: Prisma.LedgerEntryWhereInput = {
    walletId: wallet.id,
    ...(query.type && { type: query.type as LedgerEntryType }),
    ...((query.from || query.to) && {
      createdAt: {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to   && { lte: new Date(query.to + 'T23:59:59') }),
      },
    }),
  };
  const [entries, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, amount: true, balanceAfter: true, description: true, referenceId: true, metadata: true, createdAt: true },
    }),
    prisma.ledgerEntry.count({ where }),
  ]);
  return {
    entries: entries.map(e => ({ ...e, amount: Number(e.amount) / 100, balanceAfter: Number(e.balanceAfter) / 100 })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const exportLedgerCsv = async (userId: string, from?: string, to?: string) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
  if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      walletId: wallet.id,
      ...((from || to) && { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to + 'T23:59:59') }) } }),
    },
    orderBy: { createdAt: 'asc' },
  });
  const header = 'Date,Time,Description,Reference,Type,Amount (INR),Balance After (INR)\n';
  const rows = entries.map(e => {
    const d = new Date(e.createdAt);
    return `${d.toLocaleDateString('en-IN')},${d.toLocaleTimeString('en-IN', { hour12: false })},"${e.description.replace(/"/g, '""')}",${e.referenceId || ''},${e.type},${(Number(e.amount) / 100).toFixed(2)},${(Number(e.balanceAfter) / 100).toFixed(2)}`;
  }).join('\n');
  return header + rows;
};

export const getWalletAnalytics = async (userId: string, days = 30) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
  if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  const from = new Date();
  from.setDate(from.getDate() - days);
  const entries = await prisma.ledgerEntry.findMany({
    where: { walletId: wallet.id, createdAt: { gte: from } },
    select: { type: true, amount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const byDate: Record<string, { credit: number; debit: number; date: string }> = {};
  entries.forEach(e => {
    const key = e.createdAt.toISOString().split('T')[0];
    if (!byDate[key]) byDate[key] = { credit: 0, debit: 0, date: key };
    const amt = Number(e.amount) / 100;
    if (e.type === LedgerEntryType.CREDIT) byDate[key].credit += amt;
    else byDate[key].debit += amt;
  });
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push(byDate[key] || { date: key, credit: 0, debit: 0 });
  }
  const totalCredit = entries.filter(e => e.type === LedgerEntryType.CREDIT).reduce((s, e) => s + Number(e.amount), 0) / 100;
  const totalDebit  = entries.filter(e => e.type === LedgerEntryType.DEBIT).reduce((s, e)  => s + Number(e.amount), 0) / 100;
  return { daily: result, totalCredit, totalDebit, days };
};