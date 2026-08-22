/**
 * @design_doc   Header omits a duplicate cast picker; the cast list is the search surface
 * @related_to   Header and CastListPage
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Header } from './header'

const authState = vi.hoisted(() => ({
  permissions: ['customer:read', 'reservation:create'],
  currentStore: { id: 'ikebukuro', slug: 'ikebukuro' },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'admin', permissions: authState.permissions } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/dashboard',
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: authState.currentStore }),
}))

vi.mock('@/contexts/notification-context', () => ({
  useNotifications: () => ({
    notifications: [],
    markAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    unreadCount: 0,
  }),
}))

vi.mock('@/components/store/store-selector', () => ({
  StoreSelector: () => <div>店舗</div>,
}))

vi.mock('@/components/notification-list', () => ({
  NotificationList: () => null,
}))

vi.mock('@/components/notification-detail-dialog', () => ({
  NotificationDetailDialog: () => null,
}))

vi.mock('@/components/customer/customer-selection-dialog', () => ({
  CustomerSelectionDialog: () => null,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

describe('Header search surfaces', () => {
  beforeEach(() => {
    authState.currentStore = { id: 'ikebukuro', slug: 'ikebukuro' }
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  it('does not keep a header cast picker or phone search', () => {
    render(<Header />)

    expect(screen.queryByRole('combobox', { name: /キャスト検索/ })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('キャストを検索...')).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: '顧客電話番号検索' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('顧客の電話番号')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'キャスト' }).length).toBeGreaterThan(0)
  })
})
