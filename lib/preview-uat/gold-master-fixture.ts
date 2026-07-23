/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md sanitized Ikebukuro legacy-data preview
 * @related_to   scripts/extract-gold-master-ikebukuro-preview.php provides the strict read-only projection
 * @known_issues This best-effort UAT projection is not an atomic final-cutover snapshot
 */
import { Prisma } from '@prisma/client'
import { addMinutes } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { z } from 'zod'

import type { PreviewUatFixture } from './setup'

const STORE_ID = 'uat-ikebukuro'
const STORE_SLUG = 'ikebukuro'
const SOURCE_DATABASE = 'nzuadtjn_gold_master'
const SHOP_NO = 5600
const TIME_ZONE = 'Asia/Tokyo'
const LEGACY_IMAGE_BASE = 'https://gold-esthe.com/ikebukuro/img_girls/5600'

const integer = z
  .union([z.number().int(), z.string().regex(/^-?[0-9]+$/u)])
  .transform((value) => Number(value))
  .refine(Number.isSafeInteger)
const nonNegativeInteger = integer.refine((value) => value >= 0)
const positiveInteger = integer.refine((value) => value > 0)
const nullableText = z.string().nullable()
const emptyIfNull = z
  .string()
  .nullable()
  .transform((value) => value ?? '')
const zeroIfNull = z.union([nonNegativeInteger, z.null()]).transform((value) => value ?? 0)
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)
const dateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u)

const countsSchema = z
  .object({
    stores: nonNegativeInteger,
    courses: nonNegativeInteger,
    paidOptions: nonNegativeInteger,
    freeOptions: nonNegativeInteger,
    areas: nonNegativeInteger,
    stations: nonNegativeInteger,
    hotelGroups: nonNegativeInteger,
    hotels: nonNegativeInteger,
    casts: nonNegativeInteger,
    schedules: nonNegativeInteger,
    reservations: nonNegativeInteger,
    reviews: nonNegativeInteger,
  })
  .strict()

const storeSchema = z
  .object({
    shop_no: integer,
    shop_name: z.string().min(1),
    tel: nullableText,
    adress: nullableText,
    eigyo: nullableText,
    mail_ad: nullableText,
    lev: integer,
  })
  .strict()

const courseSchema = z
  .object({
    id: nonNegativeInteger,
    sort: nonNegativeInteger,
    charge_name: z.string().min(1),
    charge_name_admin: z.string(),
    charge_kin: nonNegativeInteger,
    charge_ara: nonNegativeInteger,
    charge_min: nonNegativeInteger,
    flg_show: integer,
    flg_web: integer,
  })
  .strict()

const optionSchema = z
  .object({
    serial: nonNegativeInteger,
    sort: nonNegativeInteger,
    option_name: z.string().min(1),
    kin: nonNegativeInteger,
    girl_pay: nonNegativeInteger,
    lev: integer,
    lev_admin: integer,
  })
  .strict()

const freeOptionSchema = z
  .object({
    serial: positiveInteger,
    sort: nonNegativeInteger,
    option_name: z.string().min(1),
    kin: nonNegativeInteger,
    lev: integer,
    lev_admin: integer,
  })
  .strict()

const areaSchema = z
  .object({
    serial: positiveInteger,
    pref_no: positiveInteger,
    city_name: z.string().min(1),
    sort: nonNegativeInteger,
    group_no: nonNegativeInteger,
    lev: integer,
  })
  .strict()

const stationSchema = z
  .object({
    serial: positiveInteger,
    shop_no: integer,
    pref_no: positiveInteger,
    city_no: positiveInteger,
    station_name: z.string().min(1),
    kana: emptyIfNull,
    sort: nonNegativeInteger,
    traffic_kin: nonNegativeInteger,
    lev: integer,
    hp_flg: integer,
  })
  .strict()

const hotelGroupSchema = z
  .object({
    serial: positiveInteger,
    shop_no: integer,
    pref_no: positiveInteger,
    area_name: z.string().min(1),
    lev: integer,
  })
  .strict()

const hotelSchema = z
  .object({
    serial: positiveInteger,
    area_no: zeroIfNull,
    shop_no: integer,
    pref_no: zeroIfNull,
    city_no: zeroIfNull,
    city_no2: zeroIfNull,
    hotel_name: z.string().min(1),
    station: emptyIfNull,
    address: emptyIfNull,
    tel: emptyIfNull,
    price1: emptyIfNull,
    price2: emptyIfNull,
    price3: emptyIfNull,
    price4: emptyIfNull,
    cm: emptyIfNull,
    lev: integer,
  })
  .strict()

