import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@payflow.com' },
    update: {},
    create: {
      email: 'superadmin@payflow.com',
      name: 'Super Admin',
      phone: '9000000001',
      passwordHash: await hash('SuperAdmin@123'),
      role: Role.SUPER_ADMIN,
      isActive: true,
      isVerified: true,
      wallet: { create: { primaryBalance: 10000000n, secondaryBalance: 0n } }, // ₹1,00,000
    },
  });

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@payflow.com' },
    update: {},
    create: {
      email: 'admin@payflow.com',
      name: 'Rohit Kumar Banka',
      phone: '9000000002',
      passwordHash: await hash('Admin@123'),
      role: Role.ADMIN,
      isActive: true,
      isVerified: true,
      parentId: superAdmin.id,
      wallet: { create: { primaryBalance: 90786n, secondaryBalance: 1957947n } }, // ₹907.86 primary
    },
  });

  // Client
  const client = await prisma.user.upsert({
    where: { email: 'client@payflow.com' },
    update: {},
    create: {
      email: 'client@payflow.com',
      name: 'Priya Sharma',
      phone: '9000000003',
      passwordHash: await hash('Client@123'),
      role: Role.CLIENT,
      isActive: true,
      isVerified: true,
      parentId: admin.id,
      wallet: { create: { primaryBalance: 500000n, secondaryBalance: 0n } },
    },
  });

  // Agent
  await prisma.user.upsert({
    where: { email: 'agent@payflow.com' },
    update: {},
    create: {
      email: 'agent@payflow.com',
      name: 'Amit Singh',
      phone: '9000000004',
      passwordHash: await hash('Agent@123'),
      role: Role.AGENT,
      isActive: true,
      isVerified: false,
      parentId: client.id,
      wallet: { create: { primaryBalance: 25000n, secondaryBalance: 0n } },
    },
  });

  // Commission Rules
  const rules = [
    { role: Role.SUPER_ADMIN, serviceType: 'AEPS', isPercentage: true, value: 0.1 },
    { role: Role.ADMIN, serviceType: 'AEPS', isPercentage: true, value: 0.3 },
    { role: Role.CLIENT, serviceType: 'AEPS', isPercentage: true, value: 0.5 },
    { role: Role.SUPER_ADMIN, serviceType: 'BBPS', isPercentage: false, value: 2 },
    { role: Role.ADMIN, serviceType: 'BBPS', isPercentage: false, value: 3 },
    { role: Role.CLIENT, serviceType: 'BBPS', isPercentage: false, value: 5 },
    { role: Role.SUPER_ADMIN, serviceType: 'DMT', isPercentage: true, value: 0.05 },
    { role: Role.ADMIN, serviceType: 'DMT', isPercentage: true, value: 0.1 },
    { role: Role.CLIENT, serviceType: 'DMT', isPercentage: true, value: 0.2 },
  ];

  for (const rule of rules) {
    await prisma.commissionRule.upsert({
      where: { role_serviceType: { role: rule.role, serviceType: rule.serviceType } },
      update: {},
      create: rule,
    });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Super Admin: superadmin@payflow.com / SuperAdmin@123');
  console.log('  Admin:       admin@payflow.com / Admin@123');
  console.log('  Client:      client@payflow.com / Client@123');
  console.log('  Agent:       agent@payflow.com / Agent@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
