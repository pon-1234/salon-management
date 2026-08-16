/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md guarded sanitized Ikebukuro import command
 * @related_to   import-gold-master-ikebukuro-preview.ts validates private input before Prisma
 * @known_issues Uses injected dependencies and never connects to a real database
 */
import { describe, expect, it, vi } from 'vitest'

import type { LegacyPreviewImageImportIo } from '@/lib/migration/legacy/preview-image-import'
import type { PreviewUatDatabase } from '@/lib/preview-uat/setup'
import {
  GOLD_MASTER_IMAGE_SOURCE_KEY,
  type PreparedGoldMasterPreviewImages,
} from '@/lib/preview-uat/gold-master-images'
import {
  GOLD_MASTER_PREVIEW_ACKNOWLEDGEMENT,
  runGoldMasterPreviewImport,
} from './import-gold-master-ikebukuro-preview'

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
  PREVIEW_IMAGE_TARGET_ROOT: '/srv/salon-preview-storage/images',
}
const snapshotPath = '/private/ikebukuro-preview.json'
const imageManifestPath = '/private/ikebukuro-preview-images.json'
const imageSourceRoot = '/private/ikebukuro-preview-images'
const imageTargetRoot = '/srv/salon-preview-storage/images'
const argv = [
  '--snapshot',
  snapshotPath,
  '--image-manifest',
  imageManifestPath,
  '--image-source-root',
  imageSourceRoot,
  '--image-target-root',
  imageTargetRoot,
  '--ack',
  GOLD_MASTER_PREVIEW_ACKNOWLEDGEMENT,
]

const imagePlan = {
  version: 1 as const,
  sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
  capturedAt: '2026-07-20T04:00:00.000Z',
  files: [],
}
const preparedImages: PreparedGoldMasterPreviewImages = {
  plan: imagePlan,
  resolveImageUrl: () => {
    throw new Error('The importer test snapshot has no image references.')
  },
}
const imageIo = {} as LegacyPreviewImageImportIo
const imageDependencies = {
  readImageManifest: vi.fn(async () => imagePlan),
  prepareImages: vi.fn(() => preparedImages),
  createImageFilesystem: vi.fn(() => imageIo),
  copyImages: vi.fn(async () => ({
    success: true,
    plannedFileCount: 0,
    verifiedByteCount: 0,
    createdFileCount: 0,
    reusedFileCount: 0,
    rolledBackFileCount: 0,
    issues: [],
  })),
  generateDisabledPassword: vi.fn(() => 'unpublished-disabled-customer-secret'),
}