const castSchema = z
  .object({
    girl_no: nonNegativeInteger,
    shop_no: integer,
    name: z.string().min(1),
    age: nonNegativeInteger,
    regist_date: dateTime,
    p_height: nonNegativeInteger,
    p_bust: nonNegativeInteger,
    p_bust_cup: nonNegativeInteger,
    p_waist: nonNegativeInteger,
    p_hip: nonNegativeInteger,
    p_type: emptyIfNull,
    profile_catch: emptyIfNull,
    profile_cm: emptyIfNull,
    profile_new_1: emptyIfNull,
    profile_new_2: emptyIfNull,
    profile_new_3: emptyIfNull,
    profile_new_4: emptyIfNull,
    profile_new_5: emptyIfNull,
    profile_new_6: emptyIfNull,
    photo_1: emptyIfNull,
    photo_2: emptyIfNull,
    photo_3: emptyIfNull,
    photo_4: emptyIfNull,
    photo_5: emptyIfNull,
    photo_6: emptyIfNull,
    photo_7: emptyIfNull,
    photo_8: emptyIfNull,
    photo_9: emptyIfNull,
    photo_10: emptyIfNull,
    photo_11: emptyIfNull,
    photo_12: emptyIfNull,
    photo_13: emptyIfNull,
    photo_14: emptyIfNull,
    photo_15: emptyIfNull,
    access_count: nonNegativeInteger,
    options: emptyIfNull,
    options_free: emptyIfNull,
  })
  .strict()

const scheduleSchema = z
  .object({
    serial: nonNegativeInteger,
    syu_date: dateOnly,
    shop_no: integer,
    girl_no: nonNegativeInteger,
    work: integer,
    work1: nonNegativeInteger,
    work2: nonNegativeInteger,
    work3: nonNegativeInteger,
    work4: nonNegativeInteger,
    flg_work: integer,
  })
  .strict()

const reservationSchema = z
  .object({
    serial: nonNegativeInteger,
    shop_no: integer,
    girl_no: nonNegativeInteger,
    deli_date: dateOnly,
    mem_id: nonNegativeInteger,
    time_h: nonNegativeInteger,
    time_m: nonNegativeInteger,
    course: nonNegativeInteger,
    course_time: nonNegativeInteger,
    course_kin: nonNegativeInteger,
    course2_kin: nonNegativeInteger,
    course3_kin: nonNegativeInteger,
    simei_kind: integer,
    simei_kin: zeroIfNull,
    koutu: nonNegativeInteger,
    hotel_kin: nonNegativeInteger,
    nebiki_kin: nonNegativeInteger,
    nebiki_kin_point: nonNegativeInteger,
    total: nonNegativeInteger,
    ara: nonNegativeInteger,
    girl_pay: nonNegativeInteger,
    lev: integer,
    nyu_date: dateTime,
    pay_kind: integer,
    media: integer,
    options: emptyIfNull,
    options_free: emptyIfNull,
    pref_no: zeroIfNull,
    city_no: zeroIfNull,
    station_no: zeroIfNull,
    place_h_no: zeroIfNull,
  })
  .strict()

const reviewSchema = z
  .object({
    serial: nonNegativeInteger,
    shop_no: integer,
    mem_id: nonNegativeInteger,
    girl_no: nonNegativeInteger,
    order_no: nonNegativeInteger,
    add_date: dateTime,
    h_lev: integer,
    cm: z.string(),
    lev: integer,
  })
  .strict()

const snapshotSchema = z
  .object({
    version: z.literal(3),
    scope: z
      .object({
        sourceDatabase: z.literal(SOURCE_DATABASE),
        shopNo: z.literal(SHOP_NO),
        cutoffAt: dateTime,
        scheduleFrom: dateOnly,
        scheduleTo: dateOnly,
        reservationFrom: dateOnly,
        consistency: z.literal('best-effort-read-only'),
      })
      .strict(),
    beforeCounts: countsSchema,
    afterCounts: countsSchema,
    rows: z
      .object({
        stores: z.array(storeSchema),
        courses: z.array(courseSchema),
        paidOptions: z.array(optionSchema),
        freeOptions: z.array(freeOptionSchema),
        areas: z.array(areaSchema),
        stations: z.array(stationSchema),
        hotelGroups: z.array(hotelGroupSchema),
        hotels: z.array(hotelSchema),
        casts: z.array(castSchema),
        schedules: z.array(scheduleSchema),
        reservations: z.array(reservationSchema),
        reviews: z.array(reviewSchema),
      })
      .strict(),
  })
  .strict()

export type GoldMasterIkebukuroSnapshotV3 = z.input<typeof snapshotSchema>

interface GoldMasterPreviewFixtureInput {
  passwordHashes: {
    admin: string
    customer: string
    cast: string
  }
}

export class GoldMasterPreviewError extends Error {
  constructor() {
    super('GOLD_MASTER_PREVIEW_REJECTED')
    this.name = 'GoldMasterPreviewError'
  }
}

function parseLegacyDateTime(value: string): Date {
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/u.test(normalized)
  const parsed = hasZone ? new Date(normalized) : zonedTimeToUtc(normalized, TIME_ZONE)
  if (Number.isNaN(parsed.getTime())) throw new GoldMasterPreviewError()
  return parsed
}

