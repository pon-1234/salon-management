/**
 * @design_doc   Permission-aware administrator customer actions
 * @related_to   Header and CustomerSelectionDialog
 * @known_issues None
 */
import { act, render, screen, waitFor } from '@testing-library/react'
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
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
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

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandInput: () => <input aria-label="キャストを検索" />,
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
    authState.permissions = ['customer:read', 'reservation:create']
    authState.currentStore = { id: 'ikebukuro', slug: 'ikebukuro' }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    )
  })

  it('shows reservation and customer lookup launchers with both required permissions', () => {
    render(<Header />)

    expect(screen.getByRole('link', { name: '顧客管理' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '予約作成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '顧客検索' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'モバイル予約作成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'モバイル顧客検索' })).toBeInTheDocument()
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

  it('clears the previous store cast list immediately while the next store loads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'ikebukuro-cast', name: '池袋キャスト' }],
      } as Response)
      .mockImplementationOnce(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<Header />)

    expect(await screen.findByText('池袋キャスト')).toBeInTheDocument()

    authState.currentStore = { id: 'shinjuku', slug: 'shinjuku' }
    rerender(<Header />)

    await waitFor(() => expect(screen.queryByText('池袋キャスト')).not.toBeInTheDocument())
  })

  it('ignores a delayed cast response from the previous store', async () => {
    let resolveIkebukuro: ((response: Response) => void) | undefined
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes('storeId=ikebukuro')) {
        return new Promise<Response>((resolve) => {
          resolveIkebukuro = resolve
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => [{ id: 'shinjuku-cast', name: '新宿キャスト' }],
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<Header />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    authState.currentStore = { id: 'shinjuku', slug: 'shinjuku' }
    rerender(<Header />)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cast?storeId=shinjuku&limit=100',
        expect.any(Object)
      )
    )
    expect(await screen.findByText('新宿キャスト')).toBeInTheDocument()

    await act(async () => {
      resolveIkebukuro?.({
        ok: true,
        json: async () => [{ id: 'ikebukuro-cast', name: '池袋キャスト' }],
      } as Response)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByText('新宿キャスト')).toBeInTheDocument()
    expect(screen.queryByText('池袋キャスト')).not.toBeInTheDocument()
  })
})
