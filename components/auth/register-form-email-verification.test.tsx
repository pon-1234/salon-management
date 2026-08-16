/**
 * @design_doc   Recoverable registration verification delivery UI
 * @related_to   RegisterForm and verify-email/send API
 * @known_issues Provider delivery is confirmed asynchronously by receipt of email
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from './register-form'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))

global.fetch = vi.fn()
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never

const store = {
  id: 'store-1',
  slug: 'ikebukuro',
  name: '池袋店',
  displayName: '池袋店',
  address: '',
  phone: '',
  email: '',
  openingHours: {
    weekday: { open: '10:00', close: '22:00' },
    weekend: { open: '10:00', close: '22:00' },
  },
  location: { lat: 0, lng: 0 },
  features: [],
  images: { main: '', gallery: [] },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('RegisterForm email verification recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('does not advertise benefits that are not granted by registration', () => {
    render(<RegisterForm store={store} />)

    expect(screen.queryByText(/1000ポイント/)).not.toBeInTheDocument()
    expect(screen.queryByText(/会員限定の特別割引/)).not.toBeInTheDocument()
    expect(screen.queryByText(/誕生日月に特別クーポン/)).not.toBeInTheDocument()
    expect(screen.queryByText(/お気に入りキャストの登録/)).not.toBeInTheDocument()
  })

  it('rejects a short mobile number before public registration is submitted', async () => {
    const user = userEvent.setup()

    render(<RegisterForm store={store} />)
    await user.type(screen.getByLabelText('ニックネーム'), 'Test User')
    await user.type(screen.getByLabelText('メールアドレス'), 'customer@example.com')
    await user.type(screen.getByLabelText('電話番号'), '090-123-4567')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.type(screen.getByLabelText('パスワード（確認）'), 'password123')
    await user.click(screen.getByRole('checkbox', { name: /利用規約/ }))
    await user.click(screen.getByRole('button', { name: '会員登録' }))

    expect(await screen.findByText('有効な日本国内の電話番号を入力してください')).toBeVisible()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('recognizes a created account with failed delivery and offers a store-scoped resend', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({
          error: '会員登録は完了しましたが、確認メールを送信できませんでした',
          code: 'VERIFICATION_DELIVERY_FAILED',
          accountCreated: true,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { message: '確認リンクを送信します' } }),
      } as Response)

    render(<RegisterForm store={store} />)
    await user.type(screen.getByLabelText('ニックネーム'), 'Test User')
    await user.type(screen.getByLabelText('メールアドレス'), '  Customer@Example.COM  ')
    await user.type(screen.getByLabelText('電話番号'), '+81 (0)3-1234-5678')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.type(screen.getByLabelText('パスワード（確認）'), 'password123')
    await user.click(screen.getByRole('checkbox', { name: /利用規約/ }))
    await user.click(screen.getByRole('button', { name: '会員登録' }))

    const resendButton = await screen.findByRole('button', { name: '確認メールを再送' })
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/auth/register',
      expect.objectContaining({
        body: JSON.stringify({
          nickname: 'Test User',
          email: 'customer@example.com',
          phone: '+81312345678',
          password: 'password123',
          smsNotifications: false,
          storeId: 'store-1',
        }),
      })
    )

    await user.click(resendButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/auth/verify-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@example.com', storeId: 'store-1' }),
      })
    })
    expect(screen.getByText(/未確認アカウントがある場合/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
