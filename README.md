# Salon Management

## Overview

A comprehensive salon management application built with Next.js 15, featuring customer management, reservation system, and admin dashboard.

## Features

- 👥 **Customer Management**: Registration, profiles, and authentication
- 📅 **Reservation System**: Online booking and management
- 👨‍💼 **Admin Dashboard**: Business analytics and management tools
- 🔐 **Secure Authentication**: Role-based access control

## Deployment

The production target is the XServer VPS stack managed by the
`platinum-management` repository. Legacy-data cutover is currently **No-Go**;
passing local CI alone does not authorize deployment or traffic switching. See
[docs/VPS_DEPLOYMENT.md](./docs/VPS_DEPLOYMENT.md) and the
[legacy migration runbook](./docs/LEGACY_DATA_MIGRATION_RUNBOOK.md).

The repository includes fail-closed tooling for verifying an offline legacy snapshot, copying its
declared public images, and loading canonical rows into a separately marked disposable preview
database. No current production snapshot has been copied or imported; the legacy extractor,
coordinated multi-database cutoff evidence, approved business mappings, isolated preview
infrastructure, and field UAT are still required.
The required raw-to-canonical completeness proof is specified in
[docs/LEGACY_EXTRACTOR_CONTRACT.md](./docs/LEGACY_EXTRACTOR_CONTRACT.md).

## Local Login

Create local users with the setup or seed scripts before signing in:

- **Admin URL**: `/admin/login` after running the explicit `pnpm setup:admin` bootstrap
- **Customer URL**: `/[store]/login` (for example, `/store1/login`) after registration or seeding

## Recent Updates

### Test Coverage and Browser Journeys

- ✅ Added comprehensive tests for core data modules:
  - `lib/cast/data.ts`
  - `lib/customer/data.ts`
  - `lib/reservation/data.ts`
  - `lib/store/data.ts`
- ✅ Vitest enforces 55% minimum statement, line, function, and branch coverage
- ✅ Playwright covers the age gate, reservation journey, security headers, and administrator login
- 🔍 Identified and documented unused code patterns with `@no-test-required` annotations
- 🛠 Fixed `createDate` export in cast module

## Quick Start

```bash
pnpm install
cp .env.example .env.local
docker compose up -d postgres
pnpm prisma migrate deploy
pnpm prisma generate
pnpm dev
```

The Compose service stores PostgreSQL data in the named `postgres_data` volume. Check readiness
with `docker compose ps`; stop the service with `docker compose down`. Do not add `--volumes`
unless you intentionally want to delete the local database.

If you pull changes that modify `prisma/schema.prisma`, regenerate the Prisma Client before starting the dev server:

```bash
pnpm prisma generate
```

## Environment Setup

1. Copy the canonical local environment example:

```bash
cp .env.example .env.local
```

2. The example already points Prisma at the local Compose database. Replace provider credentials
   only when exercising those integrations:

- **Database**: Set your PostgreSQL connection string
  - Minimum required: `DATABASE_URL`
  - (Optional) If you run PgBouncer or want a dedicated non-pooled connection, also set `DIRECT_URL`.  
    Prisma CLI will fall back to `DATABASE_URL` when `DIRECT_URL` is omitted.
- **NextAuth**: Generate a secret with `openssl rand -base64 32`
- **Public URL**: Production requires an explicit HTTPS `NEXTAUTH_URL`; recovery and verification
  links are generated from it
- **Storage**: Set `STORAGE_ROOT` and `STORAGE_PUBLIC_BASE_URL` when testing VPS-style local storage

### Image Upload Feature

The production target uses a persistent VPS volume for image storage:

- **Local**: Images remain on the encrypted-backup VPS storage volume
- **HTTP serving**: Caddy serves the volume read-only under `/salon-uploads/`
- **Persistent**: Images remain available across deployments
- **Independent**: No Vercel or hosted Supabase account is required
- **Validated**: The server verifies JPEG, PNG, WebP, and GIF signatures against the declared MIME type and saves each file with the detected format's canonical extension

To enable image uploads:

1. Set `STORAGE_ROOT` to a writable directory.
2. Set `STORAGE_PUBLIC_BASE_URL` to the public `/salon-uploads` URL.
3. Mount the same volume read-only in Caddy when deploying.

### Database Seeding

Initialize a development database with demo data. Development seed commands fail closed when
`NODE_ENV` is any production-like value and must never be used against production:

```bash
# Create an administrator from explicit inputs (password must be 16+ characters)
export ADMIN_BOOTSTRAP_EMAIL=owner@example.com
export ADMIN_BOOTSTRAP_NAME='Local Owner'
read -r -s ADMIN_BOOTSTRAP_PASSWORD && export ADMIN_BOOTSTRAP_PASSWORD
export ADMIN_BOOTSTRAP_ROLE=super_admin
pnpm setup:admin
unset ADMIN_BOOTSTRAP_PASSWORD

# Create full demo data (casts, customers, reservations)
NODE_ENV=development pnpm seed:full
```

The full seed generates random login passwords and prints them once. Set a development-only
`SEED_FULL_ADMIN_PASSWORD` of at least 16 characters when a stable local admin password is needed.
Production schema changes use `prisma migrate deploy`; `prisma db push` and demo seeds are not
production deployment paths.

The bootstrap supports only `super_admin` or store-limited `manager` accounts. Production usage,
manager permission/store inputs, idempotent reruns, and the explicit existing-account update
acknowledgement are documented in
[docs/VPS_DEPLOYMENT.md](./docs/VPS_DEPLOYMENT.md#initial-administrator-bootstrap).

Customer login in development should use customers created by the seed scripts or by normal registration; hardcoded demo customer login is not supported.

## Payments

- `/api/payments` records an offline/manual payment only after an assigned administrator with
  `reservation:update` permission confirms the reservation. Amount, customer, store, currency,
  and payment method are derived from that reservation rather than accepted from the caller.
- Online payment intent creation and confirmation remain disabled with `503` until a production
  payment provider and signed webhook are implemented and verified.
- Historical Stripe webhook support has been removed; refunds and payment history are tracked in
  the application database.

## Development

For detailed development information, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

The non-functional architecture and local browser-test setup are documented in
[docs/NONFUNCTIONAL_FOUNDATIONS.md](./docs/NONFUNCTIONAL_FOUNDATIONS.md).

Run the complete local quality gate with:

```bash
./scripts/ci.sh
```

### Recent Improvements (2025-01-06)

- **Code Quality**: Removed unused mock data exports for cleaner codebase
- **Test Coverage**: Added comprehensive tests for data modules (chat, pricing, modification-history)
- **Type Safety**: Verified all type definitions are actively used (100% type utilization)
- **API Optimization**: Confirmed 83% of API endpoints are actively used, with 2 reserved for future features

## Production Operations

The target Platinum VPS Compose stack builds this repository from
`/opt/salon-management` and applies Prisma migrations before starting Next.js.
Cron jobs and encrypted database/image backups are controlled by the external
`platinum-management` stack and require staging execution and restore evidence
before cutover; their presence in documentation is not proof that they work.

Legacy production data must not be copied directly into PostgreSQL. Follow the
[legacy data migration runbook](./docs/LEGACY_DATA_MIGRATION_RUNBOOK.md) for the
read-only snapshot, staging reconciliation, cutover, and rollback gates.
