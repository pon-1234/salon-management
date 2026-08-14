/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md sanitized Ikebukuro legacy-data preview
 * @related_to   gold-master-fixture.ts maps the read-only legacy projection into an isolated fixture
 * @known_issues Final cutover still requires a write-paused atomic legacy snapshot
 */
import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'

import {
  GoldMasterPreviewError,
  buildGoldMasterPreviewFixture,
  projectGoldMasterPreviewImages,
  type GoldMasterIkebukuroSnapshotV4,
} from './gold-master-fixture'

const passwordHashes = {
  admin: 'admin-hash',
  customer: 'customer-hash',
  customerDisabled: 'customer-disabled-hash',
  cast: 'cast-hash',
}
const resolveImageUrl = ({
  girlNo,
  slot,
  fileName,
}: {
  girlNo: number
  slot: number
  fileName: string
}) => `/salon-uploads/casts/legacy-cast-${girlNo}/${slot}-${fileName}`

function snapshot(): GoldMasterIkebukuroSnapshotV4 {
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
      courses: 2,
      paidOptions: 1,
      freeOptions: 1,
      areas: 1,
      stations: 1,
      hotelGroups: 1,
      hotels: 1,
      casts: 2,
      schedules: 2,
      reservations: 1,
      reviews: 1,
      customers: 2,
    },
    afterCounts: {
      stores: 1,
      courses: 2,
      paidOptions: 1,
      freeOptions: 1,
      areas: 1,
      stations: 1,
      hotelGroups: 1,
      hotels: 1,
      casts: 2,
      schedules: 2,
      reservations: 1,
      reviews: 1,
      customers: 2,
    },
    rows: {
      stores: [
        {
          shop_no: 5600,
          shop_name: '金の玉クラブ池袋店',
          tel: '03-5931-5743',
          adress: null,
          eigyo: '10:00～24:00',
          mail_ad: 'customer.goldball@gmail.com',
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
        {
          id: 13,
          sort: 13,
          charge_name: '延長30分',
          charge_name_admin: '延長30分',
          charge_kin: 8000,
          charge_ara: 4000,
          charge_min: 30,
          flg_show: 1,
          flg_web: 0,
        },
      ],
      paidOptions: [
        {
          serial: 1,
          sort: 1,
          option_name: '公開オプション',
          kin: 1000,
          girl_pay: 600,
          lev: 1,
          lev_admin: 1,
        },
      ],
      freeOptions: [
        {
          serial: 1,
          sort: 1,
          option_name: '無料オプション',
          kin: 0,
          lev: 1,
          lev_admin: 1,
        },
      ],
      areas: [
        {
          serial: 88,
          pref_no: 8,
          city_name: '豊島区',
          sort: 1,
          group_no: 1,
          lev: 1,
        },
      ],
      stations: [
        {
          serial: 888,
          shop_no: 5600,
          pref_no: 8,
          city_no: 88,
          station_name: '池袋',
          kana: 'いけぶくろ',
          sort: 1,
          traffic_kin: 2000,
          lev: 1,
          hp_flg: 1,
        },
      ],
      hotelGroups: [
        {
          serial: 20,
          shop_no: 5600,
          pref_no: 8,
          area_name: '池袋ホテルグループ',
          lev: 1,
        },
      ],
      hotels: [
        {
          serial: 999,
          area_no: 20,
          shop_no: 5600,
          pref_no: 8,
          city_no: 88,
          city_no2: 0,
          hotel_name: '旧池袋ホテル',
          station: '池袋駅西口',
          address: '東京都豊島区の確認用住所',
          tel: '0300000000',
          price1: '6800',
          price2: '休憩2時間 8,000円',
          price3: '',
          price4: '',
          cm: '旧ホテル備考',
          lev: 1,
        },
      ],
      casts: [
        {
          girl_no: 56019,
          shop_no: 5600,
          name: '旧公開キャストA',
          age: 31,
          regist_date: '2025-02-03 12:00:00',
          p_height: 160,
          p_bust: 86,
          p_bust_cup: 3,
          p_waist: 58,
          p_hip: 86,
          p_type: 'おっとり',
          profile_catch: '公開キャッチ',
          profile_cm: '公開プロフィール',
          profile_new_1: '趣味',
          profile_new_2: '',
          profile_new_3: '',
          profile_new_4: '',
          profile_new_5: '',
          profile_new_6: '',
          photo_1: 'main.jpg',
          photo_2: 'second.jpg',
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
          access_count: 80,
          options: '01',
          options_free: '01',
        },
        {
          girl_no: 56020,
          shop_no: 5600,
          name: '旧公開キャストB',
          age: 29,
          regist_date: '2026-01-02 12:00:00',
          p_height: 158,
          p_bust: 84,
          p_bust_cup: 2,
          p_waist: 57,
          p_hip: 85,
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
          access_count: 20,
          options: '',
          options_free: null,
        },
      ],
      schedules: [
        {
          serial: 901,
          syu_date: '2026-07-20',
          shop_no: 5600,
          girl_no: 56019,
          work: 3,
          work1: 23,
          work2: '30',
          work3: 26,
          work4: '15',
          flg_work: 0,
        },
        {
          serial: 902,
          syu_date: '2026-07-21',
          shop_no: 5600,
          girl_no: 56020,
          work: 5,
          work1: 10,
          work2: '00',
          work3: 18,
          work4: '00',
          flg_work: 0,
        },
      ],
      reservations: [
        {
          serial: 7001,
          shop_no: 5600,
          girl_no: 56019,
          deli_date: '2026-07-20',
          mem_id: 1234,
          time_h: '25',
          time_m: '30',
          course: 2,
          course_time: 110,
          course_kin: 21000,
          course2_kin: 8000,
          course3_kin: 0,
          simei_kind: 5,
          simei_kin: 1000,
          koutu: 2000,
          hotel_kin: 1500,
          nebiki_kin: 1000,
          nebiki_kin_point: 500,
          total: 30500,
          ara: 17000,
          girl_pay: 13500,
          lev: 3,
          nyu_date: '2026-07-19 10:00:00',
          pay_kind: 2,
          media: 4,
          options: '01',
          options_free: '01',
          pref_no: 8,
          city_no: 88,
          station_no: 888,
          place_h_no: 999,
        },
      ],
      reviews: [
        {
          serial: 5001,
          shop_no: 5600,
          mem_id: 1234,
          girl_no: 56019,
          order_no: 7001,
          add_date: '2026-07-20 18:00:00',
          h_lev: 5,
          cm: '旧HPで公開済みの口コミ',
          lev: 1,
        },
      ],
      customers: [
        {
          mem_id: 1234,
          shop_no: 5600,
          name: '旧実名顧客',
          tel: '090-1234-5678',
          mail_ad: 'legacy-customer@example.com',
          birth: '1985-04-03',
          age: 41,
          point: 3200,
          lev_member: 4,
          lev: 2,
          lev_admin: 0,
          flg_smail: 0,
          regist_date: '2020-05-06 12:34:56',
          regist_date_new: '2020-05-06',
          login_date: '2026-07-19 09:00:00',
          deli_date: '2026-07-20',
        },
        {
          mem_id: 2345,
          shop_no: null,
          name: '旧台帳のみ顧客',
          tel: '080-2222-3333',
          mail_ad: 'ledger-only@example.com',
          birth: '1992-06-07',
          age: 34,
          point: 500,
          lev_member: 1,
          lev: 1,
          lev_admin: 0,
          flg_smail: 1,
          regist_date: '2024-03-02 01:02:03',
          regist_date_new: '2024-03-02',
          login_date: null,
          deli_date: null,
        },
      ],
    },
  }
}

