# Deployment & Setup Guide

## Pre-Deployment Checklist

- [ ] Database backup created
- [ ] Environment variables configured
- [ ] Prisma schema reviewed
- [ ] Migration tested in development
- [ ] Initial SUPER_ADMIN created
- [ ] All tests passing
- [ ] Code reviewed

## Step 1: Database Migration

### Development Environment

```bash
cd server

# Install dependencies (if not already done)
npm install

# Run migration
npx prisma migrate dev

# Or, if using existing database:
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Production Environment

```bash
cd server

# Deploy migration (non-interactive)
npx prisma migrate deploy

# Verify migration applied
npx prisma db push --skip-generate
```

## Step 2: Create Initial SUPER_ADMIN

### Option A: Using Seed Script

Add to `server/prisma/seed.ts`:

```typescript
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if SUPER_ADMIN already exists
  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existing) {
    console.log('✅ SUPER_ADMIN already exists');
    return;
  }

  // Create SUPER_ADMIN
  const passwordHash = await bcrypt.hash('SuperAdminPass123', 10);
  
  const superAdmin = await prisma.user.create({
    data: {
      name: 'System Super Admin',
      email: 'superadmin@payflow.com',
      phone: '9999999999',
      passwordHash,
      role: Role.SUPER_ADMIN,
      createdById: null,
      wallet: {
        create: {
          primaryBalance: 0n,
          secondaryBalance: 0n,
          holdBalance: 0n,
        },
      },
    },
  });

  console.log('✅ SUPER_ADMIN created:', superAdmin.email);
  
  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: 'SYSTEM_SUPER_ADMIN_CREATED',
      entity: 'User',
      entityId: superAdmin.id,
    },
  });
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
npx prisma db seed
```

### Option B: Direct Database Insert

```sql
-- PostgreSQL
INSERT INTO "User" (
  id, email, phone, name, "passwordHash", role, 
  "isActive", "isVerified", "createdById", 
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'superadmin@payflow.com',
  '9999999999',
  'System Super Admin',
  '$2a$10$...', -- bcrypt hash of 'SuperAdminPass123'
  'SUPER_ADMIN',
  true,
  false,
  NULL,
  NOW(),
  NOW()
);
```

### Option C: Manual Creation via API (After Deployment)

If you have a temporary backdoor endpoint or direct DB access, create a SUPER_ADMIN user with `createdById = null`.

## Step 3: Build and Start Server

```bash
cd server

# Install dependencies
npm install

# Build TypeScript (if using compiled JS)
npm run build

# Start server
npm start
# or for development:
npm run dev
```

## Step 4: Verify Deployment

### Check Server Health

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-08T10:00:00.000Z",
  "env": "production"
}
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@payflow.com",
    "password": "SuperAdminPass123"
  }'
```

Should return accessToken and refreshToken.

### Test User Creation

```bash
curl -X POST http://localhost:5000/api/hierarchy/admins/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Admin",
    "email": "admin@test.com",
    "phone": "9876543210",
    "password": "AdminPass123"
  }'
```

Should return 201 with created admin.

## Step 5: Environment Variables

### Development (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/payflow_dev"

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"

# Server
PORT=5000
NODE_ENV="development"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# Payment Gateway (if used)
RAZORPAY_KEY_ID="your_razorpay_key"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
```

### Production (.env.production)

```bash
# Database (use connection pooling)
DATABASE_URL="postgresql://user:password@prod-db:5432/payflow_prod?ssl=require&connection_limit=20"

# JWT Secrets (use strong, unique values)
JWT_ACCESS_SECRET="production_access_secret_very_long_random_string"
JWT_REFRESH_SECRET="production_refresh_secret_very_long_random_string"

# Server
PORT=5000
NODE_ENV="production"

# CORS - Allow frontend domain
ALLOWED_ORIGINS="https://payflow.com,https://app.payflow.com"

# Payment Gateway
RAZORPAY_KEY_ID="prod_razorpay_key"
RAZORPAY_KEY_SECRET="prod_razorpay_secret"

# Logging
LOG_LEVEL="info"
```

## Step 6: Database Optimization

### Create Indexes (for production)

```sql
-- Indexes for hierarchy queries
CREATE INDEX idx_user_created_by_id ON "User"("createdById");
CREATE INDEX idx_user_role ON "User"("role");
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_audit_log_user_id ON "AuditLog"("userId");
CREATE INDEX idx_audit_log_action ON "AuditLog"(action);
CREATE INDEX idx_audit_log_created_at ON "AuditLog"("createdAt");
```

### Connection Pool Configuration

In production, use a connection pool:

```bash
# Add to DATABASE_URL
DATABASE_URL="postgresql://user:password@host:5432/db?ssl=require&connection_limit=20&pool_mode=transaction"
```

## Step 7: Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/payflow"
DB_NAME="payflow_prod"
DB_USER="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -type f -name "db_*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
```

