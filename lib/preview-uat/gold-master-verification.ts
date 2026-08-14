/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md V5 pre-import verification gate
 * @related_to   gold-master-fixture.ts maps the private snapshot; gold-master-post-import-sql.ts reuses this control
 * @known_issues This proves the scoped preview artifact only, not completeness of the live legacy source
 */
import { createHash } from 'node:crypto'

import { Prisma } from '@prisma/client'
import { z } from 'zod'

import type {
  LegacyImageInspection,
  LegacyPublicImageManifestEntry,
} from '@/lib/migration/legacy/image-manifest'
import {
  buildGoldMasterPreviewFixture,
  projectGoldMasterPreviewImages,
} from './gold-master-fixture'
import { prepareGoldMasterPreviewImages } from './gold-master-images'
import {
  PREVIEW_UAT_EMPTY_TABLES,
  type PreviewUatEmptyTable,
  type PreviewUatFixture,
} from './setup'

const SHA256_PATTERN = /^[a-f0-9]{64}$/u
const MIGRATION_NAME_PATTERN = /^\d{14}_[a-z0-9_]+$/u
const FIXTURE_HASH_DOMAIN = 'salon:ikebukuro-preview-fixture:v1\0'
const MODEL_HASH_DOMAIN = 'salon:ikebukuro-preview-model:v1\0'
const IMAGE_HASH_DOMAIN = 'salon:ikebukuro-preview-images:v1\0'
const INVENTORY_HASH_DOMAIN = 'salon:ikebukuro-preview-image-inventory:v1\0'
const MIGRATION_HASH_DOMAIN = 'salon:ikebukuro-preview-migrations:v1\0'

const FIXTURE_PASSWORD_CLASSES = {
  admin: '<credential:admin>',
  customer: '<credential:customer>',
  customerDisabled: '<credential:customer-disabled>',
  cast: '<credential:cast>',
} as const

const MODEL_FIXTURE_KEYS: Record<PreviewUatEmptyTable, keyof PreviewUatFixture | null> = {
  Customer: 'customers',
  CustomerStoreAssignment: 'customerStoreAssignments',
  Store: 'stores',
  Cast: 'casts',
  NgCastEntry: null,
  Reservation: 'reservations',
  SettlementPayment: null,
  SettlementPaymentReservation: null,
  CoursePrice: 'courses',
  OptionPrice: 'options',
  CastOptionSetting: 'castOptionSettings',
  AreaInfo: 'areas',
  StationInfo: 'stations',
  ReservationOption: 'reservationOptions',
  ReservationHistory: null,
  DesignationFee: 'designationFees',
  Review: 'reviews',
  CastSchedule: 'castSchedules',
  Admin: 'admins',
  CastLineRegistrationToken: null,
  AdminStoreAssignment: 'adminStoreAssignments',
  Message: 'messages',
  PaymentIntent: null,
  PaymentTransaction: null,
  StoreSettings: 'storeSettings',
  CustomerPointHistory: 'pointHistories',
  StoreEventBanner: null,
  ReservationLineLog: null,
  ReservationAttendanceRequest: null,
  HotelSettings: 'hotels',
  HotelServiceArea: 'hotelServiceAreas',
  HotelRate: 'hotelRates',
  LegacyMigrationMapping: null,
  LegacyMigrationRun: null,
}

const SOURCE_DATASETS = [
  'stores',
  'courses',
  'paidOptions',
  'freeOptions',
  'areas',
  'stations',
  'hotelGroups',
  'hotels',
  'casts',
  'schedules',
  'reservations',
  'reviews',
  'customers',
] as const

export interface GoldMasterPreviewMigrationVerification {
  name: string
  sha256: string
}

export interface GoldMasterPreviewImageInspectionResult {
  inventory: string[]
  files: Array<{ sourcePath: string; inspection: LegacyImageInspection }>
}

