import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPasswordPage from './page'
import { useRouter, useSearchParams } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

describe('ResetPasswordPage', () => {
  const mockPush = vi.fn()
  const mockGet = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(useSearchParams).mockReturnValue({ get: mockGet } as any)
  })

  afterEach(() => {
    cleanup()
  })

  it('should display error when no token is provided', () => {
    mockGet.mockReturnValue(null)

    render(<ResetPasswordPage />)

    expect(screen.getByText('エラー')).toBeInTheDocument()
    expect(screen.getByText('無効なリセットリンクです')).toBeInTheDocument()
    expect(screen.getByText('ログインページへ')).toBeInTheDocument()
  })

  it('should navigate to login when clicking login button (no token)', async () => {
    mockGet.mockReturnValue(null)
    const user = userEvent.setup()

    render(<ResetPasswordPage />)

    const loginButtons = screen.getAllByText('ログインページへ')
    await user.click(loginButtons[0])

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should display password reset form with valid token', () => {
    mockGet.mockReturnValue('valid-token-123')

    render(<ResetPasswordPage />)

    expect(screen.getByText('新しいパスワードを設定')).toBeInTheDocument()
    expect(screen.getByText('新しいパスワードを入力してください')).toBeInTheDocument()
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'パスワードをリセット' })).toBeInTheDocument()
  })

  it('should validate password length', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'short')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('パスワードは8文字以上で入力してください')).toBeInTheDocument()
    })
  })

  it('should validate password confirmation match', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const confirmInput = screen.getByLabelText('パスワード（確認）')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'password123')
    await user.type(confirmInput, 'password456')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
    })
  })

  it('should successfully reset password', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'パスワードがリセットされました' }),
    } as Response)

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const confirmInput = screen.getByLabelText('パスワード（確認）')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'newPassword123')
    await user.type(confirmInput, 'newPassword123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('パスワードリセット完了')).toBeInTheDocument()
      expect(screen.getByText('パスワードが正常にリセットされました')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token-123',
        password: 'newPassword123',
      }),
    })
  })

  it('should navigate to login after successful reset', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'パスワードがリセットされました' }),
    } as Response)

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const confirmInput = screen.getByLabelText('パスワード（確認）')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'newPassword123')
    await user.type(confirmInput, 'newPassword123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('パスワードリセット完了')).toBeInTheDocument()
    })

    const loginButtons = screen.getAllByText('ログインページへ')
    const loginButton = loginButtons[0]
    await user.click(loginButton)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should display error on API failure', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '無効なトークンです' }),
    } as Response)

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const confirmInput = screen.getByLabelText('パスワード（確認）')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'newPassword123')
    await user.type(confirmInput, 'newPassword123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('無効なトークンです')).toBeInTheDocument()
    })
  })

  it('should display generic error on network failure', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const confirmInput = screen.getByLabelText('パスワード（確認）')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'newPassword123')
    await user.type(confirmInput, 'newPassword123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    mockGet.mockReturnValue('valid-token-123')
    const user = userEvent.setup()

    vi.mocked(global.fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'パスワードがリセットされました' }),
            } as Response)
          }, 100)
        })
    )

    render(<ResetPasswordPage />)

    const passwordInput = screen.getByLabelText('新しいパスワード')
    const confirmInput = screen.getByLabelText('パスワード（確認）')
    const submitButtons = screen.getAllByRole('button', { name: 'パスワードをリセット' })
    const submitButton = submitButtons[0]

    await user.type(passwordInput, 'newPassword123')
    await user.type(confirmInput, 'newPassword123')
    await user.click(submitButton)

    expect(passwordInput).toBeDisabled()
    expect(confirmInput).toBeDisabled()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByText('パスワードリセット完了')).toBeInTheDocument()
    })
  })
})
