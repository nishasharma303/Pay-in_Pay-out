# API Testing Examples

This file contains cURL examples for testing the hierarchical user management system.

## Setup: Create Initial Users

### 1. System Setup (Initial - Seed a SUPER_ADMIN)

In your database seed or migration, create the first SUPER_ADMIN user:

```typescript
// In prisma/seed.ts or migration script
const superAdmin = await prisma.user.create({
  data: {
    name: "System Super Admin",
    email: "superadmin@payflow.com",
    phone: "9999999999",
    passwordHash: await bcrypt.hash("SuperAdminPass123", 10),
    role: Role.SUPER_ADMIN,
    createdById: null, // No creator for super admin
    wallet: {
      create: { primaryBalance: 0n, secondaryBalance: 0n, holdBalance: 0n },
    },
  },
});
```

### 2. Login as SUPER_ADMIN

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@payflow.com",
    "password": "SuperAdminPass123"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "superadmin_id_here",
      "name": "System Super Admin",
      "email": "superadmin@payflow.com",
      "phone": "9999999999",
      "role": "SUPER_ADMIN",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:00:00Z",
      "createdById": null,
      "wallet": {
        "primaryBalance": 0,
        "secondaryBalance": 0,
        "holdBalance": 0
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Save the accessToken** for use in subsequent requests.

---

## Create ADMIN (SUPER_ADMIN only)

```bash
curl -X POST http://localhost:5000/api/hierarchy/admins/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPERADMIN_TOKEN_HERE" \
  -d '{
    "name": "Regional Admin",
    "email": "admin@payflow.com",
    "phone": "9876543210",
    "password": "AdminPass123"
  }'
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "admin_uuid_12345",
    "name": "Regional Admin",
    "email": "admin@payflow.com",
    "phone": "9876543210",
    "role": "ADMIN",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:15:00Z"
  },
  "message": "Admin user created successfully"
}
```

### Test Case: ADMIN trying to create another ADMIN (should fail)

```bash
curl -X POST http://localhost:5000/api/hierarchy/admins/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -d '{
    "name": "Another Admin",
    "email": "admin2@payflow.com",
    "phone": "9876543211",
    "password": "AdminPass123"
  }'
```

**Expected Response** (403):
```json
{
  "success": false,
  "error": {
    "message": "Only SUPER_ADMIN can create ADMIN users",
    "code": "FORBIDDEN"
  }
}
```

---

## Create CLIENT (ADMIN only)

### 1. Login as ADMIN

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@payflow.com",
    "password": "AdminPass123"
  }'
```

**Save the admin accessToken**.

### 2. Create CLIENT

```bash
curl -X POST http://localhost:5000/api/hierarchy/clients/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "Business Client",
    "email": "client@payflow.com",
    "phone": "9876543212",
    "password": "ClientPass123"
  }'
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "client_uuid_67890",
    "name": "Business Client",
    "email": "client@payflow.com",
    "phone": "9876543212",
    "role": "CLIENT",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:30:00Z"
  },
  "message": "Client user created successfully"
}
```

### Test Case: CLIENT trying to create another CLIENT (should fail)

```bash
curl -X POST http://localhost:5000/api/hierarchy/clients/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLIENT_TOKEN_HERE" \
  -d '{
    "name": "Another Client",
    "email": "client2@payflow.com",
    "phone": "9876543213",
    "password": "ClientPass123"
  }'
```

**Expected Response** (403):
```json
{
  "success": false,
  "error": {
    "message": "Only ADMIN can create CLIENT users",
    "code": "FORBIDDEN"
  }
}
```

---

## Create AGENT (CLIENT only)

### 1. Login as CLIENT

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@payflow.com",
    "password": "ClientPass123"
  }'
```

**Save the client accessToken**.

### 2. Create AGENT

