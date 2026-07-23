/**
 * @design_doc   Legacy migration manifest v1, defined by this module's public types
 * @related_to   manifest.ts validates source mappings; transform.ts creates intermediate records
 * @known_issues Import persistence is intentionally outside this offline transformation boundary
 */

export const LEGACY_ENTITY_NAMES = [
  'stores',
  'courses',
  'casts',
  'customers',
  'reservations',
  'castSchedules',
  'pointHistories',
] as const

export type LegacyEntityName = (typeof LEGACY_ENTITY_NAMES)[number]
export type LegacyReferenceEntity = LegacyEntityName

export interface LegacyStoreMapping {
  legacyStoreId: string
  targetStoreId: string
  targetStoreSlug: string
  targetStoreTimezone: 'Asia/Tokyo'
}

export interface LegacySourceManifestV1 {
  sourceKey: string
  utcOffsetMinutes: number
  storeMappings: LegacyStoreMapping[]
}

export interface LegacyMigrationManifestV1 {
  version: 1
  sources: LegacySourceManifestV1[]
}

export interface LegacyManifestIssue {
  code:
    | 'DUPLICATE_SOURCE_KEY'
    | 'DUPLICATE_STORE_MAPPING'
    | 'DUPLICATE_TARGET_STORE_MAPPING'
    | 'EMPTY_SOURCES'
    | 'EMPTY_STORE_MAPPINGS'
    | 'INVALID_MANIFEST'
    | 'INVALID_SOURCE_KEY'
    | 'INVALID_STORE_MAPPING'
    | 'INVALID_UTC_OFFSET'
    | 'UNSUPPORTED_MANIFEST_FIELD'
    | 'UNSUPPORTED_VERSION'
  path: string
  message: string
}

export type LegacyManifestValidationResult =
  | {
      success: true
      data: LegacyMigrationManifestV1
      issues: []
    }
  | {
      success: false
      issues: LegacyManifestIssue[]
    }

export type LegacyRow = Record<string, unknown>

export interface LegacyOfflineRows {
  stores: LegacyRow[]
  courses: LegacyRow[]
  casts: LegacyRow[]
  customers: LegacyRow[]
  reservations: LegacyRow[]
  castSchedules: LegacyRow[]
  pointHistories: LegacyRow[]
}

export interface LegacyOfflineExport {
  sourceKey: string
  rows: LegacyOfflineRows
}

export interface LegacySourceReference<
  Entity extends LegacyReferenceEntity = LegacyReferenceEntity,
> {
  sourceKey: string
  entity: Entity
  physicalTable: string
  legacyId: string
}

interface LegacyRecordBase<Entity extends LegacyEntityName> {
  source: LegacySourceReference<Entity>
}

export interface LegacyStoreRecord extends LegacyRecordBase<'stores'> {
  targetStoreId: string
  targetStoreSlug: string
  targetStoreTimezone: 'Asia/Tokyo'
  name: string
  displayName: string
  phone: string | null
  email: string | null
  address: string | null
  isActive: boolean
  createdAt: string | null
}

export interface LegacyCourseRecord extends LegacyRecordBase<'courses'> {
  store: LegacySourceReference<'stores'>
  targetStoreId: string
  name: string
  duration: number
  price: number
  storeShare: number | null
  castShare: number | null
  description: string
  isActive: boolean
  enableWebBooking: boolean
  archivedAt: string | null
}

export type LegacyCastWorkStatus = 'active' | 'inactive'

export interface LegacyCastRecord extends LegacyRecordBase<'casts'> {
  store: LegacySourceReference<'stores'>
  targetStoreId: string
  name: string
  age: number | null
  height: number | null
  bust: string | null
  waist: number | null
  hip: number | null
  type: string | null
  image: string | null
  images: string[]
  description: string | null
  panelDesignationRank: number
  regularDesignationRank: number
  netReservation: boolean
  workStatus: LegacyCastWorkStatus
  createdAt: string | null
}

