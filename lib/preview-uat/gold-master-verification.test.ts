/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md V5 pre-import verification gate
 * @related_to   gold-master-verification.ts produces a redacted deterministic control
 * @known_issues Uses a synthetic private snapshot and never reads production data
 */
import { describe, expect, it } from 'vitest'

import { PREVIEW_UAT_EMPTY_TABLES } from './setup'
import {
  GoldMasterPreviewVerificationError,
  createGoldMasterPreviewVerificationControl,
  type GoldMasterPreviewVerificationDependencies,
} from './gold-master-verification'

const SNAPSHOT_SHA = 'a'.repeat(64)
const MANIFEST_SHA = 'b'.repeat(64)
const IMAGE_SHA = 'c'.repeat(64)

function snapshot() {
  const counts = {
    stores: 1,
    courses: 1,
    paidOptions: 1,
    freeOptions: 0,
    areas: 0,
    stations: 0,
    hotelGroups: 0,
    hotels: 0,
    casts: 1,
    schedules: 1,
    reservations: 1,
    reviews: 0,
    customers: 1,
  }
  return {
    version: 4,
    scope: {
      sourceDatabase: 'nzuadtjn_gold_master',
      customerSourceDatabase: 'nzuadtjn_primegb_master',
      shopNo: 5600,
      cutoffAt: '2026-08-14T19:31:10+09:00',
      scheduleFrom: '2026-08-01',
      scheduleTo: '2026-09-30',
      reservationFrom: '2026-01-01',
      consistency: 'best-effort-read-only-count-checked',
    },
    beforeCounts: counts,
    afterCounts: counts,
    rows: {
      stores: [
        {
          shop_no: 5600,
          shop_name: 'private-store-name',
          tel: '0300000000',
          adress: 'private-store-address',
          eigyo: '10:00-24:00',
          mail_ad: 'private-store@example.test',
          lev: 1,
        },
      ],
      courses: [
        {
          id: 1,
          sort: 1,
          charge_name: 'private-course-name',
          charge_name_admin: 'private-course-admin-name',
          charge_kin: 20000,
          charge_ara: 11000,
          charge_min: 60,
          flg_show: 1,
          flg_web: 1,
        },
      ],
      paidOptions: [
        {
          serial: 1,
          sort: 1,
          option_name: 'private-option-name',
          kin: 1000,
          girl_pay: 1000,
          lev: 1,
          lev_admin: 1,
        },
      ],
      freeOptions: [],
      areas: [],
      stations: [],
      hotelGroups: [],
      hotels: [],
      casts: [
        {
          girl_no: 60001,
          shop_no: 5600,
          name: 'private-cast-name',
          age: 30,
          regist_date: '2026-01-01 10:00:00',
          p_height: 160,
          p_bust: 85,
          p_bust_cup: 3,
          p_waist: 58,
          p_hip: 86,
          p_type: 'private-cast-type',
          profile_catch: 'private-profile',
          profile_cm: '',
          profile_new_1: '',
          profile_new_2: '',
          profile_new_3: '',
          profile_new_4: '',
          profile_new_5: '',
          profile_new_6: '',
          photo_1: 'private-photo.jpg',
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
          access_count: 10,
          options: '1',
          options_free: '',
        },
      ],
      schedules: [
        {
          serial: 1,
          syu_date: '2026-08-15',
          shop_no: 5600,
          girl_no: 60001,
          work: 3,
          work1: 10,
          work2: 0,
          work3: 18,
          work4: 0,
          flg_work: 0,
        },
      ],
      reservations: [
        {
          serial: 70001,
          shop_no: 5600,
          girl_no: 60001,
          deli_date: '2026-08-15',
          mem_id: 10001,
          time_h: 12,
          time_m: 0,
          course: 1,
          course_time: 60,
          course_kin: 20000,
          course2_kin: 0,
          course3_kin: 0,
          simei_kind: 1,
          simei_kin: 0,
          koutu: 0,
          hotel_kin: 0,
          nebiki_kin: 0,
          nebiki_kin_point: 0,
          total: 21000,
          ara: 10000,
          girl_pay: 11000,
          lev: 1,
          nyu_date: '2026-08-14 18:00:00',
          pay_kind: 2,
          media: 104,
          options: '1',
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
          mem_id: 10001,
          shop_no: 5600,
          name: 'private-customer-name',
          tel: '09000000000',
          mail_ad: 'private-customer@example.test',
          birth: '1990-01-01',
          age: 36,
          point: 500,
          lev_member: 1,
          lev: 1,
          lev_admin: 0,
          flg_smail: 0,
          regist_date: '2020-01-01 10:00:00',
          regist_date_new: '2020-01-01',
          login_date: null,
          deli_date: '2026-08-15',
        },
      ],
    },
  }
}

function imageManifest() {
  return {
    version: 1,
    sourceKey: 'gold-master-ikebukuro-5600',
    capturedAt: '2026-08-14T10:31:10.000Z',
    files: [
      {
        sourcePath: '60001/private-photo.jpg',
        targetPath: `casts/ikebukuro/legacy-cast-60001/01-${IMAGE_SHA.slice(0, 16)}.jpg`,
        owner: {
          sourceKey: 'gold-master-ikebukuro-5600',
          entity: 'casts',
          physicalTable: 'nzuadtjn_gold_master.girls',
          legacyId: 'nzuadtjn_gold_master.girls:60001',
        },
        slot: 1,
        mediaType: 'image/jpeg',
        width: 800,
        height: 1200,
        sha256: IMAGE_SHA,
        sizeBytes: 1234,
        visibility: 'public',
      },
    ],
  }
}