export interface GoldMasterPreviewVerificationDependencies {
  inspectImages(
    sourceRoot: string,
    files: readonly LegacyPublicImageManifestEntry[]
  ): Promise<GoldMasterPreviewImageInspectionResult>
  readMigrations(root: string): Promise<GoldMasterPreviewMigrationVerification[]>
}

export interface GoldMasterPreviewVerificationInput {
  snapshotInput: unknown
  snapshotSha256: string
  imageManifestInput: unknown
  imageManifestSha256: string
  imageSourceRoot: string
  migrationsRoot: string
}

export interface GoldMasterPreviewModelVerification {
  count: number
  fieldCount: number
  canonicalSha256: string
}

export interface GoldMasterPreviewVerificationControl {
  version: 1
  evidenceScope: 'ikebukuro-preview-artifact'
  snapshot: {
    schemaVersion: 4
    sha256: string
    cutoffAt: string
    scheduleFrom: string
    scheduleTo: string
    reservationFrom: string
    sourceRowCounts: Record<string, number>
  }
  images: {
    manifestVersion: 1
    manifestSha256: string
    fileCount: number
    byteCount: number
    inventorySha256: string
    canonicalSha256: string
  }
  migrations: {
    count: number
    canonicalSha256: string
    entries: GoldMasterPreviewMigrationVerification[]
  }
  models: Record<PreviewUatEmptyTable, GoldMasterPreviewModelVerification>
  fixtureCanonicalSha256: string
  aggregates: {
    customers: {
      count: number
      active: number
      blocked: number
      pending: number
      withdrawn: number
      unknown: number
      regularStage: number
      silverStage: number
      goldStage: number
      platinumStage: number
      godStage: number
      regularMember: number
      vipMember: number
      points: number
      lastLogin: number
      lastVisit: number
      emailVerified: number
      smsEnabled: number
      emailNotificationEnabled: number
      distinctPhones: number
      distinctEmails: number
    }
    reservations: {
      count: number
      completed: number
      confirmed: number
      pending: number
      cancelled: number
      settlementPending: number
      cash: number
      creditCard: number
      paymentReference: number
      designationNone: number
      designationPanel: number
      designationRegular: number
      price: number
      storeRevenue: number
      staffRevenue: number
      designationFee: number
      transportationFee: number
      additionalFee: number
      hotelExpense: number
      discountAmount: number
      welfareExpense: number
      pointsUsed: number
    }
    reservationOptions: FinancialAggregate
    courses: FinancialAggregate
    options: FinancialAggregate
    schedules: { count: number; available: number; unavailable: number }
    reviews: { count: number; published: number }
  }
}

interface FinancialAggregate {
  count: number
  price: number
  storeShare: number
  castShare: number
}

interface RedactedSnapshotMetadata {
  version: 4
  scope: {
    cutoffAt: string
    scheduleFrom: string
    scheduleTo: string
    reservationFrom: string
  }
  rows: Record<(typeof SOURCE_DATASETS)[number], unknown[]>
}

interface CanonicalModelDocument {
  model: string
  fields: Array<{
    name: string
    type: string
    kind: string
    isList: boolean
    isRequired: boolean
    isUpdatedAt: boolean
    defaultValue: unknown
  }>
  rows: Array<Record<string, unknown>>
}

export class GoldMasterPreviewVerificationError extends Error {
  constructor() {
    super('GOLD_MASTER_PREVIEW_VERIFICATION_REJECTED')
    this.name = 'GoldMasterPreviewVerificationError'
  }
}

