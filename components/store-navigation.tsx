'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Phone, Menu, User, LogIn, LogOut } from 'lucide-react'
import { useStore } from '@/components/store-provider'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const navigationItems = [
  { name: '料金システム', href: '/pricing' },
  { name: 'プレイ内容', href: '/services' },
  { name: '在籍一覧', href: '/cast' },
  { name: '出勤一覧', href: '/schedule' },
  { name: '入店情報', href: '/recruitment' },
  { name: 'ランキング', href: '/ranking' },
  { name: 'クチコミ', href: '/reviews' },
]

export function StoreNavigation() {
  const pathname = usePathname()
  const store = useStore()
  const { data: session, status } = useSession()

  const isAuthenticated = status === 'authenticated'
  const isCustomer = isAuthenticated && session?.user?.role === 'customer'
  const customerName = session?.user?.name ?? session?.user?.email ?? '会員'

  const handleLogout = async () => {
    await signOut({
      callbackUrl: `/${store.slug}`,
    })
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={`/${store.slug}`} className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{store.displayName}</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={`/${store.slug}${item.href}`}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === `/${store.slug}${item.href}`
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {isCustomer ? (
              <>
                <div className="hidden flex-col text-right sm:flex">
                  <span className="text-xs text-muted-foreground">ログイン中</span>
                  <span className="text-sm font-semibold text-primary">{customerName}</span>
                </div>
                <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                  <Link href={`/${store.slug}/mypage`}>
                    <User className="mr-2 h-4 w-4" />
                    マイページ
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </Button>
              </>
            ) : status === 'loading' ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">認証確認中...</span>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                  <Link href={`/${store.slug}/register`}>
                    <User className="mr-2 h-4 w-4" />
                    会員登録
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                  <Link href={`/${store.slug}/login`}>
                    <LogIn className="mr-2 h-4 w-4" />
                    ログイン
                  </Link>
                </Button>
              </>
            )}

            <div className="flex flex-col items-end">
              <a
                href={`tel:${store.phone}`}
                className="flex items-center gap-1 font-bold text-primary"
              >
                <Phone className="h-4 w-4" />
                {store.phone}
              </a>
              <span className="text-xs text-muted-foreground">
                {store.openingHours.weekday.open}～翌
                {store.openingHours.weekday.close.split(':')[0]}:00
              </span>
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{store.name}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-4">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={`/${store.slug}${item.href}`}
                      className={cn(
                        'py-2 text-sm font-medium transition-colors hover:text-primary',
                        pathname === `/${store.slug}${item.href}`
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <hr className="my-4" />
                  {isCustomer ? (
                    <>
                      <Link href={`/${store.slug}/mypage`} className="py-2 text-sm font-medium">
                        マイページ
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 py-2 text-left text-sm font-medium text-red-600"
                      >
                        <LogOut className="h-4 w-4" />
                        ログアウト
                      </button>
                    </>
                  ) : status === 'loading' ? (
                    <span className="py-2 text-sm text-muted-foreground">認証確認中...</span>
                  ) : (
                    <>
                      <Link href={`/${store.slug}/register`} className="py-2 text-sm font-medium">
                        会員登録
                      </Link>
                      <Link href={`/${store.slug}/login`} className="py-2 text-sm font-medium">
                        ログイン
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
