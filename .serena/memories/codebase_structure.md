# Codebase Structure

## Root Structure

```
/
├── app/                    # Next.js App Router pages
│   ├── (admin)/           # Admin pages group
│   ├── (public)/          # Public pages group
│   ├── [store]/           # Dynamic store routes
│   ├── admin/             # Admin routes
│   └── api/               # API endpoints
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Auth components
│   ├── cast/             # Cast management
│   ├── customer/         # Customer management
│   ├── reservation/      # Reservation components
│   └── ...               # Other domain components
├── lib/                   # Core business logic
│   ├── analytics/        # Analytics domain
│   ├── auth/             # Authentication
│   ├── cast/             # Cast domain
│   ├── customer/         # Customer domain
│   ├── pricing/          # Pricing domain
│   ├── reservation/      # Reservation domain
│   ├── store/            # Store domain
│   └── types/            # Shared types
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── prisma/               # Database schema
├── public/               # Static assets
├── scripts/              # Build/utility scripts
└── styles/               # Global styles

## Domain Structure Pattern
Each domain in `lib/` follows:
- `types.ts` - Domain models and interfaces
- `repository.ts` - Abstract repository interface
- `repository-impl.ts` - Concrete implementation
- `usecases.ts` - Business logic
- `data.ts` - Mock data generators
```
