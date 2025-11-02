/**
 * @design_doc   Authentication middleware using NextAuth.js
 * @related_to   authOptions in lib/auth/config.ts, NextAuth API routes
 * @known_issues None currently
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { env } from '@/lib/config/env'

// Public routes that don't require authentication
const publicRoutes = ['/', '/_next', '/favicon.ico']

// Auth routes that should be accessible without authentication
const authRoutes = ['/login', '/register', '/admin/login', '/auth', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api')

  // Check if route is public
  const isPublicRoute =
    !isApiRoute &&
    (publicRoutes.some((route) => pathname.startsWith(route)) ||
      authRoutes.some((route) => pathname.startsWith(route)) ||
      pathname.match(/^\/((?!admin|mypage).)*$/)) // All non-admin, non-mypage page routes

  // Get session token
  const token = await getToken({
    req: request,
    secret: env.nextAuth.secret,
  })

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Handle authentication routes
  if (isAuthRoute) {
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    if (token) {
      if (token.role === 'admin' && pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }

      if (token.role === 'customer') {
        // Allow customers to reach the admin login page so they can re-authenticate as admin
        if (pathname === '/admin/login') {
          return NextResponse.next()
        }

        const storeMatch = pathname.match(/^\/([^/]+)\/(login|register)/)
        const fallbackPath = storeMatch ? `/${storeMatch[1]}` : '/'
        return NextResponse.redirect(new URL(fallbackPath, request.url))
      }
    }

    return NextResponse.next()
  }

  // Handle admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      // Redirect to admin login if not authenticated
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url, { status: 307 })
    }

    if (token.role !== 'admin') {
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url, { status: 307 })
    }

    // Special redirect for /admin to /admin/dashboard
    if (pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    return NextResponse.next()
  }

  // Handle protected customer routes (e.g., mypage)
  if (pathname.includes('/mypage')) {
    if (!token) {
      // Extract store from URL and redirect to store-specific login
      const pathParts = pathname.split('/')
      const store = pathParts[1]
      const url = new URL(`/${store}/login`, request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url, { status: 307 })
    }

    return NextResponse.next()
  }

  // Allow public API routes (e.g., /api/public/*) without auth
  if (isApiRoute && pathname.startsWith('/api/public')) {
    return NextResponse.next()
  }

  // Handle protected API routes
  if (isApiRoute) {
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // For admin-only API routes
    if (pathname.startsWith('/api/admin') && token.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    return NextResponse.next()
  }

  // Allow all other public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Default: require authentication
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url, { status: 307 })
  }

  return NextResponse.next()
}
