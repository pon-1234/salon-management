/**
 * @design_doc   Authentication middleware using NextAuth.js
 * @related_to   authOptions in lib/auth/config.ts, NextAuth API routes
 * @known_issues None currently
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Public routes that don't require authentication
const publicRoutes = ['/', '/api', '/_next', '/favicon.ico']

// Auth routes that should be accessible without authentication
const authRoutes = ['/login', '/register', '/admin/login', '/auth']

// Routes that require admin role
const adminRoutes = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route is public
  const isPublicRoute =
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    authRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.match(/^\/((?!admin|mypage).)*$/) // All non-admin, non-mypage routes

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Handle authentication routes
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    // If already authenticated, redirect to appropriate dashboard
    if (token) {
      if (token.role === 'admin' && pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (token.role === 'customer') {
        const store = pathname.split('/')[1]
        return NextResponse.redirect(new URL(`/${store}`, request.url))
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
      // Return 403 if authenticated but not admin
      return new NextResponse('Forbidden', { status: 403 })
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

  // Handle protected API routes
  if (pathname.startsWith('/api/reservation') || pathname.startsWith('/api/cast')) {
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