Setup cron job (daily at 2 AM):
```bash
0 2 * * * /path/to/backup.sh >> /var/log/payflow_backup.log 2>&1
```

### Restore from Backup

```bash
gzip -d < backup_file.sql.gz | psql -U postgres payflow_prod
```

## Step 8: Monitoring & Logs

### Enable Audit Logs

All user creation is automatically logged in the `AuditLog` table.

Query audit logs:
```sql
SELECT * FROM "AuditLog" 
WHERE action IN ('USER_CREATED', 'ADMIN_CREATED', 'CLIENT_CREATED', 'AGENT_CREATED')
ORDER BY "createdAt" DESC
LIMIT 100;
```

### Monitor User Hierarchy

```sql
-- Count users by role
SELECT role, COUNT(*) as count FROM "User" GROUP BY role;

-- Show hierarchy tree
SELECT u.id, u.name, u.role, uc.id as created_by_id, uc.name as created_by_name
FROM "User" u
LEFT JOIN "User" uc ON u."createdById" = uc.id
ORDER BY u.role, uc.name, u.name;
```

## Step 9: Rollback Plan

If issues occur post-deployment:

### Rollback Migration

```bash
# This will rollback the LAST migration
npx prisma migrate resolve --rolled-back 1715145600000_rename_parent_to_created_by

# Or revert to previous migration
npx prisma migrate resolve --rolled-back migration_name
```

### Revert Code Changes

```bash
# If using git
git revert HEAD~N  # Where N is number of commits to revert

# Or restore from backup branch
git checkout backup-branch -- src/
```

### Database Recovery

```bash
# From automated backup
psql -U postgres payflow_prod < backup_20260507_020000.sql
```

## Step 10: Post-Deployment Verification

### Run Test Suite

```bash
cd server

# Run tests
npm run test

# Run tests with coverage
npm run test:cov
```

### Manual Testing Checklist

- [ ] SUPER_ADMIN can login
- [ ] SUPER_ADMIN can create ADMIN
- [ ] ADMIN can login
- [ ] ADMIN can create CLIENT
- [ ] ADMIN cannot create SUPER_ADMIN
- [ ] CLIENT can login
- [ ] CLIENT can create AGENT
- [ ] CLIENT cannot create CLIENT
- [ ] AGENT can login
- [ ] AGENT cannot create anyone
- [ ] Public signup returns 403
- [ ] User hierarchy is correctly saved
- [ ] Audit logs are created
- [ ] User listing is scoped correctly

### Performance Testing

```bash
# Test hierarchy queries under load
npm run load-test

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/users
```

## Security Checklist

- [ ] JWT secrets are strong (32+ chars, random)
- [ ] HTTPS/TLS enabled in production
- [ ] Database connections use SSL
- [ ] Rate limiting is configured
- [ ] CORS is restricted to allowed origins
- [ ] Input validation is in place
- [ ] Password hashing uses bcrypt (10 rounds)
- [ ] Audit logs are enabled
- [ ] Access logs are monitored
- [ ] Database backups are encrypted
- [ ] Environment variables are not in version control
- [ ] Sensitive data not logged

## Troubleshooting

### Issue: Migration Fails

```bash
# Check current migration status
npx prisma migrate status

# Reset database (development only!)
npx prisma migrate reset

# Manually verify schema
npx prisma db pull
```

### Issue: Authentication Fails

```bash
# Verify JWT secrets are set
echo $JWT_ACCESS_SECRET
echo $JWT_REFRESH_SECRET

# Check token validity
node -e "
const jwt = require('jsonwebtoken');
const token = 'your_token_here';
console.log(jwt.decode(token));
"
```

### Issue: Hierarchy Validation Fails

```sql
-- Check user hierarchy structure
SELECT id, name, role, "createdById" FROM "User" WHERE "createdById" IS NOT NULL;

-- Fix invalid hierarchy
UPDATE "User" SET "createdById" = NULL WHERE role = 'SUPER_ADMIN';
```

### Issue: Slow User Queries

```sql
-- Check missing indexes
EXPLAIN ANALYZE
SELECT * FROM "User" WHERE "createdById" = 'some_id';

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_user_created_by_id ON "User"("createdById");
```

## Maintenance Tasks

### Weekly
- [ ] Check server logs for errors
- [ ] Verify backups completed successfully
- [ ] Monitor database disk usage

### Monthly
- [ ] Review audit logs for suspicious activity
- [ ] Verify all three roles working correctly
- [ ] Check database performance metrics

### Quarterly
- [ ] Security audit
- [ ] Backup restoration test
- [ ] Load testing
- [ ] Update dependencies

## Support & Documentation

- **Implementation Guide**: See `HIERARCHY_IMPLEMENTATION.md`
- **API Testing**: See `API_TESTING_EXAMPLES.md`
- **Database Schema**: See `server/prisma/schema.prisma`

---

**Version**: 1.0.0  
**Last Updated**: May 8, 2026  
**Status**: Production-Ready
