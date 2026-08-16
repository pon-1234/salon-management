/**
 * @design_doc   Customer and cast chat deep-link selection contract
 * @related_to   ChatPage, CustomerList, CastList, chat participant APIs
 * @known_issues Customer-list pagination is covered by a separate task
 */
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatPage from './page'

const navigationState = vi.hoisted(() => ({ query: '' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigationState.query),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))

vi.mock('@/components/chat/customer-list', () => ({
  CustomerList: ({ selectedCustomerId }: { selectedCustomerId?: string }) => (
    <div data-testid="customer-list">{selectedCustomerId ?? 'none'}</div>
  ),
}))

vi.mock('@/components/chat/customer-header', () => ({
  CustomerHeader: ({ customer }: { customer?: { name: string } }) => (
    <div data-testid="customer-header">{customer?.name ?? 'none'}</div>
  ),
}))

vi.mock('@/components/chat/cast-list', () => ({
  CastList: ({ selectedCastId }: { selectedCastId?: string }) => (
    <div data-testid="cast-list">{selectedCastId ?? 'none'}</div>
  ),
}))

vi.mock('@/components/chat/cast-header', () => ({
  CastHeader: ({ cast }: { cast?: { name: string } }) => (
    <div data-testid="cast-header">{cast?.name ?? 'none'}</div>
  ),
}))

vi.mock('@/components/chat/chat-window', () => ({
  ChatWindow: ({
    participantType,
    participantId,
  }: {
    participantType: 'customer' | 'cast'
    participantId?: string
  }) => (
    <div data-testid="chat-window">
      {participantType}:{participantId ?? 'none'}
    </div>
  ),
}))

vi.mock('@/components/chat/chat-broadcast-dialog', () => ({
  ChatBroadcastDialog: () => null,
}))

const customer = {
  id: 'legacy-customer/member 100448',
  name: '確認顧客',
  lastMessage: '',
  lastMessageTime: '',
  hasUnread: false,
  unreadCount: 0,
  isOnline: false,
  memberType: 'regular',
  status: 'オフライン',
}

const cast = {
  id: 'legacy-cast-56060',
  name: '確認キャスト',
  lastMessage: '',
  lastMessageTime: '',
  hasUnread: false,
  unreadCount: 0,
  isOnline: false,
  status: 'オフライン',
}

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('ChatPage deep links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigationState.query = ''
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the chat workspace inside the viewport so the composer stays reachable', () => {
    render(<ChatPage />)

    expect(screen.getByTestId('admin-chat-workspace')).toHaveClass(
      'h-[calc(100dvh-5.5rem)]',
      'min-h-0',
      'overflow-hidden'
    )
    expect(screen.getByTestId('admin-chat-panes')).toHaveClass('min-h-0', 'overflow-hidden')
  })

  it('hydrates and selects the customer requested by customerId', async () => {
    navigationState.query = `customerId=${encodeURIComponent(customer.id)}`
    vi.mocked(fetch).mockResolvedValue(mockResponse(customer))

    render(<ChatPage />)

    expect(await screen.findByText(customer.name)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      `/api/chat/customers?id=${encodeURIComponent(customer.id)}&storeId=store-a`,
      { credentials: 'include' }
    )
    expect(screen.getByTestId('customer-list')).toHaveTextContent(customer.id)
    expect(screen.getByTestId('chat-window')).toHaveTextContent(`customer:${customer.id}`)
  })

  it('shows an explicit error when the requested customer cannot be loaded', async () => {
    navigationState.query = 'customerId=missing-customer'
    vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Customer not found' }, 404))

    render(<ChatPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '対象の顧客チャットを開けませんでした'
    )
    expect(screen.getByTestId('customer-header')).toHaveTextContent('none')
    expect(screen.getByTestId('chat-window')).toHaveTextContent('customer:none')
  })

  it('keeps the existing castId deep link working', async () => {
    navigationState.query = `castId=${encodeURIComponent(cast.id)}`
    vi.mocked(fetch).mockResolvedValue(mockResponse(cast))

    render(<ChatPage />)

    expect(await screen.findByText(cast.name)).toBeInTheDocument()
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/chat/casts?id=${encodeURIComponent(cast.id)}&storeId=store-a`,
        {
          credentials: 'include',
        }
      )
    })
    expect(screen.getByTestId('cast-list')).toHaveTextContent(cast.id)
    expect(screen.getByTestId('chat-window')).toHaveTextContent(`cast:${cast.id}`)
  })

  it('shows an explicit error instead of fabricating a cast when a deep link is outside the store', async () => {
    navigationState.query = 'castId=foreign-cast'
    vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Cast not found' }, 404))

    render(<ChatPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '対象のキャストチャットを開けませんでした'
    )
    expect(screen.getByTestId('cast-header')).toHaveTextContent('none')
    expect(screen.getByTestId('chat-window')).toHaveTextContent('cast:none')
  })
})
