# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting

## Architecture Overview

This is a Next.js salon management application built with React 19, TypeScript, and Tailwind CSS. The codebase follows a clean architecture pattern with clear separation of concerns.

### Core Domains

The application is organized around several business domains:

- **Cast Management** (`lib/cast/`) - Manages cast/staff members with appointment scheduling
- **Customer Management** (`lib/customer/`) - Customer profiles, usage records, and member types
- **Reservations** (`lib/reservation/`) - Booking system with service management
- **Analytics** (`lib/analytics/`) - Sales reports, performance tracking, and business metrics
- **Chat** (`lib/chat/`) - Customer communication system

### Data Layer

Each domain follows a repository pattern:
- `types.ts` - Domain models and interfaces
- `repository.ts` - Abstract repository interface
- `repository-impl.ts` - Concrete implementation with mock data
- `usecases.ts` - Business logic layer
- `data.ts` - Mock data generators

### UI Components

Components are organized by feature in `components/`:
- Domain-specific components (e.g., `cast/`, `reservation/`, `analytics/`)
- Shared UI components in `ui/` (shadcn/ui based)
- Layout components and navigation

### Page Structure

App Router pages in `app/`:
- Feature-based routing (e.g., `/cast/`, `/customers/`, `/analytics/`)
- Dynamic routes for entity details (e.g., `/cast/[id]/`)
- Nested layouts for consistent UI structure

### Key Technologies

- **UI Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for analytics
- **Date Handling**: date-fns
- **Icons**: Lucide React

### Data Patterns

All data is currently mocked but follows realistic business patterns:
- Cast have work schedules, appointments, and designation fees
- Customers have member types (regular/vip), points, and usage history
- Reservations link customers, cast, and services with pricing
- Analytics track sales by time period, location, and performance metrics

### Development Notes

- The codebase uses TypeScript strict mode
- Components use modern React patterns (hooks, functional components)
- State management is handled locally with React state
- All external dependencies use exact or latest versions
- The project syncs with v0.dev for iterative development