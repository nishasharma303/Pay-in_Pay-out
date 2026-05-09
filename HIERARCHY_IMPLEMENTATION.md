# PayFlow Hierarchical Role-Based User Management System

## Overview

This implementation enforces a strict hierarchical role-based structure for the PayFlow fintech platform:

```
SUPER_ADMIN (can only be created by initial setup/system)
    ↓
ADMIN (created by SUPER_ADMIN)
    ↓
CLIENT (created by ADMIN)
    ↓
AGENT (created by CLIENT)
```

## Key Changes Made

### 1. Database Schema (Prisma)

**File**: `prisma/schema.prisma`

Changed from `parentId` to `createdById` relationship:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  phone        String?  @unique
  name         String
  passwordHash String
  role         Role     @default(AGENT)
  isActive     Boolean  @default(true)
  isVerified   Boolean  @default(false)

  // Hierarchy: tracks who created this user
  createdById  String?
  createdBy    User?    @relation("UserHierarchy", fields: [createdById], references: [id])
  children     User[]   @relation("UserHierarchy")

  // ... rest of fields
  @@index([createdById])
}
```

**Migration**: `prisma/migrations/1715145600000_rename_parent_to_created_by/migration.sql`
- Renames `parentId` column to `createdById`
- Updates all indexes and foreign key constraints

### 2. Authentication Service Updates

**File**: `src/services/auth.service.ts`

- **Removed**: `registerUser()` (public signup)
- **Added**: `createUserByRole()` - Internal function for role-based creation
  - Used only by hierarchy endpoints
  - Stores `createdById` reference
  - Records audit logs with target role

- **Updated**: `loginUser()`, `getMe()` - Use `createdById` instead of `parentId`

### 3. Public Signup Disabled

**File**: `src/controllers/auth.controller.ts`

```typescript
export const register = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(403).json({
    success: false,
    error: {
      message: 'Public registration is disabled. Contact your administrator for account creation.',
      code: 'SIGNUP_DISABLED',
    },
  });
};
```

Only login endpoint (`POST /auth/login`) remains public.

### 4. Hierarchy Middleware

**File**: `src/middlewares/hierarchy.ts`

Key functions:

- **`validateHierarchyCreation(targetRole)`**: Validates that a user can create a child of specific role
  ```
  SUPER_ADMIN → can create ADMIN
  ADMIN → can create CLIENT
  CLIENT → can create AGENT
  AGENT → cannot create anyone
  ```

- **`validateOwnership(requesterId, requesterRole, targetUserId)`**: Checks if requester created the target user

- **`checkOwnership` middleware**: Route-level ownership validation

- **`getHierarchyFilter(requesterId, requesterRole)`**: Returns Prisma where clause for data scoping

- **`validateRoleAccess(requesterRole, targetRole)`**: Validates role hierarchy access

### 5. Hierarchy Service (New)

**File**: `src/services/hierarchy.service.ts`

Three functions for creating users at each level:

#### `createAdmin(data, superAdminId)`
- **Prerequisites**: Caller must be SUPER_ADMIN
- **Input**: `{ name, email, phone, password }`
- **Password validation**: Min 8 chars, uppercase, lowercase, numbers
- **Returns**: Created admin user object
- **Audit**: Logs `ADMIN_CREATED` action

#### `createClient(data, adminId)`
- **Prerequisites**: Caller must be ADMIN
- **Input**: `{ name, email, phone, password }`
- **Same validation** as createAdmin
- **Returns**: Created client user object
- **Audit**: Logs `CLIENT_CREATED` action
- **Ownership**: Sets `createdById = adminId`

#### `createAgent(data, clientId)`
- **Prerequisites**: Caller must be CLIENT
- **Input**: `{ name, email, phone, password }`
- **Returns**: Created agent user object
- **Audit**: Logs `AGENT_CREATED` action
- **Ownership**: Sets `createdById = clientId`

### 6. Hierarchy Controller (New)

**File**: `src/controllers/hierarchy.controller.ts`

Three endpoints:
- `createAdmin()` - POST /hierarchy/admins/create
- `createClient()` - POST /hierarchy/clients/create
- `createAgent()` - POST /hierarchy/agents/create

### 7. Hierarchy Routes (New)

**File**: `src/routes/hierarchy.routes.ts`

```typescript
POST /hierarchy/admins/create   [SUPER_ADMIN only]
POST /hierarchy/clients/create  [ADMIN only]
POST /hierarchy/agents/create   [CLIENT only]
```

### 8. Updated User Service

**File**: `src/services/user.service.ts`

**Updated `listUsers()`**:
- SUPER_ADMIN: Sees all users
- ADMIN: Sees only CLIENTs and AGENTs they created (`createdById = adminId`)
- CLIENT: Sees only AGENTs they created (`createdById = clientId`)
- AGENT: Cannot see any users (empty list)

**Updated `getUserById()`**:
- Changed `parent` relation to `createdBy`
- Shows who created the user

### 9. App Registration

**File**: `src/app.ts`

- Imported `hierarchyRouter`
- Registered at `/api/hierarchy` base path

## API Specifications

### 1. Create Admin

**Endpoint**: `POST /api/hierarchy/admins/create`

**Authentication**: Bearer token (SUPER_ADMIN role)

**Request Body**:
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "phone": "9876543210",
  "password": "SecurePass123"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "admin_uuid",
    "name": "Admin User",
    "email": "admin@example.com",
    "phone": "9876543210",
    "role": "ADMIN",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:30:00Z"
  },
  "message": "Admin user created successfully"
}
```

