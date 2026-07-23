/**
 * @design_doc   Legacy migration manifest v1 and deterministic intermediate record types
 * @related_to   manifest.ts validates configuration before any offline row is transformed
 * @known_issues Version 1 expects canonical snake_case export columns and does not persist records
 */

import { assertLegacyMigrationManifest } from './manifest'
import { findUnsupportedLegacyColumns } from './columns'
import {
  LEGACY_ENTITY_NAMES,
  type LegacyCastRecord,
  type LegacyCastScheduleRecord,
  type LegacyCastWorkStatus,
  type LegacyCourseRecord,
  type LegacyCustomerRecord,
  type LegacyEntityName,
  type LegacyMigrationIssue,
  type LegacyMigrationManifestV1,
  type LegacyMigrationRecords,
  type LegacyMigrationResult,
  type LegacyOfflineExport,
  type LegacyPointHistoryRecord,
  type LegacyPointHistoryType,
  type LegacyReservationRecord,
  type LegacyReservationStatus,
  type LegacyRow,
  type LegacySourceReference,
  type LegacyStoreRecord,
  type LegacyStoreMapping,
} from './types'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'on', 'はい', '有効', '可'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'off', 'いいえ', '無効', '不可'])

const CAST_STATUS_VALUES: Readonly<Record<string, LegacyCastWorkStatus>> = {
  active: 'active',
  available: 'active',
  working: 'active',
  enrolled: 'active',
  在籍: 'active',
  出勤: 'active',
  inactive: 'inactive',
  retired: 'inactive',
  disabled: 'inactive',
  off: 'inactive',
  休職: 'inactive',
  退店: 'inactive',
  非表示: 'inactive',
}

const RESERVATION_STATUS_VALUES: Readonly<Record<string, LegacyReservationStatus>> = {
  pending: 'pending',
  provisional: 'pending',
  受付: 'pending',
  仮予約: 'pending',
  confirmed: 'confirmed',
  booked: 'confirmed',
  確定: 'confirmed',
  予約確定: 'confirmed',
  completed: 'completed',
  complete: 'completed',
  完了: 'completed',
  対応済み: 'completed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  キャンセル: 'cancelled',
  取消: 'cancelled',
}

const POINT_TYPE_VALUES: Readonly<Record<string, LegacyPointHistoryType>> = {
  earned: 'earned',
  earn: 'earned',
  grant: 'earned',
  付与: 'earned',
  used: 'used',
  use: 'used',
  redeem: 'used',
  利用: 'used',
  adjusted: 'adjusted',
  adjustment: 'adjusted',
  調整: 'adjusted',
  expired: 'expired',
  expire: 'expired',
  失効: 'expired',
}

interface RowContext {
  entity: LegacyEntityName
  rowIndex: number
  legacyId: string | null
  hasErrors: boolean
  error: (code: LegacyMigrationIssue['code'], message: string, field?: string) => void
  warning: (code: LegacyMigrationIssue['code'], message: string, field?: string) => void
}

interface IntegerOptions {
  required?: boolean
  min?: number
  max?: number
}

interface PointHistoryCandidate {
  record: LegacyPointHistoryRecord
  context: RowContext
}

const POSTGRES_INT_MIN = -2147483648
const POSTGRES_INT_MAX = 2147483647

export function transformLegacyExport(
  manifestInput: LegacyMigrationManifestV1,
  offlineExport: LegacyOfflineExport
): LegacyMigrationResult {
  const manifest = assertLegacyMigrationManifest(manifestInput)
  const source = manifest.sources.find(
    (candidate) => candidate.sourceKey === offlineExport.sourceKey
  )
  if (!source) {
    throw new Error(`Unknown legacy source: ${offlineExport.sourceKey}`)
  }

  const issues: LegacyMigrationIssue[] = []
  const records: LegacyMigrationRecords = {
    stores: [],
    courses: [],
    casts: [],
    customers: [],
    reservations: [],
    castSchedules: [],
    pointHistories: [],
  }
  const storeMappings = new Map(
    source.storeMappings.map((mapping) => [mapping.legacyStoreId, mapping])
  )

  transformStores(
    offlineExport.rows.stores,
    source.sourceKey,
    source.utcOffsetMinutes,
    storeMappings,
    records.stores,
    issues
  )
  transformCourses(
    offlineExport.rows.courses,
    source.sourceKey,
    source.utcOffsetMinutes,
    storeMappings,
    records.stores,
    records.courses,
    issues
  )
  transformCasts(
    offlineExport.rows.casts,
    source.sourceKey,
    source.utcOffsetMinutes,
    storeMappings,
    records.stores,
    records.casts,
    issues
  )
  transformCustomers(
    offlineExport.rows.customers,
    source.sourceKey,
    source.utcOffsetMinutes,
    records.customers,
    issues
  )
  transformReservations(
    offlineExport.rows.reservations,
    source.sourceKey,
    source.utcOffsetMinutes,
    storeMappings,
    records.customers,
    records.casts,
    records.courses,
    records.reservations,
    issues
  )
  transformCastSchedules(
    offlineExport.rows.castSchedules,
    source.sourceKey,
    source.utcOffsetMinutes,
    records.casts,
    records.castSchedules,
    issues
  )
  transformPointHistories(
    offlineExport.rows.pointHistories,
    source.sourceKey,
    source.utcOffsetMinutes,
    records.customers,
    records.reservations,
    records.pointHistories,
    issues
  )

  for (const entity of LEGACY_ENTITY_NAMES) {
    records[entity].sort((left, right) =>
      left.source.legacyId.localeCompare(right.source.legacyId, 'en')
    )
  }

  return {
    records,
    issues,
    reconciliation: {
      stores: reconcile(offlineExport.rows.stores, records.stores),
      courses: reconcile(offlineExport.rows.courses, records.courses),
      casts: reconcile(offlineExport.rows.casts, records.casts),
      customers: reconcile(offlineExport.rows.customers, records.customers),
      reservations: reconcile(offlineExport.rows.reservations, records.reservations),
      castSchedules: reconcile(offlineExport.rows.castSchedules, records.castSchedules),
      pointHistories: reconcile(offlineExport.rows.pointHistories, records.pointHistories),
    },
  }
}