/** Builds one deterministic PII-free control without connecting to any database. */
export async function createGoldMasterPreviewVerificationControl(
  input: GoldMasterPreviewVerificationInput,
  dependencies: GoldMasterPreviewVerificationDependencies
): Promise<GoldMasterPreviewVerificationControl> {
  try {
    requireSha256(input.snapshotSha256)
    requireSha256(input.imageManifestSha256)
    const metadata = readSnapshotMetadata(input.snapshotInput)
    const projection = projectGoldMasterPreviewImages(input.snapshotInput)
    const preparedImages = prepareGoldMasterPreviewImages(projection, input.imageManifestInput)
    const [imageInspection, migrationEntries] = await Promise.all([
      dependencies.inspectImages(input.imageSourceRoot, preparedImages.plan.files),
      dependencies.readMigrations(input.migrationsRoot),
    ])
    const images = verifyImages(
      preparedImages.plan.files,
      imageInspection,
      input.imageManifestSha256
    )
    const migrations = verifyMigrations(migrationEntries)
    const fixture = buildGoldMasterPreviewFixture(input.snapshotInput, {
      passwordHashes: FIXTURE_PASSWORD_CLASSES,
      resolveImageUrl: preparedImages.resolveImageUrl,
    })
    const { models, fixtureCanonicalSha256 } = verifyFixtureModels(fixture)

    return {
      version: 1,
      evidenceScope: 'ikebukuro-preview-artifact',
      snapshot: {
        schemaVersion: metadata.version,
        sha256: input.snapshotSha256,
        cutoffAt: canonicalDate(metadata.scope.cutoffAt),
        scheduleFrom: metadata.scope.scheduleFrom,
        scheduleTo: metadata.scope.scheduleTo,
        reservationFrom: metadata.scope.reservationFrom,
        sourceRowCounts: Object.fromEntries(
          SOURCE_DATASETS.map((dataset) => [dataset, metadata.rows[dataset].length])
        ),
      },
      images,
      migrations,
      models,
      fixtureCanonicalSha256,
      aggregates: buildAggregates(fixture),
    }
  } catch {
    throw new GoldMasterPreviewVerificationError()
  }
}

/** Parses an approved redacted control with no tolerance for unknown fields or missing models. */
export function parseGoldMasterPreviewVerificationControl(
  input: unknown
): GoldMasterPreviewVerificationControl {
  try {
    const parsed = verificationControlSchema.parse(input)
    const modelNames = Object.keys(parsed.models).sort()
    if (stableJson(modelNames) !== stableJson([...PREVIEW_UAT_EMPTY_TABLES].sort())) {
      throw new GoldMasterPreviewVerificationError()
    }
    return parsed as GoldMasterPreviewVerificationControl
  } catch {
    throw new GoldMasterPreviewVerificationError()
  }
}

/** Hashes the normalized redacted control for approval and later exact comparison. */
export function calculateGoldMasterPreviewControlSha256(
  control: GoldMasterPreviewVerificationControl
): string {
  const parsed = parseGoldMasterPreviewVerificationControl(control)
  return sha256(`salon:ikebukuro-preview-control:v1\0${stableJson(parsed)}`)
}

function verifyImages(
  manifestFiles: readonly LegacyPublicImageManifestEntry[],
  inspected: GoldMasterPreviewImageInspectionResult,
  manifestSha256: string
): GoldMasterPreviewVerificationControl['images'] {
  const expectedInventory = manifestFiles.map(({ sourcePath }) => sourcePath).sort(compareText)
  const actualInventory = [...inspected.inventory].sort(compareText)
  if (
    actualInventory.length !== new Set(actualInventory).size ||
    stableJson(actualInventory) !== stableJson(expectedInventory)
  ) {
    throw new GoldMasterPreviewVerificationError()
  }

  const inspections = new Map<string, LegacyImageInspection>()
  for (const file of inspected.files) {
    if (inspections.has(file.sourcePath)) throw new GoldMasterPreviewVerificationError()
    inspections.set(file.sourcePath, file.inspection)
  }
  if (inspections.size !== manifestFiles.length) throw new GoldMasterPreviewVerificationError()

  let byteCount = 0
  for (const file of manifestFiles) {
    const inspection = inspections.get(file.sourcePath)
    if (
      !inspection ||
      !inspection.isFile ||
      inspection.isSymbolicLink ||
      inspection.sizeBytes !== file.sizeBytes ||
      inspection.sha256 !== file.sha256 ||
      inspection.mediaType !== file.mediaType ||
      inspection.width !== file.width ||
      inspection.height !== file.height
    ) {
      throw new GoldMasterPreviewVerificationError()
    }
    byteCount = safeAdd(byteCount, file.sizeBytes)
  }

  return {
    manifestVersion: 1,
    manifestSha256,
    fileCount: manifestFiles.length,
    byteCount,
    inventorySha256: sha256(`${INVENTORY_HASH_DOMAIN}${stableJson(expectedInventory)}`),
    canonicalSha256: sha256(`${IMAGE_HASH_DOMAIN}${stableJson(manifestFiles)}`),
  }
}

