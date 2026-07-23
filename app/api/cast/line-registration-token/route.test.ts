/**
 * @design_doc   Store-scoped admin API contract for issuing LINE cast registration tokens
 * @related_to   route.ts, lib/line/cast-registration-token.ts
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
  getServerSession: vi.fn(),
  issueToken: vi.fn(),
  unlink: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/store/server', () => ({
  resolveStoreId: mocks.resolveStoreId,
  ensureStoreId: mocks.ensureStoreId,
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }))
vi.mock('@/lib/line/cast-registration-token', () => ({
  issueCastLineRegistrationToken: mocks.issueToken,
  unlinkCastLineRegistration: mocks.unlink,
  CastLineRegistrationTokenError: class CastLineRegistrationTokenError extends Error {
    constructor(public code: string) {
      super(code)
    }
  },
}))

import { DELETE, POST } from './route'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/cast/line-registration-token?storeId=store-a', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/cast/line-registration-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStoreId.mockResolvedValue('store-a')
    mocks.ensureStoreId.mockResolvedValue('store-a')
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.getServerSession.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    mocks.issueToken.mockResolvedValue({
      token: 'A'.repeat(43),
      expiresAt: new Date('2030-01-01T00:15:00.000Z'),
    })
  })

  it('requires cast:update permission and assignment for the requested store', async () => {
    const response = await POST(request({ castId: 'cast-1' }))

    expect(response.status).toBe(201)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'cast:update',
      storeId: 'store-a',
    })
    expect(mocks.issueToken).toHaveBeenCalledWith({
      castId: 'cast-1',
      storeId: 'store-a',
      createdByAdminId: 'admin-1',
    })
  })

  it('returns the raw token and command only in the issuance response', async () => {
    const response = await POST(request({ castId: 'cast-1' }))
    const body = await response.json()

    expect(body).toEqual({
      token: 'A'.repeat(43),
      command: `reg ${'A'.repeat(43)}`,
      expiresAt: '2030-01-01T00:15:00.000Z',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('stops before issuance when authorization fails', async () => {
    mocks.requireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )

    const response = await POST(request({ castId: 'cast-1' }))

    expect(response.status).toBe(403)
    expect(mocks.issueToken).not.toHaveBeenCalled()
    expect(mocks.getServerSession).not.toHaveBeenCalled()
  })

  it('maps a cross-store or missing cast to 404 without issuing a token', async () => {
    const { CastLineRegistrationTokenError } = await import('@/lib/line/cast-registration-token')
    mocks.issueToken.mockRejectedValueOnce(new CastLineRegistrationTokenError('cast_not_found'))

    const response = await POST(request({ castId: 'foreign-cast' }))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Cast not found' })
  })
})

describe('DELETE /api/cast/line-registration-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStoreId.mockResolvedValue('store-a')
    mocks.ensureStoreId.mockResolvedValue('store-a')
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.getServerSession.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    mocks.unlink.mockResolvedValue(undefined)
  })

  it('requires cast:update access and revokes the scoped cast link', async () => {
    const response = await DELETE(request({ castId: 'cast-1' }))

    expect(response.status).toBe(200)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'cast:update',
      storeId: 'store-a',
    })
    expect(mocks.unlink).toHaveBeenCalledWith({ castId: 'cast-1', storeId: 'store-a' })
  })

  it('maps a cross-store or missing cast to 404', async () => {
    const { CastLineRegistrationTokenError } = await import('@/lib/line/cast-registration-token')
    mocks.unlink.mockRejectedValueOnce(new CastLineRegistrationTokenError('cast_not_found'))

    const response = await DELETE(request({ castId: 'foreign-cast' }))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Cast not found' })
  })
})
