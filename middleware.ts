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

  // 保護対象のパスプレフィックス
  const protectedPaths = ['/admin', '/mypage', '/api/reservation', '/api/cast']

  // 現在のパスが保護対象かどうかをチェック
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtected) {
    if (!token) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      // ページアクセスの場合はログインページにリダイレクト
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    try {
      // JWTの検証
      const { payload } = await jwtVerify(token, await getJwtSecret());
      const customerId = payload.customerId as string;

      if (!customerId) {
        throw new Error('Customer ID not found in token');
      }

      // リクエストヘッダーをコピーして新しいヘッダーを作成
      const requestHeaders = new Headers(request.headers);
      // カスタムヘッダーに顧客IDを追加
      requestHeaders.set('x-customer-id', customerId);

      // 新しいヘッダーでリクエストを続行
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('JWT Verification Error:', error)
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
      // ページアクセスの場合はログインページにリダイレクト
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }
  
  // /admin にアクセスした場合、/admin/dashboard にリダイレクト (認証チェック後に行うべきだが、一旦残す)
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // エンドユーザー向けページは認証不要（一部除く）
  if (pathname.startsWith('/mypage')) {
    // マイページは認証が必要
    // const userToken = request.cookies.get('user-token')
    // if (!userToken) {
    //   return NextResponse.redirect(new URL('/login', request.url))
    // }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     *
     * APIルートもミドルウェアの対象に含めるため、'api'の除外を削除
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
