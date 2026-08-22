/**
 * @design_doc   Permission-aware administrator customer actions
 * @related_to   Header and CustomerSelectionDialog
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

const navigationState = vi.hoisted(() => ({ pathname: '/admin/dashboard' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => navigationState.pathname,
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

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

describe('Header customer permissions', () => {
  beforeEach(() => {
    navigationState.pathname = '/admin/dashboard'
    authState.permissions = ['customer:read', 'reservation:create']
    authState.currentStore = { id: 'ikebukuro', slug: 'ikebukuro' }
  })

  it('marks the current destination as the active page', () => {
    navigationState.pathname = '/admin/chat'
    render(<Header />)

    const chatLinks = screen.getAllByRole('link', { name: 'チャット' })
    expect(chatLinks.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true)
    const homeLinks = screen.getAllByRole('link', { name: 'ホーム' })
    expect(homeLinks.every((link) => link.getAttribute('aria-current') !== 'page')).toBe(true)
  })

  it('shows reservation and customer lookup launchers with both required permissions', () => {
    render(<Header />)

    expect(screen.getAllByRole('link', { name: '予約表' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: '顧客管理' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '予約作成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '顧客検索' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'モバイル予約作成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'モバイル顧客検索' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: '顧客電話番号検索' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('顧客の電話番号')).not.toBeInTheDocument()
  })

  it('keeps customer lookup but hides reservation creation without reservation:create', () => {
    authState.permissions = ['customer:read']

    render(<Header />)

    expect(screen.queryByRole('button', { name: '予約作成' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '顧客検索' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'モバイル予約作成' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'モバイル顧客検索' })).toBeInTheDocument()
  })

  it('hides every customer-dialog launcher without customer:read permission', () => {
    authState.permissions = ['dashboard:view']

    render(<Header />)

    expect(screen.queryByRole('button', { name: '予約作成' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '顧客検索' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'モバイル予約作成' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'モバイル顧客検索' })).not.toBeInTheDocument()
  })

  it('hides customer management navigation with customer:create but without customer:read', () => {
    authState.permissions = ['customer:create']

    render(<Header />)

    expect(screen.queryByRole('link', { name: '顧客管理' })).not.toBeInTheDocument()
  })
})