function transformCourses(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  storeMappings: ReadonlyMap<string, LegacyStoreMapping>,
  stores: readonly LegacyStoreRecord[],
  output: LegacyCourseRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  const storesById = recordsByLegacyId(stores)
  const storeIds = new Set(storesById.keys())
  rows.forEach((row, rowIndex) => {
    const context = createContext('courses', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    const legacyStoreId = parseLegacyId(row.store_id, 'store_id', context)
    const targetStoreId = resolveStore(legacyStoreId, storeMappings, context, 'store_id')
    checkReference(legacyStoreId, storeIds, 'store_id', context)
    const referencedStore = legacyStoreId === null ? undefined : storesById.get(legacyStoreId)
    const name = parseRequiredString(row.name, 'name', context)
    const duration = parseInteger(row.duration, 'duration', context, { required: true, min: 1 })
    const price = parseInteger(row.price, 'price', context, { required: true, min: 0 })
    const storeShare = parseInteger(row.store_share, 'store_share', context, { min: 0 })
    const castShare = parseInteger(row.cast_share, 'cast_share', context, { min: 0 })
    const description = parseOptionalString(row.description) ?? ''
    const isActive = parseBoolean(row.is_active, 'is_active', context)
    const enableWebBooking = parseBoolean(row.enable_web_booking, 'enable_web_booking', context)
    const archivedAt = parseOptionalDateTime(
      row.archived_at,
      'archived_at',
      utcOffsetMinutes,
      context
    )
    if (archivedAt !== null && (isActive === true || enableWebBooking === true)) {
      context.error(
        'INVALID_STATUS',
        'An archived course must be inactive and unavailable for web booking.',
        'archived_at'
      )
    }

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      legacyStoreId === null ||
      referencedStore === undefined ||
      targetStoreId === null ||
      name === null ||
      duration === null ||
      price === null ||
      isActive === null ||
      enableWebBooking === null
    ) {
      return
    }

    output.push({
      source: reference(sourceKey, 'courses', physicalTable, legacyId),
      store: referencedStore.source,
      targetStoreId,
      name,
      duration,
      price,
      storeShare,
      castShare,
      description,
      isActive,
      enableWebBooking,
      archivedAt,
    })
  })
}

function transformStores(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  storeMappings: ReadonlyMap<string, LegacyStoreMapping>,
  output: LegacyStoreRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  rows.forEach((row, rowIndex) => {
    const context = createContext('stores', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    const targetStoreId = resolveStore(legacyId, storeMappings, context, 'id')
    const storeMapping = legacyId === null ? undefined : storeMappings.get(legacyId)
    const name = parseRequiredString(row.name, 'name', context)
    const displayName = parseOptionalString(row.display_name) ?? name
    const phone = parseOptionalPhone(row.phone, 'phone', context)
    const email = parseOptionalEmail(row.email, 'email', context)
    const address = parseOptionalString(row.address)
    const isActive = parseBoolean(row.is_active, 'is_active', context)
    const createdAt = parseOptionalDateTime(row.created_at, 'created_at', utcOffsetMinutes, context)

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      targetStoreId === null ||
      storeMapping === undefined ||
      name === null ||
      isActive === null
    ) {
      return
    }

    output.push({
      source: reference(sourceKey, 'stores', physicalTable, legacyId),
      targetStoreId,
      targetStoreSlug: storeMapping.targetStoreSlug,
      targetStoreTimezone: storeMapping.targetStoreTimezone,
      name,
      displayName: displayName ?? name,
      phone,
      email,
      address,
      isActive,
      createdAt,
    })
  })
}

