import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { debitWallet } from './wallet.service';

export interface ServicePayload {
  serviceType: string;
  amount: number;
  mobile?: string;
  accountNumber?: string;
  ifscCode?: string;
  beneficiaryName?: string;
  operatorCode?: string;
  billerName?: string;
  consumerNumber?: string;
  remarks?: string;
}

const validateMobile = (mobile?: string) => {
  if (!mobile || !/^\d{10}$/.test(mobile))
    throw new AppError('Valid 10-digit mobile number required', 400, 'INVALID_MOBILE');
};

const validateConsumer = (num?: string, label = 'Consumer number') => {
  if (!num || num.trim().length < 4)
    throw new AppError(`${label} is required`, 400, 'INVALID_CONSUMER');
};

export const processService = async (userId: string, payload: ServicePayload) => {
  const { serviceType, amount } = payload;
  const amountPaise = BigInt(Math.round(amount * 100));

  if (amount < 1)      throw new AppError('Minimum amount is ₹1', 400, 'MIN_AMOUNT');
  if (amount > 100000) throw new AppError('Maximum amount is ₹1,00,000', 400, 'MAX_AMOUNT');

  switch (serviceType) {
    case 'RECHARGE':
    case 'DTH':
    case 'AEPS':
      validateMobile(payload.mobile);
      break;
    case 'DMT':
      validateMobile(payload.mobile);
      if (!payload.accountNumber) throw new AppError('Account number is required', 400, 'MISSING_ACCOUNT');
      if (!payload.ifscCode)      throw new AppError('IFSC code is required', 400, 'MISSING_IFSC');
      if (!payload.beneficiaryName) throw new AppError('Beneficiary name is required', 400, 'MISSING_BENE');
      break;
    case 'BBPS':
    case 'ELECTRICITY':
    case 'WATER':
    case 'GAS':
    case 'CC_BILL':
    case 'EDUCATION':
    case 'INSURANCE':
      validateConsumer(payload.consumerNumber);
      break;
    case 'FASTAG':
      validateConsumer(payload.consumerNumber, 'Vehicle number');
      break;
  }

  const descMap: Record<string, string> = {
    RECHARGE:    `Mobile Recharge - ${payload.mobile} (${payload.operatorCode || 'N/A'})`,
    DTH:         `DTH Recharge - ${payload.mobile} (${payload.operatorCode || 'N/A'})`,
    BBPS:        `BBPS Bill Payment - ${payload.billerName} - ${payload.consumerNumber}`,
    ELECTRICITY: `Electricity Bill - ${payload.billerName} - ${payload.consumerNumber}`,
    WATER:       `Water Bill - ${payload.billerName} - ${payload.consumerNumber}`,
    GAS:         `Gas Bill - ${payload.billerName} - ${payload.consumerNumber}`,
    DMT:         `Money Transfer to ${payload.beneficiaryName} - A/C ${payload.accountNumber}`,
    FASTAG:      `FASTag Recharge - ${payload.consumerNumber}`,
    CC_BILL:     `Credit Card Bill - ${payload.consumerNumber}`,
    EDUCATION:   `Education Fee - ${payload.consumerNumber}`,
    INSURANCE:   `Insurance Payment - ${payload.consumerNumber}`,
    AEPS:        `AEPS Cash - ${payload.mobile}`,
    BUS:         `Bus Booking - ${payload.remarks || ''}`,
    FLIGHT:      `Flight Booking - ${payload.remarks || ''}`,
    RAIL:        `Rail Ticket - ${payload.consumerNumber || ''}`,
    HOTEL:       `Hotel Booking - ${payload.remarks || ''}`,
  };
  const description = descMap[serviceType] || `${serviceType} - ${payload.remarks || 'Service payment'}`;

  // Create transaction record
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type:      TransactionType.PAY_OUT,
      status:    TransactionStatus.PENDING,
      amount:    amountPaise,
      fee:       0n,
      netAmount: amountPaise,
      description,
      metadata: { ...payload, processedAt: new Date().toISOString() } as Prisma.InputJsonValue,
    },
  });

  try {
    await debitWallet(userId, amountPaise, description, `SVC-${serviceType}-${Date.now()}`, transaction.id);

    await prisma.transaction.update({
      where: { id: transaction.id },
      data:  { status: TransactionStatus.SUCCESS },
    });

    

    // Distribute commissions — don't fail main transaction if this errors
    try {
      // Correct import - note the full path
      const { distributeCommissions } = await import('./commission.service.js');
      await distributeCommissions(userId, transaction.id, amount, serviceType);
    } catch { /* commission failure is non-fatal */ }

    return {
      transactionId: transaction.id,
      status:        'SUCCESS',
      amount,
      description,
      message:       `${serviceType} processed successfully`,
    };
  } catch (err) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data:  { status: TransactionStatus.FAILED, failureReason: (err as Error).message },
    });
    throw err;
  }
};

export const getServiceHistory = async (userId: string, serviceType?: string, page = 1, limit = 20) => {
  const skip  = (page - 1) * limit;
  const where: Prisma.TransactionWhereInput = {
    userId,
    type: TransactionType.PAY_OUT,
    description: { not: undefined },
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, status: true, description: true, metadata: true, createdAt: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  
  return {
    transactions: transactions.map(t => ({ ...t, amount: Number(t.amount) / 100 })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};