```bash
curl -X POST http://localhost:5000/api/hierarchy/agents/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLIENT_TOKEN_HERE" \
  -d '{
    "name": "Field Agent",
    "email": "agent@payflow.com",
    "phone": "9876543214",
    "password": "AgentPass123"
  }'
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "agent_uuid_54321",
    "name": "Field Agent",
    "email": "agent@payflow.com",
    "phone": "9876543214",
    "role": "AGENT",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:45:00Z"
  },
  "message": "Agent user created successfully"
}
```

### Test Case: AGENT trying to create another AGENT (should fail)

```bash
curl -X POST http://localhost:5000/api/hierarchy/agents/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer AGENT_TOKEN_HERE" \
  -d '{
    "name": "Another Agent",
    "email": "agent2@payflow.com",
    "phone": "9876543215",
    "password": "AgentPass123"
  }'
```

**Expected Response** (403):
```json
{
  "success": false,
  "error": {
    "message": "Only CLIENT can create AGENT users",
    "code": "FORBIDDEN"
  }
}
```

---

## Verify User Hierarchy with Get Profile

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer AGENT_TOKEN_HERE"
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "agent_uuid_54321",
    "name": "Field Agent",
    "email": "agent@payflow.com",
    "phone": "9876543214",
    "role": "AGENT",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-05-08T10:45:00Z",
    "createdById": "client_uuid_67890",
    "createdBy": {
      "id": "client_uuid_67890",
      "name": "Business Client",
      "email": "client@payflow.com",
      "role": "CLIENT"
    },
    "wallet": {
      "primaryBalance": 0,
      "secondaryBalance": 0,
      "holdBalance": 0
    }
  }
}
```

Notice the `createdById` and `createdBy` fields showing the parent-child relationship.

---

## List Users (Hierarchy-Scoped)

### SUPER_ADMIN Lists All Users

```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=20" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN_HERE"
```

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "admin_uuid_12345",
      "name": "Regional Admin",
      "email": "admin@payflow.com",
      "phone": "9876543210",
      "role": "ADMIN",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:15:00Z",
      "kyc": { "status": "PENDING" },
      "wallet": { "primaryBalance": 0 },
      "_count": { "children": 1 }
    },
    {
      "id": "client_uuid_67890",
      "name": "Business Client",
      "email": "client@payflow.com",
      "phone": "9876543212",
      "role": "CLIENT",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:30:00Z",
      "kyc": { "status": "PENDING" },
      "wallet": { "primaryBalance": 0 },
      "_count": { "children": 1 }
    },
    {
      "id": "agent_uuid_54321",
      "name": "Field Agent",
      "email": "agent@payflow.com",
      "phone": "9876543214",
      "role": "AGENT",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:45:00Z",
      "kyc": { "status": "PENDING" },
      "wallet": { "primaryBalance": 0 },
      "_count": { "children": 0 }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### ADMIN Lists Only Their CLIENTs and AGENTs

```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "client_uuid_67890",
      "name": "Business Client",
      "email": "client@payflow.com",
      "phone": "9876543212",
      "role": "CLIENT",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:30:00Z",
      "kyc": { "status": "PENDING" },
      "wallet": { "primaryBalance": 0 },
      "_count": { "children": 1 }
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

Notice that only the CLIENT they created is shown, not other ADMINs' CLIENTs.

### CLIENT Lists Only Their AGENTs

```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=20" \
  -H "Authorization: Bearer CLIENT_TOKEN_HERE"
```

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "agent_uuid_54321",
      "name": "Field Agent",
      "email": "agent@payflow.com",
      "phone": "9876543214",
      "role": "AGENT",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-05-08T10:45:00Z",
      "kyc": { "status": "PENDING" },
      "wallet": { "primaryBalance": 0 },
      "_count": { "children": 0 }
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

### AGENT Lists Users (Empty - Cannot see anyone)

```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=20" \
  -H "Authorization: Bearer AGENT_TOKEN_HERE"
```

**Response** (200):
```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

## Test Public Signup Disabled

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hacker User",
    "email": "hacker@attacker.com",
    "phone": "1234567890",
    "password": "SomePassword123",
    "role": "SUPER_ADMIN"
  }'
```