function transformCasts(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  storeMappings: ReadonlyMap<string, LegacyStoreMapping>,
  stores: readonly LegacyStoreRecord[],
  output: LegacyCastRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  const storesById = recordsByLegacyId(stores)
  const storeIds = new Set(storesById.keys())
  rows.forEach((row, rowIndex) => {
    const context = createContext('casts', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    const legacyStoreId = parseLegacyId(row.store_id, 'store_id', context)
    const targetStoreId = resolveStore(legacyStoreId, storeMappings, context, 'store_id')
    checkReference(legacyStoreId, storeIds, 'store_id', context)
    const referencedStore = legacyStoreId === null ? undefined : storesById.get(legacyStoreId)
    const name = parseRequiredString(row.name, 'name', context)
    const age = parseInteger(row.age, 'age', context, { min: 0, max: 120 })
    const height = parseInteger(row.height, 'height', context, {
      min: 0,
      max: 300,
    })
    const bust = parseOptionalString(row.bust)
    const waist = parseInteger(row.waist, 'waist', context, {
      min: 0,
      max: 300,
    })
    const hip = parseInteger(row.hip, 'hip', context, { min: 0, max: 300 })
    const type = parseOptionalString(row.type)
    const image = parseOptionalString(row.image)
    const images = parseStringList(row.images, 'images', context)
    const description = parseOptionalString(row.description)
    const panelDesignationRank = parseInteger(
      row.panel_designation_rank,
      'panel_designation_rank',
      context,
      { required: true, min: 0 }
    )
    const regularDesignationRank = parseInteger(
      row.regular_designation_rank,
      'regular_designation_rank',
      context,
      { required: true, min: 0 }
    )
    const netReservation = parseBoolean(row.net_reservation, 'net_reservation', context)
    const workStatus = parseStatus(row.work_status, 'work_status', CAST_STATUS_VALUES, context)
    const createdAt = parseOptionalDateTime(row.created_at, 'created_at', utcOffsetMinutes, context)

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      legacyStoreId === null ||
      referencedStore === undefined ||
      targetStoreId === null ||
      name === null ||
      panelDesignationRank === null ||
      regularDesignationRank === null ||
      netReservation === null ||
      workStatus === null
    ) {
      return
    }

    const allImages = images.length > 0 ? images : image ? [image] : []
    output.push({
      source: reference(sourceKey, 'casts', physicalTable, legacyId),
      store: referencedStore.source,
      targetStoreId,
      name,
      age,
      height,
      bust,
      waist,
      hip,
      type,
      image,
      images: allImages,
      description,
      panelDesignationRank,
      regularDesignationRank,
      netReservation,
      workStatus,
      createdAt,
    })
  })
}

function transformCustomers(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  output: LegacyCustomerRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  rows.forEach((row, rowIndex) => {
    const context = createContext('customers', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    reportOmittedCredentials(row, context)
    const name = parseRequiredString(row.name, 'name', context)
    const nameKana = parseOptionalString(row.name_kana)
    const phone = parseRequiredPhone(row.phone, 'phone', context)
    const email = parseOptionalEmail(row.email, 'email', context)
    checkDuplicateCustomerIdentity(phone, seenPhones, 'DUPLICATE_CUSTOMER_PHONE', 'phone', context)
    checkDuplicateCustomerIdentity(email, seenEmails, 'DUPLICATE_CUSTOMER_EMAIL', 'email', context)
    const persistenceDisposition = isEmpty(row.email) ? 'blocked-missing-email' : 'ready'
    if (persistenceDisposition === 'blocked-missing-email') {
      context.warning(
        'MISSING_EMAIL_REQUIRES_RESOLUTION',
        'Customer has no email; persistence must remain blocked until identity is resolved.',
        'email'
      )
    }
    const birthDate = parseOptionalDate(row.birth_date, 'birth_date', context)
    const memberType = parseRequiredString(row.member_type, 'member_type', context)
    const points = parseInteger(row.points, 'points', context, {
      required: true,
      min: 0,
    })
    const smsEnabled = parseBoolean(row.sms_enabled, 'sms_enabled', context)
    const emailNotificationEnabled = parseBoolean(
      row.email_notification_enabled,
      'email_notification_enabled',
      context
    )
    const createdAt = parseOptionalDateTime(row.created_at, 'created_at', utcOffsetMinutes, context)

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      name === null ||
      phone === null ||
      memberType === null ||
      points === null ||
      smsEnabled === null ||
      emailNotificationEnabled === null
    ) {
      return
    }

    output.push({
      source: reference(sourceKey, 'customers', physicalTable, legacyId),
      name,
      nameKana,
      phone,
      email,
      birthDate,
      memberType,
      points,
      smsEnabled,
      emailNotificationEnabled,
      credentialStrategy: 'reset-required',
      persistenceDisposition,
      createdAt,
    })
  })
}

