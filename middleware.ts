/**
 * @design_doc   Authentication middleware using NextAuth.js
 * @related_to   authOptions in lib/auth/config.ts, NextAuth API routes
 * @known_issues None currently
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { env } from '@/lib/config/env'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import {
  AGE_VERIFICATION_COOKIE,
  AGE_VERIFICATION_COOKIE_VALUE,
  getStorefrontSlug,
  isAgeVerificationPath,
} from '@/lib/age-verification'

// Public routes that don't require authentication
const publicRoutes = ['/', '/_next', '/favicon.ico']

// Auth routes that should be accessible without authentication
const authRoutes = ['/login', '/register', '/admin/login', '/auth', '/api/auth', '/cast/login']
const storeCastLoginPattern = /^\/[^/]+\/cast\/login$/
const publicApiRoutes = ['/api/age-verification', '/api/health', '/api/line/webhook']
const publicPostApiRoutes = ['/api/request-attendance']
const publicReadApiPrefixes = ['/api/course', '/api/option']
const storeScopedApiPrefixes = [
  '/api/admin/cast/settlements',
  '/api/analytics',
  '/api/cast',
  '/api/cast-schedule',
  '/api/course',
  '/api/customer/insights',
  '/api/designation-fee',
  '/api/option',
  '/api/reservation',
  '/api/review',
  '/api/settings',
  '/api/store-schedule',
]
const PREVIEW_ACCESS_GATE_HEADER = 'x-preview-access-gate-token'
const LEGACY_IKEBUKURO_PREVIEW_PATH = '/uat-ikebukuro'
const CANONICAL_IKEBUKURO_PATH = '/ikebukuro'

function matchesApiPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function extractStoreContext(request: NextRequest): string | null {
  const queryStore =
    request.nextUrl.searchParams.get('storeId') ?? request.nextUrl.searchParams.get('store')
  const headerStore =
    request.headers.get('x-store-id') ??
    request.headers.get('x-store-code') ??
    request.headers.get('x-tenant-id')
  const candidate = queryStore ?? headerStore

  if (!candidate) {
    return null
  }

  const normalized = candidate.trim().toLowerCase()
  return normalized || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    env.runtimeMode === 'preview' &&
    pathname !== '/api/health' &&
    request.headers.get(PREVIEW_ACCESS_GATE_HEADER) !== env.preview.accessGateToken
  ) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (
    env.runtimeMode === 'preview' &&
    (pathname === LEGACY_IKEBUKURO_PREVIEW_PATH ||
      pathname.startsWith(`${LEGACY_IKEBUKURO_PREVIEW_PATH}/`))
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `${CANONICAL_IKEBUKURO_PATH}${pathname.slice(
      LEGACY_IKEBUKURO_PREVIEW_PATH.length
    )}`
    return NextResponse.redirect(redirectUrl, { status: 307 })
  }

  const storefrontSlug = getStorefrontSlug(pathname)
  if (
    storefrontSlug &&
    !isAgeVerificationPath(pathname, storefrontSlug) &&
    request.cookies.get(AGE_VERIFICATION_COOKIE)?.value !== AGE_VERIFICATION_COOKIE_VALUE
  ) {
    const verificationUrl = request.nextUrl.clone()
    verificationUrl.pathname = `/${storefrontSlug}/age-verification`
    verificationUrl.search = ''
    verificationUrl.searchParams.set(
      'callbackUrl',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )
    return NextResponse.redirect(verificationUrl, { status: 307 })
  }

  const isApiRoute = pathname.startsWith('/api')
  const isPublicReadApiRoute =
    isApiRoute &&
    request.method === 'GET' &&
    publicReadApiPrefixes.some((route) => pathname.startsWith(route))
  const isPublicApiRoute =
    isApiRoute &&
    (pathname.startsWith('/api/public') ||
      publicApiRoutes.some((route) => matchesApiPrefix(pathname, route)) ||
      (request.method === 'POST' && publicPostApiRoutes.some((route) => pathname === route)) ||
      isPublicReadApiRoute)

  if (isPublicApiRoute) {
    return NextResponse.next()
  }

  // Check if route is public
  const isStoreCastAuthRoute = storeCastLoginPattern.test(pathname)

  const isPublicRoute =
    !isApiRoute &&
    (publicRoutes.some((route) => pathname.startsWith(route)) ||
      authRoutes.some((route) => pathname.startsWith(route)) ||
      isStoreCastAuthRoute ||
      pathname.match(/^\/((?!admin|mypage|cast).)*$/)) // All non-admin, non-mypage, non-cast routes

  // Get session token
  const token = await getToken({
    req: request,
    secret: env.nextAuth.secret,
  })

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route)) || isStoreCastAuthRoute

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

      if (token.role === 'cast') {
        return NextResponse.redirect(new URL('/cast/dashboard', request.url))
      }
    }

    return NextResponse.next()
  }

  const isStoreScopedApi =
    isApiRoute && storeScopedApiPrefixes.some((prefix) => matchesApiPrefix(pathname, prefix))
  if (isStoreScopedApi && token?.role === 'admin') {
    const storeId = extractStoreContext(request)
    if (!storeId) {
      return NextResponse.json({ error: '店舗を明示してください' }, { status: 400 })
    }
    if (!canAdminAccessStore(token, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }
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

  // Handle cast portal routes
  if (pathname.startsWith('/cast')) {
    // Allow unauthenticated access to cast login
    if (pathname.startsWith('/cast/login')) {
      return NextResponse.next()
    }

    if (!token) {
      const url = new URL('/cast/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url, { status: 307 })
    }

    if (token.role !== 'cast') {
      const url = new URL('/cast/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url, { status: 307 })
    }

    if (pathname === '/cast') {
      return NextResponse.redirect(new URL('/cast/dashboard', request.url))
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

  // Allow CRON job API routes (these handle their own authentication via CRON_SECRET)
  const cronRoutes = ['/api/customer/points/expire', '/api/customer/points/notify-expiring']
  if (isApiRoute && cronRoutes.some((route) => pathname === route)) {
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
