/**
 * @design_doc   Authentication middleware using NextAuth.js
 * @related_to   authOptions in lib/auth/config.ts, NextAuth API routes
 * @known_issues None currently
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api',
  '/_next',
  '/favicon.ico',
]

// Auth routes that should be accessible without authentication
const authRoutes = [
  '/login',
  '/register',
  '/admin/login',
  '/auth',
]

// Routes that require admin role
const adminRoutes = [
  '/admin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin にアクセスした場合、/admin/dashboard にリダイレクト
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) ||
    authRoutes.some(route => pathname.startsWith(route)) ||
    pathname.match(/^\/((?!admin|mypage).)*$/) // All non-admin, non-mypage routes

  // Get session token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Handle authentication routes
  if (authRoutes.some(route => pathname.startsWith(route))) {
    // If already authenticated, redirect to appropriate dashboard
    if (token) {
      if (token.role === 'admin' && pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (token.role === 'customer') {
        const store = pathname.split('/')[1]
        return NextResponse.redirect(new URL(`/${store}`, request.url))
      }
    }
    return undefined
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

    return undefined
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

    return undefined
  }

  // Allow all other public routes
  if (isPublicRoute) {
    return undefined
  }

  // Default: require authentication
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url, { status: 307 })
  }

  return undefined
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