function verifyMigrations(
  input: GoldMasterPreviewMigrationVerification[]
): GoldMasterPreviewVerificationControl['migrations'] {
  const entries = [...input].sort((left, right) => compareText(left.name, right.name))
  const names = new Set<string>()
  for (const entry of entries) {
    if (
      !MIGRATION_NAME_PATTERN.test(entry.name) ||
      !SHA256_PATTERN.test(entry.sha256) ||
      names.has(entry.name)
    ) {
      throw new GoldMasterPreviewVerificationError()
    }
    names.add(entry.name)
  }
  return {
    count: entries.length,
    canonicalSha256: sha256(`${MIGRATION_HASH_DOMAIN}${stableJson(entries)}`),
    entries,
  }
}

function verifyFixtureModels(fixture: PreviewUatFixture): {
  models: Record<PreviewUatEmptyTable, GoldMasterPreviewModelVerification>
  fixtureCanonicalSha256: string
} {
  const dmmfModels = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]))
  const modelReports = {} as Record<PreviewUatEmptyTable, GoldMasterPreviewModelVerification>

  for (const modelName of [...PREVIEW_UAT_EMPTY_TABLES].sort(compareText)) {
    const model = dmmfModels.get(modelName)
    if (!model) throw new GoldMasterPreviewVerificationError()
    const fixtureKey = MODEL_FIXTURE_KEYS[modelName]
    const sourceRows = fixtureKey
      ? (fixture[fixtureKey] as unknown as Array<Record<string, unknown>>)
      : []
    const document = canonicalModelDocument(model, sourceRows)
    modelReports[modelName] = {
      count: document.rows.length,
      fieldCount: document.fields.length,
      canonicalSha256: sha256(`${MODEL_HASH_DOMAIN}${stableJson(document)}`),
    }
  }

  return {
    models: modelReports,
    fixtureCanonicalSha256: sha256(`${FIXTURE_HASH_DOMAIN}${stableJson(modelReports)}`),
  }
}

function canonicalModelDocument(
  model: (typeof Prisma.dmmf.datamodel.models)[number],
  sourceRows: Array<Record<string, unknown>>
): CanonicalModelDocument {
  const fields = model.fields
    .filter((field) => field.kind !== 'object')
    .sort((left, right) => compareText(left.name, right.name))
  const fieldDefinitions = fields.map((field) => ({
    name: field.name,
    type: field.type,
    kind: field.kind,
    isList: field.isList,
    isRequired: field.isRequired,
    isUpdatedAt: field.isUpdatedAt === true,
    defaultValue: canonicalValue(field.hasDefaultValue ? field.default : null),
  }))
  const rows = sourceRows
    .map((row) => {
      const canonical: Record<string, unknown> = {}
      for (const field of fields) {
        const value = Object.prototype.hasOwnProperty.call(row, field.name)
          ? row[field.name]
          : missingFieldValue(field)
        canonical[field.name] = canonicalValue(value)
      }
      return canonical
    })
    .sort((left, right) => compareText(stableJson(left), stableJson(right)))
  return { model: model.name, fields: fieldDefinitions, rows }
}

