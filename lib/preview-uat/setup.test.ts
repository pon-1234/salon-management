/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md synthetic preview UAT bootstrap contract
 * @related_to   scripts/setup-preview-uat.ts; prisma-adapter.ts
 * @known_issues These tests use an injected database boundary and never open a real connection
 */
import { describe, expect, it, vi } from 'vitest'

import {
  PREVIEW_UAT_ACKNOWLEDGEMENT,
  buildPreviewUatFixture,
  parsePreviewUatSetupConfig,
  provisionPreviewUat,
  type PreviewUatDatabase,
  type PreviewUatTargetIdentity,
} from './setup'

const adminPassword = 'Admin-Preview-UAT-2026!'
const customerPassword = 'Customer-Preview-UAT-2026!'
const castPassword = 'Cast-Preview-UAT-2026!'
const marker = 'preview-uat-target-id-20260720'

function validEnvironment(): Record<string, string | undefined> {
  return {
    APP_RUNTIME_MODE: 'preview',
    OUTBOUND_DELIVERY_MODE: 'disabled',
    DATABASE_URL:
      'postgresql://preview_user:private@preview-db:5432/salon_uat_preview?schema=public',
    PREVIEW_TARGET_ID: marker,
    PREVIEW_UAT_ADMIN_PASSWORD: adminPassword,
    PREVIEW_UAT_CUSTOMER_PASSWORD: customerPassword,
    PREVIEW_UAT_CAST_PASSWORD: castPassword,
  }
}

const acknowledgementArguments = ['--ack', PREVIEW_UAT_ACKNOWLEDGEMENT]

describe('parsePreviewUatSetupConfig', () => {
  it('accepts only an explicitly acknowledged, outbound-disabled preview target', () => {
    const config = parsePreviewUatSetupConfig(acknowledgementArguments, validEnvironment())

    expect(config).toEqual({
      databaseUrl: validEnvironment().DATABASE_URL,
      databaseName: 'salon_uat_preview',
      marker,
      passwords: { admin: adminPassword, customer: customerPassword, cast: castPassword },
    })
  })

  it('accepts the single leading argument separator forwarded by pnpm', () => {
    const config = parsePreviewUatSetupConfig(
      ['--', ...acknowledgementArguments],
      validEnvironment()
    )

    expect(config.databaseName).toBe('salon_uat_preview')
  })

  it.each([
    ['runtime mode', { APP_RUNTIME_MODE: 'live' }],
    ['outbound mode', { OUTBOUND_DELIVERY_MODE: 'provider' }],
    ['production database name', { DATABASE_URL: 'postgresql://u:p@db/salon_production' }],
    [
      'unsafe connection option',
      { DATABASE_URL: 'postgresql://u:p@db/salon_uat_preview?schema=x' },
    ],
    ['weak marker', { PREVIEW_TARGET_ID: 'short' }],
    ['weak admin password', { PREVIEW_UAT_ADMIN_PASSWORD: 'weak' }],
    ['weak customer password', { PREVIEW_UAT_CUSTOMER_PASSWORD: 'weak' }],
    ['weak cast password', { PREVIEW_UAT_CAST_PASSWORD: 'weak' }],
    ['reused role password', { PREVIEW_UAT_CAST_PASSWORD: customerPassword }],
  ])('rejects an invalid %s before any database dependency is needed', (_, override) => {
    expect(() =>
      parsePreviewUatSetupConfig(acknowledgementArguments, {
        ...validEnvironment(),
        ...override,
      })
    ).toThrow(/PREVIEW_UAT_CONFIG_REJECTED/u)
  })

  it.each([
    { argv: [] },
    { argv: ['--ack', 'wrong'] },
    { argv: ['--unknown', PREVIEW_UAT_ACKNOWLEDGEMENT] },
    {
      argv: ['--ack', PREVIEW_UAT_ACKNOWLEDGEMENT, '--ack', PREVIEW_UAT_ACKNOWLEDGEMENT],
    },
  ])('rejects missing, incorrect, unknown, or repeated acknowledgement arguments', ({ argv }) => {
    expect(() => parsePreviewUatSetupConfig(argv, validEnvironment())).toThrow(
      /PREVIEW_UAT_CONFIG_REJECTED/u
    )
  })

  it('never includes a rejected credential or database URL in its error', () => {
    const secret = 'leak-me-Admin-Preview-UAT-2026!'
    const databaseUrl = 'postgresql://preview:database-secret@db/live'

    expect(() =>
      parsePreviewUatSetupConfig(acknowledgementArguments, {
        ...validEnvironment(),
        DATABASE_URL: databaseUrl,
        PREVIEW_UAT_ADMIN_PASSWORD: secret,
      })
    ).toThrowError(
      expect.objectContaining({
        message: expect.not.stringContaining(secret),
      })
    )
    try {
      parsePreviewUatSetupConfig(acknowledgementArguments, {
        ...validEnvironment(),
        DATABASE_URL: databaseUrl,
      })
    } catch (error) {
      expect(String(error)).not.toContain('database-secret')
      expect(String(error)).not.toContain(databaseUrl)
    }
  })
})

