import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin にアクセスした場合、/admin/dashboard にリダイレクト
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // 管理画面へのアクセス制御
  if (pathname.startsWith('/admin')) {
    
    // ここで認証チェックを行う
    // 現在はモックなので、常に通過させる
    // 実際の実装では、JWTトークンやセッションをチェック
    
    // 例: 認証されていない場合のリダイレクト
    // const token = request.cookies.get('auth-token')
    // if (!token) {
    //   return NextResponse.redirect(new URL('/login', request.url))
    // }
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}