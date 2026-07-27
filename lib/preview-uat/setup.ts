/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md synthetic preview UAT bootstrap contract
 * @related_to   prisma-adapter.ts enforces the empty Serializable target transaction
 * @known_issues Synthetic fixtures validate application flows only and never prove legacy-data completeness
 */
import type { Prisma } from '@prisma/client'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'

export const PREVIEW_UAT_ACKNOWLEDGEMENT = 'CREATE_SYNTHETIC_UAT_DATA_IN_EMPTY_ISOLATED_PREVIEW'

export const PREVIEW_UAT_EMPTY_TABLES = [
  'Customer',
  'Store',
  'Cast',
  'NgCastEntry',
  'Reservation',
  'SettlementPayment',
  'SettlementPaymentReservation',
  'CoursePrice',
  'OptionPrice',
  'CastOptionSetting',
  'AreaInfo',
  'StationInfo',
  'ReservationOption',
  'ReservationHistory',
  'DesignationFee',
  'Review',
  'CastSchedule',
  'Admin',
  'CastLineRegistrationToken',
  'AdminStoreAssignment',
  'Message',
  'PaymentIntent',
  'PaymentTransaction',
  'StoreSettings',
  'CustomerPointHistory',
  'StoreEventBanner',
  'ReservationLineLog',
  'ReservationAttendanceRequest',
  'HotelSettings',
  'HotelServiceArea',
  'HotelRate',
  'LegacyMigrationMapping',
  'LegacyMigrationRun',
] as const

export type PreviewUatEmptyTable = (typeof PREVIEW_UAT_EMPTY_TABLES)[number]

export interface PreviewUatSetupConfig {
  databaseUrl: string
  databaseName: string
  marker: string
  passwords: {
    admin: string
    customer: string
    cast: string
  }
}

export interface PreviewUatTargetIdentity {
  databaseName: string
  environment: string | null
  marker: string | null
}

export interface PreviewUatFixture {
  stores: Prisma.StoreCreateManyInput[]
  storeSettings: Prisma.StoreSettingsCreateManyInput[]
  admins: Prisma.AdminCreateManyInput[]
  adminStoreAssignments: Prisma.AdminStoreAssignmentCreateManyInput[]
  customers: Prisma.CustomerCreateManyInput[]
  courses: Prisma.CoursePriceCreateManyInput[]
  options: Prisma.OptionPriceCreateManyInput[]
  areas: Prisma.AreaInfoCreateManyInput[]
  stations: Prisma.StationInfoCreateManyInput[]
  hotels: Prisma.HotelSettingsCreateManyInput[]
  hotelServiceAreas: Prisma.HotelServiceAreaCreateManyInput[]
  hotelRates: Prisma.HotelRateCreateManyInput[]
  designationFees: Prisma.DesignationFeeCreateManyInput[]
  casts: Prisma.CastCreateManyInput[]
  castOptionSettings: Prisma.CastOptionSettingCreateManyInput[]
  castSchedules: Prisma.CastScheduleCreateManyInput[]
  reservations: Prisma.ReservationCreateManyInput[]
  reservationOptions: Prisma.ReservationOptionCreateManyInput[]
  pointHistories: Prisma.CustomerPointHistoryCreateManyInput[]
  reviews: Prisma.ReviewCreateManyInput[]
  messages: Prisma.MessageCreateManyInput[]
}

export interface PreviewUatSetupSummary {
  stores: number
  admins: number
  customers: number
  casts: number
  reservations: number
  options: number
  areas: number
  stations: number
  hotels: number
  hotelServiceAreas: number
  hotelRates: number
  reservationOptions: number
}

export interface PreviewUatDatabase {
  readTargetIdentity(): Promise<PreviewUatTargetIdentity>
  createSyntheticFixture(
    expectedIdentity: PreviewUatTargetIdentity,
    fixture: PreviewUatFixture
  ): Promise<PreviewUatSetupSummary>
  disconnect(): Promise<void>
}