export interface LegacyCustomerRecord extends LegacyRecordBase<'customers'> {
  name: string
  nameKana: string | null
  phone: string
  email: string | null
  birthDate: string | null
  memberType: string
  points: number
  smsEnabled: boolean
  emailNotificationEnabled: boolean
  credentialStrategy: 'reset-required'
  persistenceDisposition: 'ready' | 'blocked-missing-email'
  createdAt: string | null
}

export type LegacyReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface LegacyReservationRecord extends LegacyRecordBase<'reservations'> {
  store: LegacySourceReference<'stores'>
  targetStoreId: string
  customer: LegacySourceReference<'customers'>
  cast: LegacySourceReference<'casts'>
  course: LegacySourceReference<'courses'>
  startTime: string
  endTime: string
  status: LegacyReservationStatus
  price: number
  pointsUsed: number
  notes: string | null
  createdAt: string | null
}

export interface LegacyCastScheduleRecord extends LegacyRecordBase<'castSchedules'> {
  cast: LegacySourceReference<'casts'>
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

export type LegacyPointHistoryType = 'earned' | 'used' | 'adjusted' | 'expired'

export interface LegacyPointHistoryRecord extends LegacyRecordBase<'pointHistories'> {
  customer: LegacySourceReference<'customers'>
  reservation: LegacySourceReference<'reservations'> | null
  type: LegacyPointHistoryType
  amount: number
  description: string
  balance: number
  sourceOrder: number
  expiresAt: string | null
  isExpired: boolean
  createdAt: string
}

export interface LegacyMigrationRecords {
  stores: LegacyStoreRecord[]
  courses: LegacyCourseRecord[]
  casts: LegacyCastRecord[]
  customers: LegacyCustomerRecord[]
  reservations: LegacyReservationRecord[]
  castSchedules: LegacyCastScheduleRecord[]
  pointHistories: LegacyPointHistoryRecord[]
}

export interface LegacyMigrationIssue {
  severity: 'error' | 'warning'
  code:
    | 'CUSTOMER_REFERENCE_MISMATCH'
    | 'DUPLICATE_CUSTOMER_EMAIL'
    | 'DUPLICATE_CUSTOMER_PHONE'
    | 'DUPLICATE_LEGACY_ID'
    | 'DUPLICATE_POINT_SOURCE_ORDER'
    | 'INVALID_BOOLEAN'
    | 'INVALID_DATE'
    | 'INVALID_DATETIME'
    | 'INVALID_DATE_RANGE'
    | 'INVALID_EMAIL'
    | 'INVALID_INTEGER'
    | 'INVALID_PHONE'
    | 'INVALID_STATUS'
    | 'MISSING_EMAIL_REQUIRES_RESOLUTION'
    | 'MISSING_REQUIRED_FIELD'
    | 'MISSING_TARGET_REQUIRED_FIELD'
    | 'PLAINTEXT_CREDENTIAL_OMITTED'
    | 'POINT_AMOUNT_SIGN_MISMATCH'
    | 'POINT_BALANCE_CHAIN_MISMATCH'
    | 'POINT_OPENING_BALANCE_MISMATCH'
    | 'POINT_SOURCE_ORDER_DATE_MISMATCH'
    | 'STORE_REFERENCE_MISMATCH'
    | 'UNMAPPED_STORE'
    | 'UNSUPPORTED_EXPORT_COLUMN'
    | 'UNRESOLVED_REFERENCE'
  message: string
  entity: LegacyEntityName
  rowIndex: number
  legacyId: string | null
  field?: string
}

export interface LegacyEntityReconciliation {
  input: number
  accepted: number
  rejected: number
}

export type LegacyMigrationReconciliation = Record<LegacyEntityName, LegacyEntityReconciliation>

export interface LegacyMigrationResult {
  records: LegacyMigrationRecords
  issues: LegacyMigrationIssue[]
  reconciliation: LegacyMigrationReconciliation
}
