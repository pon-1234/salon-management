/**
 * @design_doc   Custom authentication hooks for NextAuth.js
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const user = session?.user

  const login = async (credentials: { email: string; password: string }, providerId: string = 'customer-credentials') => {
    try {
      const result = await signIn(providerId, {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })
      
      return result
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async (callbackUrl?: string) => {
    try {
      await signOut({ 
        redirect: true, 
        callbackUrl: callbackUrl || '/' 
      })
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const requireAuth = (redirectTo?: string) => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      const redirectPath = redirectTo || `/login?callbackUrl=${encodeURIComponent(currentPath)}`
      router.push(redirectPath)
      return false
    }
    return isAuthenticated
  }

  const requireRole = (role: string, redirectTo?: string) => {
    if (!requireAuth(redirectTo)) {
      return false
    }
    
    if (user?.role !== role) {
      const currentPath = window.location.pathname
      const redirectPath = redirectTo || `/login?callbackUrl=${encodeURIComponent(currentPath)}`
      router.push(redirectPath)
      return false
    }
    
    return true
  }

  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    requireAuth,
    requireRole,
  }
}

export function useAdminAuth() {
  const auth = useAuth()
  
  return {
    ...auth,
    isAdmin: auth.user?.role === 'admin',
    requireAdmin: (redirectTo?: string) => auth.requireRole('admin', redirectTo),
  }
}

export function useCustomerAuth() {
  const auth = useAuth()
  
  return {
    ...auth,
    isCustomer: auth.user?.role === 'customer',
    requireCustomer: (redirectTo?: string) => auth.requireRole('customer', redirectTo),
  }
}