**Error Cases**:
- `403 FORBIDDEN` - Caller is not SUPER_ADMIN
- `409 DUPLICATE_USER` - Email or phone already exists
- `400 BAD_REQUEST` - Password validation failed

---

### 2. Create Client

**Endpoint**: `POST /api/hierarchy/clients/create`

**Authentication**: Bearer token (ADMIN role)

**Request Body**:
```json
{
  "name": "Client User",
  "email": "client@example.com",
  "phone": "9876543211",
  "password": "SecurePass123"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "client_uuid",
    "name": "Client User",
    "email": "client@example.com",
    "phone": "9876543211",
    "role": "CLIENT",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:35:00Z"
  },
  "message": "Client user created successfully"
}
```

**Error Cases**:
- `403 FORBIDDEN` - Caller is not ADMIN
- `409 DUPLICATE_USER` - Email or phone already exists
- `400 BAD_REQUEST` - Password validation failed

---

### 3. Create Agent

**Endpoint**: `POST /api/hierarchy/agents/create`

**Authentication**: Bearer token (CLIENT role)

**Request Body**:
```json
{
  "name": "Agent User",
  "email": "agent@example.com",
  "phone": "9876543212",
  "password": "SecurePass123"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "agent_uuid",
    "name": "Agent User",
    "email": "agent@example.com",
    "phone": "9876543212",
    "role": "AGENT",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:40:00Z"
  },
  "message": "Agent user created successfully"
}
```

**Error Cases**:
- `403 FORBIDDEN` - Caller is not CLIENT
- `409 DUPLICATE_USER` - Email or phone already exists
- `400 BAD_REQUEST` - Password validation failed

---

### 4. Login (Public)

**Endpoint**: `POST /api/auth/login`

**No Authentication Required**

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "admin_uuid",
      "name": "Admin User",
      "email": "admin@example.com",
      "phone": "9876543210",
      "role": "ADMIN",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:30:00Z",
      "createdById": null,
      "wallet": {
        "primaryBalance": 0,
        "secondaryBalance": 0,
        "holdBalance": 0
      },
      "kyc": { "status": "PENDING" }
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "Login successful"
}
```

---

### 5. Get Profile (Protected)

**Endpoint**: `GET /api/auth/me`

**Authentication**: Bearer token (any role)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "9876543210",
    "role": "AGENT",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:40:00Z",
    "createdById": "client_uuid",
    "createdBy": {
      "id": "client_uuid",
      "name": "Client User",
      "email": "client@example.com",
      "role": "CLIENT"
    },
    "wallet": {
      "primaryBalance": 1500.50,
      "secondaryBalance": 0,
      "holdBalance": 250.25
    },
    "kyc": { "status": "PENDING" }
  }
}
```

---

### 6. List Users (Protected - Scoped)

**Endpoint**: `GET /api/users?page=1&limit=20&role=CLIENT&search=john`

**Authentication**: Bearer token (SUPER_ADMIN, ADMIN, or CLIENT)

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role (ADMIN, CLIENT, AGENT)
- `search` (optional): Search by name, email, or phone

**Response** (200) - For ADMIN User:
```json
{
  "success": true,
  "data": [
    {
      "id": "client_uuid",
      "name": "Client User",
      "email": "client@example.com",
      "phone": "9876543211",
      "role": "CLIENT",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:35:00Z",
      "kyc": { "status": "APPROVED" },
      "wallet": { "primaryBalance": 5000 },
      "_count": { "children": 2 }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Data Scoping Rules**:
- **SUPER_ADMIN**: Sees all ADMINs, CLIENTs, AGENTs
- **ADMIN**: Sees only their CLIENTs and AGENTs
- **CLIENT**: Sees only their AGENTs
- **AGENT**: Sees no users (empty list)

---

## Access Control Rules

### User Creation Hierarchy

```
❌ AGENT cannot create any users
✅ CLIENT can create only AGENT
✅ ADMIN can create CLIENT and AGENT (transitively)
✅ SUPER_ADMIN can create ADMIN, CLIENT, AGENT (transitively)
```

### Data Visibility

```
SUPER_ADMIN:
  - Can see all users in the system
  - Can view all transactions, wallets, KYC
  
ADMIN:
  - Can see only users they created
  - Can see their CLIENTs and their CLIENTs' AGENTs
  - Cannot see other ADMINs' users
  
