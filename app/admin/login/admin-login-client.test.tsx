/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-10
 * @related_to   AdminLoginClient InfiniTalk callback return
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLoginClient } from './admin-login-client'

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  callbackUrl: null as string | null,
}))

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mocks.signIn(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'callbackUrl' ? mocks.callbackUrl : null),
  }),
}))

describe('AdminLoginClient', () => {
  beforeEach(() => {
    mocks.signIn.mockReset()
    mocks.push.mockReset()
    mocks.refresh.mockReset()
    mocks.callbackUrl = null
  })

  it('returns to the InfiniTalk incoming URL after a successful login', async () => {
    mocks.callbackUrl = '/admin/cti/incoming?telno=09012345678&calledno=0312345678'
    mocks.signIn.mockResolvedValue({ ok: true })

    render(<AdminLoginClient />)
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        '/admin/cti/incoming?telno=09012345678&calledno=0312345678'
      )
    })
  })
})
