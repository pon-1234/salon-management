/**
 * @design_doc   Role-based access control middleware
 * @related_to   Admin and Customer authentication, JWT tokens
 * @known_issues None currently
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
  }
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const tokenCookie = request.cookies.get('auth-token')
  const token = tokenCookie?.value

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/_next',
    '/favicon.ico',
    '/login',
    '/register',
    '/admin/login',
  ]

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  
  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protected paths
  const isAdminPath = pathname.startsWith('/admin')
  const isCustomerPath = pathname.includes('/mypage')
  const isProtectedApiPath = pathname.startsWith('/api/reservation') || pathname.startsWith('/api/cast')

  // No token - redirect to login
  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Redirect to appropriate login page
    if (isAdminPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url, { status: 307 })
    } else if (isCustomerPath) {
      // Extract store from URL for customer routes
      const pathParts = pathname.split('/')
      const store = pathParts[1]
      const url = request.nextUrl.clone()
      url.pathname = `/${store}/login`
      return NextResponse.redirect(url, { status: 307 })
    }
    
    return NextResponse.next()
  }

  // Verify JWT token
  try {
    const { payload } = await jwtVerify(token, await getJwtSecret())
    
    // Validate token structure based on role
    if (payload.role === 'admin') {
      if (!payload.adminId) {
        throw new Error('Invalid admin token structure')
      }
    } else if (payload.role === 'customer') {
      if (!payload.customerId) {
        throw new Error('Invalid customer token structure')
      }
    } else {
      throw new Error('Invalid role in token')
    }

    // Check role-based access
    if (isAdminPath) {
      if (payload.role !== 'admin') {
        if (pathname.startsWith('/api')) {
          return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
        }
        return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
      }
      
      // Special redirect for /admin to /admin/dashboard
      if (pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }

    // Add user info to request headers
    const requestHeaders = new Headers(request.headers)
    if (payload.role === 'admin') {
      requestHeaders.set('x-customer-id', payload.adminId as string)
    } else if (payload.role === 'customer') {
      requestHeaders.set('x-customer-id', payload.customerId as string)
    }

    // Continue with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error('JWT Verification Error:', error)
    
    if (pathname.startsWith('/api')) {
      const errorMessage = error instanceof Error && error.message.includes('token structure') 
        ? 'Invalid token structure' 
        : 'Invalid or expired token'
      return NextResponse.json({ error: errorMessage }, { status: 401 })
    }
    
    // Redirect to appropriate login page
    const url = request.nextUrl.clone()
    if (isAdminPath) {
      url.pathname = '/admin/login'
    } else if (isCustomerPath) {
      const pathParts = pathname.split('/')
      const store = pathParts[1]
      url.pathname = `/${store}/login`
    } else {
      url.pathname = '/login'
    }
    
    return NextResponse.redirect(url, { status: 307 })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}