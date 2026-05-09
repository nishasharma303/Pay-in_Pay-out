/**
 * User Hierarchy Management Service
 * Handles creation of users across the hierarchy with proper validation
 */

import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error';
import { z } from 'zod';

// Validation schemas for each role
const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).regex(/^\d+$/, 'Phone must contain only digits'),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and numbers'),
});

const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).regex(/^\d+$/, 'Phone must contain only digits'),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and numbers'),
});

const createAgentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).regex(/^\d+$/, 'Phone must contain only digits'),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and numbers'),
});

/**
 * SUPER_ADMIN creates ADMIN
 */
export const createAdmin = async (
  data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  },
  superAdminId: string
) => {
  // Validate input
  const validatedData = createAdminSchema.parse(data);

  // Check if creator is SUPER_ADMIN
  const creator = await prisma.user.findUnique({
    where: { id: superAdminId },
    select: { role: true },
  });

  if (creator?.role !== Role.SUPER_ADMIN) {
    throw new AppError(
      'Only SUPER_ADMIN can create ADMIN users',
      403,
      'FORBIDDEN'
    );
  }

  // Check for duplicate email/phone
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: validatedData.email }, { phone: validatedData.phone }],
    },
  });

  if (existing) {
    throw new AppError(
      existing.email === validatedData.email
        ? 'Email already registered'
        : 'Phone already registered',
      409,
      'DUPLICATE_USER'
    );
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(validatedData.password, 10);

  const admin = await prisma.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      passwordHash,
      role: Role.ADMIN,
      parentId: superAdminId,
      wallet: {
        create: { primaryBalance: 0n, secondaryBalance: 0n, holdBalance: 0n },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: superAdminId,
      action: 'ADMIN_CREATED',
      entity: 'User',
      entityId: admin.id,
      metadata: { role: Role.ADMIN },
    },
  });

  return admin;
};

/**
 * ADMIN creates CLIENT
 */
export const createClient = async (
  data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  },
  adminId: string
) => {
  // Validate input
  const validatedData = createClientSchema.parse(data);

  // Check if creator is ADMIN or SUPER_ADMIN
  const creator = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });

  if (creator?.role !== Role.ADMIN && creator?.role !== Role.SUPER_ADMIN) {
    throw new AppError(
      'Only ADMIN (or higher) can create CLIENT users',
      403,
      'FORBIDDEN'
    );
  }

  // Check for duplicate email/phone
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: validatedData.email }, { phone: validatedData.phone }],
    },
  });

  if (existing) {
    throw new AppError(
      existing.email === validatedData.email
        ? 'Email already registered'
        : 'Phone already registered',
      409,
      'DUPLICATE_USER'
    );
  }

  // Create client user
  const passwordHash = await bcrypt.hash(validatedData.password, 10);

  const client = await prisma.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      passwordHash,
      role: Role.CLIENT,
      parentId: adminId,
      wallet: {
        create: { primaryBalance: 0n, secondaryBalance: 0n, holdBalance: 0n },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: 'CLIENT_CREATED',
      entity: 'User',
      entityId: client.id,
      metadata: { role: Role.CLIENT },
    },
  });

  return client;
};

/**
 * CLIENT creates AGENT
 */
export const createAgent = async (
  data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  },
  clientId: string
) => {
  // Validate input
  const validatedData = createAgentSchema.parse(data);

  // Check if creator is CLIENT (or higher)
  const creator = await prisma.user.findUnique({
    where: { id: clientId },
    select: { role: true },
  });

  if (!creator || creator.role === Role.AGENT) {
    throw new AppError(
      'Only CLIENT (or higher) can create AGENT users',
      403,
      'FORBIDDEN'
    );
  }

  // Check for duplicate email/phone
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: validatedData.email }, { phone: validatedData.phone }],
    },
  });

  if (existing) {
    throw new AppError(
      existing.email === validatedData.email
        ? 'Email already registered'
        : 'Phone already registered',
      409,
      'DUPLICATE_USER'
    );
  }

  // Create agent user
  const passwordHash = await bcrypt.hash(validatedData.password, 10);

  const agent = await prisma.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      passwordHash,
      role: Role.AGENT,
      parentId: clientId,
      wallet: {
        create: { primaryBalance: 0n, secondaryBalance: 0n, holdBalance: 0n },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: clientId,
      action: 'AGENT_CREATED',
      entity: 'User',
      entityId: agent.id,
      metadata: { role: Role.AGENT },
    },
  });

  return agent;
};
