'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Phone, Menu, User, LogIn } from 'lucide-react'
import { useStore } from '@/components/store-provider'
import {
  Sheet,
  SheetContent,
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${store.slug}`} className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{store.displayName}</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
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
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <User className="h-4 w-4 mr-2" />
              会員登録
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <LogIn className="h-4 w-4 mr-2" />
              ログイン
            </Button>
            
            <div className="flex flex-col items-end">
              <a href={`tel:${store.phone}`} className="flex items-center gap-1 text-primary font-bold">
                <Phone className="h-4 w-4" />
                {store.phone}
              </a>
              <span className="text-xs text-muted-foreground">
                {store.openingHours.weekday.open}～翌{store.openingHours.weekday.close.split(':')[0]}:00
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
                <nav className="flex flex-col gap-4 mt-6">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={`/${store.slug}${item.href}`}
                      className={cn(
                        'text-sm font-medium transition-colors hover:text-primary py-2',
                        pathname === `/${store.slug}${item.href}` 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <hr className="my-4" />
                  <Link href={`/${store.slug}/register`} className="text-sm font-medium py-2">
                    会員登録
                  </Link>
                  <Link href={`/${store.slug}/login`} className="text-sm font-medium py-2">
                    ログイン
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}