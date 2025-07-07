import { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Home, Users, User } from 'lucide-react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Salon Booking</h1>
            </Link>
            <nav className="hidden space-x-8 md:flex">
              <Link href="/" className="text-gray-600 transition-colors hover:text-gray-900">
                ホーム
              </Link>
              <Link href="/booking" className="text-gray-600 transition-colors hover:text-gray-900">
                予約
              </Link>
              <Link href="/cast" className="text-gray-600 transition-colors hover:text-gray-900">
                キャスト
              </Link>
              <Link href="/mypage" className="text-gray-600 transition-colors hover:text-gray-900">
                マイページ
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                ログイン
              </Button>
              <Button size="sm">新規登録</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Salon Booking</h3>
              <p className="text-sm text-gray-400">最高のサロン体験をご提供します</p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">サービス</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/booking" className="text-sm text-gray-400 hover:text-white">
                    オンライン予約
                  </Link>
                </li>
                <li>
                  <Link href="/cast" className="text-sm text-gray-400 hover:text-white">
                    キャスト一覧
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">会社情報</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-gray-400 hover:text-white">
                    会社概要
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-gray-400 hover:text-white">
                    お問い合わせ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">法的情報</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-gray-400 hover:text-white">
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-400 hover:text-white">
                    利用規約
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Salon Booking. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden">
        <div className="grid h-16 grid-cols-4">
          <Link
            href="/"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900"
          >
            <Home className="h-5 w-5" />
            <span className="mt-1 text-xs">ホーム</span>
          </Link>
          <Link
            href="/booking"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900"
          >
            <Calendar className="h-5 w-5" />
            <span className="mt-1 text-xs">予約</span>
          </Link>
          <Link
            href="/cast"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900"
          >
            <Users className="h-5 w-5" />
            <span className="mt-1 text-xs">キャスト</span>
          </Link>
          <Link
            href="/mypage"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900"
          >
            <User className="h-5 w-5" />
            <span className="mt-1 text-xs">マイページ</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
