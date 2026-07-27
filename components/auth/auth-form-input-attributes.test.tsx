/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-8 authentication form usability
 * @related_to   LoginForm and RegisterForm customer credential fields
 * @known_issues None
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
)

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}))

const store = {
  id: 'store-1',
  slug: 'ikebukuro',
  name: '池袋店',
  displayName: '池袋店',
} as never

afterEach(cleanup)

describe('customer authentication field attributes', () => {
  it('marks login credentials for browser autofill and native validation', () => {
    render(<LoginForm store={store} />)

    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('メールアドレス')).toBeRequired()
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText('パスワード')).toBeRequired()
  })

  it('marks registration identity and credential fields with semantic attributes', () => {
    const { container } = render(<RegisterForm store={store} />)

    expect(screen.getByLabelText('ニックネーム')).toHaveAttribute('autocomplete', 'nickname')
    expect(screen.getByLabelText('ニックネーム')).toBeRequired()
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('メールアドレス')).toBeRequired()
    expect(screen.getByLabelText('電話番号')).toHaveAttribute('autocomplete', 'tel')
    expect(screen.getByLabelText('電話番号')).toHaveAttribute('inputmode', 'tel')
    expect(screen.getByLabelText('電話番号')).toBeRequired()
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('パスワード')).toBeRequired()
    expect(screen.getByLabelText('パスワード（確認）')).toHaveAttribute(
      'autocomplete',
      'new-password'
    )
    expect(screen.getByLabelText('パスワード（確認）')).toBeRequired()
    expect(container.querySelector('input[name="smsNotifications"]')).not.toBeNull()
    expect(container.querySelector('input[name="agreed"]')).toBeRequired()
  })
})