function missingFieldValue(field: (typeof Prisma.dmmf.datamodel.models)[number]['fields'][number]) {
  if (!field.isRequired) return null
  if (field.isList) return []
  if (field.hasDefaultValue) {
    const defaultValue = field.default
    if (isRecord(defaultValue) && typeof defaultValue.name === 'string') {
      return { $generated: defaultValue.name }
    }
    return defaultValue
  }
  throw new GoldMasterPreviewVerificationError()
}

function canonicalValue(value: unknown, ancestors: Set<object> = new Set()): unknown {
  if (value === Prisma.JsonNull || value === Prisma.DbNull || value === null) return null
  if (value instanceof Date) return { $date: canonicalDate(value) }
  if (typeof value === 'bigint') return { $bigint: value.toString() }
  if (Buffer.isBuffer(value)) return { $bytes: value.toString('base64') }
  if (Prisma.Decimal.isDecimal(value)) return { $decimal: value.toFixed() }
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new GoldMasterPreviewVerificationError()
    return value
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new GoldMasterPreviewVerificationError()
    const next = new Set(ancestors).add(value)
    return value.map((entry) => canonicalValue(entry, next))
  }
  if (!isRecord(value) || ancestors.has(value)) {
    throw new GoldMasterPreviewVerificationError()
  }
  const next = new Set(ancestors).add(value)
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareText)
      .map((key) => [key, canonicalValue(value[key], next)])
  )
}

function buildAggregates(
  fixture: PreviewUatFixture
): GoldMasterPreviewVerificationControl['aggregates'] {
  const customers = fixture.customers
  const reservations = fixture.reservations
  return {
    customers: {
      count: customers.length,
      active: count(customers, 'accountStatus', 'active'),
      blocked: count(customers, 'accountStatus', 'blocked'),
      pending: count(customers, 'accountStatus', 'pending'),
      withdrawn: count(customers, 'accountStatus', 'withdrawn'),
      unknown: count(customers, 'accountStatus', 'unknown'),
      regularStage: count(customers, 'membershipStage', 'regular'),
      silverStage: count(customers, 'membershipStage', 'silver'),
      goldStage: count(customers, 'membershipStage', 'gold'),
      platinumStage: count(customers, 'membershipStage', 'platinum'),
      godStage: count(customers, 'membershipStage', 'god'),
      regularMember: count(customers, 'memberType', 'regular'),
      vipMember: count(customers, 'memberType', 'vip'),
      points: sum(customers, 'points'),
      lastLogin: customers.filter(({ lastLoginAt }) => lastLoginAt !== null).length,
      lastVisit: customers.filter(({ lastVisitAt }) => lastVisitAt !== null).length,
      emailVerified: customers.filter(({ emailVerified }) => emailVerified).length,
      smsEnabled: customers.filter(({ smsEnabled }) => smsEnabled).length,
      emailNotificationEnabled: customers.filter(
        ({ emailNotificationEnabled }) => emailNotificationEnabled
      ).length,
      distinctPhones: new Set(customers.map(({ phone }) => phone)).size,
      distinctEmails: new Set(customers.map(({ email }) => email)).size,
    },
    reservations: {
      count: reservations.length,
      completed: count(reservations, 'status', 'completed'),
      confirmed: count(reservations, 'status', 'confirmed'),
      pending: count(reservations, 'status', 'pending'),
      cancelled: count(reservations, 'status', 'cancelled'),
      settlementPending: count(reservations, 'settlementStatus', 'pending'),
      cash: count(reservations, 'paymentMethod', '現金'),
      creditCard: count(reservations, 'paymentMethod', 'クレジットカード'),
      paymentReference: reservations.filter(
        (reservation) => 'paymentReference' in reservation && reservation.paymentReference !== null
      ).length,
      designationNone: reservations.filter(({ designationType }) => designationType === null)
        .length,
      designationPanel: count(reservations, 'designationType', 'panel'),
      designationRegular: count(reservations, 'designationType', 'regular'),
      price: sum(reservations, 'price'),
      storeRevenue: sum(reservations, 'storeRevenue'),
      staffRevenue: sum(reservations, 'staffRevenue'),
      designationFee: sum(reservations, 'designationFee'),
      transportationFee: sum(reservations, 'transportationFee'),
      additionalFee: sum(reservations, 'additionalFee'),
      hotelExpense: sum(reservations, 'hotelExpense'),
      discountAmount: sum(reservations, 'discountAmount'),
      welfareExpense: sum(reservations, 'welfareExpense'),
      pointsUsed: sum(reservations, 'pointsUsed'),
    },
    reservationOptions: financialAggregate(fixture.reservationOptions, 'optionPrice'),
    courses: financialAggregate(fixture.courses, 'price'),
    options: financialAggregate(fixture.options, 'price'),
    schedules: {
      count: fixture.castSchedules.length,
      available: fixture.castSchedules.filter(({ isAvailable }) => isAvailable).length,
      unavailable: fixture.castSchedules.filter(({ isAvailable }) => !isAvailable).length,
    },
    reviews: {
      count: fixture.reviews.length,
      published: fixture.reviews.filter(({ status }) => status === 'published').length,
    },
  }
}