function snapshot() {
  return {
    version: 4,
    scope: {
      sourceDatabase: 'nzuadtjn_gold_master',
      customerSourceDatabase: 'nzuadtjn_primegb_master',
      shopNo: 5600,
      cutoffAt: '2026-07-20T04:00:00+00:00',
      scheduleFrom: '2026-07-20',
      scheduleTo: '2026-08-09',
      reservationFrom: '2026-04-21',
      consistency: 'best-effort-read-only-count-checked',
    },
    beforeCounts: {
      stores: 1,
      courses: 1,
      paidOptions: 0,
      freeOptions: 0,
      areas: 0,
      stations: 0,
      hotelGroups: 0,
      hotels: 0,
      casts: 1,
      schedules: 0,
      reservations: 1,
      reviews: 0,
      customers: 1,
    },
    afterCounts: {
      stores: 1,
      courses: 1,
      paidOptions: 0,
      freeOptions: 0,
      areas: 0,
      stations: 0,
      hotelGroups: 0,
      hotels: 0,
      casts: 1,
      schedules: 0,
      reservations: 1,
      reviews: 0,
      customers: 1,
    },
    rows: {
      stores: [
        {
          shop_no: 5600,
          shop_name: '金の玉クラブ池袋店',
          tel: '03-5931-5743',
          adress: null,
          eigyo: '10:00～24:00',
          mail_ad: 'public@example.com',
          lev: 1,
        },
      ],
      courses: [
        {
          id: 2,
          sort: 2,
          charge_name: '80分',
          charge_name_admin: '80分',
          charge_kin: 21000,
          charge_ara: 11000,
          charge_min: 80,
          flg_show: 1,
          flg_web: 1,
        },
      ],
      paidOptions: [],
      freeOptions: [],
      areas: [],
      stations: [],
      hotelGroups: [],
      hotels: [],
      casts: [
        {
          girl_no: 56019,
          shop_no: 5600,
          name: '公開キャスト',
          age: 31,
          regist_date: '2025-02-03 12:00:00',
          p_height: 160,
          p_bust: 86,
          p_bust_cup: 3,
          p_waist: 58,
          p_hip: 86,
          p_type: '',
          profile_catch: '',
          profile_cm: '',
          profile_new_1: '',
          profile_new_2: '',
          profile_new_3: '',
          profile_new_4: '',
          profile_new_5: '',
          profile_new_6: '',
          photo_1: '',
          photo_2: '',
          photo_3: '',
          photo_4: '',
          photo_5: '',
          photo_6: '',
          photo_7: '',
          photo_8: '',
          photo_9: '',
          photo_10: '',
          photo_11: '',
          photo_12: '',
          photo_13: '',
          photo_14: '',
          photo_15: '',
          access_count: 1,
          options: '',
          options_free: '',
        },
      ],
      schedules: [],
      reservations: [
        {
          serial: 7001,
          shop_no: 5600,
          girl_no: 56019,
          deli_date: '2026-07-20',
          mem_id: 1234,
          time_h: 20,
          time_m: 0,
          course: 2,
          course_time: 80,
          course_kin: 21000,
          course2_kin: 0,
          course3_kin: 0,
          simei_kind: 0,
          simei_kin: 0,
          koutu: 0,
          hotel_kin: 0,
          nebiki_kin: 0,
          nebiki_kin_point: 0,
          total: 21000,
          ara: 10000,
          girl_pay: 11000,
          lev: 3,
          nyu_date: '2026-07-20 10:00:00',
          pay_kind: 1,
          media: 1,
          options: '',
          options_free: '',
          pref_no: 0,
          city_no: 0,
          station_no: 0,
          place_h_no: 0,
        },
      ],
      reviews: [],
      customers: [
        {
          mem_id: 1234,
          shop_no: 5600,
          name: '旧顧客',
          tel: '09012345678',
          mail_ad: 'legacy@example.com',
          birth: '1985-04-03',
          age: 41,
          point: 100,
          lev_member: 1,
          lev: 1,
          lev_admin: 0,
          flg_smail: 0,
          regist_date: '2020-05-06 12:34:56',
          regist_date_new: '2020-05-06',
          login_date: null,
          deli_date: '2026-07-20',
        },
      ],
    },
  }
}

function database(): PreviewUatDatabase {
  return {
    readTargetIdentity: vi.fn(async () => ({
      databaseName: 'salon_uat_preview',
      environment: 'staging-preview',
      marker: 'preview-uat-target-id-20260720',
    })),
    createSyntheticFixture: vi.fn(async (_identity, fixture) => ({
      stores: fixture.stores.length,
      admins: fixture.admins.length,
      customers: fixture.customers.length,
      casts: fixture.casts.length,
      reservations: fixture.reservations.length,
      options: fixture.options.length,
      areas: fixture.areas.length,
      stations: fixture.stations.length,
      hotels: fixture.hotels.length,
      hotelServiceAreas: fixture.hotelServiceAreas.length,
      hotelRates: fixture.hotelRates.length,
      reservationOptions: fixture.reservationOptions.length,
    })),
    disconnect: vi.fn(async () => undefined),
  }
}