function dependencies(
  overrides: Partial<GoldMasterPreviewVerificationDependencies> = {}
): GoldMasterPreviewVerificationDependencies {
  return {
    inspectImages: async () => ({
      inventory: ['60001/private-photo.jpg'],
      files: [
        {
          sourcePath: '60001/private-photo.jpg',
          inspection: {
            isFile: true,
            isSymbolicLink: false,
            sizeBytes: 1234,
            sha256: IMAGE_SHA,
            mediaType: 'image/jpeg',
            width: 800,
            height: 1200,
          },
        },
      ],
    }),
    readMigrations: async () => [
      { name: '20260101000000_baseline', sha256: 'd'.repeat(64) },
      { name: '20260814000000_current', sha256: 'e'.repeat(64) },
    ],
    ...overrides,
  }
}

describe('createGoldMasterPreviewVerificationControl', () => {
  it('covers every target model and emits only redacted counts, aggregates, and canonical hashes', async () => {
    const control = await createGoldMasterPreviewVerificationControl(
      {
        snapshotInput: snapshot(),
        snapshotSha256: SNAPSHOT_SHA,
        imageManifestInput: imageManifest(),
        imageManifestSha256: MANIFEST_SHA,
        imageSourceRoot: '/private/images',
        migrationsRoot: '/workspace/prisma/migrations',
      },
      dependencies()
    )

    expect(Object.keys(control.models).sort()).toEqual([...PREVIEW_UAT_EMPTY_TABLES].sort())
    expect(control.models.Customer.count).toBe(1)
    expect(control.models.Reservation.count).toBe(1)
    expect(control.models.CastLedgerEntry.count).toBe(0)
    expect(control.snapshot.sourceRowCounts).toEqual(
      expect.objectContaining({
        payments: 0,
        withdrawals: 0,
        welfareDeductions: 0,
      })
    )
    expect(control.models.NgCastEntry.count).toBe(0)
    expect(control.models.Reservation.fieldCount).toBeGreaterThan(30)
    expect(control.models.Reservation.canonicalSha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(control.fixtureCanonicalSha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(control.images).toEqual(
      expect.objectContaining({ fileCount: 1, byteCount: 1234, manifestSha256: MANIFEST_SHA })
    )
    expect(control.migrations.entries).toHaveLength(2)
    expect(control.aggregates.reservations).toEqual(
      expect.objectContaining({
        count: 1,
        price: 21000,
        creditCard: 1,
        confirmed: 1,
      })
    )

    const serialized = JSON.stringify(control)
    for (const privateValue of [
      'private-store-name',
      'private-customer-name',
      'private-customer@example.test',
      '09000000000',
      'private-cast-name',
      'private-photo.jpg',
      '/private/images',
    ]) {
      expect(serialized).not.toContain(privateValue)
    }
  })

  it('changes the affected model and fixture digest when one source field changes', async () => {
    const original = await createGoldMasterPreviewVerificationControl(
      {
        snapshotInput: snapshot(),
        snapshotSha256: SNAPSHOT_SHA,
        imageManifestInput: imageManifest(),
        imageManifestSha256: MANIFEST_SHA,
        imageSourceRoot: '/private/images',
        migrationsRoot: '/workspace/prisma/migrations',
      },
      dependencies()
    )
    const changedSnapshot = snapshot()
    changedSnapshot.rows.customers[0].point += 1
    const changed = await createGoldMasterPreviewVerificationControl(
      {
        snapshotInput: changedSnapshot,
        snapshotSha256: 'f'.repeat(64),
        imageManifestInput: imageManifest(),
        imageManifestSha256: MANIFEST_SHA,
        imageSourceRoot: '/private/images',
        migrationsRoot: '/workspace/prisma/migrations',
      },
      dependencies()
    )

    expect(changed.models.Customer.canonicalSha256).not.toBe(
      original.models.Customer.canonicalSha256
    )
    expect(changed.fixtureCanonicalSha256).not.toBe(original.fixtureCanonicalSha256)
    expect(changed.models.Cast.canonicalSha256).toBe(original.models.Cast.canonicalSha256)
  })

  it('fails closed when image bytes or inventory do not exactly match the manifest', async () => {
    await expect(
      createGoldMasterPreviewVerificationControl(
        {
          snapshotInput: snapshot(),
          snapshotSha256: SNAPSHOT_SHA,
          imageManifestInput: imageManifest(),
          imageManifestSha256: MANIFEST_SHA,
          imageSourceRoot: '/private/images',
          migrationsRoot: '/workspace/prisma/migrations',
        },
        dependencies({
          inspectImages: async () => ({
            inventory: ['60001/private-photo.jpg', 'private-extra.jpg'],
            files: [
              {
                sourcePath: '60001/private-photo.jpg',
                inspection: {
                  isFile: true,
                  isSymbolicLink: false,
                  sizeBytes: 1234,
                  sha256: '0'.repeat(64),
                  mediaType: 'image/jpeg',
                  width: 800,
                  height: 1200,
                },
              },
            ],
          }),
        })
      )
    ).rejects.toThrow(GoldMasterPreviewVerificationError)
  })
})
