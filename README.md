# Salon Management

_Automatically synced with your [v0.dev](https://v0.dev) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pons-projects-2da64dc3/v0-salon-management-jigb52crstx)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/JiGB52cRsTX)

## Overview

A comprehensive salon management application built with Next.js 15, featuring customer management, reservation system, and admin dashboard.

## Features

- 👥 **Customer Management**: Registration, profiles, and authentication
- 📅 **Reservation System**: Online booking and management
- 👨‍💼 **Admin Dashboard**: Business analytics and management tools
- 🔐 **Secure Authentication**: Role-based access control

## Deployment

Your project is live at:

**[https://vercel.com/pons-projects-2da64dc3/v0-salon-management-jigb52crstx](https://vercel.com/pons-projects-2da64dc3/v0-salon-management-jigb52crstx)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/JiGB52cRsTX](https://v0.dev/chat/projects/JiGB52cRsTX)**

## Local Login

Create local users with the setup or seed scripts before signing in:

- **Admin URL**: `/admin/login` after running `npm run setup:admin`
- **Customer URL**: `/[store]/login` (for example, `/store1/login`) after registration or seeding

## Recent Updates

### Test Coverage Improvements (2025-08-05)

- ✅ Added comprehensive tests for core data modules:
  - `lib/cast/data.ts`
  - `lib/customer/data.ts`
  - `lib/reservation/data.ts`
  - `lib/store/data.ts`
- 📈 The enforced coverage threshold is 30% in `vitest.config.ts`
- 🔍 Identified and documented unused code patterns with `@no-test-required` annotations
- 🛠 Fixed `createDate` export in cast module

## Quick Start

```bash
npm install
npm run dev
```

If you pull changes that modify `prisma/schema.prisma`, regenerate the Prisma Client before starting the dev server:

```bash
npx prisma generate
```

## Environment Setup

1. Copy the environment variables:

```bash
cp env.example .env.local
```

2. Configure the required variables:

- **Database**: Set your PostgreSQL connection string
  - Minimum required: `DATABASE_URL`
  - (Optional) If you run PgBouncer or want a dedicated non-pooled connection, also set `DIRECT_URL`.  
    Prisma CLI will fall back to `DATABASE_URL` when `DIRECT_URL` is omitted.
- **NextAuth**: Generate a secret with `openssl rand -base64 32`
- **Supabase**: Set your Supabase URL and anon key

### Image Upload Feature

This application uses Supabase Storage for persistent image storage:

- **Automatic**: Images are uploaded directly to cloud storage
- **CDN**: Global distribution for fast loading
- **Persistent**: Images remain available across deployments
- **Integrated**: Works seamlessly with your existing Supabase database

To enable image uploads:

1. Create a storage bucket named "images" in your Supabase dashboard
2. Add the following to your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
3. Deploy or run locally

### Database Seeding

Initialize your database with demo data:

```bash
# Create an admin user interactively
npm run setup:admin

# Create full demo data (casts, customers, reservations)
npm run seed:full
```

Customer login in development should use customers created by the seed scripts or by normal registration; hardcoded demo customer login is not supported.

## Payments

- The built-in payment endpoints now rely on an internal **manual provider**. No external Stripe keys are required.
- `/api/payments` and `/api/payments/intents` accept requests without a `provider` value (they default to `manual`).
- Historical Stripe webhook support has been removed; refunds and payment history are tracked purely in your database.

## Development

For detailed development information, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

### Recent Improvements (2025-01-06)

- **Code Quality**: Removed unused mock data exports for cleaner codebase
- **Test Coverage**: Added comprehensive tests for data modules (chat, pricing, modification-history)
- **Type Safety**: Verified all type definitions are actively used (100% type utilization)
- **API Optimization**: Confirmed 83% of API endpoints are actively used, with 2 reserved for future features

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