describe('runGoldMasterPreviewImport', () => {
  it('rejects before reading private data or constructing Prisma when acknowledgement is absent', async () => {
    const readSnapshot = vi.fn()
    const createDatabase = vi.fn(() => database())
    const writeError = vi.fn()

    await expect(
      runGoldMasterPreviewImport([], environment, {
        ...imageDependencies,
        readSnapshot,
        createDatabase,
        hashPassword: vi.fn(),
        writeOutput: vi.fn(),
        writeError,
      })
    ).resolves.toBe(1)

    expect(readSnapshot).not.toHaveBeenCalled()
    expect(createDatabase).not.toHaveBeenCalled()
    expect(writeError).toHaveBeenCalledWith(
      'Gold master preview import failed: GOLD_MASTER_PREVIEW_CONFIG_REJECTED'
    )
  })

  it('loads, transforms, writes, and reports aggregate counts only', async () => {
    const target = database()
    const writeOutput = vi.fn()
    const writeError = vi.fn()
    const hashPassword = vi.fn(async (password: string) => `hash:${password}`)
    const generateDisabledPassword = vi.fn(() => 'unpublished-disabled-customer-secret')

    await expect(
      runGoldMasterPreviewImport(argv, environment, {
        ...imageDependencies,
        generateDisabledPassword,
        readSnapshot: vi.fn(async () => snapshot()),
        createDatabase: vi.fn(() => target),
        hashPassword,
        writeOutput,
        writeError,
      })
    ).resolves.toBe(0)

    expect(target.createSyntheticFixture).toHaveBeenCalledWith(
      {
        databaseName: 'salon_uat_preview',
        environment: 'staging-preview',
        marker: 'preview-uat-target-id-20260720',
      },
      expect.objectContaining({
        stores: [expect.objectContaining({ slug: 'ikebukuro' })],
      })
    )
    expect(target.disconnect).toHaveBeenCalledOnce()
    expect(generateDisabledPassword).toHaveBeenCalledOnce()
    expect(hashPassword).toHaveBeenCalledWith('unpublished-disabled-customer-secret')
    expect(writeError).not.toHaveBeenCalled()
    expect(writeOutput).toHaveBeenCalledWith(
      'Gold master preview imported: stores=1 admins=2 customers=1 casts=1 reservations=1 options=0 areas=0 stations=0 hotels=0 hotelServiceAreas=0 hotelRates=0 reservationOptions=0 images=0 imageBytes=0'
    )
    const output = JSON.stringify(writeOutput.mock.calls)
    for (const secret of [...Object.values(passwords), 'db-secret']) {
      expect(output).not.toContain(secret)
    }
  })

  it('accepts the package-runner argument separator before the guarded arguments', async () => {
    const target = database()

    await expect(
      runGoldMasterPreviewImport(['--', ...argv], environment, {
        ...imageDependencies,
        readSnapshot: vi.fn(async () => snapshot()),
        createDatabase: vi.fn(() => target),
        hashPassword: vi.fn(async (password: string) => `hash:${password}`),
        writeOutput: vi.fn(),
        writeError: vi.fn(),
      })
    ).resolves.toBe(0)

    expect(target.createSyntheticFixture).toHaveBeenCalledOnce()
  })

  it('redacts parser and database errors and disconnects after connection', async () => {
    const target = database()
    vi.mocked(target.createSyntheticFixture).mockRejectedValueOnce(
      new Error(`database said ${passwords.customer} db-secret`)
    )
    const writeError = vi.fn()

    await expect(
      runGoldMasterPreviewImport(argv, environment, {
        ...imageDependencies,
        readSnapshot: vi.fn(async () => snapshot()),
        createDatabase: vi.fn(() => target),
        hashPassword: vi.fn(async (password: string) => `hash:${password}`),
        writeOutput: vi.fn(),
        writeError,
      })
    ).resolves.toBe(1)

    expect(target.disconnect).toHaveBeenCalledOnce()
    expect(writeError).toHaveBeenCalledWith(
      'Gold master preview import failed: GOLD_MASTER_PREVIEW_IMPORT_FAILED'
    )
    expect(JSON.stringify(writeError.mock.calls)).not.toContain(passwords.customer)
    expect(JSON.stringify(writeError.mock.calls)).not.toContain('db-secret')
  })

  it('refuses to construct Prisma when verified image copying fails', async () => {
    const createDatabase = vi.fn(() => database())
    const writeError = vi.fn()

    await expect(
      runGoldMasterPreviewImport(argv, environment, {
        ...imageDependencies,
        copyImages: vi.fn(async () => ({
          success: false,
          plannedFileCount: 1,
          verifiedByteCount: 0,
          createdFileCount: 0,
          reusedFileCount: 0,
          rolledBackFileCount: 0,
          issues: [
            {
              code: 'SOURCE_VERIFICATION_MISMATCH' as const,
              path: '$.files[0]',
              message: 'redacted',
            },
          ],
        })),
        readSnapshot: vi.fn(async () => snapshot()),
        createDatabase,
        hashPassword: vi.fn(async (password: string) => `hash:${password}`),
        writeOutput: vi.fn(),
        writeError,
      })
    ).resolves.toBe(1)

    expect(createDatabase).not.toHaveBeenCalled()
    expect(writeError).toHaveBeenCalledWith(
      'Gold master preview import failed: GOLD_MASTER_PREVIEW_IMAGE_IMPORT_FAILED'
    )
  })
})
