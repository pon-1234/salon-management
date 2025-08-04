/**
 * @design_doc   Common authentication utilities for API routes
 * @related_to   All API routes requiring authentication
 * @known_issues None
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

/**
 * Requires the current user to be an admin.
 * Returns null if authorized, or a NextResponse error if not.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  return null
}
