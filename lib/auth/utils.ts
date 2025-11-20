/**
 * @design_doc   Common authentication utilities for API routes
 * @related_to   All API routes requiring authentication
 * @known_issues None
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { hasAllPermissions, type Permission } from '@/lib/auth/permissions'

interface RequireAdminOptions {
  permissions?: Permission | Permission[]
}

/**
 * Requires the current user to be an admin.
 * Returns null if authorized, or a NextResponse error if not.
 */
export async function requireAdmin(options?: RequireAdminOptions) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const requiredPermissions = options?.permissions
  if (requiredPermissions) {
    const granted = session.user.permissions ?? []
    if (!hasAllPermissions(granted, requiredPermissions)) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }
  }

  return null
}

interface RequireCastResult {
  error: NextResponse | null
  session: Session | null
}

export async function requireCast(): Promise<RequireCastResult> {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    return {
      error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }),
      session: null,
    }
  }

  return {
    error: null,
    session,
  }
}

interface RequireCustomerResult {
  error: NextResponse | null
  session: Session | null
}

export async function requireCustomer(): Promise<RequireCustomerResult> {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'customer') {
    return {
      error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }),
      session: null,
    }
  }

  return {
    error: null,
    session,
  }
}