CLIENT:
  - Can see only AGENTs they created
  - Can manage their AGENTs' data
  - Cannot see other CLIENTs' AGENTs
  
AGENT:
  - Cannot see any other users
  - Can only access their own data
```

### Cross-Hierarchy Access Prevention

- ADMIN A cannot see ADMIN B's CLIENTs
- CLIENT A cannot see CLIENT B's AGENTs
- AGENT cannot create or manage anyone
- No user can bypass their hierarchy level

## Database Migration

**Run migration**:
```bash
cd server
npx prisma migrate deploy
# or for development:
npx prisma migrate dev
```

**Migration SQL** (auto-applied):
```sql
ALTER TABLE "User" RENAME COLUMN "parentId" TO "createdById";
DROP INDEX "User_parentId_idx";
CREATE INDEX "User_createdById_idx" ON "User"("createdById");
ALTER TABLE "User" RENAME CONSTRAINT "User_parentId_fkey" TO "User_createdById_fkey";
```

## Audit Logging

All user creation actions are logged:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String   // Who performed the action
  action     String   // USER_CREATED, ADMIN_CREATED, CLIENT_CREATED, AGENT_CREATED
  entity     String   // "User"
  entityId   String   // ID of created user
  metadata   Json?    // { targetRole: "CLIENT" }
  createdAt  DateTime @default(now())
}
```

## Implementation Notes

### 1. Password Hashing
- Uses bcryptjs with 10 salt rounds
- Never stores plaintext passwords
- Consistent hashing across all creation endpoints

### 2. Error Handling
- All errors use standardized AppError format
- Proper HTTP status codes (401, 403, 409, 400)
- Meaningful error codes for client-side handling

### 3. Validation
- Zod schemas for request body validation
- Email format validation
- Phone digit-only validation (10-15 digits)
- Password strength requirements (8+ chars, upper, lower, numbers)

### 4. Transaction Safety
- Uses Prisma transactions where needed
- Atomic user + wallet creation
- Atomic audit log creation

### 5. RBAC Middleware
- Existing `authenticate` middleware validates JWT
- Existing `authorize(...roles)` middleware checks role
- New hierarchy middleware adds ownership validation

## What Remains Unchanged

✅ Frontend architecture - No changes needed
✅ JWT authentication flow - Still works as before
✅ Wallet module - All wallet operations unchanged
✅ Payment modules (pay-in/pay-out) - Fully operational
✅ Dashboard UI - No modifications required
✅ Commission system - Works with hierarchy
✅ KYC workflow - Still operational
✅ Rate limiting - Applied to hierarchy endpoints

## Example Workflow

### Setup Flow:
1. **System admin** creates initial SUPER_ADMIN user (out of system)
2. SUPER_ADMIN logs in → `POST /api/auth/login`
3. SUPER_ADMIN creates ADMIN → `POST /api/hierarchy/admins/create`
4. ADMIN logs in → `POST /api/auth/login`
5. ADMIN creates CLIENT → `POST /api/hierarchy/clients/create`
6. CLIENT logs in → `POST /api/auth/login`
7. CLIENT creates AGENT → `POST /api/hierarchy/agents/create`
8. AGENT logs in → `POST /api/auth/login`

### Access Control Example:
```javascript
// ADMIN trying to create another ADMIN
POST /api/hierarchy/admins/create
Authorization: Bearer admin_token
Body: { name, email, phone, password }

// Response: 403 Forbidden
// "Only SUPER_ADMIN can create ADMIN users"

// But ADMIN can create CLIENT:
POST /api/hierarchy/clients/create
Authorization: Bearer admin_token
Body: { name, email, phone, password }

// Response: 201 Created
// Client user created with createdById = admin_id
```

### Data Scoping Example:
```javascript
// ADMIN lists users
GET /api/users
Authorization: Bearer admin_token

// Only returns: CLIENTs and AGENTs created by this ADMIN
// Children count shows how many users they've created

// SUPER_ADMIN lists users
GET /api/users
Authorization: Bearer superadmin_token

// Returns: ALL ADMINs, CLIENTs, AGENTs in system
```

## Security Considerations

1. **Hierarchy Enforcement**: Strictly enforced at middleware level
2. **Ownership Validation**: Every operation validates creator relationship
3. **Cross-hierarchy Prevention**: No endpoint allows cross-hierarchy access
4. **Audit Trail**: All creations logged for compliance
5. **Role Isolation**: AGENT role completely isolated from creation
6. **Password Security**: Strong password requirements enforced

## Next Steps (Optional Enhancements)

1. Add role update endpoint (with hierarchy validation)
2. Add user deactivation with cascade logic
3. Add hierarchy analytics (users per admin, etc)
4. Add bulk user creation with CSV
5. Add role-based fee structures
6. Add hierarchy-based commission rules
7. Add parent notification on child actions

---

**Implementation Date**: May 8, 2026  
**Status**: Production-Ready
