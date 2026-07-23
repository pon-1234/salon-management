/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md operator-owned synthetic setup command
 * @related_to   lib/preview-uat/setup.ts validates all inputs before this CLI creates Prisma
 * @known_issues Uses injected dependencies and never connects to a real database
 */
import { describe, expect, it, vi } from 'vitest'

import { PREVIEW_UAT_ACKNOWLEDGEMENT, type PreviewUatDatabase } from '@/lib/preview-uat/setup'
import { runPreviewUatSetup } from './setup-preview-uat'

const passwords = {
  admin: 'Admin-Preview-UAT-2026!',
  customer: 'Customer-Preview-UAT-2026!',
  cast: 'Cast-Preview-UAT-2026!',
}
const environment = {
  APP_RUNTIME_MODE: 'preview',
  OUTBOUND_DELIVERY_MODE: 'disabled',
  DATABASE_URL: 'postgresql://preview:db-secret@db:5432/salon_uat_preview?schema=public',
  PREVIEW_TARGET_ID: 'preview-uat-target-id-20260720',
  PREVIEW_UAT_ADMIN_PASSWORD: passwords.admin,
  PREVIEW_UAT_CUSTOMER_PASSWORD: passwords.customer,
  PREVIEW_UAT_CAST_PASSWORD: passwords.cast,
}
const argv = ['--ack', PREVIEW_UAT_ACKNOWLEDGEMENT]

function fakeDatabase(): PreviewUatDatabase {
  return {
    readTargetIdentity: vi.fn(async () => ({
      databaseName: 'salon_uat_preview',
      environment: 'staging-preview',
      marker: 'preview-uat-target-id-20260720',
    })),
    createSyntheticFixture: vi.fn(async () => ({
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
    })),
    disconnect: vi.fn(async () => undefined),
  }
}

describe('runPreviewUatSetup', () => {
  it('validates all configuration before creating a Prisma-backed database dependency', async () => {
    const createDatabase = vi.fn(() => fakeDatabase())
    const writeError = vi.fn()

    await expect(
      runPreviewUatSetup([], environment, {
        createDatabase,
        hashPassword: vi.fn(),
        now: () => new Date('2026-07-20T03:00:00.000Z'),
        writeOutput: vi.fn(),
        writeError,
      })
    ).resolves.toBe(1)

    expect(createDatabase).not.toHaveBeenCalled()
    expect(writeError).toHaveBeenCalledWith('Preview UAT setup failed: PREVIEW_UAT_CONFIG_REJECTED')
  })

  it('creates, reports only aggregate counts, and always disconnects', async () => {
    const database = fakeDatabase()
    const createDatabase = vi.fn(() => database)
    const writeOutput = vi.fn()
    const writeError = vi.fn()

    await expect(
      runPreviewUatSetup(argv, environment, {
        createDatabase,
        hashPassword: vi.fn(async (password: string) => `hash:${password}`),
        now: () => new Date('2026-07-20T03:00:00.000Z'),
        writeOutput,
        writeError,
      })
    ).resolves.toBe(0)

    expect(createDatabase).toHaveBeenCalledOnce()
    expect(database.disconnect).toHaveBeenCalledOnce()
    expect(writeError).not.toHaveBeenCalled()
    expect(writeOutput).toHaveBeenCalledWith(
      'Preview UAT setup created: stores=2 admins=2 customers=1 casts=2 reservations=2 options=2 areas=2 stations=2 hotels=2 hotelServiceAreas=2 hotelRates=2 reservationOptions=1'
    )
    const output = JSON.stringify(writeOutput.mock.calls)
    for (const secret of [...Object.values(passwords), 'db-secret']) {
      expect(output).not.toContain(secret)
    }
  })

  it('redacts dependency errors and credentials while disconnecting after failure', async () => {
    const database = fakeDatabase()
    vi.mocked(database.createSyntheticFixture).mockRejectedValueOnce(
      new Error(`database said ${passwords.customer} db-secret`)
    )
    const writeError = vi.fn()

    await expect(
      runPreviewUatSetup(argv, environment, {
        createDatabase: () => database,
        hashPassword: vi.fn(async (password: string) => `hash:${password}`),
        now: () => new Date('2026-07-20T03:00:00.000Z'),
        writeOutput: vi.fn(),
        writeError,
      })
    ).resolves.toBe(1)

    expect(database.disconnect).toHaveBeenCalledOnce()
    expect(writeError).toHaveBeenCalledWith('Preview UAT setup failed: PREVIEW_UAT_SETUP_FAILED')
    expect(JSON.stringify(writeError.mock.calls)).not.toContain(passwords.customer)
    expect(JSON.stringify(writeError.mock.calls)).not.toContain('db-secret')
  })
})
