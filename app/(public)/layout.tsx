import { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Home, Users, User } from 'lucide-react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Salon Booking</h1>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                ホーム
              </Link>
              <Link href="/booking" className="text-gray-600 hover:text-gray-900 transition-colors">
                予約
              </Link>
              <Link href="/cast" className="text-gray-600 hover:text-gray-900 transition-colors">
                キャスト
              </Link>
              <Link href="/mypage" className="text-gray-600 hover:text-gray-900 transition-colors">
                マイページ
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                ログイン
              </Button>
              <Button size="sm">
                新規登録
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Salon Booking</h3>
              <p className="text-gray-400 text-sm">
                最高のサロン体験をご提供します
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">
                サービス
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/booking" className="text-gray-400 hover:text-white text-sm">
                    オンライン予約
                  </Link>
                </li>
                <li>
                  <Link href="/cast" className="text-gray-400 hover:text-white text-sm">
                    キャスト一覧
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">
                会社情報
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white text-sm">
                    会社概要
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white text-sm">
                    お問い合わせ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">
                法的情報
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
                    利用規約
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Salon Booking. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 h-16">
          <Link href="/" className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">ホーム</span>
          </Link>
          <Link href="/booking" className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900">
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">予約</span>
          </Link>
          <Link href="/cast" className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900">
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">キャスト</span>
          </Link>
          <Link href="/mypage" className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900">
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">マイページ</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}