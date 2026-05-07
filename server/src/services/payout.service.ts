import crypto from 'crypto';
import { TransactionStatus, TransactionType, PayoutMode } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { holdBalance, releaseHold, creditWallet } from './wallet.service';
import { getPaginationParams } from '../utils/response';

// ─── Cashfree API base URL ────────────────────────────────────────────────────
const CF_BASE = process.env.CASHFREE_ENV === 'PROD'
  ? 'https://api.cashfree.com'
  : 'https://sandbox.cashfree.com';

// Define types for Cashfree responses
interface CashfreeResponse {
  transfer_id?: string;
  referenceId?: string;
  transfer_status?: string;
  beneficiary_name?: string;
  message?: string;
  [key: string]: any;
}

// ─── Cashfree API helper ──────────────────────────────────────────────────────
const cfRequest = async (method: string, path: string, body?: object): Promise<CashfreeResponse> => {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    throw new AppError('Cashfree not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env', 503, 'CASHFREE_NOT_CONFIGURED');
  }

  const res = await fetch(`${CF_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.CASHFREE_APP_ID!,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
      'x-api-version': '2024-01-01',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const data = await res.json() as CashfreeResponse;
  }
  return data as CashfreeResponse;
};

// ─── Validate IFSC code format ────────────────────────────────────────────────
const isValidIfsc = (code: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code);
const isValidUpi = (id: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(id);

// ─── Initiate a Payout ────────────────────────────────────────────────────────
export const initiatePayout = async (
  userId: string,
  payload: {
    amount: number;
    mode: PayoutMode;
    beneficiaryName: string;
    // Bank transfer fields
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    // UPI fields
    upiId?: string;
    // Optional
    remarks?: string;
  }
) => {
  const { amount, mode, beneficiaryName, accountNumber, ifscCode, bankName, upiId, remarks } = payload;
  const amountPaise = BigInt(Math.round(amount * 100));

  // ── Validate inputs ──
  if (amount < 1) throw new AppError('Minimum payout amount is ₹1', 400, 'MIN_AMOUNT');
  if (amount > 200000) throw new AppError('Maximum payout amount is ₹2,00,000 per transaction', 400, 'MAX_AMOUNT');

  if (mode === PayoutMode.UPI) {
    if (!upiId) throw new AppError('UPI ID is required for UPI payout', 400, 'MISSING_UPI');
    if (!isValidUpi(upiId)) throw new AppError('Invalid UPI ID format', 400, 'INVALID_UPI');
  } else {
    if (!accountNumber) throw new AppError('Account number is required', 400, 'MISSING_ACCOUNT');
    if (!ifscCode) throw new AppError('IFSC code is required', 400, 'MISSING_IFSC');
    if (!isValidIfsc(ifscCode)) throw new AppError('Invalid IFSC code format (e.g. SBIN0001234)', 400, 'INVALID_IFSC');
  }

  // ── Step 1: Hold balance to prevent concurrent double-spend ──
  await holdBalance(userId, amountPaise, `Payout to ${beneficiaryName}`);

  // ── Step 2: Create transaction record ──
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: TransactionType.PAY_OUT,
      status: TransactionStatus.PENDING,
      amount: amountPaise,
      fee: 0n,
      netAmount: amountPaise,
      payoutMode: mode,
      beneficiaryName,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      upiId: upiId || null,
      description: remarks || `Payout via ${mode}`,
    },
  });

  try {
    // ── Step 3: Call Cashfree API ──
    const cfPayload = mode === PayoutMode.UPI
      ? {
          transfer_id: transaction.id,
          transfer_amount: amount,
          transfer_currency: 'INR',
          transfer_mode: 'upi',
          transfer_remarks: remarks || 'PayFlow payout',
          beneficiary_details: {
            beneficiary_id: `BEN_${userId.slice(-8)}_${Date.now()}`,
            beneficiary_name: beneficiaryName,
            beneficiary_vpa: upiId,
          },
        }
      : {
          transfer_id: transaction.id,
          transfer_amount: amount,
          transfer_currency: 'INR',
          transfer_mode: mode === PayoutMode.IMPS ? 'imps' : 'neft',
          transfer_remarks: remarks || 'PayFlow payout',
          beneficiary_details: {
            beneficiary_id: `BEN_${userId.slice(-8)}_${Date.now()}`,
            beneficiary_name: beneficiaryName,
            beneficiary_account_number: accountNumber!,
            beneficiary_ifsc: ifscCode!,
          },
        };

    const cfResponse = await cfRequest('POST', '/payout/v1/transfers', cfPayload);

    // ── Step 4: Update transaction with gateway reference ──
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        gatewayRef: cfResponse.transfer_id || cfResponse.referenceId || null,
        status: TransactionStatus.PENDING,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYOUT_INITIATED',
        entity: 'Transaction',
        entityId: transaction.id,
        metadata: { amount, mode, beneficiaryName, cfResponse: JSON.stringify(cfResponse) } as any,
      },
    });

    return {
      transactionId: transaction.id,
      status: 'PENDING',
      amount,
      mode,
      message: `Payout of ₹${amount} initiated via ${mode}. Estimated: ${mode === PayoutMode.IMPS ? '30 seconds' : '2-4 hours'}`,
    };
  } catch (err) {
    // ── Rollback: release hold back to primary on API failure ──
    await releaseHold(userId, amountPaise, true, 'Payout API failed');
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        failureReason: (err as Error).message,
      },
    });
    throw err;
  }
};

// ─── Check payout status (poll or webhook update) ─────────────────────────────
export const checkPayoutStatus = async (transactionId: string) => {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

  // Already terminal — no need to call API
  const terminalStatuses: TransactionStatus[] = [TransactionStatus.SUCCESS, TransactionStatus.FAILED, TransactionStatus.REVERSED];
  if (terminalStatuses.includes(transaction.status)) {
    return transaction;
  }

  if (!transaction.gatewayRef) return transaction;

  try {
    const cfResponse = await cfRequest('GET', `/payout/v1/transfers/${transaction.gatewayRef}`);
    await updatePayoutStatus(transactionId, cfResponse.transfer_status || '', cfResponse);
  } catch {
    // Don't fail the request if status check fails — return current status
  }

  return prisma.transaction.findUnique({ where: { id: transactionId } });
};

// ─── Update payout status (called by webhook + polling) ──────────────────────
export const updatePayoutStatus = async (
  transactionId: string,
  cfStatus: string,
  metadata?: CashfreeResponse
) => {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return;
  
  const terminalStatuses: TransactionStatus[] = [TransactionStatus.SUCCESS, TransactionStatus.FAILED];
  if (terminalStatuses.includes(transaction.status)) return;

  const statusMap: Record<string, TransactionStatus> = {
    SUCCESS: TransactionStatus.SUCCESS,
    FAILED: TransactionStatus.FAILED,
    REVERSED: TransactionStatus.REVERSED,
    PENDING: TransactionStatus.PENDING,
    INITIATED: TransactionStatus.PENDING,
  };

  const newStatus = statusMap[cfStatus.toUpperCase()] || TransactionStatus.PENDING;

  if (newStatus === TransactionStatus.SUCCESS) {
    // Release hold (success = money is gone, don't credit back)
    await releaseHold(transaction.userId, transaction.amount, false, 'Payout successful');
    await prisma.transaction.update({ where: { id: transactionId }, data: { status: newStatus, metadata: metadata as any } });
  } else if (newStatus === TransactionStatus.FAILED || newStatus === TransactionStatus.REVERSED) {
    // Return held money back to primary
    await releaseHold(transaction.userId, transaction.amount, true, `Payout ${newStatus.toLowerCase()}`);
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: newStatus, failureReason: `Cashfree status: ${cfStatus}`, metadata: metadata as any },
    });
  } else {
    await prisma.transaction.update({ where: { id: transactionId }, data: { status: newStatus, metadata: metadata as any } });
  }
};

// ─── Retry a failed payout ────────────────────────────────────────────────────
export const retryPayout = async (transactionId: string, userId: string) => {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new AppError('Transaction not found', 404, 'NOT_FOUND');
  if (transaction.userId !== userId) throw new AppError('Not your transaction', 403, 'FORBIDDEN');
  if (transaction.status !== TransactionStatus.FAILED) throw new AppError('Only failed transactions can be retried', 400, 'NOT_FAILED');
  if (transaction.type !== TransactionType.PAY_OUT) throw new AppError('Only payout transactions can be retried', 400, 'WRONG_TYPE');

  return initiatePayout(userId, {
    amount: Number(transaction.amount) / 100,
    mode: transaction.payoutMode!,
    beneficiaryName: transaction.beneficiaryName!,
    accountNumber: transaction.accountNumber || undefined,
    ifscCode: transaction.ifscCode || undefined,
    upiId: transaction.upiId || undefined,
    remarks: `Retry: ${transaction.description}`,
  });
};

// ─── Webhook handler ─────────────────────────────────────────────────────────
export const handleWebhook = async (rawBody: string, signature: string, timestamp: string) => {
  // Verify Cashfree webhook signature
  const secret = process.env.CASHFREE_SECRET_KEY!;
  const signedPayload = `${timestamp}${rawBody}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');

  if (expectedSig !== signature) {
    throw new AppError('Invalid webhook signature', 401, 'INVALID_WEBHOOK_SIG');
  }

  const event = JSON.parse(rawBody);
  const { type, data } = event;

  if (!data?.transfer?.transfer_id) return { message: 'No transfer ID' };

  const transactionId = data.transfer.transfer_id;

  const statusEvents: Record<string, string> = {
    'TRANSFER_SUCCESS': 'SUCCESS',
    'TRANSFER_FAILED': 'FAILED',
    'TRANSFER_REVERSED': 'REVERSED',
  };

  const newStatus = statusEvents[type];
  if (newStatus) {
    await updatePayoutStatus(transactionId, newStatus, data);
  }

  return { message: `Handled: ${type}` };
};

// ─── Get payout history ───────────────────────────────────────────────────────
export const getPayOutHistory = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const where = { userId, type: TransactionType.PAY_OUT };

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, status: true, payoutMode: true,
        beneficiaryName: true, accountNumber: true, ifscCode: true,
        upiId: true, description: true, failureReason: true,
        gatewayRef: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) / 100 })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Verify UPI ID before payout ─────────────────────────────────────────────
export const verifyUpiId = async (upiId: string) => {
  if (!isValidUpi(upiId)) throw new AppError('Invalid UPI ID format', 400, 'INVALID_UPI');
  try {
    const result = await cfRequest('POST', '/payout/v1/validation/upiDetails', { vpa: upiId });
    return { valid: true, name: result.beneficiary_name, upiId };
  } catch {
    return { valid: false, name: null, upiId };
  }
};