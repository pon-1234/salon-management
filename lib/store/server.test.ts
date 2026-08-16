/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md store isolation requirement
 * @related_to   server.ts resolves the tenant for store-scoped APIs
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const storeMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: storeMocks,
  },
}))

async function loadEnsureStoreId() {
  const { ensureStoreId } = await import('./server')
  return ensureStoreId
}

describe('ensureStoreId', () => {
  beforeEach(() => {
    vi.resetModules()
    storeMocks.findUnique.mockReset()
    storeMocks.upsert.mockReset()
  })

  it('returns an explicitly requested existing store', async () => {
    storeMocks.findUnique.mockResolvedValue({ id: 'ginza' })
    const ensureStoreId = await loadEnsureStoreId()

    await expect(ensureStoreId(' GINZA ')).resolves.toBe('ginza')
    expect(storeMocks.upsert).not.toHaveBeenCalled()
  })

  it('resolves a public store slug to its canonical database id', async () => {
    storeMocks.findUnique.mockImplementation(
      ({ where }: { where: { id?: string; slug?: string } }) => {
        if (where.slug === 'ikebukuro') {
          return Promise.resolve({ id: 'uat-ikebukuro' })
        }

        return Promise.resolve(null)
      }
    )
    const ensureStoreId = await loadEnsureStoreId()

    await expect(ensureStoreId('ikebukuro')).resolves.toBe('uat-ikebukuro')
    expect(storeMocks.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 'ikebukuro' },
      select: { id: true },
    })
    expect(storeMocks.findUnique).toHaveBeenNthCalledWith(2, {
      where: { slug: 'ikebukuro' },
      select: { id: true },
    })
  })

  it('rejects an unknown explicit store instead of silently using the default store', async () => {
    storeMocks.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === 'ikebukuro' ? { id: 'ikebukuro' } : null)
    )
    const ensureStoreId = await loadEnsureStoreId()

    await expect(ensureStoreId('missing-store')).rejects.toThrow('Unknown store: missing-store')
    expect(storeMocks.findUnique).toHaveBeenCalledTimes(2)
    expect(storeMocks.findUnique).toHaveBeenLastCalledWith({
      where: { slug: 'missing-store' },
      select: { id: true },
    })
    expect(storeMocks.upsert).not.toHaveBeenCalled()
  })

  it('uses the configured default only when no store was requested', async () => {
    storeMocks.findUnique.mockResolvedValue({ id: 'ikebukuro' })
    const ensureStoreId = await loadEnsureStoreId()

    await expect(ensureStoreId()).resolves.toBe('ikebukuro')
    expect(storeMocks.upsert).not.toHaveBeenCalled()
  })

  it('fails closed when the default store has not been provisioned', async () => {
    storeMocks.findUnique.mockResolvedValue(null)
    const ensureStoreId = await loadEnsureStoreId()

    await expect(ensureStoreId()).rejects.toThrow('Default store is not configured')
    expect(storeMocks.upsert).not.toHaveBeenCalled()
  })
})
