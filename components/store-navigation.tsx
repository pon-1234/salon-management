'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Phone, Menu, User, LogIn, LogOut } from 'lucide-react'
import { useStore } from '@/components/store-provider'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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
  const handleLogout = async () => {
    await signOut({
      callbackUrl: `/${store.slug}`,
    })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-luxury-gold-border/40 bg-gradient-to-r from-luxury-brown via-luxury-black to-luxury-brown text-white shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center justify-between gap-6 lg:justify-start">
          {/* Logo */}
          <Link href={`/${store.slug}`} className="flex flex-col">
            <span className="luxury-display text-lg text-luxury-gold md:text-xl">THE SALON</span>
            <span className="text-xs text-[#d6b46a]">{store.displayName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-3 xl:flex 2xl:gap-5">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={`/${store.slug}${item.href}`}
                className={cn(
                  'whitespace-nowrap text-xs font-semibold tracking-[0.12em] text-luxury-gold-soft transition-colors hover:text-luxury-gold-bright 2xl:tracking-[0.2em]',
                  pathname === `/${store.slug}${item.href}`
                    ? 'text-luxury-gold-bright'
                    : 'text-luxury-gold-muted'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isCustomer ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden border border-transparent text-xs text-luxury-gold-soft hover:border-luxury-gold-border/60 hover:text-luxury-gold-bright sm:flex"
                asChild
              >
                <Link href={`/${store.slug}/mypage`}>
                  <User className="mr-2 h-4 w-4" />
                  マイページ
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden border border-transparent text-xs text-luxury-gold-soft hover:border-luxury-gold-border/60 hover:text-luxury-gold-bright sm:flex"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </Button>
            </>
          ) : status === 'loading' ? (
            <span className="hidden text-xs text-luxury-gold-muted sm:inline">認証確認中...</span>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden border border-transparent text-xs text-luxury-gold-soft hover:border-luxury-gold-border/60 hover:text-luxury-gold-bright sm:flex"
                asChild
              >
                <Link href={`/${store.slug}/register`}>
                  <User className="mr-2 h-4 w-4" />
                  会員登録
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden border border-transparent text-xs text-luxury-gold-soft hover:border-luxury-gold-border/60 hover:text-luxury-gold-bright sm:flex"
                asChild
              >
                <Link href={`/${store.slug}/login`}>
                  <LogIn className="mr-2 h-4 w-4" />
                  ログイン
                </Link>
              </Button>
            </>
          )}

          <a
            href={`tel:${store.phone}`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-luxury-gold-border/50 text-luxury-gold sm:hidden"
            aria-label={`電話で問い合わせ ${store.phone}`}
          >
            <Phone className="h-5 w-5" />
          </a>

          <div className="hidden flex-col items-end text-xs text-luxury-gold-muted md:flex">
            <a
              href={`tel:${store.phone}`}
              className="flex items-center gap-2 text-base font-semibold text-luxury-gold transition-colors hover:text-[#f8e2b5]"
            >
              <Phone className="h-4 w-4" />
              {store.phone}
            </a>
            <span>
              営業時間 {store.openingHours.weekday.open}～翌
              {store.openingHours.weekday.close.split(':')[0]}:00
            </span>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="xl:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="店舗メニューを開く"
                className="h-11 w-11 border border-luxury-gold-border/50 text-luxury-gold hover:bg-luxury-brown-muted"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-l border-luxury-border bg-luxury-panel-dark text-white">
              <SheetHeader>
                <SheetTitle className="luxury-display text-luxury-gold">{store.name}</SheetTitle>
                <SheetDescription className="sr-only">
                  店舗ページのナビゲーション、電話、ログイン導線
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4 text-sm">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={`/${store.slug}${item.href}`}
                    className={cn(
                      'flex min-h-11 items-center py-2 text-sm font-medium text-luxury-gold-menu transition-colors hover:text-luxury-gold-bright',
                      pathname === `/${store.slug}${item.href}`
                        ? 'text-luxury-gold-bright'
                        : 'text-luxury-gold-muted'
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="rounded-md border border-luxury-gold-border/35 bg-[#1b1510] p-4">
                  <a
                    href={`tel:${store.phone}`}
                    className="flex min-h-11 items-center gap-2 text-base font-semibold text-luxury-gold transition-colors hover:text-[#f8e2b5]"
                    aria-label={`電話で問い合わせ ${store.phone}`}
                  >
                    <Phone className="h-4 w-4" />
                    {store.phone}
                  </a>
                  <p className="mt-2 text-xs text-luxury-gold-muted">
                    営業時間 {store.openingHours.weekday.open}～翌
                    {store.openingHours.weekday.close.split(':')[0]}:00
                  </p>
                </div>
                <hr className="my-4 border-luxury-border" />
                {isCustomer ? (
                  <>
                    <Link href={`/${store.slug}/mypage`} className="py-2 text-sm font-medium">
                      マイページ
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2 py-2 text-left text-sm font-medium text-[#e05a4f]"
                    >
                      <LogOut className="h-4 w-4" />
                      ログアウト
                    </button>
                  </>
                ) : status === 'loading' ? (
                  <span className="py-2 text-sm text-luxury-gold-muted">認証確認中...</span>
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
    </header>
  )
}