function transformReservations(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  storeMappings: ReadonlyMap<string, LegacyStoreMapping>,
  customers: readonly LegacyCustomerRecord[],
  casts: readonly LegacyCastRecord[],
  courses: readonly LegacyCourseRecord[],
  output: LegacyReservationRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  const customersById = recordsByLegacyId(customers)
  const castsById = recordsByLegacyId(casts)
  const coursesById = recordsByLegacyId(courses)
  const customerIds = new Set(customersById.keys())
  const castIds = new Set(castsById.keys())
  const courseIds = new Set(coursesById.keys())

  rows.forEach((row, rowIndex) => {
    const context = createContext('reservations', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    const legacyStoreId = parseLegacyId(row.store_id, 'store_id', context)
    const targetStoreId = resolveStore(legacyStoreId, storeMappings, context, 'store_id')
    const customerId = parseLegacyId(row.customer_id, 'customer_id', context)
    const castId = parseLegacyId(row.cast_id, 'cast_id', context)
    const courseId = parseLegacyId(row.course_id, 'course_id', context)
    checkReference(customerId, customerIds, 'customer_id', context)
    checkReference(castId, castIds, 'cast_id', context)
    checkReference(courseId, courseIds, 'course_id', context)

    const referencedCustomer = customerId === null ? undefined : customersById.get(customerId)
    const referencedCast = castId === null ? undefined : castsById.get(castId)
    if (
      referencedCast &&
      targetStoreId !== null &&
      referencedCast.targetStoreId !== targetStoreId
    ) {
      context.error(
        'STORE_REFERENCE_MISMATCH',
        'Referenced cast belongs to a different mapped target store.',
        'cast_id'
      )
    }

    const referencedCourse = courseId === null ? undefined : coursesById.get(courseId)
    if (
      referencedCourse &&
      targetStoreId !== null &&
      referencedCourse.targetStoreId !== targetStoreId
    ) {
      context.error(
        'STORE_REFERENCE_MISMATCH',
        'Referenced course belongs to a different mapped target store.',
        'course_id'
      )
    }

    const startTime = parseRequiredDateTime(row.start_time, 'start_time', utcOffsetMinutes, context)
    const endTime = parseRequiredDateTime(row.end_time, 'end_time', utcOffsetMinutes, context)
    if (startTime !== null && endTime !== null && Date.parse(endTime) <= Date.parse(startTime)) {
      context.error('INVALID_DATE_RANGE', 'Reservation end time must be after its start time.')
    }
    const status = parseStatus(row.status, 'status', RESERVATION_STATUS_VALUES, context)
    const price = parseInteger(row.price, 'price', context, {
      required: true,
      min: 0,
    })
    const pointsUsed = parseInteger(row.points_used, 'points_used', context, {
      required: true,
      min: 0,
    })
    const notes = parseOptionalString(row.notes)
    const createdAt = parseOptionalDateTime(row.created_at, 'created_at', utcOffsetMinutes, context)

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      legacyStoreId === null ||
      targetStoreId === null ||
      customerId === null ||
      referencedCustomer === undefined ||
      castId === null ||
      referencedCast === undefined ||
      courseId === null ||
      referencedCourse === undefined ||
      startTime === null ||
      endTime === null ||
      status === null ||
      price === null ||
      pointsUsed === null
    ) {
      return
    }

    output.push({
      source: reference(sourceKey, 'reservations', physicalTable, legacyId),
      store: referencedCast.store,
      targetStoreId,
      customer: referencedCustomer.source,
      cast: referencedCast.source,
      course: referencedCourse.source,
      startTime,
      endTime,
      status,
      price,
      pointsUsed,
      notes,
      createdAt,
    })
  })
}

function transformCastSchedules(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  casts: readonly LegacyCastRecord[],
  output: LegacyCastScheduleRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  const castsById = recordsByLegacyId(casts)
  const castIds = new Set(castsById.keys())
  rows.forEach((row, rowIndex) => {
    const context = createContext('castSchedules', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    const castId = parseLegacyId(row.cast_id, 'cast_id', context)
    checkReference(castId, castIds, 'cast_id', context)
    const referencedCast = castId === null ? undefined : castsById.get(castId)
    const date = parseRequiredDate(row.date, 'date', context)
    const startTime = parseRequiredDateTime(row.start_time, 'start_time', utcOffsetMinutes, context)
    const endTime = parseRequiredDateTime(row.end_time, 'end_time', utcOffsetMinutes, context)
    if (startTime !== null && endTime !== null && Date.parse(endTime) <= Date.parse(startTime)) {
      context.error('INVALID_DATE_RANGE', 'Schedule end time must be after its start time.')
    }
    const isAvailable = parseBoolean(row.is_available, 'is_available', context)

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      castId === null ||
      referencedCast === undefined ||
      date === null ||
      startTime === null ||
      endTime === null ||
      isAvailable === null
    ) {
      return
    }

    output.push({
      source: reference(sourceKey, 'castSchedules', physicalTable, legacyId),
      cast: referencedCast.source,
      date,
      startTime,
      endTime,
      isAvailable,
    })
  })
}