function legacyClock(date: string, hour: number, minute: number): Date {
  if (hour > 47 || minute > 59) throw new GoldMasterPreviewError()
  const dayOffset = Math.floor(hour / 24)
  const base = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) throw new GoldMasterPreviewError()
  base.setUTCDate(base.getUTCDate() + dayOffset)
  const dateKey = base.toISOString().slice(0, 10)
  return zonedTimeToUtc(
    `${dateKey}T${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    TIME_ZONE
  )
}

function customerKey(memId: number, fallback: string): string {
  return memId > 0 ? `member-${memId}` : fallback
}

function customerId(key: string): string {
  return `legacy-customer-${key}`
}

function normalizeBusinessHours(value: string | null): string {
  const normalized = value
    ?.trim()
    .replace(/[~〜～]/gu, '-')
    .replace(/\s+/gu, '')
  return normalized || '10:00-24:00'
}

function buildImageUrl(girlNo: number, fileName: string): string {
  return `${LEGACY_IMAGE_BASE}/${girlNo}/${encodeURIComponent(fileName)}`
}

function reservationStatus(value: number): string {
  if (value === 3) return 'completed'
  if (value === 1 || value === 2) return 'confirmed'
  if (value >= -2 && value <= 0) return 'pending'
  throw new GoldMasterPreviewError()
}

function designationType(value: number, fee: number): string | null {
  if (fee === 0 && value === 0) return null
  return value >= 5 ? 'regular' : 'panel'
}

type LegacyOptionKind = 'paid' | 'free'

const PREFECTURES = [
  '',
  '北海道',
  '青森県',
  '岩手県',
  '秋田県',
  '宮城県',
  '山形県',
  '福島県',
  '東京都',
  '神奈川県',
  '千葉県',
  '埼玉県',
  '群馬県',
  '茨城県',
  '栃木県',
  '山梨県',
  '石川県',
  '福井県',
  '富山県',
  '新潟県',
  '長野県',
  '愛知県',
  '岐阜県',
  '静岡県',
  '三重県',
  '大阪府',
  '京都府',
  '奈良県',
  '兵庫県',
  '滋賀県',
  '和歌山県',
  '岡山県',
  '広島県',
  '島根県',
  '鳥取県',
  '山口県',
  '愛媛県',
  '香川県',
  '高知県',
  '徳島県',
  '福岡県',
  '佐賀県',
  '大分県',
  '長崎県',
  '熊本県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
] as const

function legacyOptionId(kind: LegacyOptionKind, serial: number): string {
  return `legacy-option-${kind}-${serial}`
}

function parseLegacyOptionList(
  value: string,
  kind: LegacyOptionKind,
  knownSerials: ReadonlySet<number>
): number[] {
  if (value === '') return []
  if (!/^[0-9]+(?:#[0-9]+)*$/u.test(value)) throw new GoldMasterPreviewError()

  const serials = value.split('#').map((token) => Number(token))
  const unique = new Set<number>()
  for (const serial of serials) {
    if (!Number.isSafeInteger(serial) || serial <= 0 || unique.has(serial)) {
      throw new GoldMasterPreviewError()
    }
    if (!knownSerials.has(serial)) throw new GoldMasterPreviewError()
    unique.add(serial)
  }
  return [...unique]
}

function prefectureName(prefectureNumber: number): string {
  const name = PREFECTURES[prefectureNumber]
  if (!name) throw new GoldMasterPreviewError()
  return name
}

function assertSnapshotIntegrity(snapshot: z.output<typeof snapshotSchema>): void {
  const rowCounts: Record<keyof typeof snapshot.beforeCounts, number> = {
    stores: snapshot.rows.stores.length,
    courses: snapshot.rows.courses.length,
    paidOptions: snapshot.rows.paidOptions.length,
    freeOptions: snapshot.rows.freeOptions.length,
    areas: snapshot.rows.areas.length,
    stations: snapshot.rows.stations.length,
    hotelGroups: snapshot.rows.hotelGroups.length,
    hotels: snapshot.rows.hotels.length,
    casts: snapshot.rows.casts.length,
    schedules: snapshot.rows.schedules.length,
    reservations: snapshot.rows.reservations.length,
    reviews: snapshot.rows.reviews.length,
  }
  for (const entity of Object.keys(snapshot.beforeCounts) as Array<
    keyof typeof snapshot.beforeCounts
  >) {
    if (
      snapshot.beforeCounts[entity] !== snapshot.afterCounts[entity] ||
      snapshot.afterCounts[entity] !== rowCounts[entity]
    ) {
      throw new GoldMasterPreviewError()
    }
  }
  if (snapshot.rows.stores.length !== 1) throw new GoldMasterPreviewError()
  if (snapshot.scope.scheduleFrom > snapshot.scope.scheduleTo) throw new GoldMasterPreviewError()

  const uniqueIds = new Set<string>()
  const addUnique = (key: string) => {
    if (uniqueIds.has(key)) throw new GoldMasterPreviewError()
    uniqueIds.add(key)
  }
  snapshot.rows.courses.forEach(({ id }) => addUnique(`course:${id}`))
  snapshot.rows.paidOptions.forEach(({ serial }) => addUnique(`paid-option:${serial}`))
  snapshot.rows.freeOptions.forEach(({ serial }) => addUnique(`free-option:${serial}`))
  snapshot.rows.areas.forEach(({ serial }) => addUnique(`area:${serial}`))
  snapshot.rows.stations.forEach(({ serial }) => addUnique(`station:${serial}`))
  snapshot.rows.hotelGroups.forEach(({ serial }) => addUnique(`hotel-group:${serial}`))
  snapshot.rows.hotels.forEach(({ serial }) => addUnique(`hotel:${serial}`))
  snapshot.rows.casts.forEach(({ girl_no }) => addUnique(`cast:${girl_no}`))
  snapshot.rows.reservations.forEach(({ serial }) => addUnique(`reservation:${serial}`))
  snapshot.rows.reviews.forEach(({ serial }) => addUnique(`review:${serial}`))

  const castIds = new Set(snapshot.rows.casts.map(({ girl_no }) => girl_no))
  const courseIds = new Set(snapshot.rows.courses.map(({ id }) => id))
  const paidOptionIds = new Set(snapshot.rows.paidOptions.map(({ serial }) => serial))
  const freeOptionIds = new Set(snapshot.rows.freeOptions.map(({ serial }) => serial))
  const areasById = new Map(snapshot.rows.areas.map((row) => [row.serial, row] as const))
  const stationsById = new Map(snapshot.rows.stations.map((row) => [row.serial, row] as const))
  const hotelsById = new Map(snapshot.rows.hotels.map((row) => [row.serial, row] as const))

  for (const row of snapshot.rows.areas) prefectureName(row.pref_no)
  for (const row of snapshot.rows.stations) {
    const area = areasById.get(row.city_no)
    if (!area || area.pref_no !== row.pref_no || row.shop_no !== SHOP_NO) {
      throw new GoldMasterPreviewError()
    }
  }
  for (const row of snapshot.rows.hotelGroups) prefectureName(row.pref_no)
  for (const row of snapshot.rows.hotels) {
    if (row.shop_no !== SHOP_NO) throw new GoldMasterPreviewError()
    if (row.pref_no !== 0) prefectureName(row.pref_no)
    for (const cityNo of new Set([row.city_no, row.city_no2])) {
      if (cityNo === 0) continue
      const area = areasById.get(cityNo)
      if (!area || (row.pref_no !== 0 && area.pref_no !== row.pref_no)) {
        throw new GoldMasterPreviewError()
      }
    }
  }
  for (const row of snapshot.rows.casts) {
    parseLegacyOptionList(row.options, 'paid', paidOptionIds)
    parseLegacyOptionList(row.options_free, 'free', freeOptionIds)
  }
  const castDays = new Set<string>()
  for (const row of snapshot.rows.schedules) {
    const key = `${row.girl_no}:${row.syu_date}`
    if (castDays.has(key)) throw new GoldMasterPreviewError()
    castDays.add(key)
    if (!castIds.has(row.girl_no)) throw new GoldMasterPreviewError()
  }
  for (const row of snapshot.rows.reservations) {
    if (!castIds.has(row.girl_no) || !courseIds.has(row.course)) {
      throw new GoldMasterPreviewError()
    }
    parseLegacyOptionList(row.options, 'paid', paidOptionIds)
    parseLegacyOptionList(row.options_free, 'free', freeOptionIds)
    if (row.pref_no !== 0) prefectureName(row.pref_no)
    const area = row.city_no === 0 ? undefined : areasById.get(row.city_no)
    if (row.city_no !== 0 && !area) throw new GoldMasterPreviewError()
    if (area && row.pref_no !== 0 && area.pref_no !== row.pref_no) {
      throw new GoldMasterPreviewError()
    }
    const station = row.station_no === 0 ? undefined : stationsById.get(row.station_no)
    if (row.station_no !== 0 && !station) throw new GoldMasterPreviewError()
    if (
      station &&
      (station.shop_no !== SHOP_NO ||
        (row.city_no !== 0 && station.city_no !== row.city_no) ||
        (row.pref_no !== 0 && station.pref_no !== row.pref_no))
    ) {
      throw new GoldMasterPreviewError()
    }
    const hotel = row.place_h_no === 0 ? undefined : hotelsById.get(row.place_h_no)
    if (row.place_h_no !== 0 && (!hotel || hotel.shop_no !== SHOP_NO)) {
      throw new GoldMasterPreviewError()
    }
  }
  for (const row of snapshot.rows.reviews) {
    if (!castIds.has(row.girl_no) || row.lev !== 1) throw new GoldMasterPreviewError()
  }

  const scopedRows = [
    ...snapshot.rows.stores,
    ...snapshot.rows.casts,
    ...snapshot.rows.stations,
    ...snapshot.rows.hotelGroups,
    ...snapshot.rows.hotels,
    ...snapshot.rows.schedules,
    ...snapshot.rows.reservations,
    ...snapshot.rows.reviews,
  ]
  if (scopedRows.some((row) => row.shop_no !== SHOP_NO)) throw new GoldMasterPreviewError()
}

/** Maps a strict, sanitized legacy snapshot into one deterministic isolated-preview fixture. */
export function buildGoldMasterPreviewFixture(
  input: unknown,
  { passwordHashes }: GoldMasterPreviewFixtureInput
): PreviewUatFixture {
  let snapshot: z.output<typeof snapshotSchema>
  try {
    snapshot = snapshotSchema.parse(input)
    assertSnapshotIntegrity(snapshot)
  } catch {
    throw new GoldMasterPreviewError()
  }

  const cutoffAt = parseLegacyDateTime(snapshot.scope.cutoffAt)
  const store = snapshot.rows.stores[0]
  const paidOptionRows = [...snapshot.rows.paidOptions].sort(
    (left, right) => left.sort - right.sort || left.serial - right.serial
  )
  const freeOptionRows = [...snapshot.rows.freeOptions].sort(
    (left, right) => left.sort - right.sort || left.serial - right.serial
  )
  const paidOptionsBySerial = new Map(paidOptionRows.map((row) => [row.serial, row] as const))
  const freeOptionsBySerial = new Map(freeOptionRows.map((row) => [row.serial, row] as const))
  const paidOptionSerials = new Set(paidOptionsBySerial.keys())
  const freeOptionSerials = new Set(freeOptionsBySerial.keys())
  const stationsBySerial = new Map(snapshot.rows.stations.map((row) => [row.serial, row] as const))
  const hotelGroupsBySerial = new Map(
    snapshot.rows.hotelGroups.map((row) => [row.serial, row] as const)
  )
  const hotelsBySerial = new Map(snapshot.rows.hotels.map((row) => [row.serial, row] as const))
  const sortedHotels = [...snapshot.rows.hotels].sort(
    (left, right) => left.area_no - right.area_no || left.serial - right.serial
  )
  const sortedCasts = [...snapshot.rows.casts].sort(
    (left, right) => right.access_count - left.access_count || left.girl_no - right.girl_no
  )
  const customerKeys = new Set<string>()
  snapshot.rows.reservations.forEach((row) =>
    customerKeys.add(customerKey(row.mem_id, `reservation-${row.serial}`))
  )
  snapshot.rows.reviews.forEach((row) =>
    customerKeys.add(customerKey(row.mem_id, `review-${row.serial}`))
  )
  const orderedCustomerKeys = [...customerKeys].sort((left, right) => left.localeCompare(right))
  const reservationByLegacyId = new Map(
    snapshot.rows.reservations.map((row) => [row.serial, row] as const)
  )

  return {
    stores: [
      {
        id: STORE_ID,
        slug: STORE_SLUG,
        name: store.shop_name,
        displayName: store.shop_name,
        phone: store.tel,
        email: store.mail_ad,
        timezone: TIME_ZONE,
        address: store.adress,
        isActive: store.lev === 1,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      },
    ],
    storeSettings: [
      {
        id: 'uat-settings-ikebukuro',
        storeId: STORE_ID,
        storeName: store.shop_name,
        address: store.adress?.trim() || '店舗へお問い合わせください',
        phone: store.tel?.trim() || '00000000000',
        email: store.mail_ad?.trim() || 'ikebukuro-store@preview-uat.invalid',
        website: 'https://salon.c-platinum.com/ikebukuro',
        businessHours: normalizeBusinessHours(store.eigyo),
        description: '旧システムの池袋公開データから作成した確認用コピーです。',
        zipCode: '',
        prefecture: '東京都',
        city: '豊島区',
        businessDays: '年中無休',
        lastOrder: '23:00',
        welfareExpenseRate: 10,
        marketingChannels: ['店リピート', '電話', '紹介', 'SNS', 'WEB', 'Heaven'],
        pointEarnRate: 1,
        pointExpirationMonths: 12,
        pointMinUsage: 100,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      },
    ],
    admins: [
      {
        id: 'uat-admin-super',
        email: 'super-admin@preview-uat.invalid',
        password: passwordHashes.admin,
        name: '[確認用] 全店管理者',
        role: 'super_admin',
        permissions: JSON.stringify(['*']),
        isActive: true,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      },
      {
        id: 'uat-admin-manager',
        email: 'manager-ikebukuro@preview-uat.invalid',
        password: passwordHashes.admin,
        name: '[確認用] 池袋管理者',
        role: 'manager',
        permissions: JSON.stringify([
          'cast:*',
          'customer:read',
          'customer:create',
          'customer:update',
          'reservation:*',
          'pricing:*',
          'settings:*',
          'analytics:read',
          'dashboard:view',
        ]),
        isActive: true,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      },
    ],
    adminStoreAssignments: [{ adminId: 'uat-admin-manager', storeId: STORE_ID }],
    customers: [
      {
        id: 'uat-customer',
        name: '[確認用] 操作確認顧客',
        nameKana: 'カクニンヨウ ソウサカクニンコキャク',
        phone: '00000000002',
        email: 'customer@preview-uat.invalid',
        password: passwordHashes.customer,
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        memberType: 'regular',
        points: 0,
        smsEnabled: false,
        emailNotificationEnabled: false,
        emailVerified: true,
        phoneVerified: false,
        phoneVerificationAttempts: 0,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      },
      ...orderedCustomerKeys.map((key, index) => ({
        id: customerId(key),
        name: `[確認用] 旧顧客 #${key.replace('member-', '')}`,
        nameKana: 'カクニンヨウ キュウコキャク',
        phone: `099${String(index + 1).padStart(8, '0')}`,
        email: `legacy-customer-${String(index + 1).padStart(6, '0')}@preview-uat.invalid`,
        password: passwordHashes.customer,
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        memberType: 'legacy-preview-anonymized',
        points: 0,
        smsEnabled: false,
        emailNotificationEnabled: false,
        emailVerified: false,
        phoneVerified: false,
        phoneVerificationAttempts: 0,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
    ],
    courses: snapshot.rows.courses
      .sort((left, right) => left.sort - right.sort || left.id - right.id)
      .map((row) => ({
        id: `legacy-course-${row.id}`,
        storeId: STORE_ID,
        name: row.charge_name_admin.trim() || row.charge_name,
        duration: row.charge_min,
        price: row.charge_kin,
        storeShare: Math.max(0, row.charge_kin - row.charge_ara),
        castShare: row.charge_ara,
        description: `旧システムコース #${row.id}`,
        isActive: row.flg_show === 1,
        enableWebBooking: row.flg_web === 1,
        archivedAt: row.flg_show === 1 ? null : cutoffAt,
      })),
    options: [
      ...paidOptionRows.map((row) => ({
        id: legacyOptionId('paid', row.serial),
        storeId: STORE_ID,
        name: row.option_name,
        description: `旧システム有料オプション #${row.serial}`,
        price: row.kin,
        duration: null,
        category: 'special',
        displayOrder: row.sort,
        isActive: row.lev_admin === 1,
        visibility: row.lev === 1 ? 'public' : 'internal',
        storeShare: Math.max(0, row.kin - row.girl_pay),
        castShare: row.girl_pay,
        archivedAt: row.lev_admin === 1 ? null : cutoffAt,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
      ...freeOptionRows.map((row) => ({
        id: legacyOptionId('free', row.serial),
        storeId: STORE_ID,
        name: row.option_name,
        description: `旧システム無料系オプション #${row.serial}`,
        price: row.kin,
        duration: null,
        category: 'special',
        displayOrder: row.sort,
        isActive: row.lev_admin === 1,
        visibility: row.lev === 1 ? 'public' : 'internal',
        storeShare: 0,
        castShare: row.kin,
        archivedAt: row.lev_admin === 1 ? null : cutoffAt,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
    ],
    areas: [...snapshot.rows.areas]
      .sort((left, right) => left.sort - right.sort || left.serial - right.serial)
      .map((row) => ({
        id: `legacy-area-${row.serial}`,
        name: row.city_name,
        prefecture: prefectureName(row.pref_no),
        city: row.city_name,
        description: `旧システム配車エリア #${row.serial} / group:${row.group_no}`,
        displayOrder: row.sort,
        isActive: row.lev === 1,
        storeId: STORE_ID,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
    stations: [...snapshot.rows.stations]
      .sort((left, right) => left.sort - right.sort || left.serial - right.serial)
      .map((row) => ({
        id: `legacy-station-${row.serial}`,
        name: row.station_name,
        line: null,
        areaId: `legacy-area-${row.city_no}`,
        transportationFee: row.traffic_kin,
        travelTime: 0,
        description: row.kana.trim() || `旧システム駅 #${row.serial}`,
        isActive: row.lev === 1 && row.hp_flg === 1,
        displayOrder: row.sort,
        storeId: STORE_ID,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
    hotels: sortedHotels.map((row, index) => {
      const legacyCityNos = [...new Set([row.city_no, row.city_no2])].filter((cityNo) => cityNo > 0)
      return {
        id: `legacy-hotel-${row.serial}`,
        storeId: STORE_ID,
        legacyId: String(row.serial),
        hotelName: row.hotel_name,
        area: hotelGroupsBySerial.get(row.area_no)?.area_name ?? null,
        station: row.station.trim() || null,
        roomCount: null,
        hourlyRate: null,
        address: row.address.trim() || null,
        phone: row.tel.trim() || null,
        checkInTime: null,
        checkOutTime: null,
        amenities: [],
        notes: row.cm.trim() || null,
        rawText: JSON.stringify({
          legacyAreaNo: row.area_no,
          legacyPrefectureNo: row.pref_no,
          legacyCityNos,
        }),
        isActive: row.lev === 1,
        displayOrder: index + 1,
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      }
    }),
    hotelServiceAreas: sortedHotels.flatMap((row) =>
      [...new Set([row.city_no, row.city_no2])]
        .filter((cityNo) => cityNo > 0)
        .map((cityNo, index) => ({
          id: `legacy-hotel-service-area-${row.serial}-${cityNo}`,
          storeId: STORE_ID,
          hotelId: `legacy-hotel-${row.serial}`,
          areaId: `legacy-area-${cityNo}`,
          isActive: row.lev === 1,
          displayOrder: index + 1,
          createdAt: cutoffAt,
          updatedAt: cutoffAt,
        }))
    ),
    hotelRates: sortedHotels.flatMap((row) =>
      (
        [
          ['price1', row.price1],
          ['price2', row.price2],
          ['price3', row.price3],
          ['price4', row.price4],
        ] as const
      )
        .filter((entry) => entry[1].trim().length > 0)
        .map(([sourceField, rawValue], index) => ({
          id: `legacy-hotel-rate-${row.serial}-${sourceField}`,
          hotelId: `legacy-hotel-${row.serial}`,
          label: null,
          durationMinutes: null,
          amount: null,
          rawText: JSON.stringify({ sourceField, rawValue }),
          isActive: row.lev === 1,
          displayOrder: index + 1,
          createdAt: cutoffAt,
          updatedAt: cutoffAt,
        }))
    ),
    designationFees: [],
    casts: sortedCasts.map((row, index) => {
      const photos = Array.from(
        { length: 15 },
        (_, photoIndex) => row[`photo_${photoIndex + 1}` as keyof typeof row]
      )
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((fileName) => buildImageUrl(row.girl_no, fileName))
      const profileLines = [
        row.profile_catch,
        row.profile_cm,
        row.profile_new_1,
        row.profile_new_2,
        row.profile_new_3,
        row.profile_new_4,
        row.profile_new_5,
        row.profile_new_6,
      ].filter((value) => value.trim().length > 0)
      const isPortalCast = index === 0

      return {
        id: `legacy-cast-${row.girl_no}`,
        storeId: STORE_ID,
        name: row.name,
        nameKana: null,
        age: row.age,
        height: row.p_height,
        bust: String(row.p_bust),
        waist: row.p_waist,
        hip: row.p_hip,
        type: row.p_type.trim() || '未設定',
        image: photos[0] ?? '/images/non-photo.svg',
        images: photos.length > 0 ? photos : ['/images/non-photo.svg'],
        description: profileLines.join('\n') || '旧システム公開プロフィール',
        publicProfile: Prisma.JsonNull,
        netReservation: true,
        requestAttendanceEnabled: true,
        panelDesignationRank: index < 4 ? index + 1 : 0,
        regularDesignationRank: 0,
        workStatus: '出勤',
        availableOptions: [
          ...parseLegacyOptionList(row.options, 'paid', paidOptionSerials).map((serial) =>
            legacyOptionId('paid', serial)
          ),
          ...parseLegacyOptionList(row.options_free, 'free', freeOptionSerials).map((serial) =>
            legacyOptionId('free', serial)
          ),
        ],
        welfareExpenseRate: 10,
        loginEmail: isPortalCast ? 'cast-ikebukuro@preview-uat.invalid' : null,
        passwordHash: isPortalCast ? passwordHashes.cast : null,
        createdAt: parseLegacyDateTime(row.regist_date),
        updatedAt: cutoffAt,
      }
    }),
    castOptionSettings: sortedCasts.flatMap((row) => [
      ...parseLegacyOptionList(row.options, 'paid', paidOptionSerials).map((serial) => ({
        id: `legacy-cast-option-${row.girl_no}-paid-${serial}`,
        castId: `legacy-cast-${row.girl_no}`,
        optionId: legacyOptionId('paid', serial),
        visibility: paidOptionsBySerial.get(serial)?.lev === 1 ? 'public' : 'internal',
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
      ...parseLegacyOptionList(row.options_free, 'free', freeOptionSerials).map((serial) => ({
        id: `legacy-cast-option-${row.girl_no}-free-${serial}`,
        castId: `legacy-cast-${row.girl_no}`,
        optionId: legacyOptionId('free', serial),
        visibility: freeOptionsBySerial.get(serial)?.lev === 1 ? 'public' : 'internal',
        createdAt: cutoffAt,
        updatedAt: cutoffAt,
      })),
    ]),
    castSchedules: snapshot.rows.schedules
      .sort(
        (left, right) => left.syu_date.localeCompare(right.syu_date) || left.girl_no - right.girl_no
      )
      .map((row) => {
        const startTime = legacyClock(row.syu_date, row.work1, row.work2)
        let endTime = legacyClock(row.syu_date, row.work3, row.work4)
        if (endTime <= startTime) endTime = addMinutes(endTime, 24 * 60)
        return {
          id: `legacy-schedule-${row.serial}`,
          castId: `legacy-cast-${row.girl_no}`,
          date: zonedTimeToUtc(`${row.syu_date}T00:00:00`, TIME_ZONE),
          startTime,
          endTime,
          isAvailable: (row.work === 3 || row.work === 4) && row.flg_work === 0,
        }
      }),
    reservations: snapshot.rows.reservations
      .sort((left, right) => left.serial - right.serial)
      .map((row) => {
        const startTime = legacyClock(row.deli_date, row.time_h, row.time_m)
        const endTime = addMinutes(startTime, row.course_time)
        const status = reservationStatus(row.lev)
        const station = row.station_no === 0 ? undefined : stationsBySerial.get(row.station_no)
        const areaSerial = row.city_no || station?.city_no || 0
        const hotel = row.place_h_no === 0 ? undefined : hotelsBySerial.get(row.place_h_no)
        return {
          id: `legacy-reservation-${row.serial}`,
          customerId: customerId(customerKey(row.mem_id, `reservation-${row.serial}`)),
          castId: `legacy-cast-${row.girl_no}`,
          courseId: `legacy-course-${row.course}`,
          startTime,
          endTime,
          status,
          settlementStatus: status === 'completed' ? 'completed' : 'pending',
          price: row.total,
          storeId: STORE_ID,
          designationType: designationType(row.simei_kind, row.simei_kin),
          designationFee: row.simei_kin,
          transportationFee: row.koutu,
          additionalFee: row.course2_kin + row.course3_kin,
          hotelExpense: row.hotel_kin,
          discountAmount: row.nebiki_kin,
          welfareExpense: 0,
          paymentMethod: row.pay_kind === 2 ? 'クレジットカード' : '現金',
          marketingChannel: `旧システム media:${row.media}`,
          storeRevenue: row.ara,
          staffRevenue: row.girl_pay,
          areaId: areaSerial === 0 ? null : `legacy-area-${areaSerial}`,
          stationId: station ? `legacy-station-${station.serial}` : null,
          hotelId: hotel ? `legacy-hotel-${hotel.serial}` : null,
          hotelName: hotel?.hotel_name ?? null,
          notes: `[確認用コピー] 旧予約 #${row.serial}（顧客情報は匿名化済み）`,
          pointsUsed: row.nebiki_kin_point,
          createdAt: parseLegacyDateTime(row.nyu_date),
          updatedAt: status === 'completed' ? endTime : cutoffAt,
        }
      }),
    reservationOptions: snapshot.rows.reservations
      .sort((left, right) => left.serial - right.serial)
      .flatMap((reservation) => [
        ...parseLegacyOptionList(reservation.options, 'paid', paidOptionSerials).map((serial) => {
          const option = paidOptionsBySerial.get(serial)
          if (!option) throw new GoldMasterPreviewError()
          return {
            id: `legacy-reservation-option-${reservation.serial}-paid-${serial}`,
            reservationId: `legacy-reservation-${reservation.serial}`,
            optionId: legacyOptionId('paid', serial),
            optionName: option.option_name,
            optionPrice: option.kin,
            storeShare: Math.max(0, option.kin - option.girl_pay),
            castShare: option.girl_pay,
          }
        }),
        ...parseLegacyOptionList(reservation.options_free, 'free', freeOptionSerials).map(
          (serial) => {
            const option = freeOptionsBySerial.get(serial)
            if (!option) throw new GoldMasterPreviewError()
            return {
              id: `legacy-reservation-option-${reservation.serial}-free-${serial}`,
              reservationId: `legacy-reservation-${reservation.serial}`,
              optionId: legacyOptionId('free', serial),
              optionName: option.option_name,
              optionPrice: option.kin,
              storeShare: 0,
              castShare: option.kin,
            }
          }
        ),
      ]),
    pointHistories: [],
    reviews: snapshot.rows.reviews
      .sort((left, right) => left.serial - right.serial)
      .map((row) => {
        const reservation = reservationByLegacyId.get(row.order_no)
        const reservationMatches =
          reservation && reservation.girl_no === row.girl_no && reservation.mem_id === row.mem_id
        const createdAt = parseLegacyDateTime(row.add_date)
        return {
          id: `legacy-review-${row.serial}`,
          customerId: customerId(customerKey(row.mem_id, `review-${row.serial}`)),
          castId: `legacy-cast-${row.girl_no}`,
          reservationId: reservationMatches ? `legacy-reservation-${row.order_no}` : null,
          rating: Math.min(5, Math.max(1, row.h_lev)),
          comment: row.cm.trim() || '（コメントなし）',
          status: 'published' as const,
          publishedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
        }
      }),
    messages: [],
  }
}