describe('buildGoldMasterPreviewFixture', () => {
  it('assigns every migrated Ikebukuro customer to the Ikebukuro store', () => {
    const fixture = buildGoldMasterPreviewFixture(snapshot(), { passwordHashes, resolveImageUrl })

    expect(fixture.customerStoreAssignments).toEqual([
      { customerId: 'legacy-customer-member-1234', storeId: 'uat-ikebukuro' },
      { customerId: 'legacy-customer-member-2345', storeId: 'uat-ikebukuro' },
    ])
  })

  it('projects the exact legacy photo slots at the canonical snapshot cutoff', () => {
    expect(projectGoldMasterPreviewImages(snapshot())).toEqual({
      cutoffAt: '2026-07-20T04:00:00.000Z',
      references: [
        { girlNo: 56019, slot: 1, fileName: 'main.jpg' },
        { girlNo: 56019, slot: 2, fileName: 'second.jpg' },
      ],
    })
  })

  it('builds a one-store fixture with real public and customer data plus isolated credentials', () => {
    const fixture = buildGoldMasterPreviewFixture(snapshot(), { passwordHashes, resolveImageUrl })

    expect(fixture.stores).toEqual([
      expect.objectContaining({
        id: 'uat-ikebukuro',
        slug: 'ikebukuro',
        name: '金の玉クラブ池袋店',
        phone: '03-5931-5743',
        email: 'customer.goldball@gmail.com',
      }),
    ])
    expect(fixture.stores).toHaveLength(1)
    expect(fixture.storeSettings[0]).toEqual(
      expect.objectContaining({
        storeId: 'uat-ikebukuro',
        businessHours: '10:00-24:00',
      })
    )
    expect(fixture.courses).toEqual([
      expect.objectContaining({
        id: 'legacy-course-2',
        displayOrder: 2,
        duration: 80,
        price: 21000,
        storeShare: 10000,
        castShare: 11000,
        enableWebBooking: true,
      }),
      expect.objectContaining({
        id: 'legacy-course-13',
        displayOrder: 13,
        enableWebBooking: false,
      }),
    ])
    expect(fixture.options).toEqual([
      expect.objectContaining({
        id: 'legacy-option-paid-1',
        name: '公開オプション',
        price: 1000,
        storeShare: 400,
        castShare: 600,
      }),
      expect.objectContaining({
        id: 'legacy-option-free-1',
        name: '無料オプション',
        price: 0,
      }),
    ])
    expect(fixture.casts).toHaveLength(2)
    expect(fixture.casts[0]).toEqual(
      expect.objectContaining({
        id: 'legacy-cast-56019',
        name: '旧公開キャストA',
        bust: '86',
        image: '/salon-uploads/casts/legacy-cast-56019/1-main.jpg',
        images: [
          '/salon-uploads/casts/legacy-cast-56019/1-main.jpg',
          '/salon-uploads/casts/legacy-cast-56019/2-second.jpg',
        ],
        panelDesignationRank: 1,
        loginEmail: 'cast-ikebukuro@preview-uat.invalid',
        passwordHash: 'cast-hash',
        availableOptions: ['legacy-option-paid-1', 'legacy-option-free-1'],
      })
    )
    expect(fixture.casts[1]).toEqual(
      expect.objectContaining({
        id: 'legacy-cast-56020',
        image: '/images/non-photo.svg',
        loginEmail: null,
        passwordHash: null,
      })
    )
    expect(fixture.casts.every(({ publicProfile }) => publicProfile === Prisma.JsonNull)).toBe(true)
    expect(fixture.castOptionSettings).toEqual([
      expect.objectContaining({
        castId: 'legacy-cast-56019',
        optionId: 'legacy-option-paid-1',
      }),
      expect.objectContaining({
        castId: 'legacy-cast-56019',
        optionId: 'legacy-option-free-1',
      }),
    ])
    expect(fixture.areas).toEqual([
      expect.objectContaining({
        id: 'legacy-area-88',
        name: '豊島区',
        prefecture: '東京都',
        storeId: 'uat-ikebukuro',
      }),
    ])
    expect(fixture.stations).toEqual([
      expect.objectContaining({
        id: 'legacy-station-888',
        name: '池袋',
        areaId: 'legacy-area-88',
        transportationFee: 2000,
        storeId: 'uat-ikebukuro',
      }),
    ])
    expect(fixture.hotels).toEqual([
      expect.objectContaining({
        id: 'legacy-hotel-999',
        storeId: 'uat-ikebukuro',
        legacyId: '999',
        hotelName: '旧池袋ホテル',
        area: '池袋ホテルグループ',
        station: '池袋駅西口',
        address: '東京都豊島区の確認用住所',
        phone: '0300000000',
        notes: '旧ホテル備考',
        isActive: true,
      }),
    ])
    expect(fixture.hotelServiceAreas).toEqual([
      expect.objectContaining({
        hotelId: 'legacy-hotel-999',
        areaId: 'legacy-area-88',
        storeId: 'uat-ikebukuro',
      }),
    ])
    expect(fixture.hotelRates).toEqual([
      expect.objectContaining({
        hotelId: 'legacy-hotel-999',
        rawText: JSON.stringify({ sourceField: 'price1', rawValue: '6800' }),
        displayOrder: 1,
      }),
      expect.objectContaining({
        hotelId: 'legacy-hotel-999',
        rawText: JSON.stringify({ sourceField: 'price2', rawValue: '休憩2時間 8,000円' }),
        displayOrder: 2,
      }),
    ])
    expect(fixture.admins.map(({ email }) => email)).toEqual([
      'super-admin@preview-uat.invalid',
      'manager-ikebukuro@preview-uat.invalid',
    ])
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
    expect(fixture.adminStoreAssignments).toEqual([
      { adminId: 'uat-admin-manager', storeId: 'uat-ikebukuro' },
    ])

    const migratedCustomer = fixture.customers.find(
      ({ id }) => id === 'legacy-customer-member-1234'
    )
    expect(migratedCustomer).toEqual(
      expect.objectContaining({
        name: '[確認用] 旧実名顧客',
        email: 'customer@preview-uat.invalid',
        phone: '09012345678',
        birthDate: new Date('1985-04-03T00:00:00.000Z'),
        memberType: 'vip',
        accountStatus: 'active',
        membershipStage: 'platinum',
        lastLoginAt: new Date('2026-07-19T00:00:00.000Z'),
        lastVisitAt: new Date('2026-07-19T15:00:00.000Z'),
        points: 3200,
        password: 'customer-hash',
        smsEnabled: false,
        emailNotificationEnabled: false,
        emailVerified: true,
      })
    )
    expect(fixture.customers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'legacy-customer-member-2345',
          name: '[確認用] 旧台帳のみ顧客',
          email: 'ledger-only@example.com',
          phone: '08022223333',
          password: 'customer-disabled-hash',
          accountStatus: 'active',
          membershipStage: 'regular',
          lastLoginAt: null,
          lastVisitAt: null,
          points: 500,
          emailVerified: false,
        }),
      ])
    )
    expect(fixture.customers).toHaveLength(2)
    expect(fixture.reservations.some(({ customerId }) => customerId === migratedCustomer?.id)).toBe(
      true
    )

    expect(fixture.reservations).toEqual([
      expect.objectContaining({
        id: 'legacy-reservation-7001',
        customerId: 'legacy-customer-member-1234',
        castId: 'legacy-cast-56019',
        courseId: 'legacy-course-2',
        startTime: new Date('2026-07-20T16:30:00.000Z'),
        endTime: new Date('2026-07-20T18:20:00.000Z'),
        status: 'completed',
        settlementStatus: 'pending',
        price: 30500,
        designationType: 'regular',
        designationFee: 1000,
        transportationFee: 2000,
        additionalFee: 8000,
        hotelExpense: 1500,
        discountAmount: 1000,
        pointsUsed: 500,
        paymentMethod: 'クレジットカード',
        storeRevenue: 17000,
        staffRevenue: 13500,
        areaId: 'legacy-area-88',
        stationId: 'legacy-station-888',
        hotelId: 'legacy-hotel-999',
        hotelName: '旧池袋ホテル',
      }),
    ])
    expect(fixture.reservationOptions).toEqual([
      expect.objectContaining({
        reservationId: 'legacy-reservation-7001',
        optionId: 'legacy-option-paid-1',
        optionName: '公開オプション',
        optionPrice: 1000,
        storeShare: 400,
        castShare: 600,
      }),
      expect.objectContaining({
        reservationId: 'legacy-reservation-7001',
        optionId: 'legacy-option-free-1',
        optionName: '無料オプション',
        optionPrice: 0,
      }),
    ])
    expect(fixture.reviews).toEqual([
      expect.objectContaining({
        id: 'legacy-review-5001',
        customerId: 'legacy-customer-member-1234',
        castId: 'legacy-cast-56019',
        reservationId: 'legacy-reservation-7001',
        rating: 5,
        comment: '旧HPで公開済みの口コミ',
        status: 'published',
      }),
    ])
  })

  it('normalizes legacy phones and replaces digit-equivalent duplicates deterministically', () => {
    const legacy = snapshot()
    legacy.rows.customers[1].tel = '09012345678'

    const fixture = buildGoldMasterPreviewFixture(legacy, { passwordHashes, resolveImageUrl })
    const phones = fixture.customers.map(({ phone }) => phone)

    expect(phones[0]).toBe('09012345678')
    expect(phones[1]).toMatch(/^\d{11}$/u)
    expect(new Set(phones).size).toBe(phones.length)
  })

  it('preserves the approved national-format phone representation in the audited fixture', () => {
    const fixture = buildGoldMasterPreviewFixture(snapshot(), {
      passwordHashes,
      resolveImageUrl,
    })

    expect(fixture.customers.map(({ phone }) => phone)).toEqual(['09012345678', '08022223333'])
  })

  it('converts legacy 24-29 hour schedule notation to the following JST day', () => {
    const fixture = buildGoldMasterPreviewFixture(snapshot(), { passwordHashes, resolveImageUrl })

    expect(fixture.castSchedules[0]).toEqual(
      expect.objectContaining({
        date: new Date('2026-07-19T15:00:00.000Z'),
        startTime: new Date('2026-07-20T14:30:00.000Z'),
        endTime: new Date('2026-07-20T17:15:00.000Z'),
        isAvailable: true,
      })
    )
    expect(fixture.castSchedules[1]).toEqual(
      expect.objectContaining({
        isAvailable: false,
      })
    )
  })

  it('normalizes nullable legacy profile and fee columns without admitting unknown fields', () => {
    const legacy = snapshot() as any
    legacy.rows.casts[0].profile_catch = null
    legacy.rows.casts[0].profile_cm = null
    legacy.rows.casts[0].photo_2 = null
    legacy.rows.reservations[0].simei_kin = null

    const fixture = buildGoldMasterPreviewFixture(legacy, { passwordHashes, resolveImageUrl })

    expect(fixture.casts[0].images).toEqual(['/salon-uploads/casts/legacy-cast-56019/1-main.jpg'])
    expect(fixture.reservations[0]).toEqual(
      expect.objectContaining({ designationType: 'regular', designationFee: 0 })
    )
  })

  it('binds every legacy photo slot to its verified preview-storage URL', () => {
    const fixtureOptions = {
      passwordHashes,
      resolveImageUrl: ({
        girlNo,
        slot,
        fileName,
      }: {
        girlNo: number
        slot: number
        fileName: string
      }) => `/salon-uploads/casts/legacy-cast-${girlNo}/${slot}-${fileName}`,
    }

    const fixture = buildGoldMasterPreviewFixture(snapshot(), fixtureOptions)

    expect(fixture.casts[0]).toEqual(
      expect.objectContaining({
        image: '/salon-uploads/casts/legacy-cast-56019/1-main.jpg',
        images: [
          '/salon-uploads/casts/legacy-cast-56019/1-main.jpg',
          '/salon-uploads/casts/legacy-cast-56019/2-second.jpg',
        ],
      })
    )
  })

  it('preserves an unresolved legacy hotel group without inventing a service area', () => {
    const legacy = snapshot() as any
    legacy.rows.hotels[0].area_no = 19

    const fixture = buildGoldMasterPreviewFixture(legacy, { passwordHashes, resolveImageUrl })

    expect(fixture.hotels[0]).toEqual(
      expect.objectContaining({
        area: null,
        rawText: JSON.stringify({
          legacyAreaNo: 19,
          legacyPrefectureNo: 8,
          legacyCityNos: [88],
        }),
      })
    )
  })

  it.each([
    ['wrong source database', (value: any) => (value.scope.sourceDatabase = 'other')],
    ['unsupported snapshot version', (value: any) => (value.version = 2)],
    ['wrong shop', (value: any) => (value.scope.shopNo = 1000)],
    ['non-read-only scope', (value: any) => (value.scope.consistency = 'live-copy')],
    ['count drift', (value: any) => (value.afterCounts.casts = 3)],
    ['cross-shop cast', (value: any) => (value.rows.casts[0].shop_no = 1000)],
    ['unresolved cast', (value: any) => (value.rows.schedules[0].girl_no = 99999)],
    ['unresolved course', (value: any) => (value.rows.reservations[0].course = 999)],
    ['unresolved paid cast option', (value: any) => (value.rows.casts[0].options = '02')],
    [
      'unresolved free reservation option',
      (value: any) => (value.rows.reservations[0].options_free = '02'),
    ],
    ['malformed option list', (value: any) => (value.rows.casts[0].options = '01##02')],
    ['duplicate option list entry', (value: any) => (value.rows.casts[0].options = '01#1')],
    ['unresolved area', (value: any) => (value.rows.reservations[0].city_no = 999)],
    ['unresolved station', (value: any) => (value.rows.reservations[0].station_no = 999)],
    ['station area mismatch', (value: any) => (value.rows.stations[0].city_no = 999)],
    ['unresolved hotel', (value: any) => (value.rows.reservations[0].place_h_no = 998)],
    ['unresolved hotel service area', (value: any) => (value.rows.hotels[0].city_no = 998)],
    [
      'duplicate cast day',
      (value: any) => value.rows.schedules.push({ ...value.rows.schedules[0] }),
    ],
    ['credential field', (value: any) => (value.rows.casts[0].pass = 'must-never-enter')],
    ['customer phone field', (value: any) => (value.rows.reservations[0].tel = '09000000000')],
  ])('rejects unsafe or inconsistent snapshots: %s', (_name, mutate) => {
    const unsafe = snapshot() as any
    mutate(unsafe)

    expect(() =>
      buildGoldMasterPreviewFixture(unsafe, { passwordHashes, resolveImageUrl })
    ).toThrow(GoldMasterPreviewError)
  })

  it('is deterministic for the same snapshot and password hashes', () => {
    const first = buildGoldMasterPreviewFixture(snapshot(), { passwordHashes, resolveImageUrl })
    const second = buildGoldMasterPreviewFixture(snapshot(), { passwordHashes, resolveImageUrl })

    expect(second).toEqual(first)
  })
})
