import Razorpay from 'razorpay';
import crypto from 'crypto';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { creditWallet } from './wallet.service';

// ─── Lazily init Razorpay (no crash if env not set) ──────────────────────────
let rzp: Razorpay | null = null;
const getRazorpay = () => {
  if (rzp) return rzp;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env', 503, 'RAZORPAY_NOT_CONFIGURED');
  }
  rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  return rzp;
};

// ─── Create a Razorpay order ──────────────────────────────────────────────────
export const createPayInOrder = async (userId: string, amountRupees: number, description?: string) => {
  if (amountRupees < 1) throw new AppError('Minimum amount is ₹1', 400, 'MIN_AMOUNT');
  if (amountRupees > 500000) throw new AppError('Maximum amount is ₹5,00,000', 400, 'MAX_AMOUNT');

  const amountPaise = Math.round(amountRupees * 100);
  const razorpay = getRazorpay();

  // Create order in Razorpay
  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `pf_${userId.slice(-8)}_${Date.now()}`,
    notes: { userId, description: description || 'PayFlow Pay-In' },
  });

  // Create transaction record in our DB
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: TransactionType.PAY_IN,
      status: TransactionStatus.INITIATED,
      amount: BigInt(amountPaise),
      fee: 0n,
      netAmount: BigInt(amountPaise),
      gatewayOrderId: rzpOrder.id,
      description: description || 'Pay-In via Razorpay',
    },
  });

  return {
    transaction: {
      ...transaction,
      amount: Number(transaction.amount) / 100,
      fee: Number(transaction.fee) / 100,
      netAmount: Number(transaction.netAmount) / 100,
    },
    order: {
      id: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  };
};

// ─── Verify payment signature (called after user completes payment) ────────────
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
};

// ─── Confirm payment & credit wallet ─────────────────────────────────────────
export const confirmPayment = async (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  // 1. Find the transaction
  const transaction = await prisma.transaction.findFirst({ where: { gatewayOrderId: orderId } });
  if (!transaction) throw new AppError('Transaction not found', 404, 'NOT_FOUND');
  if (transaction.status === TransactionStatus.SUCCESS) {
    return {
      message: 'Already processed',
      amount: Number(transaction.amount) / 100,
      newBalance: 0,
    };
  }

  // 2. Verify signature
  const isValid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!isValid) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.FAILED, failureReason: 'Invalid signature', gatewayPaymentId: paymentId },
    });
    throw new AppError('Payment signature verification failed', 400, 'INVALID_SIGNATURE');
  }

  // 3. Credit wallet + update transaction atomically
  const walletResult = await creditWallet(
    transaction.userId,
    transaction.amount,
    `Pay-In via Razorpay`,
    orderId,
    transaction.id,
    { paymentId, orderId }
  );

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.SUCCESS,
      gatewayPaymentId: paymentId,
      gatewayRef: signature,
    },
  });

  return {
    message: 'Payment confirmed',
    amount: Number(transaction.amount) / 100,
    newBalance: Number(walletResult.newBalance) / 100,
  };
};

// ─── Webhook handler (async updates from Razorpay) ───────────────────────────
export const handleWebhook = async (rawBody: string, signature: string) => {
  // 1. Verify webhook signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (expectedSig !== signature) {
    throw new AppError('Invalid webhook signature', 401, 'INVALID_WEBHOOK_SIG');
  }

  const event = JSON.parse(rawBody);
  const eventId = event.id;

  // 2. Idempotency — skip if already processed
  const existing = await prisma.transaction.findFirst({ where: { webhookEventId: eventId } });
  if (existing) return { message: 'Already processed', eventId };

  const entity = event.payload?.payment?.entity;
  if (!entity) return { message: 'No payment entity', eventId };

  const orderId = entity.order_id;
  const paymentId = entity.id;

  // 3. Find our transaction
  const transaction = await prisma.transaction.findFirst({ where: { gatewayOrderId: orderId } });
  if (!transaction) return { message: 'Transaction not found', eventId };

  if (event.event === 'payment.captured') {
    // Already SUCCESS — just update webhookEventId
    if (transaction.status === TransactionStatus.SUCCESS) {
      await prisma.transaction.update({ where: { id: transaction.id }, data: { webhookEventId: eventId } });
      return { message: 'Already credited', eventId };
    }

    // Credit wallet
    await creditWallet(transaction.userId, transaction.amount, 'Pay-In via Razorpay (webhook)', orderId, transaction.id, { paymentId });
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.SUCCESS, gatewayPaymentId: paymentId, webhookEventId: eventId },
    });

  } else if (event.event === 'payment.failed') {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        gatewayPaymentId: paymentId,
        webhookEventId: eventId,
        failureReason: entity.error_description || 'Payment failed',
      },
    });
  }

  return { message: `Handled: ${event.event}`, eventId };
};

// ─── List user's pay-in transactions ─────────────────────────────────────────
export const getPayInHistory = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const where = { userId, type: TransactionType.PAY_IN };

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, status: true, gatewayOrderId: true, gatewayPaymentId: true, description: true, createdAt: true, updatedAt: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) / 100 })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};