**Expected Response** (403):
```json
{
  "success": false,
  "error": {
    "message": "Public registration is disabled. Contact your administrator for account creation.",
    "code": "SIGNUP_DISABLED"
  }
}
```

---

## Test Password Validation

```bash
curl -X POST http://localhost:5000/api/hierarchy/admins/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPERADMIN_TOKEN_HERE" \
  -d '{
    "name": "Test User",
    "email": "test@payflow.com",
    "phone": "9876543210",
    "password": "weak"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": {
    "message": "Password must contain uppercase, lowercase, and numbers",
    "code": "VALIDATION_ERROR"
  }
}
```

---

## Test Duplicate Email/Phone

```bash
curl -X POST http://localhost:5000/api/hierarchy/clients/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "Duplicate Client",
    "email": "client@payflow.com",
    "phone": "9999999999",
    "password": "NewPassword123"
  }'
```

**Expected Response** (409):
```json
{
  "success": false,
  "error": {
    "message": "Email already registered",
    "code": "DUPLICATE_USER"
  }
}
```

---

## Postman Collection Import

You can import this as a Postman collection:

```json
{
  "info": {
    "name": "PayFlow Hierarchy API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"admin@payflow.com\", \"password\": \"AdminPass123\"}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/login",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "login"]
            }
          }
        },
        {
          "name": "Register (Should Fail)",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"name\": \"Test\", \"email\": \"test@test.com\", \"phone\": \"1234567890\", \"password\": \"TestPass123\"}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/register",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "register"]
            }
          }
        }
      ]
    },
    {
      "name": "User Management",
      "item": [
        {
          "name": "Create Admin",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{superadmin_token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"name\": \"Admin\", \"email\": \"admin@payflow.com\", \"phone\": \"9876543210\", \"password\": \"AdminPass123\"}"
            },
            "url": {
              "raw": "{{base_url}}/api/hierarchy/admins/create",
              "host": ["{{base_url}}"],
              "path": ["api", "hierarchy", "admins", "create"]
            }
          }
        },
        {
          "name": "Create Client",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"name\": \"Client\", \"email\": \"client@payflow.com\", \"phone\": \"9876543212\", \"password\": \"ClientPass123\"}"
            },
            "url": {
              "raw": "{{base_url}}/api/hierarchy/clients/create",
              "host": ["{{base_url}}"],
              "path": ["api", "hierarchy", "clients", "create"]
            }
          }
        },
        {
          "name": "Create Agent",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{client_token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"name\": \"Agent\", \"email\": \"agent@payflow.com\", \"phone\": \"9876543214\", \"password\": \"AgentPass123\"}"
            },
            "url": {
              "raw": "{{base_url}}/api/hierarchy/agents/create",
              "host": ["{{base_url}}"],
              "path": ["api", "hierarchy", "agents", "create"]
            }
          }
        },
        {
          "name": "List Users",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/users?page=1&limit=20",
              "host": ["{{base_url}}"],
              "path": ["api", "users"],
              "query": [
                {"key": "page", "value": "1"},
                {"key": "limit", "value": "20"}
              ]
            }
          }
        },
        {
          "name": "Get Profile",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{user_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/auth/me",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "me"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {"key": "base_url", "value": "http://localhost:5000"},
    {"key": "superadmin_token", "value": ""},
    {"key": "admin_token", "value": ""},
    {"key": "client_token", "value": ""},
    {"key": "agent_token", "value": ""}
  ]
}
```

---

## Environment Variables for Testing

Create a `.env.test` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/payflow_test"
JWT_ACCESS_SECRET="test-access-secret-key-12345"
JWT_REFRESH_SECRET="test-refresh-secret-key-12345"
NODE_ENV="test"
PORT=5000
```

---

**Note**: Replace `YOUR_TOKEN_HERE` with actual tokens from login responses. Use Postman environment variables to store tokens for easier testing.