function transformPointHistories(
  rows: LegacyRow[],
  sourceKey: string,
  utcOffsetMinutes: number,
  customers: readonly LegacyCustomerRecord[],
  reservations: readonly LegacyReservationRecord[],
  output: LegacyPointHistoryRecord[],
  issues: LegacyMigrationIssue[]
): void {
  const seenIds = new Set<string>()
  const customersById = recordsByLegacyId(customers)
  const reservationsById = recordsByLegacyId(reservations)
  const customerIds = new Set(customersById.keys())
  const reservationIds = new Set(reservationsById.keys())
  const candidates: PointHistoryCandidate[] = []
  rows.forEach((row, rowIndex) => {
    const context = createContext('pointHistories', rowIndex, issues)
    const legacyId = parseLegacyId(row.id, 'id', context)
    context.legacyId = legacyId
    const physicalTable = parseRequiredString(row.source_table, 'source_table', context)
    rejectUnsupportedColumns(row, context)
    checkDuplicateId(legacyId, seenIds, context)
    const customerId = parseLegacyId(row.customer_id, 'customer_id', context)
    checkReference(customerId, customerIds, 'customer_id', context)
    const referencedCustomer = customerId === null ? undefined : customersById.get(customerId)
    const reservationId = parseOptionalLegacyId(row.reservation_id, 'reservation_id', context)
    if (reservationId !== null) {
      checkReference(reservationId, reservationIds, 'reservation_id', context)
    }
    const referencedReservation =
      reservationId === null ? null : reservationsById.get(reservationId)
    if (
      referencedCustomer &&
      referencedReservation &&
      referencedReservation.customer.legacyId !== referencedCustomer.source.legacyId
    ) {
      context.error(
        'CUSTOMER_REFERENCE_MISMATCH',
        'Referenced reservation belongs to a different customer.',
        'reservation_id'
      )
    }
    const type = parseStatus(row.type, 'type', POINT_TYPE_VALUES, context)
    const amount = parseInteger(row.amount, 'amount', context, {
      required: true,
    })
    if (type !== null && amount !== null && !isValidPointAmount(type, amount)) {
      context.error(
        'POINT_AMOUNT_SIGN_MISMATCH',
        'Point amount sign must match the approved event type policy.',
        'amount'
      )
    }
    const description = parseOptionalString(row.description) ?? ''
    const balance = parseInteger(row.balance, 'balance', context, {
      required: true,
      min: 0,
    })
    const sourceOrder = parseInteger(row.source_order, 'source_order', context, {
      required: true,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    })
    const expiresAt = parseOptionalDateTime(row.expires_at, 'expires_at', utcOffsetMinutes, context)
    const isExpired = parseBoolean(row.is_expired, 'is_expired', context)
    const createdAt = parseRequiredDateTime(row.created_at, 'created_at', utcOffsetMinutes, context)

    if (
      context.hasErrors ||
      legacyId === null ||
      physicalTable === null ||
      customerId === null ||
      referencedCustomer === undefined ||
      (reservationId !== null && referencedReservation === undefined) ||
      type === null ||
      amount === null ||
      balance === null ||
      sourceOrder === null ||
      isExpired === null ||
      createdAt === null
    ) {
      return
    }

    candidates.push({
      context,
      record: {
        source: reference(sourceKey, 'pointHistories', physicalTable, legacyId),
        customer: referencedCustomer.source,
        reservation: referencedReservation?.source ?? null,
        type,
        amount,
        description,
        balance,
        sourceOrder,
        expiresAt,
        isExpired,
        createdAt,
      },
    })
  })

  appendValidPointHistorySequences(candidates, output)
}

