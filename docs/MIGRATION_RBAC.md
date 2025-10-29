# Role-Based Access Control (RBAC) Migration Guide

## Overview

This guide explains how to migrate to the new role-based access control (RBAC) system implemented for authentication in the salon management application.

## Changes Made

### 1. Authentication System

- **Unified to NextAuth.js**: All authentication now uses NextAuth.js instead of custom JWT implementation
- **Removed custom JWT endpoints**: `/api/auth/login` and `/api/auth/admin/login` have been removed
- **Session-based authentication**: Uses NextAuth.js session management with JWT strategy

### 2. Admin Model Updates

The Admin model in Prisma schema has been updated with new fields:

```prisma
model Admin {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      String   @default("staff") // 'staff' | 'manager' | 'super_admin'
  permissions Json?  // Array of permission strings
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3. Role Structure

- **Customer**: Standard customer role with access to store features
- **Admin Roles**:
  - `staff`: Basic admin access
  - `manager`: Extended admin access
  - `super_admin`: Full system access

### 4. Permission System

Permissions are stored as JSON array in the admin table. Example permissions:

- `cast:read` - View cast members
- `cast:write` - Create/update cast members
- `cast:delete` - Delete cast members
- `analytics:read` - View analytics
- `dashboard:view` - Access the management dashboard
- `reservation:read` - View reservation information
- `reservation:*` - Manage all reservations
- `customer:manage` - Manage customer accounts

> Note: 管理画面ではロールを選択すると対応する許可範囲が自動付与され、個別に permissions を編集する必要はありません。

## Migration Steps

### 1. Database Migration

Run the Prisma migration to update the Admin table:

```bash
npx prisma migrate dev --name add-rbac-to-admin
```

### 2. Update Existing Admin Users

For existing admin users, you need to update their records with the new fields:

```sql
-- Set default values for existing admins
UPDATE "Admin"
SET
  role = 'staff',
  permissions = '[]',
  "isActive" = true
WHERE role IS NULL;
```

### 3. Update Environment Variables

Ensure you have the proper environment variables set:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=your-database-url
```

### 4. Update Frontend Code

#### Admin Login

Update admin login to use NextAuth:

```typescript
import { signIn } from 'next-auth/react'

const result = await signIn('admin-credentials', {
  email,
  password,
  redirect: false,
})
```

#### Check Admin Permissions

Use the session to check permissions:

```typescript
import { useSession } from 'next-auth/react'

const { data: session } = useSession()

// Check if user is admin
if (session?.user?.role === 'admin') {
  // Check specific permission
  if (session.user.permissions?.includes('cast:write')) {
    // Allow cast editing
  }
}
```

### 5. API Route Protection

API routes are now protected by the middleware automatically. To check permissions in API routes:

```typescript
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check specific permission
  if (!session.user.permissions?.includes('cast:write')) {
    return new Response('Forbidden', { status: 403 })
  }

  // Process request...
}
```

### 6. Testing

1. Test admin login with existing credentials
2. Verify role-based access control works correctly
3. Test that inactive admin accounts cannot login
4. Verify permissions are enforced

## Breaking Changes

1. **Custom JWT tokens are no longer valid** - All users must re-login
2. **API endpoints changed** - `/api/auth/login` and `/api/auth/admin/login` removed
3. **Cookie format changed** - NextAuth uses different cookie structure
4. **Session data structure changed** - Update any code that directly accesses session data

## Rollback Plan

If you need to rollback:

1. Revert the code changes
2. Run the Prisma migration rollback:
   ```bash
   npx prisma migrate reset
   ```
3. Restore the previous authentication endpoints

## Support

For questions or issues with the migration, please refer to:

- NextAuth.js documentation: https://next-auth.js.org/
- Project documentation: `/docs/DEVELOPMENT_GUIDE.md`
