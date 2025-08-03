import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from './forgot-password-form'
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock store object
const mockStore = {
  id: '1',
  slug: 'ikebukuro',
  name: 'Ikebukuro Store',
  displayName: '池袋店',
  description: 'Test store description',
  storeType: 'beauty_salon',
  phone: '03-1234-5678',
  email: 'ikebukuro@example.com',
  website: 'https://example.com',
  address: '東京都豊島区池袋1-1-1',
  city: '豊島区',
  state: '東京都',
  zipCode: '170-0014',
  country: 'JP',
  latitude: 35.7295,
  longitude: 139.7109,
  timezone: 'Asia/Tokyo',
  currency: 'JPY',
  businessHours: {},
  settings: {},
  integrations: {},
  metadata: {},
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  openingHours: {
    weekday: { open: '10:00', close: '22:00' },
    weekend: { open: '10:00', close: '22:00' },
  },
  location: {
    lat: 35.7295,
    lng: 139.7109,
  },
  features: ['駐車場あり', 'クレジットカード可'],
  images: {
    main: '/images/store-main.jpg',
    gallery: ['/images/store-1.jpg', '/images/store-2.jpg'],
  },
}

describe('ForgotPasswordForm', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
  })

  it('should display the form initially', () => {
    render(<ForgotPasswordForm store={mockStore} />)

    expect(screen.getByText('パスワードをお忘れの方')).toBeInTheDocument()
    expect(screen.getByText('ご登録のメールアドレスを入力してください')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'リセットリンクを送信' })).toBeInTheDocument()
  })

  it('should successfully submit and show success message', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'パスワードリセットメールを送信しました' }),
    } as Response)

    const { container } = render(<ForgotPasswordForm store={mockStore} />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const submitButtons = screen.getAllByRole('button', { name: 'リセットリンクを送信' })
    const submitButton = submitButtons[0]

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      const successTitles = screen.getAllByText('送信完了')
      expect(successTitles[0]).toBeInTheDocument()
      const successMessages = screen.getAllByText('パスワードリセットの手順をメールで送信しました')
      expect(successMessages[0]).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
  })

  it('should show success message even on API error (security)', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'User not found' }),
    } as Response)

    render(<ForgotPasswordForm store={mockStore} />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const submitButtons = screen.getAllByRole('button', { name: 'リセットリンクを送信' })
    const submitButton = submitButtons[0]

    await user.type(emailInput, 'nonexistent@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      const successTitles = screen.getAllByText('送信完了')
      expect(successTitles[0]).toBeInTheDocument()
      const successMessages = screen.getAllByText('パスワードリセットの手順をメールで送信しました')
      expect(successMessages[0]).toBeInTheDocument()
    })
  })

  it('should show success message even on network error (security)', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<ForgotPasswordForm store={mockStore} />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const submitButtons = screen.getAllByRole('button', { name: 'リセットリンクを送信' })
    const submitButton = submitButtons[0]

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      const successTitles = screen.getAllByText('送信完了')
      expect(successTitles[0]).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'メール送信完了' }),
            } as Response)
          }, 100)
        })
    )

    render(<ForgotPasswordForm store={mockStore} />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const submitButtons = screen.getAllByRole('button', { name: 'リセットリンクを送信' })
    const submitButton = submitButtons[0]

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    expect(screen.getByText('送信中...')).toBeInTheDocument()

    await waitFor(() => {
      const successTitles = screen.getAllByText('送信完了')
      expect(successTitles[0]).toBeInTheDocument()
    })
  })

  it('should have a link back to login', () => {
    render(<ForgotPasswordForm store={mockStore} />)

    const loginLinks = screen.getAllByRole('link', { name: 'ログインページに戻る' })
    expect(loginLinks[0]).toBeInTheDocument()
    expect(loginLinks[0]).toHaveAttribute('href', '/ikebukuro/login')
  })
})