function appendValidPointHistorySequences(
  candidates: PointHistoryCandidate[],
  output: LegacyPointHistoryRecord[]
): void {
  const candidatesByCustomer = new Map<string, PointHistoryCandidate[]>()
  for (const candidate of candidates) {
    const customerKey = referenceKey(candidate.record.customer)
    const customerCandidates = candidatesByCustomer.get(customerKey) ?? []
    customerCandidates.push(candidate)
    candidatesByCustomer.set(customerKey, customerCandidates)
  }

  for (const customerCandidates of candidatesByCustomer.values()) {
    const candidatesBySourceOrder = new Map<number, PointHistoryCandidate[]>()
    for (const candidate of customerCandidates) {
      const duplicates = candidatesBySourceOrder.get(candidate.record.sourceOrder) ?? []
      duplicates.push(candidate)
      candidatesBySourceOrder.set(candidate.record.sourceOrder, duplicates)
    }

    for (const duplicates of candidatesBySourceOrder.values()) {
      if (duplicates.length < 2) continue
      for (const duplicate of duplicates) {
        duplicate.context.error(
          'DUPLICATE_POINT_SOURCE_ORDER',
          'Point-history source order must be unique within each customer.',
          'source_order'
        )
      }
    }

    const orderedCandidates = [...customerCandidates].sort((left, right) =>
      left.record.sourceOrder < right.record.sourceOrder
        ? -1
        : left.record.sourceOrder > right.record.sourceOrder
          ? 1
          : 0
    )
    for (let index = 1; index < orderedCandidates.length; index += 1) {
      const previous = orderedCandidates[index - 1]
      const current = orderedCandidates[index]
      if (previous.record.createdAt <= current.record.createdAt) continue

      current.context.error(
        'POINT_SOURCE_ORDER_DATE_MISMATCH',
        'Point-history creation time must not move backwards as source order increases.',
        'source_order'
      )
    }

    if (!customerCandidates.some(({ context }) => context.hasErrors)) {
      const first = orderedCandidates[0]
      const openingBalance = first.record.balance - first.record.amount
      if (openingBalance < 0 || openingBalance > POSTGRES_INT_MAX) {
        first.context.error(
          'POINT_OPENING_BALANCE_MISMATCH',
          'The first point event must imply a non-negative PostgreSQL Int opening balance.',
          'balance'
        )
      }
    }

    if (!customerCandidates.some(({ context }) => context.hasErrors)) {
      for (let index = 1; index < orderedCandidates.length; index += 1) {
        const previous = orderedCandidates[index - 1]
        const current = orderedCandidates[index]
        if (current.record.balance === previous.record.balance + current.record.amount) continue

        current.context.error(
          'POINT_BALANCE_CHAIN_MISMATCH',
          'Point-history balance must equal the previous balance plus the current amount.',
          'balance'
        )
      }
    }

    if (customerCandidates.some(({ context }) => context.hasErrors)) continue
    output.push(...customerCandidates.map(({ record }) => record))
  }
}

function isValidPointAmount(type: LegacyPointHistoryType, amount: number): boolean {
  if (type === 'earned') return amount > 0
  if (type === 'used' || type === 'expired') return amount < 0
  return amount !== 0
}

function createContext(
  entity: LegacyEntityName,
  rowIndex: number,
  issues: LegacyMigrationIssue[]
): RowContext {
  const context: RowContext = {
    entity,
    rowIndex,
    legacyId: null,
    hasErrors: false,
    error(code, message, field) {
      context.hasErrors = true
      issues.push({
        severity: 'error',
        code,
        message,
        entity,
        rowIndex,
        legacyId: context.legacyId,
        ...(field ? { field } : {}),
      })
    },
    warning(code, message, field) {
      issues.push({
        severity: 'warning',
        code,
        message,
        entity,
        rowIndex,
        legacyId: context.legacyId,
        ...(field ? { field } : {}),
      })
    },
  }
  return context
}

function rejectUnsupportedColumns(row: LegacyRow, context: RowContext): void {
  for (const column of findUnsupportedLegacyColumns(context.entity, row)) {
    context.error(
      'UNSUPPORTED_EXPORT_COLUMN',
      'Column is not part of the canonical export contract.',
      column
    )
  }
}

function parseLegacyId(value: unknown, field: string, context: RowContext): string | null {
  const parsed = normalizeIdentifier(value)
  if (parsed === null) {
    context.error('MISSING_REQUIRED_FIELD', 'A non-empty legacy identifier is required.', field)
  }
  return parsed
}

function parseOptionalLegacyId(value: unknown, field: string, context: RowContext): string | null {
  if (isEmpty(value)) return null
  const parsed = normalizeIdentifier(value)
  if (parsed === null) {
    context.error(
      'MISSING_REQUIRED_FIELD',
      'Legacy identifier must be a non-empty string or safe integer.',
      field
    )
  }
  return parsed
}

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.normalize('NFKC').trim()
    return normalized === '' ? null : normalized
  }
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value)
  }
  return null
}

function parseRequiredString(value: unknown, field: string, context: RowContext): string | null {
  const parsed = parseOptionalString(value)
  if (parsed === null) {
    context.error('MISSING_REQUIRED_FIELD', 'A non-empty string is required.', field)
  }
  return parsed
}

function parseOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.normalize('NFKC').trim()
  return normalized === '' ? null : normalized
}

function parseInteger(
  value: unknown,
  field: string,
  context: RowContext,
  options: IntegerOptions = {}
): number | null {
  if (isEmpty(value)) {
    if (options.required) {
      context.error('MISSING_REQUIRED_FIELD', 'An integer value is required.', field)
    }
    return null
  }

  let parsed: number | null = null
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    parsed = value
  } else if (typeof value === 'string' && /^-?\d+$/.test(value.normalize('NFKC').trim())) {
    const candidate = Number(value.normalize('NFKC').trim())
    parsed = Number.isSafeInteger(candidate) ? candidate : null
  }

  if (
    parsed === null ||
    parsed < (options.min ?? POSTGRES_INT_MIN) ||
    parsed > (options.max ?? POSTGRES_INT_MAX)
  ) {
    context.error(
      'INVALID_INTEGER',
      'Value must be a safe integer within the allowed range.',
      field
    )
    return null
  }
  return parsed
}

