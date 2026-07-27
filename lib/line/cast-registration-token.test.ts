/**
 * @design_doc   Administrative issuance contract for one-time LINE cast registration tokens
 * @related_to   lib/line/cast-registration-token.ts, app/api/cast/line-registration-token/route.ts
 * @known_issues None
 */
import { describe, expect, it, vi } from 'vitest'
import {
  CastLineRegistrationTokenError,
  issueCastLineRegistrationToken,
  unlinkCastLineRegistration,
} from './cast-registration-token'
import { hashLineRegistrationToken } from './cast-registration-service'

const NOW = new Date('2030-01-01T00:00:00.000Z')

function createDatabase(cast: { id: string; storeId: string; lineUserId: string | null } | null) {
  const upsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => create)
  const transaction = vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) =>
    callback({
      cast: { findFirst: vi.fn().mockResolvedValue(cast) },
      castLineRegistrationToken: { upsert },
    })
  )
  return { database: { $transaction: transaction }, transaction, upsert }
}

describe('issueCastLineRegistrationToken', () => {
  it('returns a high-entropy raw token once while persisting only its SHA-256 hash', async () => {
    const { database, transaction, upsert } = createDatabase({
      id: 'cast-1',
      storeId: 'store-a',
      lineUserId: null,
    })
    const randomBytes = vi.fn(() => Buffer.alloc(32, 7))

    const result = await issueCastLineRegistrationToken(
      { castId: 'cast-1', storeId: 'store-a', createdByAdminId: 'admin-1' },
      {
        database: database as any,
        now: () => NOW,
        randomBytes,
      }
    )

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(result.expiresAt).toEqual(new Date('2030-01-01T00:15:00.000Z'))
    expect(randomBytes).toHaveBeenCalledWith(32)
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })

    const write = upsert.mock.calls[0][0]
    expect(JSON.stringify(write)).not.toContain(result.token)
    expect(write).toEqual({
      where: { castId: 'cast-1' },
      create: {
        castId: 'cast-1',
        storeId: 'store-a',
        tokenHash: hashLineRegistrationToken(result.token),
        expiresAt: result.expiresAt,
        usedAt: null,
        createdByAdminId: 'admin-1',
      },
      update: {
        storeId: 'store-a',
        tokenHash: hashLineRegistrationToken(result.token),
        expiresAt: result.expiresAt,
        usedAt: null,
        createdByAdminId: 'admin-1',
      },
    })
  })

  it('fails closed when the cast is outside the authorized store', async () => {
    const { database, upsert } = createDatabase(null)

    await expect(
      issueCastLineRegistrationToken(
        { castId: 'foreign-cast', storeId: 'store-a', createdByAdminId: 'admin-1' },
        { database: database as any, now: () => NOW }
      )
    ).rejects.toMatchObject({ code: 'cast_not_found' })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('does not issue a token for a cast that is already linked', async () => {
    const { database, upsert } = createDatabase({
      id: 'cast-1',
      storeId: 'store-a',
      lineUserId: 'U-existing',
    })

    await expect(
      issueCastLineRegistrationToken(
        { castId: 'cast-1', storeId: 'store-a', createdByAdminId: 'admin-1' },
        { database: database as any, now: () => NOW }
      )
    ).rejects.toMatchObject({
      code: 'cast_already_linked',
    })
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('unlinkCastLineRegistration', () => {
  it('revokes every token and clears the store-scoped cast link atomically', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'cast-1' })
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 })
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const transaction = vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) =>
      callback({
        cast: { findFirst, updateMany },
        castLineRegistrationToken: { deleteMany },
      })
    )

    await unlinkCastLineRegistration(
      { castId: 'cast-1', storeId: 'store-a' },
      { database: { $transaction: transaction } as any }
    )

    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'store-a' },
      select: { id: true },
    })
    expect(deleteMany).toHaveBeenCalledWith({ where: { castId: 'cast-1', storeId: 'store-a' } })
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'store-a' },
      data: { lineUserId: null },
    })
  })

  it('fails closed for a cast outside the authorized store', async () => {
    const deleteMany = vi.fn()
    const updateMany = vi.fn()
    const database = {
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback({
          cast: { findFirst: vi.fn().mockResolvedValue(null), updateMany },
          castLineRegistrationToken: { deleteMany },
        })
      ),
    }

    await expect(
      unlinkCastLineRegistration(
        { castId: 'foreign-cast', storeId: 'store-a' },
        { database: database as any }
      )
    ).rejects.toMatchObject({ code: 'cast_not_found' })
    expect(deleteMany).not.toHaveBeenCalled()
    expect(updateMany).not.toHaveBeenCalled()
  })
})