function financialAggregate(
  rows: Array<Record<string, unknown>>,
  priceField: string
): FinancialAggregate {
  return {
    count: rows.length,
    price: sum(rows, priceField),
    storeShare: sum(rows, 'storeShare'),
    castShare: sum(rows, 'castShare'),
  }
}

function count<T extends object>(rows: T[], key: keyof T, value: unknown): number {
  return rows.filter((row) => row[key] === value).length
}

function sum(rows: Array<Record<string, unknown>>, key: string): number {
  let total = 0
  for (const row of rows) {
    const value = row[key]
    if (value === null || value === undefined) continue
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      throw new GoldMasterPreviewVerificationError()
    }
    total = safeAdd(total, value)
  }
  return total
}

function safeAdd(left: number, right: number): number {
  const result = left + right
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new GoldMasterPreviewVerificationError()
  }
  return result
}

function readSnapshotMetadata(input: unknown): RedactedSnapshotMetadata {
  if (!isRecord(input) || input.version !== 4 || !isRecord(input.scope) || !isRecord(input.rows)) {
    throw new GoldMasterPreviewVerificationError()
  }
  const scope = input.scope
  if (
    typeof scope.cutoffAt !== 'string' ||
    typeof scope.scheduleFrom !== 'string' ||
    typeof scope.scheduleTo !== 'string' ||
    typeof scope.reservationFrom !== 'string'
  ) {
    throw new GoldMasterPreviewVerificationError()
  }
  for (const dataset of SOURCE_DATASETS) {
    if (!Array.isArray(input.rows[dataset])) throw new GoldMasterPreviewVerificationError()
  }
  return input as unknown as RedactedSnapshotMetadata
}

function canonicalDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new GoldMasterPreviewVerificationError()
  return date.toISOString()
}

function requireSha256(value: string): void {
  if (!SHA256_PATTERN.test(value)) throw new GoldMasterPreviewVerificationError()
}

