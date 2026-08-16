/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md empty preview database transaction gate
 * @related_to   setup.ts builds the deterministic fixture written by this adapter
 * @known_issues The Prisma client is mocked; PostgreSQL execution belongs to a separate rehearsal
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { buildPreviewUatFixture, PREVIEW_UAT_EMPTY_TABLES } from './setup'
import { createPrismaPreviewUatDatabase } from './prisma-adapter'

const identity = {
  databaseName: 'salon_uat_preview',
  environment: 'staging-preview',
  marker: 'preview-uat-target-id-20260720',
}

function emptyCounts() {
  return Object.fromEntries(PREVIEW_UAT_EMPTY_TABLES.map((table) => [table, BigInt(0)]))
}

function transaction(overrides: Record<string, unknown> = {}) {
  const createMany = () => vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length }))
  return {
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => [identity]),
    $queryRawUnsafe: vi.fn(async () => [emptyCounts()]),
    store: { createMany: createMany() },
    storeSettings: { createMany: createMany() },
    admin: { createMany: createMany() },
    adminStoreAssignment: { createMany: createMany() },
    customer: { createMany: createMany() },
    customerStoreAssignment: { createMany: createMany() },
    coursePrice: { createMany: createMany() },
    optionPrice: { createMany: createMany() },
    areaInfo: { createMany: createMany() },
    stationInfo: { createMany: createMany() },
    hotelSettings: { createMany: createMany() },
    hotelServiceArea: { createMany: createMany() },
    hotelRate: { createMany: createMany() },
    designationFee: { createMany: createMany() },
    cast: { createMany: createMany() },
    castOptionSetting: { createMany: createMany() },
    castSchedule: { createMany: createMany() },
    reservation: { createMany: createMany() },
    reservationOption: { createMany: createMany() },
    customerPointHistory: { createMany: createMany() },
    review: { createMany: createMany() },
    message: { createMany: createMany() },
    castLedgerEntry: { createMany: createMany() },
    ...overrides,
  }
}

function client(tx = transaction()) {
  return {
    tx,
    client: {
      $queryRaw: vi.fn(async () => [identity]),
      $transaction: vi.fn(async (operation, _options) => operation(tx)),
      $disconnect: vi.fn(async () => undefined),
    },
  }
}

const fixture = buildPreviewUatFixture({
  now: new Date('2026-07-20T03:00:00.000Z'),
  passwordHashes: { admin: 'admin-hash', customer: 'customer-hash', cast: 'cast-hash' },
})

describe('PREVIEW_UAT_EMPTY_TABLES', () => {
  it('covers every Prisma model table so reruns and partial pre-existing data fail closed', () => {
    const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    const models = Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gmu), (match) => match[1]).sort()

    expect([...PREVIEW_UAT_EMPTY_TABLES].sort()).toEqual(models)
  })
})

describe('createPrismaPreviewUatDatabase', () => {
  it('rechecks marker and emptiness under an advisory lock in one Serializable transaction', async () => {
    const mocked = client()
    const database = createPrismaPreviewUatDatabase(mocked.client as never)

    await expect(database.createSyntheticFixture(identity, fixture)).resolves.toEqual({
      stores: 2,
      admins: 2,
      customers: 1,
      casts: 2,
      reservations: 2,
      options: 2,
      areas: 2,
      stations: 2,
      hotels: 2,
      hotelServiceAreas: 2,
      hotelRates: 2,
      reservationOptions: 1,
    })

    expect(mocked.client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
      maxWait: expect.any(Number),
      timeout: expect.any(Number),
    })
    expect(mocked.tx.$executeRaw).toHaveBeenCalledOnce()
    expect(mocked.tx.$queryRaw).toHaveBeenCalledOnce()
    expect(mocked.tx.$queryRawUnsafe).toHaveBeenCalledOnce()
    expect(mocked.tx.store.createMany).toHaveBeenCalledWith({ data: fixture.stores })
    expect(mocked.tx.customerStoreAssignment.createMany).toHaveBeenCalledWith({
      data: fixture.customerStoreAssignments,
    })
    expect(mocked.tx.areaInfo.createMany).toHaveBeenCalledWith({ data: fixture.areas })
    expect(mocked.tx.stationInfo.createMany).toHaveBeenCalledWith({ data: fixture.stations })
    expect(mocked.tx.hotelSettings.createMany).toHaveBeenCalledWith({ data: fixture.hotels })
    expect(mocked.tx.hotelServiceArea.createMany).toHaveBeenCalledWith({
      data: fixture.hotelServiceAreas,
    })
    expect(mocked.tx.hotelRate.createMany).toHaveBeenCalledWith({ data: fixture.hotelRates })
    expect(mocked.tx.reservationOption.createMany).toHaveBeenCalledWith({
      data: fixture.reservationOptions,
    })
    expect(mocked.tx.areaInfo.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.stationInfo.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.stationInfo.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.hotelSettings.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.hotelSettings.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.hotelServiceArea.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.hotelServiceArea.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.reservation.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.customer.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.customerStoreAssignment.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.customerStoreAssignment.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.reservation.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.reservation.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.tx.reservationOption.createMany.mock.invocationCallOrder[0]
    )
    expect(mocked.tx.review.createMany).toHaveBeenCalledWith({ data: fixture.reviews })
  })

  it('rejects a nonempty database before the first fixture write, including on rerun', async () => {
    const tx = transaction({
      $queryRawUnsafe: vi.fn(async () => [{ ...emptyCounts(), Store: BigInt(1) }]),
    })
    const mocked = client(tx)
    const database = createPrismaPreviewUatDatabase(mocked.client as never)

    await expect(database.createSyntheticFixture(identity, fixture)).rejects.toThrow(
      /PREVIEW_UAT_DATABASE_NOT_EMPTY/u
    )
    expect(tx.store.createMany).not.toHaveBeenCalled()
  })

  it('rechecks all DB identity fields inside the write transaction', async () => {
    const tx = transaction({
      $queryRaw: vi.fn(async () => [{ ...identity, marker: 'different-marker-20260720' }]),
    })
    const mocked = client(tx)
    const database = createPrismaPreviewUatDatabase(mocked.client as never)

    await expect(database.createSyntheticFixture(identity, fixture)).rejects.toThrow(
      /PREVIEW_UAT_TARGET_REJECTED/u
    )
    expect(tx.store.createMany).not.toHaveBeenCalled()
  })

  it('lets Prisma reject and roll back the transaction when any fixture write fails', async () => {
    const tx = transaction({
      reservation: {
        createMany: vi.fn(async () => {
          throw new Error('simulated write failure')
        }),
      },
    })
    const mocked = client(tx)
    const database = createPrismaPreviewUatDatabase(mocked.client as never)

    await expect(database.createSyntheticFixture(identity, fixture)).rejects.toThrow(
      /PREVIEW_UAT_WRITE_FAILED/u
    )
    expect(mocked.client.$transaction).toHaveBeenCalledOnce()
  })
})