function parseBoolean(value: unknown, field: string, context: RowContext): boolean | null {
  if (isEmpty(value)) {
    context.error('MISSING_REQUIRED_FIELD', 'An explicit boolean value is required.', field)
    return null
  }
  if (value === true || value === false) return value
  if (typeof value === 'number' && (value === 0 || value === 1)) {
    return value === 1
  }
  if (typeof value === 'string') {
    const normalized = normalizeToken(value)
    if (TRUE_VALUES.has(normalized)) return true
    if (FALSE_VALUES.has(normalized)) return false
  }
  context.error(
    'INVALID_BOOLEAN',
    'Boolean must use an explicitly supported true or false value.',
    field
  )
  return null
}

function parseStatus<Status extends string>(
  value: unknown,
  field: string,
  values: Readonly<Record<string, Status>>,
  context: RowContext
): Status | null {
  if (typeof value === 'string') {
    const status = values[normalizeToken(value)]
    if (status !== undefined) return status
  }
  context.error('INVALID_STATUS', 'Status does not match a supported canonical value.', field)
  return null
}

function parseRequiredPhone(value: unknown, field: string, context: RowContext): string | null {
  if (isEmpty(value)) {
    context.error('MISSING_REQUIRED_FIELD', 'A customer phone number is required.', field)
    return null
  }
  return parsePhone(value, field, context)
}

function parseOptionalPhone(value: unknown, field: string, context: RowContext): string | null {
  if (isEmpty(value)) return null
  return parsePhone(value, field, context)
}

function parsePhone(value: unknown, field: string, context: RowContext): string | null {
  if (typeof value !== 'string') {
    context.error('INVALID_PHONE', 'Phone number must be an unambiguous string.', field)
    return null
  }
  const normalized = value.normalize('NFKC').trim()
  if (!/^\+?[\d\s().-]+$/.test(normalized)) {
    context.error('INVALID_PHONE', 'Phone number contains unsafe characters.', field)
    return null
  }
  const digits = normalized.replace(/\D/g, '')
  let international: string
  if (normalized.startsWith('+')) {
    international = `+${digits}`
  } else if (digits.startsWith('81')) {
    international = `+${digits}`
  } else if (digits.startsWith('0')) {
    international = `+81${digits.slice(1)}`
  } else {
    context.error(
      'INVALID_PHONE',
      'Phone number must be Japanese national format or explicit international format.',
      field
    )
    return null
  }
  if (!/^\+[1-9]\d{7,14}$/.test(international)) {
    context.error(
      'INVALID_PHONE',
      'Phone number is outside the safe international length range.',
      field
    )
    return null
  }
  return international
}

function parseOptionalEmail(value: unknown, field: string, context: RowContext): string | null {
  if (isEmpty(value)) return null
  if (typeof value !== 'string') {
    context.error('INVALID_EMAIL', 'Email address must be a string.', field)
    return null
  }
  const normalized = value.normalize('NFKC').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    context.error('INVALID_EMAIL', 'Email address is malformed.', field)
    return null
  }
  return normalized
}

function parseRequiredDate(value: unknown, field: string, context: RowContext): string | null {
  if (isEmpty(value)) {
    context.error('MISSING_REQUIRED_FIELD', 'A calendar date is required.', field)
    return null
  }
  return parseDate(value, field, context)
}

function parseOptionalDate(value: unknown, field: string, context: RowContext): string | null {
  if (isEmpty(value)) return null
  return parseDate(value, field, context)
}

function parseDate(value: unknown, field: string, context: RowContext): string | null {
  if (typeof value !== 'string') {
    context.error('INVALID_DATE', 'Date must use YYYY-MM-DD format.', field)
    return null
  }
  const normalized = value.normalize('NFKC').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (!match || !isValidCalendar(Number(match[1]), Number(match[2]), Number(match[3]))) {
    context.error('INVALID_DATE', 'Date must be a valid YYYY-MM-DD value.', field)
    return null
  }
  return normalized
}

function parseRequiredDateTime(
  value: unknown,
  field: string,
  utcOffsetMinutes: number,
  context: RowContext
): string | null {
  if (isEmpty(value)) {
    context.error('MISSING_REQUIRED_FIELD', 'A date and time are required.', field)
    return null
  }
  return parseDateTime(value, field, utcOffsetMinutes, context)
}

function parseOptionalDateTime(
  value: unknown,
  field: string,
  utcOffsetMinutes: number,
  context: RowContext
): string | null {
  if (isEmpty(value)) return null
  return parseDateTime(value, field, utcOffsetMinutes, context)
}

