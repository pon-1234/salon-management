/**
 * @design_doc   docs/ROUTING_STRUCTURE.md secure LINE cast registration flow
 * @related_to   CastLineRegistrationPanel issues a one-time command from the admin surface
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CastLineRegistrationPanel } from './cast-line-registration-panel'

describe('CastLineRegistrationPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('issues and displays the one-time command without deriving it from the cast ID', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          command: `reg ${'A'.repeat(43)}`,
          expiresAt: '2026-07-20T00:15:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    )

    render(<CastLineRegistrationPanel castId="cast-public-id" storeId="store-a" isLinked={false} />)

    await user.click(screen.getByRole('button', { name: 'LINE招待コマンドを発行' }))

    expect(fetch).toHaveBeenCalledWith('/api/cast/line-registration-token?storeId=store-a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ castId: 'cast-public-id' }),
    })
    expect(await screen.findByText(`reg ${'A'.repeat(43)}`)).toBeInTheDocument()
    expect(screen.queryByText('reg cast-public-id')).not.toBeInTheDocument()
  })

  it('revokes pending tokens while unlinking an existing account', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<CastLineRegistrationPanel castId="cast-linked" storeId="store-a" isLinked={true} />)

    expect(screen.getByText('LINE連携済み')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'LINE連携を解除' }))
    expect(fetch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '連携を解除' }))

    expect(fetch).toHaveBeenCalledWith('/api/cast/line-registration-token?storeId=store-a', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ castId: 'cast-linked' }),
    })
    expect(
      await screen.findByRole('button', { name: 'LINE招待コマンドを発行' })
    ).toBeInTheDocument()
  })
})