export type PreviewUatSetupErrorCode =
  | 'PREVIEW_UAT_CONFIG_REJECTED'
  | 'PREVIEW_UAT_CREDENTIAL_HASH_FAILED'
  | 'PREVIEW_UAT_DATABASE_NOT_EMPTY'
  | 'PREVIEW_UAT_SETUP_FAILED'
  | 'PREVIEW_UAT_TARGET_REJECTED'
  | 'PREVIEW_UAT_WRITE_FAILED'

export class PreviewUatSetupError extends Error {
  constructor(readonly code: PreviewUatSetupErrorCode) {
    super(code)
    this.name = 'PreviewUatSetupError'
  }
}

type PreviewUatEnvironment = Record<string, string | undefined>

interface BuildPreviewUatFixtureInput {
  now: Date
  passwordHashes: {
    admin: string
    customer: string
    cast: string
  }
}

interface ProvisionPreviewUatInput {
  database: PreviewUatDatabase
  config: PreviewUatSetupConfig
  hashPassword(password: string): Promise<string>
  now: Date
}

const STRONG_MARKER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{19,127}$/u
const PREVIEW_DATABASE_PATTERN = /^[a-z0-9][a-z0-9_-]*_preview$/u
const PASSWORD_MINIMUM_CHARACTERS = 20
const PASSWORD_MAXIMUM_BYTES = 72
const IKEBUKURO_STORE_ID = 'uat-ikebukuro'
const IKEBUKURO_STORE_SLUG = 'ikebukuro'
const OSAKA_STORE_ID = 'uat-osaka'
const PREVIEW_TIME_ZONE = 'Asia/Tokyo'

function rejectConfig(): never {
  throw new PreviewUatSetupError('PREVIEW_UAT_CONFIG_REJECTED')
}

function parseAcknowledgement(argv: readonly string[] | undefined): void {
  const normalizedArguments = Array.isArray(argv) && argv[0] === '--' ? argv.slice(1) : argv
  if (
    !Array.isArray(normalizedArguments) ||
    normalizedArguments.length !== 2 ||
    normalizedArguments[0] !== '--ack' ||
    normalizedArguments[1] !== PREVIEW_UAT_ACKNOWLEDGEMENT
  ) {
    rejectConfig()
  }
}