describe('buildPreviewUatFixture', () => {
  it('creates deterministic two-store cross-role data with no deliverable address', () => {
    const fixture = buildPreviewUatFixture({
      now: new Date('2026-07-20T03:00:00.000Z'),
      passwordHashes: {
        admin: 'admin-hash',
        customer: 'customer-hash',
        cast: 'cast-hash',
      },
    })

    expect(fixture.stores).toHaveLength(2)
    expect(fixture.stores).toContainEqual(
      expect.objectContaining({
        id: 'uat-ikebukuro',
        slug: 'ikebukuro',
        name: '[UAT] 池袋確認店',
        displayName: '[UAT] 池袋確認店',
        email: 'ikebukuro-store@preview-uat.invalid',
      })
    )
    expect(fixture.admins.map(({ role }) => role).sort()).toEqual(['manager', 'super_admin'])
    expect(fixture.adminStoreAssignments).toEqual([
      { adminId: 'uat-admin-manager', storeId: 'uat-ikebukuro' },
    ])
    expect(fixture.admins).toContainEqual(
      expect.objectContaining({
        email: 'manager-ikebukuro@preview-uat.invalid',
        name: '[UAT] 池袋限定管理者',
      })
    )
    const manager = fixture.admins.find(
      ({ email }) => email === 'manager-ikebukuro@preview-uat.invalid'
    )
    expect(JSON.parse(String(manager?.permissions))).toEqual([
      'cast:*',
      'customer:read',
      'customer:create',
      'customer:update',
      'reservation:*',
      'pricing:*',
      'settings:*',
      'analytics:read',
      'dashboard:view',
    ])
    expect(fixture.casts).toHaveLength(2)
    expect(fixture.casts).toContainEqual(
      expect.objectContaining({
        id: 'uat-cast-ikebukuro',
        storeId: 'uat-ikebukuro',
        name: '[UAT] 池袋キャスト',
        loginEmail: 'cast-ikebukuro@preview-uat.invalid',
      })
    )
    expect(fixture.casts.every(({ loginEmail, passwordHash }) => loginEmail && passwordHash)).toBe(
      true
    )
    expect(fixture.customers).toEqual([
      expect.objectContaining({
        id: 'uat-customer',
        email: 'customer@preview-uat.invalid',
        password: 'customer-hash',
        emailVerified: true,
        points: 1000,
      }),
    ])
    expect(fixture.customerStoreAssignments).toEqual([
      { customerId: 'uat-customer', storeId: 'uat-ikebukuro' },
    ])
    expect(fixture.courses).toHaveLength(2)
    expect(fixture.options).toHaveLength(2)
    expect(fixture.areas).toHaveLength(2)
    expect(fixture.stations).toHaveLength(2)
    expect(fixture.hotels).toEqual([
      expect.objectContaining({
        id: 'uat-hotel-ikebukuro',
        storeId: 'uat-ikebukuro',
        hotelName: '[UAT] 池袋確認ホテル',
      }),
      expect.objectContaining({
        id: 'uat-hotel-osaka',
        storeId: 'uat-osaka',
        hotelName: '[UAT] 大阪確認ホテル',
      }),
    ])
    expect(fixture.hotelServiceAreas).toHaveLength(2)
    expect(fixture.hotelRates).toHaveLength(2)
    expect(fixture.reservationOptions).toEqual([
      expect.objectContaining({
        reservationId: 'uat-reservation-past',
        optionId: 'uat-option-ikebukuro',
        optionName: '[UAT] 池袋確認オプション',
        optionPrice: 1000,
      }),
    ])
    expect(fixture.designationFees).toHaveLength(2)
    expect(fixture.castSchedules).toHaveLength(2)
    expect(fixture.reservations.map(({ status }) => status).sort()).toEqual([
      'completed',
      'confirmed',
    ])
    expect(fixture.pointHistories.map(({ amount, balance }) => ({ amount, balance }))).toEqual([
      { amount: 1500, balance: 1500 },
      { amount: -500, balance: 1000 },
    ])
    expect(fixture.reviews).toEqual([
      expect.objectContaining({ reservationId: 'uat-reservation-past', status: 'published' }),
    ])

    const futureReservation = fixture.reservations.find(({ id }) => id === 'uat-reservation-future')
    const futureSchedule = fixture.castSchedules.find(({ id }) => id === 'uat-schedule-osaka')
    const timestamp = (value: string | Date | undefined) =>
      value instanceof Date ? value.getTime() : new Date(value ?? Number.NaN).getTime()
    expect(futureReservation?.startTime).toEqual(new Date('2026-07-22T05:00:00.000Z'))
    expect(futureReservation?.endTime).toEqual(new Date('2026-07-22T06:30:00.000Z'))
    expect(futureSchedule?.date).toEqual(new Date('2026-07-21T15:00:00.000Z'))
    expect(timestamp(futureSchedule?.startTime)).toBeLessThanOrEqual(
      timestamp(futureReservation?.startTime)
    )
    expect(timestamp(futureSchedule?.endTime)).toBeGreaterThanOrEqual(
      timestamp(futureReservation?.endTime)
    )

    const serialized = JSON.stringify(fixture)
    expect(serialized).toContain('[UAT]')
    const emails = Array.from(
      serialized.matchAll(/[A-Za-z0-9._%+-]+@[^"\\]+/gu),
      (match) => match[0]
    )
    expect(emails.length).toBeGreaterThan(0)
    expect(emails.every((email) => email.endsWith('.invalid'))).toBe(true)
    expect(serialized).not.toContain(adminPassword)
    expect(serialized).not.toContain(customerPassword)
    expect(serialized).not.toContain(castPassword)
    expect(serialized).not.toContain('[UAT] 東京')
    expect(serialized).not.toContain('-tokyo')
  })
})

function database(identity: PreviewUatTargetIdentity): PreviewUatDatabase & {
  createSyntheticFixture: ReturnType<typeof vi.fn>
} {
  return {
    readTargetIdentity: vi.fn(async () => identity),
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

describe('provisionPreviewUat', () => {
  it('checks the independently provisioned database identity before hashing or writing', async () => {
    const target = database({
      databaseName: 'salon_uat_preview',
      environment: 'staging-preview',
      marker,
    })
    const hashPassword = vi.fn(async (password: string) => `hash:${password}`)
    const config = parsePreviewUatSetupConfig(acknowledgementArguments, validEnvironment())

    await expect(
      provisionPreviewUat({
        database: target,
        config,
        hashPassword,
        now: new Date('2026-07-20T03:00:00.000Z'),
      })
    ).resolves.toEqual({
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

    expect(target.readTargetIdentity).toHaveBeenCalledOnce()
    expect(hashPassword).toHaveBeenCalledTimes(3)
    expect(target.createSyntheticFixture).toHaveBeenCalledOnce()
  })

  it.each([
    ['database name', { databaseName: 'salon_production' }],
    ['environment marker', { environment: 'production' }],
    ['target marker', { marker: 'another-preview-target-id-20260720' }],
  ])('refuses a mismatched DB-side %s before hashing and writing', async (_, override) => {
    const target = database({
      databaseName: 'salon_uat_preview',
      environment: 'staging-preview',
      marker,
      ...override,
    })
    const hashPassword = vi.fn(async (password: string) => `hash:${password}`)

    await expect(
      provisionPreviewUat({
        database: target,
        config: parsePreviewUatSetupConfig(acknowledgementArguments, validEnvironment()),
        hashPassword,
        now: new Date('2026-07-20T03:00:00.000Z'),
      })
    ).rejects.toThrow(/PREVIEW_UAT_TARGET_REJECTED/u)

    expect(hashPassword).not.toHaveBeenCalled()
    expect(target.createSyntheticFixture).not.toHaveBeenCalled()
  })

  it('does not begin the write transaction if any credential hashing fails', async () => {
    const target = database({
      databaseName: 'salon_uat_preview',
      environment: 'staging-preview',
      marker,
    })
    const hashPassword = vi.fn(async () => {
      throw new Error(`provider leaked ${adminPassword}`)
    })

    await expect(
      provisionPreviewUat({
        database: target,
        config: parsePreviewUatSetupConfig(acknowledgementArguments, validEnvironment()),
        hashPassword,
        now: new Date('2026-07-20T03:00:00.000Z'),
      })
    ).rejects.toThrow(/PREVIEW_UAT_CREDENTIAL_HASH_FAILED/u)
    expect(target.createSyntheticFixture).not.toHaveBeenCalled()
  })
})
