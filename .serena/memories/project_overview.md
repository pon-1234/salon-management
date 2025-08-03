# Salon Management Project Overview

## Purpose

A comprehensive salon management application built with Next.js 15, featuring customer management, reservation system, and admin dashboard for salon (men's esthetic) operations.

## Tech Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 19, Tailwind CSS, shadcn/ui components
- **Forms**: React Hook Form with Zod validation
- **Authentication**: NextAuth.js with bcryptjs
- **Database**: Prisma ORM (currently with mock data)
- **Storage**: Supabase Storage for images
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Testing**: Vitest with @testing-library/react
- **Other**: Stripe, Resend, Pino logging

## Architecture

- Clean architecture with separation of concerns
- Domain-driven design in `lib/` directory
- Repository pattern for data access (currently mocked)
- Server-side rendering with Next.js App Router

## Main Features

- Admin dashboard with analytics
- Customer management and authentication
- Reservation system
- Cast (staff) management
- Multi-store support
- CTI integration for phone popups