function stableJson(value: unknown, ancestors: Set<object> = new Set()): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new GoldMasterPreviewVerificationError()
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new GoldMasterPreviewVerificationError()
    const next = new Set(ancestors).add(value)
    return `[${value.map((entry) => stableJson(entry, next)).join(',')}]`
  }
  if (!isRecord(value) || ancestors.has(value)) throw new GoldMasterPreviewVerificationError()
  const next = new Set(ancestors).add(value)
  return `{${Object.keys(value)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key], next)}`)
    .join(',')}}`
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const nonNegativeInteger = z.number().int().nonnegative()
const sha256Schema = z.string().regex(SHA256_PATTERN)
const financialAggregateSchema = z
  .object({
    count: nonNegativeInteger,
    price: nonNegativeInteger,
    storeShare: nonNegativeInteger,
    castShare: nonNegativeInteger,
  })
  .strict()
const modelVerificationSchema = z
  .object({
    count: nonNegativeInteger,
    fieldCount: nonNegativeInteger,
    canonicalSha256: sha256Schema,
  })
  .strict()
const verificationControlSchema = z
  .object({
    version: z.literal(1),
    evidenceScope: z.literal('ikebukuro-preview-artifact'),
    snapshot: z
      .object({
        schemaVersion: z.literal(4),
        sha256: sha256Schema,
        cutoffAt: z.string().datetime(),
        scheduleFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
        scheduleTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
        reservationFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
        sourceRowCounts: z.record(nonNegativeInteger),
      })
      .strict(),
    images: z
      .object({
        manifestVersion: z.literal(1),
        manifestSha256: sha256Schema,
        fileCount: nonNegativeInteger,
        byteCount: nonNegativeInteger,
        inventorySha256: sha256Schema,
        canonicalSha256: sha256Schema,
      })
      .strict(),
    migrations: z
      .object({
        count: nonNegativeInteger,
        canonicalSha256: sha256Schema,
        entries: z.array(
          z
            .object({
              name: z.string().regex(MIGRATION_NAME_PATTERN),
              sha256: sha256Schema,
            })
            .strict()
        ),
      })
      .strict(),
    models: z.record(modelVerificationSchema),
    fixtureCanonicalSha256: sha256Schema,
    aggregates: z
      .object({
        customers: z
          .object({
            count: nonNegativeInteger,
            active: nonNegativeInteger,
            blocked: nonNegativeInteger,
            pending: nonNegativeInteger,
            withdrawn: nonNegativeInteger,
            unknown: nonNegativeInteger,
            regularStage: nonNegativeInteger,
            silverStage: nonNegativeInteger,
            goldStage: nonNegativeInteger,
            platinumStage: nonNegativeInteger,
            godStage: nonNegativeInteger,
            regularMember: nonNegativeInteger,
            vipMember: nonNegativeInteger,
            points: nonNegativeInteger,
            lastLogin: nonNegativeInteger,
            lastVisit: nonNegativeInteger,
            emailVerified: nonNegativeInteger,
            smsEnabled: nonNegativeInteger,
            emailNotificationEnabled: nonNegativeInteger,
            distinctPhones: nonNegativeInteger,
            distinctEmails: nonNegativeInteger,
          })
          .strict(),
        reservations: z
          .object({
            count: nonNegativeInteger,
            completed: nonNegativeInteger,
            confirmed: nonNegativeInteger,
            pending: nonNegativeInteger,
            cancelled: nonNegativeInteger,
            settlementPending: nonNegativeInteger,
            cash: nonNegativeInteger,
            creditCard: nonNegativeInteger,
            paymentReference: nonNegativeInteger,
            designationNone: nonNegativeInteger,
            designationPanel: nonNegativeInteger,
            designationRegular: nonNegativeInteger,
            price: nonNegativeInteger,
            storeRevenue: nonNegativeInteger,
            staffRevenue: nonNegativeInteger,
            designationFee: nonNegativeInteger,
            transportationFee: nonNegativeInteger,
            additionalFee: nonNegativeInteger,
            hotelExpense: nonNegativeInteger,
            discountAmount: nonNegativeInteger,
            welfareExpense: nonNegativeInteger,
            pointsUsed: nonNegativeInteger,
          })
          .strict(),
        reservationOptions: financialAggregateSchema,
        courses: financialAggregateSchema,
        options: financialAggregateSchema,
        schedules: z
          .object({
            count: nonNegativeInteger,
            available: nonNegativeInteger,
            unavailable: nonNegativeInteger,
          })
          .strict(),
        reviews: z.object({ count: nonNegativeInteger, published: nonNegativeInteger }).strict(),
      })
      .strict(),
  })
  .strict()
