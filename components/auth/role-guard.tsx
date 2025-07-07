/**
 * @design_doc   Role-based access control component for conditional rendering
 * @related_to   NextAuth.js configuration, role-based access control
 * @known_issues None currently
 */
'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
  requireAuth?: boolean
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null, 
  requireAuth = true 
}: RoleGuardProps) {
  const { data: session, status } = useSession()

  // Show loading state
  if (status === 'loading') {
    return <div className="animate-pulse">Loading...</div>
  }

  // Check authentication requirement
  if (requireAuth && !session) {
    return <>{fallback}</>
  }

  // Check role permissions
  if (session?.user?.role && allowedRoles.includes(session.user.role)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

interface CustomerOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function CustomerOnly({ children, fallback = null }: CustomerOnlyProps) {
  return (
    <RoleGuard allowedRoles={['customer']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

interface AuthenticatedOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthenticatedOnly({ children, fallback = null }: AuthenticatedOnlyProps) {
  return (
    <RoleGuard allowedRoles={['admin', 'customer']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}