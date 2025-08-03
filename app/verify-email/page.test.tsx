import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VerifyEmailPage from './page'
import { useRouter, useSearchParams } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

describe('VerifyEmailPage', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
  })

  afterEach(() => {
    cleanup()
  })

  it('should show error when no token is provided', () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any)

    render(<VerifyEmailPage />)

    const errorTexts = screen.getAllByText('エラー')
    expect(errorTexts[0]).toBeInTheDocument()
    expect(screen.getByText('無効なリンクです')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'ログインページへ' })
    expect(buttons[0]).toBeInTheDocument()
  })

  it('should successfully verify email with valid token', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'メールアドレスが確認されました' }),
    } as Response)

    render(<VerifyEmailPage />)

    // Initially shows loading state
    expect(screen.getByText('メール確認中...')).toBeInTheDocument()
    expect(screen.getByText('しばらくお待ちください')).toBeInTheDocument()

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('メール確認完了')).toBeInTheDocument()
      expect(screen.getByText('メールアドレスが正常に確認されました')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-email/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token' }),
    })

    const buttons = screen.getAllByRole('button', { name: 'ログインページへ' })
    expect(buttons[0]).toBeInTheDocument()
  })

  it('should show error for invalid token', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('invalid-token'),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '無効または期限切れのトークンです' }),
    } as Response)

    render(<VerifyEmailPage />)

    // Initially shows loading state
    expect(screen.getByText('メール確認中...')).toBeInTheDocument()

    // Wait for error state
    await waitFor(() => {
      const errorTexts = screen.getAllByText('エラー')
      expect(errorTexts[0]).toBeInTheDocument()
      expect(screen.getByText('無効または期限切れのトークンです')).toBeInTheDocument()
    })
  })

  it('should show custom success message from API response', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'メールアドレスが正常に確認されました' }),
    } as Response)

    render(<VerifyEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('メール確認完了')).toBeInTheDocument()
      expect(screen.getByText('メールアドレスが正常に確認されました')).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as any)

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<VerifyEmailPage />)

    await waitFor(() => {
      const errorTexts = screen.getAllByText('エラー')
      expect(errorTexts[0]).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should handle API response without error field', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('invalid-token'),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    render(<VerifyEmailPage />)

    await waitFor(() => {
      const errorTexts = screen.getAllByText('エラー')
      expect(errorTexts[0]).toBeInTheDocument()
      expect(screen.getByText('メール確認に失敗しました')).toBeInTheDocument()
    })
  })

  it('should navigate to login page when button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'メールアドレスが確認されました' }),
    } as Response)

    render(<VerifyEmailPage />)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'ログインページへ' })
      expect(buttons[0]).toBeInTheDocument()
    })

    const loginButtons = screen.getAllByRole('button', { name: 'ログインページへ' })
    const loginButton = loginButtons[0]
    await user.click(loginButton)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should not show button during loading state', () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as any)

    vi.mocked(global.fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          // Never resolve to keep in loading state
        })
    )

    render(<VerifyEmailPage />)

    expect(screen.getByText('メール確認中...')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ログインページへ' })).not.toBeInTheDocument()
  })

  it('should use different button variant for error state', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('invalid-token'),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'エラー' }),
    } as Response)

    render(<VerifyEmailPage />)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'ログインページへ' })
      const button = buttons[0]
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-background')
    })
  })
})