function parseDateTime(
  value: unknown,
  field: string,
  utcOffsetMinutes: number,
  context: RowContext
): string | null {
  if (typeof value !== 'string') {
    context.error('INVALID_DATETIME', 'Date and time must be an explicit string value.', field)
    return null
  }

  const normalized = value.normalize('NFKC').trim()
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})?$/.exec(
      normalized
    )
  if (!match) {
    context.error(
      'INVALID_DATETIME',
      'Date and time must use a supported ISO or MySQL datetime format.',
      field
    )
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const millisecond = Number((match[7] ?? '').padEnd(3, '0'))
  if (!isValidCalendar(year, month, day) || hour > 23 || minute > 59 || second > 59) {
    context.error('INVALID_DATETIME', 'Date and time are not valid.', field)
    return null
  }

  const explicitOffset = match[8]
  const offset =
    explicitOffset === undefined ? utcOffsetMinutes : parseExplicitOffset(explicitOffset)
  if (offset === null) {
    context.error('INVALID_DATETIME', 'Timezone offset is not valid.', field)
    return null
  }

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - offset * 60_000
  return new Date(utcTimestamp).toISOString()
}

function parseExplicitOffset(offset: string): number | null {
  if (offset === 'Z') return 0
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset)
  if (!match) return null
  const hours = Number(match[2])
  const minutes = Number(match[3])
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) {
    return null
  }
  const magnitude = hours * 60 + minutes
  return match[1] === '-' ? -magnitude : magnitude
}

function isValidCalendar(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

function parseStringList(value: unknown, field: string, context: RowContext): string[] {
  if (isEmpty(value)) return []
  if (Array.isArray(value)) {
    const normalized = value.map(parseOptionalString)
    if (normalized.some((entry) => entry === null)) {
      context.error('MISSING_REQUIRED_FIELD', 'List entries must be non-empty strings.', field)
      return []
    }
    return normalized as string[]
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        return parseStringList(JSON.parse(trimmed) as unknown, field, context)
      } catch {
        context.error('MISSING_REQUIRED_FIELD', 'String list JSON is malformed.', field)
        return []
      }
    }
    return trimmed
      .split(',')
      .map((entry) => entry.normalize('NFKC').trim())
      .filter((entry) => entry !== '')
  }
  context.error(
    'MISSING_REQUIRED_FIELD',
    'String list must be an array or comma-separated string.',
    field
  )
  return []
}

function reportOmittedCredentials(row: LegacyRow, context: RowContext): void {
  const credentialField = Object.keys(row).find((key) =>
    ['password', 'passwd', 'pwd', 'password_hash'].includes(key.toLowerCase())
  )
  if (credentialField && !isEmpty(row[credentialField])) {
    context.warning(
      'PLAINTEXT_CREDENTIAL_OMITTED',
      'Legacy credential material was deliberately omitted; account reset is required.',
      credentialField
    )
  }
}

function resolveStore(
  legacyStoreId: string | null,
  storeMappings: ReadonlyMap<string, LegacyStoreMapping>,
  context: RowContext,
  field: string
): string | null {
  if (legacyStoreId === null) return null
  const storeMapping = storeMappings.get(legacyStoreId)
  if (!storeMapping) {
    context.error('UNMAPPED_STORE', 'Legacy store has no configured target store mapping.', field)
    return null
  }
  return storeMapping.targetStoreId
}

function checkDuplicateId(
  legacyId: string | null,
  seenIds: Set<string>,
  context: RowContext
): void {
  if (legacyId === null) return
  if (seenIds.has(legacyId)) {
    context.error('DUPLICATE_LEGACY_ID', 'Legacy IDs must be unique within an entity export.', 'id')
    return
  }
  seenIds.add(legacyId)
}

function checkDuplicateCustomerIdentity(
  value: string | null,
  seenValues: Set<string>,
  code: 'DUPLICATE_CUSTOMER_EMAIL' | 'DUPLICATE_CUSTOMER_PHONE',
  field: 'email' | 'phone',
  context: RowContext
): void {
  if (value === null) return
  if (seenValues.has(value)) {
    context.error(
      code,
      `Normalized customer ${field} values must be unique within an export.`,
      field
    )
    return
  }
  seenValues.add(value)
}

function checkReference(
  legacyId: string | null,
  accepted: ReadonlySet<string>,
  field: string,
  context: RowContext
): void {
  if (legacyId !== null && !accepted.has(legacyId)) {
    context.error(
      'UNRESOLVED_REFERENCE',
      'Referenced record is not present among accepted offline records.',
      field
    )
  }
}

function recordsByLegacyId<RecordType extends { source: LegacySourceReference }>(
  records: readonly RecordType[]
): Map<string, RecordType> {
  return new Map(records.map((record) => [record.source.legacyId, record]))
}

function reference<Entity extends LegacySourceReference['entity']>(
  sourceKey: string,
  entity: Entity,
  physicalTable: string,
  legacyId: string
): LegacySourceReference<Entity> {
  return { sourceKey, entity, physicalTable, legacyId }
}

function referenceKey(reference: LegacySourceReference): string {
  return `${reference.sourceKey}\0${reference.entity}\0${reference.physicalTable}\0${reference.legacyId}`
}

function reconcile(
  input: readonly LegacyRow[],
  accepted: readonly unknown[]
): { input: number; accepted: number; rejected: number } {
  return {
    input: input.length,
    accepted: accepted.length,
    rejected: input.length - accepted.length,
  }
}

function normalizeToken(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase()
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}
