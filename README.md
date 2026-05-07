# PayFlow — Fintech Platform

A production-grade Pay-In / Pay-Out platform with wallet, ledger, and commission hierarchy.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via **Neon** (free) + Prisma ORM |
| Auth | JWT (access token) + Refresh token (HttpOnly cookie) |
| Pay-In | Razorpay |
| Pay-Out | Cashfree |
| State | Zustand + React Query |

## Quick Start

### 1. Database (Free — Neon)
1. Go to https://neon.tech and create a free account
2. Create a new project → copy the **connection string**
3. Paste it into `server/.env` as `DATABASE_URL`

### 2. Install & Run

```bash
# Install all dependencies
npm run setup

# Push DB schema + generate Prisma client
npm run db:push
npm run db:generate

# Seed the database (creates Super Admin)
npm run db:seed

# Start both frontend + backend
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:5000  
Prisma Studio: `npm run db:studio`

### 3. Default Login Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@payflow.com | SuperAdmin@123 |
| Admin | admin@payflow.com | Admin@123 |
| Agent | agent@payflow.com | Agent@123 |

## Modules Status

- [x] Module 1: Project Setup
- [x] Module 2: Authentication & RBAC
- [ ] Module 3: KYC Management
- [ ] Module 4: Wallet & Ledger
- [ ] Module 5: Pay-In (Razorpay)
- [ ] Module 6: Pay-Out (Cashfree)
- [ ] Module 7: Commission System
- [ ] Module 8: Admin Dashboard
- [ ] Module 9: Super Admin Panel
- [ ] Module 10: Security & Optimization

## Project Structure

```
payin-payout/
├── server/                 # Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma   # DB schema
│   │   └── seed.ts         # Seed data
│   └── src/
│       ├── config/         # DB, env config
│       ├── routes/         # Route definitions
│       ├── controllers/    # Request handlers
│       ├── services/       # Business logic
│       ├── middlewares/    # Auth, error, validation
│       ├── utils/          # Helpers
│       └── types/          # TypeScript types
└── client/                 # Next.js 14 frontend
    ├── app/
    │   ├── auth/           # Login, Signup pages
    │   └── dashboard/      # Protected pages
    ├── components/
    │   ├── ui/             # Atomic components
    │   ├── dashboard/      # Dashboard widgets
    │   └── layout/         # Sidebar, Topbar
    ├── lib/                # API client, helpers
    ├── store/              # Zustand stores
    └── hooks/              # Custom React hooks
```
