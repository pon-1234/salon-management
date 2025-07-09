/**
 * @design_doc   Authentication context provider for NextAuth.js
 * @related_to   NextAuth.js configuration, session management
 * @known_issues None currently
 */
'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>
}