function parseDatabaseTarget(databaseUrl: string | undefined): {
  databaseUrl: string
  databaseName: string
} {
  if (!databaseUrl || databaseUrl.trim() !== databaseUrl) rejectConfig()

  try {
    const parsed = new URL(databaseUrl)
    if (
      (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') ||
      parsed.hostname.length === 0 ||
      parsed.hash.length > 0 ||
      !hasSafeConnectionParameters(parsed)
    ) {
      rejectConfig()
    }
    const decodedPath = decodeURIComponent(parsed.pathname)
    if (!/^\/[a-z0-9][a-z0-9_-]*_preview$/u.test(decodedPath)) rejectConfig()
    const databaseName = decodedPath.slice(1)
    if (!PREVIEW_DATABASE_PATTERN.test(databaseName)) rejectConfig()
    return { databaseUrl, databaseName }
  } catch (error) {
    if (error instanceof PreviewUatSetupError) throw error
    rejectConfig()
  }
}

function hasSafeConnectionParameters(parsed: URL): boolean {
  if (parsed.searchParams.size === 0) return true
  const schemas = parsed.searchParams.getAll('schema')
  return parsed.searchParams.size === 1 && schemas.length === 1 && schemas[0] === 'public'
}

function requireStrongPassword(value: string | undefined): string {
  if (
    !value ||
    value.trim() !== value ||
    Array.from(value).length < PASSWORD_MINIMUM_CHARACTERS ||
    Buffer.byteLength(value, 'utf8') > PASSWORD_MAXIMUM_BYTES ||
    /[\s\u0000-\u001f\u007f]/u.test(value) ||
    !/[a-z]/u.test(value) ||
    !/[A-Z]/u.test(value) ||
    !/[0-9]/u.test(value) ||
    !/[^A-Za-z0-9]/u.test(value)
  ) {
    rejectConfig()
  }
  return value
}

/** Validates every operator-controlled value without constructing or connecting a Prisma client. */
export function parsePreviewUatSetupConfig(
  argv: string[],
  environment: PreviewUatEnvironment
): PreviewUatSetupConfig {
  parseAcknowledgement(argv)
  if (
    environment.APP_RUNTIME_MODE !== 'preview' ||
    environment.OUTBOUND_DELIVERY_MODE !== 'disabled'
  ) {
    rejectConfig()
  }

  const target = parseDatabaseTarget(environment.DATABASE_URL)
  const configuredMarker = environment.PREVIEW_TARGET_ID
  if (!configuredMarker || configuredMarker.trim() !== configuredMarker) rejectConfig()
  if (!STRONG_MARKER_PATTERN.test(configuredMarker)) rejectConfig()

  const passwords = {
    admin: requireStrongPassword(environment.PREVIEW_UAT_ADMIN_PASSWORD),
    customer: requireStrongPassword(environment.PREVIEW_UAT_CUSTOMER_PASSWORD),
    cast: requireStrongPassword(environment.PREVIEW_UAT_CAST_PASSWORD),
  }
  if (new Set(Object.values(passwords)).size !== 3) rejectConfig()

  return {
    ...target,
    marker: configuredMarker,
    passwords,
  }
}

export function assertPreviewUatTargetIdentity(
  actual: PreviewUatTargetIdentity,
  expected: PreviewUatTargetIdentity
): void {
  if (
    actual.databaseName !== expected.databaseName ||
    actual.environment !== 'staging-preview' ||
    actual.environment !== expected.environment ||
    actual.marker !== expected.marker ||
    !actual.marker ||
    !STRONG_MARKER_PATTERN.test(actual.marker)
  ) {
    throw new PreviewUatSetupError('PREVIEW_UAT_TARGET_REJECTED')
  }
}

function shiftedDate(base: Date, milliseconds: number): Date {
  return new Date(base.getTime() + milliseconds)
}

/** Builds deterministic, visibly synthetic records without retaining any plaintext credential. */
export function buildPreviewUatFixture({
  now,
  passwordHashes,
}: BuildPreviewUatFixtureInput): PreviewUatFixture {
  if (Number.isNaN(now.getTime())) {
    throw new PreviewUatSetupError('PREVIEW_UAT_SETUP_FAILED')
  }

  const day = 24 * 60 * 60 * 1000
  const hour = 60 * 60 * 1000
  const pastDateKey = formatInTimeZone(shiftedDate(now, -2 * day), PREVIEW_TIME_ZONE, 'yyyy-MM-dd')
  const futureDateKey = formatInTimeZone(shiftedDate(now, 2 * day), PREVIEW_TIME_ZONE, 'yyyy-MM-dd')
  const pastStart = zonedTimeToUtc(`${pastDateKey}T14:00:00`, PREVIEW_TIME_ZONE)
  const pastEnd = shiftedDate(pastStart, hour)
  const futureStart = zonedTimeToUtc(`${futureDateKey}T14:00:00`, PREVIEW_TIME_ZONE)
  const futureEnd = shiftedDate(futureStart, 90 * 60 * 1000)
  const scheduleDate = zonedTimeToUtc(`${futureDateKey}T00:00:00`, PREVIEW_TIME_ZONE)
  const scheduleStart = zonedTimeToUtc(`${futureDateKey}T08:00:00`, PREVIEW_TIME_ZONE)
  const scheduleEnd = zonedTimeToUtc(`${futureDateKey}T23:00:00`, PREVIEW_TIME_ZONE)
  const createdAt = new Date(now)

  return {
    stores: [
      {
        id: IKEBUKURO_STORE_ID,
        name: '[UAT] 池袋確認店',
        displayName: '[UAT] 池袋確認店',
        slug: IKEBUKURO_STORE_SLUG,
        phone: '00000000000',
        email: 'ikebukuro-store@preview-uat.invalid',
        timezone: 'Asia/Tokyo',
        address: '[UAT] 合成住所（実在しません）',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: OSAKA_STORE_ID,
        name: '[UAT] 大阪確認店',
        displayName: '[UAT] 大阪確認店',
        slug: OSAKA_STORE_ID,
        phone: '00000000001',
        email: 'osaka-store@preview-uat.invalid',
        timezone: 'Asia/Tokyo',
        address: '[UAT] 合成住所（実在しません）',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    storeSettings: [
      storeSettings(IKEBUKURO_STORE_ID, '[UAT] 池袋確認店', '00000000000', createdAt),
      storeSettings(OSAKA_STORE_ID, '[UAT] 大阪確認店', '00000000001', createdAt),
    ],
    admins: [
      {
        id: 'uat-admin-super',
        email: 'super-admin@preview-uat.invalid',
        password: passwordHashes.admin,
        name: '[UAT] 全店管理者',
        role: 'super_admin',
        permissions: JSON.stringify(['*']),
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'uat-admin-manager',
        email: 'manager-ikebukuro@preview-uat.invalid',
        password: passwordHashes.admin,
        name: '[UAT] 池袋限定管理者',
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
        createdAt,
        updatedAt: createdAt,
      },
    ],
    adminStoreAssignments: [{ adminId: 'uat-admin-manager', storeId: IKEBUKURO_STORE_ID }],
    customers: [
      {
        id: 'uat-customer',
        name: '[UAT] 確認顧客',
        nameKana: 'ユーエーティー カクニンコキャク',
        phone: '00000000002',
        email: 'customer@preview-uat.invalid',
        password: passwordHashes.customer,
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        memberType: 'regular',
        points: 1000,
        smsEnabled: false,
        emailNotificationEnabled: false,
        emailVerified: true,
        phoneVerified: false,
        phoneVerificationAttempts: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    courses: [
      course('uat-course-ikebukuro', IKEBUKURO_STORE_ID, '[UAT] 池袋60分', 60, 10_000),
      course('uat-course-osaka', OSAKA_STORE_ID, '[UAT] 大阪90分', 90, 12_000),
    ],
    options: [
      option('uat-option-ikebukuro', IKEBUKURO_STORE_ID, '[UAT] 池袋確認オプション', createdAt),
      option('uat-option-osaka', OSAKA_STORE_ID, '[UAT] 大阪確認オプション', createdAt),
    ],
    areas: [
      {
        id: 'uat-area-ikebukuro',
        name: '[UAT] 豊島区',
        prefecture: '[UAT] 確認都道府県',
        city: '[UAT] 豊島区',
        description: '[UAT] 池袋確認エリア',
        displayOrder: 1,
        isActive: true,
        storeId: IKEBUKURO_STORE_ID,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'uat-area-osaka',
        name: '[UAT] 大阪市',
        prefecture: '[UAT] 確認府',
        city: '[UAT] 大阪市',
        description: '[UAT] 大阪確認エリア',
        displayOrder: 1,
        isActive: true,
        storeId: OSAKA_STORE_ID,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    stations: [
      {
        id: 'uat-station-ikebukuro',
        name: '[UAT] 池袋駅',
        areaId: 'uat-area-ikebukuro',
        transportationFee: 1000,
        travelTime: 10,
        description: '[UAT] 池袋確認駅',
        isActive: true,
        displayOrder: 1,
        storeId: IKEBUKURO_STORE_ID,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'uat-station-osaka',
        name: '[UAT] 大阪駅',
        areaId: 'uat-area-osaka',
        transportationFee: 1000,
        travelTime: 10,
        description: '[UAT] 大阪確認駅',
        isActive: true,
        displayOrder: 1,
        storeId: OSAKA_STORE_ID,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    hotels: [
      previewHotel('uat-hotel-ikebukuro', IKEBUKURO_STORE_ID, '[UAT] 池袋確認ホテル', createdAt),
      previewHotel('uat-hotel-osaka', OSAKA_STORE_ID, '[UAT] 大阪確認ホテル', createdAt),
    ],
    hotelServiceAreas: [
      previewHotelServiceArea(
        'uat-hotel-service-area-ikebukuro',
        IKEBUKURO_STORE_ID,
        'uat-hotel-ikebukuro',
        'uat-area-ikebukuro',
        createdAt
      ),
      previewHotelServiceArea(
        'uat-hotel-service-area-osaka',
        OSAKA_STORE_ID,
        'uat-hotel-osaka',
        'uat-area-osaka',
        createdAt
      ),
    ],
    hotelRates: [
      previewHotelRate('uat-hotel-rate-ikebukuro', 'uat-hotel-ikebukuro', createdAt),
      previewHotelRate('uat-hotel-rate-osaka', 'uat-hotel-osaka', createdAt),
    ],
    designationFees: [
      designationFee(
        'uat-designation-ikebukuro',
        IKEBUKURO_STORE_ID,
        '[UAT] 池袋本指名',
        createdAt
      ),
      designationFee('uat-designation-osaka', OSAKA_STORE_ID, '[UAT] 大阪本指名', createdAt),
    ],
    casts: [
      cast(
        'uat-cast-ikebukuro',
        IKEBUKURO_STORE_ID,
        '[UAT] 池袋キャスト',
        'cast-ikebukuro@preview-uat.invalid',
        passwordHashes.cast,
        ['uat-option-ikebukuro'],
        createdAt
      ),
      cast(
        'uat-cast-osaka',
        OSAKA_STORE_ID,
        '[UAT] 大阪キャスト',
        'cast-osaka@preview-uat.invalid',
        passwordHashes.cast,
        ['uat-option-osaka'],
        createdAt
      ),
    ],
    castOptionSettings: [
      {
        id: 'uat-cast-option-ikebukuro',
        castId: 'uat-cast-ikebukuro',
        optionId: 'uat-option-ikebukuro',
        visibility: 'public',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'uat-cast-option-osaka',
        castId: 'uat-cast-osaka',
        optionId: 'uat-option-osaka',
        visibility: 'public',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    castSchedules: [
      {
        id: 'uat-schedule-ikebukuro',
        castId: 'uat-cast-ikebukuro',
        date: scheduleDate,
        startTime: scheduleStart,
        endTime: scheduleEnd,
        isAvailable: true,
      },
      {
        id: 'uat-schedule-osaka',
        castId: 'uat-cast-osaka',
        date: scheduleDate,
        startTime: scheduleStart,
        endTime: scheduleEnd,
        isAvailable: true,
      },
    ],
    reservations: [
      {
        id: 'uat-reservation-past',
        customerId: 'uat-customer',
        castId: 'uat-cast-ikebukuro',
        courseId: 'uat-course-ikebukuro',
        startTime: pastStart,
        endTime: pastEnd,
        status: 'completed',
        settlementStatus: 'completed',
        price: 11_000,
        storeId: IKEBUKURO_STORE_ID,
        designationType: 'regular',
        designationFee: 1_000,
        paymentMethod: '現金',
        marketingChannel: '[UAT] 合成予約',
        storeRevenue: 6_500,
        staffRevenue: 4_500,
        areaId: 'uat-area-ikebukuro',
        stationId: 'uat-station-ikebukuro',
        hotelId: 'uat-hotel-ikebukuro',
        hotelName: '[UAT] 池袋確認ホテル',
        hotelExpense: 1000,
        notes: '[UAT] 過去完了予約',
        pointsUsed: 500,
        createdAt: shiftedDate(pastStart, -day),
        updatedAt: pastEnd,
      },
      {
        id: 'uat-reservation-future',
        customerId: 'uat-customer',
        castId: 'uat-cast-osaka',
        courseId: 'uat-course-osaka',
        startTime: futureStart,
        endTime: futureEnd,
        status: 'confirmed',
        settlementStatus: 'pending',
        price: 12_000,
        storeId: OSAKA_STORE_ID,
        paymentMethod: '現金',
        marketingChannel: '[UAT] 合成予約',
        notes: '[UAT] 未来予約',
        pointsUsed: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    reservationOptions: [
      {
        id: 'uat-reservation-option-past',
        reservationId: 'uat-reservation-past',
        optionId: 'uat-option-ikebukuro',
        optionName: '[UAT] 池袋確認オプション',
        optionPrice: 1000,
        storeShare: 600,
        castShare: 400,
      },
    ],
    pointHistories: [
      {
        id: 'uat-point-earned',
        customerId: 'uat-customer',
        type: 'earned',
        amount: 1500,
        description: '[UAT] 合成ポイント付与',
        relatedService: '[UAT] 過去完了予約',
        reservationId: 'uat-reservation-past',
        balance: 1500,
        isExpired: false,
        sourceHistoryId: 'uat:point:earned',
        createdAt: shiftedDate(pastEnd, hour),
        updatedAt: shiftedDate(pastEnd, hour),
      },
      {
        id: 'uat-point-used',
        customerId: 'uat-customer',
        type: 'used',
        amount: -500,
        description: '[UAT] 合成ポイント利用',
        relatedService: '[UAT] 過去完了予約',
        reservationId: 'uat-reservation-past',
        balance: 1000,
        isExpired: false,
        sourceHistoryId: 'uat:point:used',
        createdAt: shiftedDate(pastEnd, 2 * hour),
        updatedAt: shiftedDate(pastEnd, 2 * hour),
      },
    ],
    reviews: [
      {
        id: 'uat-review',
        customerId: 'uat-customer',
        castId: 'uat-cast-ikebukuro',
        reservationId: 'uat-reservation-past',
        rating: 5,
        comment: '[UAT] 合成口コミ（実在のお客様による投稿ではありません）',
        status: 'published',
        publishedAt: shiftedDate(pastEnd, 3 * hour),
        createdAt: shiftedDate(pastEnd, 3 * hour),
        updatedAt: shiftedDate(pastEnd, 3 * hour),
      },
    ],
    messages: [
      {
        id: 'uat-message-customer',
        customerId: 'uat-customer',
        sender: 'customer',
        content: '[UAT] 合成顧客チャット',
        timestamp: createdAt,
        readStatus: '未読',
        isReservationInfo: false,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'uat-message-cast',
        castId: 'uat-cast-ikebukuro',
        sender: 'cast',
        content: '[UAT] 合成キャストチャット',
        timestamp: createdAt,
        readStatus: '未読',
        isReservationInfo: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  }
}

function previewHotel(
  id: string,
  storeId: string,
  hotelName: string,
  timestamp: Date
): Prisma.HotelSettingsCreateManyInput {
  return {
    id,
    storeId,
    hotelName,
    area: '[UAT] 確認用ホテルグループ',
    station: '[UAT] 確認駅',
    address: '[UAT] 合成住所（実在しません）',
    phone: '00000000000',
    amenities: [],
    notes: '[UAT] 合成ホテル',
    isActive: true,
    displayOrder: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function previewHotelServiceArea(
  id: string,
  storeId: string,
  hotelId: string,
  areaId: string,
  timestamp: Date
): Prisma.HotelServiceAreaCreateManyInput {
  return {
    id,
    storeId,
    hotelId,
    areaId,
    isActive: true,
    displayOrder: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function previewHotelRate(
  id: string,
  hotelId: string,
  timestamp: Date
): Prisma.HotelRateCreateManyInput {
  return {
    id,
    hotelId,
    label: '[UAT] 確認料金',
    amount: 1000,
    isActive: true,
    displayOrder: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function storeSettings(
  storeId: string,
  storeName: string,
  phone: string,
  timestamp: Date
): Prisma.StoreSettingsCreateManyInput {
  return {
    id: `uat-settings-${storeId}`,
    storeId,
    storeName,
    address: '[UAT] 合成住所（実在しません）',
    phone,
    email: `${storeId}@preview-uat.invalid`,
    businessHours: '10:00-24:00',
    description: '[UAT] 合成店舗設定',
    zipCode: '000-0000',
    prefecture: '[UAT] 都道府県',
    city: '[UAT] 市区町村',
    businessDays: '[UAT] 毎日',
    lastOrder: '23:00',
    welfareExpenseRate: 10,
    marketingChannels: ['[UAT] WEB'],
    pointEarnRate: 1,
    pointExpirationMonths: 12,
    pointMinUsage: 100,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function course(
  id: string,
  storeId: string,
  name: string,
  duration: number,
  price: number
): Prisma.CoursePriceCreateManyInput {
  return {
    id,
    storeId,
    name,
    duration,
    price,
    storeShare: Math.round(price * 0.6),
    castShare: Math.round(price * 0.4),
    description: '[UAT] 合成コース',
    isActive: true,
    enableWebBooking: true,
  }
}

function option(
  id: string,
  storeId: string,
  name: string,
  timestamp: Date
): Prisma.OptionPriceCreateManyInput {
  return {
    id,
    storeId,
    name,
    description: '[UAT] 合成オプション',
    price: 1000,
    duration: 10,
    category: 'special',
    displayOrder: 1,
    isActive: true,
    visibility: 'public',
    note: '[UAT] 合成データ',
    storeShare: 600,
    castShare: 400,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function designationFee(
  id: string,
  storeId: string,
  name: string,
  timestamp: Date
): Prisma.DesignationFeeCreateManyInput {
  return {
    id,
    storeId,
    name,
    price: 1000,
    storeShare: 500,
    castShare: 500,
    description: '[UAT] 合成指名料',
    sortOrder: 1,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function cast(
  id: string,
  storeId: string,
  name: string,
  loginEmail: string,
  passwordHash: string,
  availableOptions: string[],
  timestamp: Date
): Prisma.CastCreateManyInput {
  return {
    id,
    storeId,
    name,
    nameKana: 'ユーエーティー カクニンキャスト',
    age: 25,
    height: 165,
    bust: 'C',
    waist: 60,
    hip: 88,
    type: '[UAT] 合成プロフィール',
    image: '/placeholder-user.jpg',
    images: ['/placeholder-user.jpg'],
    description: '[UAT] 合成キャスト（実在しません）',
    netReservation: true,
    requestAttendanceEnabled: true,
    panelDesignationRank: 1,
    regularDesignationRank: 1,
    workStatus: '出勤',
    availableOptions,
    welfareExpenseRate: 10,
    loginEmail,
    passwordHash,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/** Verifies DB-side identity, hashes credentials, then delegates one atomic empty-target write. */
export async function provisionPreviewUat({
  database,
  config,
  hashPassword,
  now,
}: ProvisionPreviewUatInput): Promise<PreviewUatSetupSummary> {
  const expectedIdentity: PreviewUatTargetIdentity = {
    databaseName: config.databaseName,
    environment: 'staging-preview',
    marker: config.marker,
  }
  const actualIdentity = await database.readTargetIdentity().catch(() => {
    throw new PreviewUatSetupError('PREVIEW_UAT_TARGET_REJECTED')
  })
  assertPreviewUatTargetIdentity(actualIdentity, expectedIdentity)

  let passwordHashes: BuildPreviewUatFixtureInput['passwordHashes']
  try {
    passwordHashes = {
      admin: await hashPassword(config.passwords.admin),
      customer: await hashPassword(config.passwords.customer),
      cast: await hashPassword(config.passwords.cast),
    }
  } catch {
    throw new PreviewUatSetupError('PREVIEW_UAT_CREDENTIAL_HASH_FAILED')
  }

  const fixture = buildPreviewUatFixture({ now, passwordHashes })
  return database.createSyntheticFixture(expectedIdentity, fixture)
}
