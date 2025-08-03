# Suggested Commands for Development

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

## Testing & Quality Checks

- `pnpm test` - Run tests with Vitest
- `pnpm test:ui` - Run tests with UI interface
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `./scripts/ci.sh` - Run all CI checks (lint, format, typecheck, test, coverage, build)

## Database & Seeding

- `pnpm create:admin` - Create admin users
- `pnpm seed:full` - Create full demo data (casts, customers, reservations)
- `npx prisma generate` - Generate Prisma client
- `pnpm setup:admin` - Setup admin (tsx script)

## Other Commands

- `pnpm migrate:images` - Migrate images to Supabase

## Task Completion Commands

When completing a task, run:

1. `pnpm lint` - Check linting
2. `pnpm typecheck` - Check types
3. `pnpm test` - Run tests
4. `./scripts/ci.sh` - Run full CI suite
