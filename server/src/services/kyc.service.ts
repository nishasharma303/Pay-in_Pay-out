import { Prisma } from '@prisma/client';
import { KycStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';

export const submitKyc = async (
  userId: string,
  data: {
    panNumber?: string; aadhaarNumber?: string;
    bankName?: string; accountNumber?: string;
    ifscCode?: string; accountHolder?: string;
    panImageUrl?: string; aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string; selfieUrl?: string;
  }
) => {
  const existing = await prisma.kycDetail.findUnique({ where: { userId } });
  if (existing?.status === KycStatus.APPROVED)
    throw new AppError('KYC already approved. Contact support to update.', 409, 'KYC_ALREADY_APPROVED');

  const maskedAadhaar = data.aadhaarNumber
    ? 'XXXX-XXXX-' + data.aadhaarNumber.replace(/\s/g, '').slice(-4)
    : undefined;

  const kyc = await prisma.kycDetail.upsert({
    where: { userId },
    create: { userId, ...data, aadhaarNumber: maskedAadhaar, status: KycStatus.PENDING },
    update: { ...data, aadhaarNumber: maskedAadhaar, status: KycStatus.PENDING, reviewNote: null, reviewedAt: null, reviewedById: null },
  });

  // Audit log separately — not inside a transaction to avoid timeout
  await prisma.auditLog.create({
    data: {
      userId, action: 'KYC_SUBMITTED', entity: 'KycDetail', entityId: kyc.id,
      metadata: { fields: Object.keys(data).filter(k => !!data[k as keyof typeof data]) } as Prisma.InputJsonValue,
    },
  });

  return kyc;
};

export const getMyKyc = async (userId: string) => {
  return prisma.kycDetail.findUnique({ where: { userId } });
};

export const listKycSubmissions = async (params: { status?: KycStatus; page: number; limit: number }) => {
  const skip = (params.page - 1) * params.limit;
  const where: Prisma.KycDetailWhereInput = params.status ? { status: params.status } : {};

  const [kycs, total] = await Promise.all([
    prisma.kycDetail.findMany({
      where, skip, take: params.limit, orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
    }),
    prisma.kycDetail.count({ where }),
  ]);

  return {
    kycs,
    meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
  };
};

export const getKycById = async (kycId: string) => {
  const kyc = await prisma.kycDetail.findUnique({
    where: { id: kycId },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
  });
  if (!kyc) throw new AppError('KYC record not found', 404, 'NOT_FOUND');
  return kyc;
};

export const reviewKyc = async (
  kycId: string, reviewerId: string,
  status: 'APPROVED' | 'REJECTED',
  reviewNote?: string
) => {
  const kyc = await prisma.kycDetail.findUnique({ where: { id: kycId } });
  if (!kyc) throw new AppError('KYC record not found', 404, 'NOT_FOUND');
  if (kyc.status !== KycStatus.PENDING)
    throw new AppError(`KYC is already ${kyc.status.toLowerCase()}.`, 409, 'KYC_NOT_PENDING');

  // Step 1: Update KYC status
  const updatedKyc = await prisma.kycDetail.update({
    where: { id: kycId },
    data: { status, reviewNote: reviewNote || null, reviewedAt: new Date(), reviewedById: reviewerId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Step 2: If approved, verify the user
  if (status === KycStatus.APPROVED) {
    await prisma.user.update({ where: { id: kyc.userId }, data: { isVerified: true } });
  }

  // Step 3: Audit log — separate operation, not in a transaction
  await prisma.auditLog.create({
    data: {
      userId: reviewerId, action: `KYC_${status}`,
      entity: 'KycDetail', entityId: kycId,
      metadata: { targetUserId: kyc.userId, reviewNote } as Prisma.InputJsonValue,
    },
  });

  return updatedKyc;
};

export const getKycStats = async () => {
  const [pending, approved, rejected, total] = await Promise.all([
    prisma.kycDetail.count({ where: { status: KycStatus.PENDING } }),
    prisma.kycDetail.count({ where: { status: KycStatus.APPROVED } }),
    prisma.kycDetail.count({ where: { status: KycStatus.REJECTED } }),
    prisma.kycDetail.count(),
  ]);
  return { pending, approved, rejected, total };
};