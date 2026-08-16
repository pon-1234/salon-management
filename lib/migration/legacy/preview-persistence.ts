/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md disposable preview persistence contract
 * @related_to   preview-prepare.ts prepares canonical rows; preview-safety.ts gates the target
 * @known_issues A separately provisioned preview database marker is required before persistence
 */
import { createHash } from 'node:crypto'

import {
  calculateLegacyPreviewPreparedDigest,
  calculateLegacyPreviewRecordSha256,
  isQualifiedLegacyPhysicalTable,
  type LegacyPreviewPreparedDigestInput,
  type PreparedLegacyPreviewImport,
} from './preview-prepare'
import { assertLegacyPreviewTarget, type LegacyPreviewSafetyInput } from './preview-safety'
import { LEGACY_ENTITY_NAMES, type LegacyEntityName, type LegacySourceReference } from './types'

const TARGET_ID_DOMAIN = 'salon-legacy-preview-target-id:v1'
const SHA256_PATTERN = /^[a-f0-9]{64}$/u
const TARGET_STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const MAX_TARGET_STORE_SLUG_LENGTH = 100
const DISABLED_CREDENTIAL_PATTERN = /^!legacy-preview-disabled!\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/u
const TARGET_CREATION_ORDER = [
  'courses',
  'casts',
  'customers',
  'castSchedules',
  'reservations',
  'pointHistories',
] as const satisfies ReadonlyArray<LegacyPreviewTargetEntity>

type LegacyPreviewTargetEntity = Exclude<LegacyEntityName, 'stores'>

export interface LegacyPreviewExecutionControls {
  runtimeMode: string | undefined
  outboundDeliveryMode: string | undefined
  databaseUrl: string | undefined
  expectedDatabaseName: string | undefined
  configuredMarker: string | undefined
  confirmedMarker: string | undefined
  acknowledgement: string | undefined
}

export interface LegacyPreviewTargetIdentity {
  databaseName: string
  environment: string | null
  marker: string | null
}

export interface LegacyPreviewMapping {
  sourceKey: string
  legacyEntity: LegacyEntityName
  legacyId: string
  targetId: string
  sourceHash: string
  migrationVersion: number
}

export interface LegacyPreviewRunProvenance {
  sourceKey: string
  targetId: string
  cutoffAt: string
  migrationManifestSha256: string
  canonicalExportSha256: string
  snapshotManifestSha256: string
  extractorVersion: string
  transformationPolicyVersion: string
  canonicalDigest: string
  migrationVersion: number
}

export interface LegacyPreviewStoredRun extends LegacyPreviewRunProvenance {
  createdAt: string
}

export interface LegacyPreviewStoreProjection {
  id: string
  slug: string
  timezone: string
  name: string
  displayName: string
  phone: string | null
  email: string | null
  address: string | null
  isActive: boolean
}

export interface LegacyPreviewAggregateCounts {
  stores: number
  courses: number
  casts: number
  customers: number
  castSchedules: number
  reservations: number
  pointHistories: number
  mappings: number
  runs: number
}

interface CourseProjection {
  id: string
  name: string
  displayOrder: number
  duration: number
  price: number
  storeShare: number | null
  castShare: number | null
  description: string
  isActive: boolean
  enableWebBooking: boolean
  archivedAt: string | null
  storeId: string
}

interface CastProjection {
  id: string
  name: string
  nameKana: null
  age: number
  height: number
  bust: string
  waist: number
  hip: number
  type: string
  image: string
  images: string[]
  description: string
  publicProfile: null
  netReservation: boolean
  requestAttendanceEnabled: false
  specialDesignationFee: null
  regularDesignationFee: null
  panelDesignationRank: number
  regularDesignationRank: number
  workStatus: string
  availableOptions: string[]
  lineUserId: null
  welfareExpenseRate: null
  loginEmail: null
  passwordHash: null
  storeId: string
  createdAt: string
  updatedAt: string
}

interface CustomerProjection {
  id: string
  name: string
  nameKana: string
  phone: string
  email: string
  birthDate: string
  memberType: string
  points: number
  smsEnabled: boolean
  emailNotificationEnabled: boolean
  resetToken: null
  resetTokenExpiry: null
  emailVerified: false
  emailVerificationToken: null
  emailVerificationExpiry: null
  phoneVerified: false
  phoneVerifiedAt: null
  phoneVerificationCode: null
  phoneVerificationExpiry: null
  phoneVerificationAttempts: 0
  createdAt: string
  updatedAt: string
}

interface CastScheduleProjection {
  id: string
  castId: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface ReservationProjection {
  id: string
  customerId: string
  castId: string
  courseId: string
  startTime: string
  endTime: string
  status: string
  settlementStatus: 'pending'
  price: number
  storeId: string
  designationType: null
  designationFee: 0
  transportationFee: 0
  additionalFee: 0
  discountAmount: 0
  welfareExpense: 0
  paymentMethod: '現金'
  marketingChannel: null
  storeRevenue: null
  staffRevenue: null
  areaId: null
  stationId: null
  hotelName: null
  roomNumber: null
  entryMemo: null
  entryReceivedAt: null
  entryReceivedBy: null
  entryNotifiedAt: null
  entryConfirmedAt: null
  entryReminderSentAt: null
  locationMemo: null
  notes: string | null
  castCheckedInAt: null
  castCheckedOutAt: null
  pointsUsed: number
  cancellationSource: null
  createdAt: string
  updatedAt: string
}

interface PointHistoryProjection {
  id: string
  customerId: string
  type: string
  amount: number
  description: string
  relatedService: null
  reservationId: string | null
  balance: number
  expiresAt: string | null
  isExpired: boolean
  sourceHistoryId: string
  createdAt: string
  updatedAt: string
}

export type LegacyPreviewTargetRow =
  | { entity: 'courses'; data: CourseProjection }
  | { entity: 'casts'; data: CastProjection }
  | { entity: 'customers'; data: CustomerProjection }
  | { entity: 'castSchedules'; data: CastScheduleProjection }
  | { entity: 'reservations'; data: ReservationProjection }
  | { entity: 'pointHistories'; data: PointHistoryProjection }

export interface LegacyPreviewStoredTarget {
  projection: unknown
  customerCredential: unknown
}

export interface LegacyPreviewTransactionPort {
  acquireSourceLock: (sourceKey: string) => Promise<void>
  readTargetIdentity: () => Promise<LegacyPreviewTargetIdentity>
  readMappings: (sourceKey: string) => Promise<LegacyPreviewMapping[]>
  readRun: (sourceKey: string) => Promise<LegacyPreviewStoredRun | null>
  readAggregateCounts: () => Promise<LegacyPreviewAggregateCounts>
  readStore: (targetId: string) => Promise<LegacyPreviewStoreProjection | null>
  readTarget: (
    entity: LegacyPreviewTargetEntity,
    targetId: string
  ) => Promise<LegacyPreviewStoredTarget | null>
  findNaturalKeyConflict: (row: LegacyPreviewTargetRow) => Promise<string | null>
  createTarget: (row: LegacyPreviewTargetRow, customerCredential: string | null) => Promise<void>
  createMapping: (mapping: LegacyPreviewMapping) => Promise<void>
  createRun: (run: LegacyPreviewRunProvenance) => Promise<void>
}

export interface LegacyPreviewPersistencePort {
  withSerializableTransaction: <Result>(
    operation: (transaction: LegacyPreviewTransactionPort) => Promise<Result>
  ) => Promise<Result>
}

export interface LegacyPreviewDisabledCredentialFactory {
  createDisabledCredential: () => Promise<string>
}

export interface LegacyPreviewEntityCount {
  created: number
  reused: number
  verified: number
}

export interface LegacyPreviewPersistenceReport {
  targetId: string
  cutoffAt: string
  canonicalDigest: string
  counts: Record<LegacyEntityName, LegacyPreviewEntityCount> & {
    mappings: { created: number; reused: number }
  }
}

interface PlannedStore {
  mapping: LegacyPreviewMapping
  projection: LegacyPreviewStoreProjection
}

interface PlannedTarget {
  mapping: LegacyPreviewMapping
  row: LegacyPreviewTargetRow
}

interface LegacyPreviewPlan {
  stores: PlannedStore[]
  targets: PlannedTarget[]
  mappings: LegacyPreviewMapping[]
}

interface LegacyPreviewInspectedState {
  mode: 'create' | 'reuse'
  target: { databaseName: string; marker: string }
  run: LegacyPreviewRunProvenance
}

export function createLegacyPreviewTargetId(
  sourceKey: string,
  entity: LegacyEntityName,
  legacyId: string
): string {
  const digest = createHash('sha256')
    .update(TARGET_ID_DOMAIN)
    .update('\0')
    .update(sourceKey)
    .update('\0')
    .update(entity)
    .update('\0')
    .update(legacyId)
    .digest('hex')

  return `lpv_${digest.slice(0, 32)}`
}

export async function persistLegacyPreviewImport(
  prepared: PreparedLegacyPreviewImport,
  controls: LegacyPreviewExecutionControls,
  dependencies: {
    persistence: LegacyPreviewPersistencePort
    credentialFactory: LegacyPreviewDisabledCredentialFactory
  }
): Promise<LegacyPreviewPersistenceReport> {
  validatePreparedImport(prepared)
  const plan = buildPlan(prepared)

  const preflight = await dependencies.persistence.withSerializableTransaction((transaction) =>
    inspectPersistenceState(transaction, prepared, controls, plan)
  )
  if (preflight.mode === 'reuse') {
    return createReport(prepared, preflight.target.marker, 'reuse')
  }

  const credentials = await createCustomerCredentials(plan.targets, dependencies.credentialFactory)

  return dependencies.persistence.withSerializableTransaction(async (transaction) => {
    const inspected = await inspectPersistenceState(transaction, prepared, controls, plan)
    if (inspected.mode === 'reuse') {
      return createReport(prepared, inspected.target.marker, 'reuse')
    }

    await transaction.createRun(inspected.run)
    for (const store of plan.stores) {
      await transaction.createMapping(store.mapping)
    }
    for (const entity of TARGET_CREATION_ORDER) {
      for (const targetRow of plan.targets.filter((candidate) => candidate.row.entity === entity)) {
        const credential = credentials.get(targetRow.row.data.id) ?? null
        await transaction.createTarget(targetRow.row, credential)
        await transaction.createMapping(targetRow.mapping)
      }
    }

    const persistedMappings = await transaction.readMappings(prepared.sourceKey)
    classifyMappings(persistedMappings, plan.mappings)
    await verifyStores(transaction, plan.stores)
    await verifyMappedTargets(transaction, plan.targets)
    await verifyRun(transaction, inspected.run)
    await verifyAggregateCounts(transaction, plan, 'reuse')

    return createReport(prepared, inspected.target.marker, 'create')
  })
}

async function inspectPersistenceState(
  transaction: LegacyPreviewTransactionPort,
  prepared: PreparedLegacyPreviewImport,
  controls: LegacyPreviewExecutionControls,
  plan: LegacyPreviewPlan
): Promise<LegacyPreviewInspectedState> {
  const identity = await transaction.readTargetIdentity()
  const target = assertSafeTarget(controls, identity)
  await transaction.acquireSourceLock(prepared.sourceKey)
  const mappings = await transaction.readMappings(prepared.sourceKey)
  const mode = classifyMappings(mappings, plan.mappings)
  const run = runFor(prepared, target.marker)
  const storedRun = await transaction.readRun(prepared.sourceKey)
  await verifyAggregateCounts(transaction, plan, mode)
  await verifyStores(transaction, plan.stores)

  if (mode === 'reuse') {
    assertMatchingRun(storedRun, run)
    await verifyMappedTargets(transaction, plan.targets)
  } else {
    if (storedRun !== null) fail('RUN_WITHOUT_MAPPINGS')
    await verifyFreshTargets(transaction, plan.targets)
  }

  return { mode, target, run }
}

function assertSafeTarget(
  controls: LegacyPreviewExecutionControls,
  identity: LegacyPreviewTargetIdentity
): { databaseName: string; marker: string } {
  const safetyInput: LegacyPreviewSafetyInput = {
    ...controls,
    databaseMarker: identity.marker,
    databaseEnvironment: identity.environment,
  }

  let target: { databaseName: string; marker: string }
  try {
    target = assertLegacyPreviewTarget(safetyInput)
  } catch {
    fail('TARGET_SAFETY_CHECK_FAILED')
  }
  if (identity.databaseName !== target.databaseName) {
    fail('CURRENT_DATABASE_MISMATCH')
  }
  return target
}

function validatePreparedImport(prepared: PreparedLegacyPreviewImport): void {
  if (
    prepared.version !== 1 ||
    prepared.sourceKey.trim().length === 0 ||
    !isCanonicalUtcTimestamp(prepared.cutoffAt) ||
    !SHA256_PATTERN.test(prepared.migrationManifestSha256) ||
    !SHA256_PATTERN.test(prepared.canonicalExportSha256) ||
    !SHA256_PATTERN.test(prepared.snapshotManifestSha256) ||
    !isVersionLabel(prepared.extractorVersion) ||
    !isVersionLabel(prepared.transformationPolicyVersion) ||
    !SHA256_PATTERN.test(prepared.canonicalDigest)
  ) {
    fail('INVALID_PREPARED_IMPORT')
  }

  for (const { record } of prepared.records.stores) {
    if (
      record.targetStoreId.trim().length === 0 ||
      record.targetStoreSlug.length > MAX_TARGET_STORE_SLUG_LENGTH ||
      !TARGET_STORE_SLUG_PATTERN.test(record.targetStoreSlug) ||
      record.targetStoreTimezone !== 'Asia/Tokyo'
    ) {
      fail('INVALID_PREPARED_STORE_MAPPING')
    }
  }

  const hashes = new Set<string>()
  const sources = new Set<string>()
  const usedSourceTables = new Set<string>()
  for (const entity of LEGACY_ENTITY_NAMES) {
    for (const preparedRecord of prepared.records[entity]) {
      if (!SHA256_PATTERN.test(preparedRecord.sourceHash)) {
        fail('INVALID_SOURCE_HASH')
      }
      let calculatedSourceHash: string
      try {
        calculatedSourceHash = calculateLegacyPreviewRecordSha256(entity, preparedRecord.record)
      } catch {
        fail('INVALID_SOURCE_HASH')
      }
      if (preparedRecord.sourceHash !== calculatedSourceHash) {
        fail('SOURCE_HASH_MISMATCH')
      }
      if (hashes.has(preparedRecord.sourceHash)) {
        fail('DUPLICATE_SOURCE_HASH')
      }
      hashes.add(preparedRecord.sourceHash)

      const { source } = preparedRecord.record
      const sourceIdentity = `${source.entity}\0${source.legacyId}`
      if (
        source.sourceKey !== prepared.sourceKey ||
        source.entity !== entity ||
        source.legacyId.length === 0 ||
        source.physicalTable.length === 0 ||
        !isQualifiedLegacyPhysicalTable(source.physicalTable) ||
        !source.legacyId.startsWith(`${source.physicalTable}:`) ||
        source.legacyId.length === source.physicalTable.length + 1 ||
        sources.has(sourceIdentity)
      ) {
        fail('INVALID_SOURCE_PROVENANCE')
      }
      sources.add(sourceIdentity)
      usedSourceTables.add(source.physicalTable)
    }
  }

  const approvedTables = [...prepared.approvedSourceTables]
  if (
    approvedTables.length === 0 ||
    new Set(approvedTables).size !== approvedTables.length ||
    !sameValue(
      approvedTables,
      [...approvedTables].sort((left, right) => left.localeCompare(right, 'en'))
    ) ||
    !sameValue(
      approvedTables,
      [...usedSourceTables].sort((left, right) => left.localeCompare(right, 'en'))
    )
  ) {
    fail('INVALID_APPROVED_SOURCE_TABLES')
  }

  for (const entity of LEGACY_ENTITY_NAMES) {
    const reconciliation = prepared.reconciliation[entity]
    if (
      !reconciliation ||
      reconciliation.input !== prepared.records[entity].length ||
      reconciliation.accepted !== prepared.records[entity].length ||
      reconciliation.rejected !== 0
    ) {
      fail('INVALID_RECONCILIATION')
    }
  }

  const { canonicalDigest, ...preparedWithoutDigest } = prepared
  let calculatedDigest: string
  try {
    calculatedDigest = calculateLegacyPreviewPreparedDigest(
      preparedWithoutDigest as LegacyPreviewPreparedDigestInput
    )
  } catch {
    fail('INVALID_PREPARED_DIGEST')
  }
  if (canonicalDigest !== calculatedDigest) {
    fail('PREPARED_DIGEST_MISMATCH')
  }
}

function buildPlan(prepared: PreparedLegacyPreviewImport): LegacyPreviewPlan {
  const targetIds = new Map<string, string>()
  const allocatedTargetIds = new Set<string>()

  for (const preparedStore of prepared.records.stores) {
    addReferenceTarget(targetIds, preparedStore.record.source, preparedStore.record.targetStoreId)
  }
  for (const entity of TARGET_CREATION_ORDER) {
    for (const preparedRecord of prepared.records[entity]) {
      const targetId = createLegacyPreviewTargetId(
        prepared.sourceKey,
        entity,
        preparedRecord.record.source.legacyId
      )
      if (allocatedTargetIds.has(targetId)) fail('DUPLICATE_TARGET_ID')
      allocatedTargetIds.add(targetId)
      addReferenceTarget(targetIds, preparedRecord.record.source, targetId)
    }
  }

  const stores = prepared.records.stores.map(({ record, sourceHash }) => ({
    mapping: mappingFor(record.source, record.targetStoreId, sourceHash),
    projection: {
      id: record.targetStoreId,
      slug: record.targetStoreSlug,
      timezone: record.targetStoreTimezone,
      name: record.name,
      displayName: record.displayName,
      phone: record.phone,
      email: record.email,
      address: record.address,
      isActive: record.isActive,
    },
  }))
  const targets: PlannedTarget[] = []

  for (const { record, sourceHash } of prepared.records.courses) {
    const id = requireTarget(targetIds, record.source)
    const storeId = requireTarget(targetIds, record.store)
    if (storeId !== record.targetStoreId) fail('TARGET_STORE_REFERENCE_MISMATCH')
    targets.push({
      mapping: mappingFor(record.source, id, sourceHash),
      row: {
        entity: 'courses',
        data: {
          id,
          name: record.name,
          displayOrder: 0,
          duration: record.duration,
          price: record.price,
          storeShare: record.storeShare,
          castShare: record.castShare,
          description: record.description,
          isActive: record.isActive,
          enableWebBooking: record.enableWebBooking,
          archivedAt: canonicalNullableDate(record.archivedAt),
          storeId,
        },
      },
    })
  }

  for (const { record, sourceHash } of prepared.records.casts) {
    if (
      record.age === null ||
      record.height === null ||
      record.bust === null ||
      record.waist === null ||
      record.hip === null ||
      record.type === null ||
      record.image === null ||
      record.description === null ||
      record.createdAt === null
    ) {
      fail('MISSING_TARGET_REQUIRED_FIELD')
    }
    const id = requireTarget(targetIds, record.source)
    const storeId = requireTarget(targetIds, record.store)
    if (storeId !== record.targetStoreId) fail('TARGET_STORE_REFERENCE_MISMATCH')
    const timestamp = canonicalDate(record.createdAt)
    targets.push({
      mapping: mappingFor(record.source, id, sourceHash),
      row: {
        entity: 'casts',
        data: {
          id,
          name: record.name,
          nameKana: null,
          age: record.age,
          height: record.height,
          bust: record.bust,
          waist: record.waist,
          hip: record.hip,
          type: record.type,
          image: record.image,
          images: [...record.images],
          description: record.description,
          publicProfile: null,
          netReservation: record.netReservation,
          requestAttendanceEnabled: false,
          specialDesignationFee: null,
          regularDesignationFee: null,
          panelDesignationRank: record.panelDesignationRank,
          regularDesignationRank: record.regularDesignationRank,
          workStatus: record.workStatus,
          availableOptions: [],
          lineUserId: null,
          welfareExpenseRate: null,
          loginEmail: null,
          passwordHash: null,
          storeId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    })
  }

  for (const { record, sourceHash } of prepared.records.customers) {
    if (
      record.nameKana === null ||
      record.email === null ||
      record.birthDate === null ||
      record.createdAt === null ||
      record.persistenceDisposition !== 'ready'
    ) {
      fail('MISSING_TARGET_REQUIRED_FIELD')
    }
    const id = requireTarget(targetIds, record.source)
    const timestamp = canonicalDate(record.createdAt)
    targets.push({
      mapping: mappingFor(record.source, id, sourceHash),
      row: {
        entity: 'customers',
        data: {
          id,
          name: record.name,
          nameKana: record.nameKana,
          phone: record.phone,
          email: record.email,
          birthDate: canonicalDate(record.birthDate),
          memberType: record.memberType,
          points: record.points,
          smsEnabled: record.smsEnabled,
          emailNotificationEnabled: record.emailNotificationEnabled,
          resetToken: null,
          resetTokenExpiry: null,
          emailVerified: false,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
          phoneVerified: false,
          phoneVerifiedAt: null,
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
          phoneVerificationAttempts: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    })
  }

  for (const { record, sourceHash } of prepared.records.castSchedules) {
    const id = requireTarget(targetIds, record.source)
    targets.push({
      mapping: mappingFor(record.source, id, sourceHash),
      row: {
        entity: 'castSchedules',
        data: {
          id,
          castId: requireTarget(targetIds, record.cast),
          date: canonicalDate(record.date),
          startTime: canonicalDate(record.startTime),
          endTime: canonicalDate(record.endTime),
          isAvailable: record.isAvailable,
        },
      },
    })
  }

  for (const { record, sourceHash } of prepared.records.reservations) {
    if (record.createdAt === null) fail('MISSING_TARGET_REQUIRED_FIELD')
    const id = requireTarget(targetIds, record.source)
    const storeId = requireTarget(targetIds, record.store)
    if (storeId !== record.targetStoreId) fail('TARGET_STORE_REFERENCE_MISMATCH')
    const timestamp = canonicalDate(record.createdAt)
    targets.push({
      mapping: mappingFor(record.source, id, sourceHash),
      row: {
        entity: 'reservations',
        data: {
          id,
          customerId: requireTarget(targetIds, record.customer),
          castId: requireTarget(targetIds, record.cast),
          courseId: requireTarget(targetIds, record.course),
          startTime: canonicalDate(record.startTime),
          endTime: canonicalDate(record.endTime),
          status: record.status,
          settlementStatus: 'pending',
          price: record.price,
          storeId,
          designationType: null,
          designationFee: 0,
          transportationFee: 0,
          additionalFee: 0,
          discountAmount: 0,
          welfareExpense: 0,
          paymentMethod: '現金',
          marketingChannel: null,
          storeRevenue: null,
          staffRevenue: null,
          areaId: null,
          stationId: null,
          hotelName: null,
          roomNumber: null,
          entryMemo: null,
          entryReceivedAt: null,
          entryReceivedBy: null,
          entryNotifiedAt: null,
          entryConfirmedAt: null,
          entryReminderSentAt: null,
          locationMemo: null,
          notes: record.notes,
          castCheckedInAt: null,
          castCheckedOutAt: null,
          pointsUsed: record.pointsUsed,
          cancellationSource: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    })
  }

  for (const { record, sourceHash } of prepared.records.pointHistories) {
    const id = requireTarget(targetIds, record.source)
    const timestamp = canonicalDate(record.createdAt)
    targets.push({
      mapping: mappingFor(record.source, id, sourceHash),
      row: {
        entity: 'pointHistories',
        data: {
          id,
          customerId: requireTarget(targetIds, record.customer),
          type: record.type,
          amount: record.amount,
          description: record.description,
          relatedService: null,
          reservationId: record.reservation ? requireTarget(targetIds, record.reservation) : null,
          balance: record.balance,
          expiresAt: canonicalNullableDate(record.expiresAt),
          isExpired: record.isExpired,
          sourceHistoryId: `legacy-preview:${id}`,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    })
  }

  const targetsByEntityOrder = TARGET_CREATION_ORDER.flatMap((entity) =>
    targets.filter((target) => target.row.entity === entity)
  )
  return {
    stores,
    targets: targetsByEntityOrder,
    mappings: [
      ...stores.map((store) => store.mapping),
      ...targetsByEntityOrder.map(({ mapping }) => mapping),
    ],
  }
}

function classifyMappings(
  actualMappings: readonly LegacyPreviewMapping[],
  expectedMappings: readonly LegacyPreviewMapping[]
): 'create' | 'reuse' {
  if (actualMappings.length === 0) return 'create'
  if (actualMappings.length !== expectedMappings.length) fail('INCOMPLETE_MAPPING_SET')

  const expectedByKey = new Map(
    expectedMappings.map((mapping) => [mappingKey(mapping.legacyEntity, mapping.legacyId), mapping])
  )
  const seenKeys = new Set<string>()
  for (const actual of actualMappings) {
    const key = mappingKey(actual.legacyEntity, actual.legacyId)
    const expected = expectedByKey.get(key)
    if (!expected || seenKeys.has(key) || !sameValue(actual, expected)) fail('MAPPING_DRIFT')
    seenKeys.add(key)
  }
  if (seenKeys.size !== expectedByKey.size) fail('INCOMPLETE_MAPPING_SET')
  return 'reuse'
}

function runFor(
  prepared: PreparedLegacyPreviewImport,
  targetId: string
): LegacyPreviewRunProvenance {
  return {
    sourceKey: prepared.sourceKey,
    targetId,
    cutoffAt: prepared.cutoffAt,
    migrationManifestSha256: prepared.migrationManifestSha256,
    canonicalExportSha256: prepared.canonicalExportSha256,
    snapshotManifestSha256: prepared.snapshotManifestSha256,
    extractorVersion: prepared.extractorVersion,
    transformationPolicyVersion: prepared.transformationPolicyVersion,
    canonicalDigest: prepared.canonicalDigest,
    migrationVersion: 1,
  }
}

async function verifyRun(
  transaction: LegacyPreviewTransactionPort,
  expected: LegacyPreviewRunProvenance
): Promise<void> {
  assertMatchingRun(await transaction.readRun(expected.sourceKey), expected)
}

async function verifyAggregateCounts(
  transaction: LegacyPreviewTransactionPort,
  plan: LegacyPreviewPlan,
  mode: 'create' | 'reuse'
): Promise<void> {
  const targetCounts = Object.fromEntries(
    TARGET_CREATION_ORDER.map((entity) => [
      entity,
      plan.targets.filter((target) => target.row.entity === entity).length,
    ])
  ) as Record<LegacyPreviewTargetEntity, number>
  const expected: LegacyPreviewAggregateCounts = {
    stores: plan.stores.length,
    courses: mode === 'reuse' ? targetCounts.courses : 0,
    casts: mode === 'reuse' ? targetCounts.casts : 0,
    customers: mode === 'reuse' ? targetCounts.customers : 0,
    castSchedules: mode === 'reuse' ? targetCounts.castSchedules : 0,
    reservations: mode === 'reuse' ? targetCounts.reservations : 0,
    pointHistories: mode === 'reuse' ? targetCounts.pointHistories : 0,
    mappings: mode === 'reuse' ? plan.mappings.length : 0,
    runs: mode === 'reuse' ? 1 : 0,
  }
  if (!sameValue(await transaction.readAggregateCounts(), expected)) {
    fail('DATABASE_NOT_DEDICATED')
  }
}

function assertMatchingRun(
  actual: LegacyPreviewStoredRun | null,
  expected: LegacyPreviewRunProvenance
): void {
  if (actual === null || !isCanonicalUtcTimestamp(actual.createdAt)) {
    fail('RUN_PROVENANCE_DRIFT')
  }
  const { createdAt: _createdAt, ...actualProvenance } = actual
  if (!sameValue(actualProvenance, expected)) fail('RUN_PROVENANCE_DRIFT')
}

async function verifyStores(
  transaction: LegacyPreviewTransactionPort,
  stores: readonly PlannedStore[]
): Promise<void> {
  for (const store of stores) {
    const actual = await transaction.readStore(store.projection.id)
    if (!actual || !sameValue(actual, store.projection)) fail('STORE_PROJECTION_DRIFT')
  }
}

async function verifyMappedTargets(
  transaction: LegacyPreviewTransactionPort,
  targets: readonly PlannedTarget[]
): Promise<void> {
  for (const target of targets) {
    const actual = await transaction.readTarget(target.row.entity, target.row.data.id)
    if (!actual || !sameValue(actual.projection, target.row)) fail('TARGET_PROJECTION_DRIFT')
    if (target.row.entity === 'customers') {
      if (!isLegacyPreviewDisabledCredential(actual.customerCredential)) {
        fail('CUSTOMER_CREDENTIAL_DRIFT')
      }
    } else if (actual.customerCredential !== null) {
      fail('TARGET_PROJECTION_DRIFT')
    }
  }
}

async function verifyFreshTargets(
  transaction: LegacyPreviewTransactionPort,
  targets: readonly PlannedTarget[]
): Promise<void> {
  for (const target of targets) {
    if (await transaction.readTarget(target.row.entity, target.row.data.id)) {
      fail('UNMAPPED_TARGET_EXISTS')
    }
    if (await transaction.findNaturalKeyConflict(target.row)) {
      fail('UNMAPPED_NATURAL_KEY_CONFLICT')
    }
  }
}

async function createCustomerCredentials(
  targets: readonly PlannedTarget[],
  factory: LegacyPreviewDisabledCredentialFactory
): Promise<Map<string, string>> {
  const credentials = new Map<string, string>()
  for (const target of targets) {
    if (target.row.entity !== 'customers') continue
    const credential = await factory.createDisabledCredential()
    if (!isLegacyPreviewDisabledCredential(credential)) fail('INVALID_DISABLED_CREDENTIAL')
    credentials.set(target.row.data.id, credential)
  }
  return credentials
}

export function isLegacyPreviewDisabledCredential(value: unknown): value is string {
  return typeof value === 'string' && DISABLED_CREDENTIAL_PATTERN.test(value)
}

function createReport(
  prepared: PreparedLegacyPreviewImport,
  targetId: string,
  mode: 'create' | 'reuse'
): LegacyPreviewPersistenceReport {
  const counts = Object.fromEntries(
    LEGACY_ENTITY_NAMES.map((entity) => {
      const count = prepared.records[entity].length
      return [
        entity,
        {
          created: entity !== 'stores' && mode === 'create' ? count : 0,
          reused: entity !== 'stores' && mode === 'reuse' ? count : 0,
          verified: entity === 'stores' ? count : 0,
        },
      ]
    })
  ) as Record<LegacyEntityName, LegacyPreviewEntityCount>
  const mappingCount = LEGACY_ENTITY_NAMES.reduce(
    (total, entity) => total + prepared.records[entity].length,
    0
  )

  return {
    targetId,
    cutoffAt: prepared.cutoffAt,
    canonicalDigest: prepared.canonicalDigest,
    counts: {
      ...counts,
      mappings: {
        created: mode === 'create' ? mappingCount : 0,
        reused: mode === 'reuse' ? mappingCount : 0,
      },
    },
  }
}

function mappingFor(
  source: LegacySourceReference,
  targetId: string,
  sourceHash: string
): LegacyPreviewMapping {
  return {
    sourceKey: source.sourceKey,
    legacyEntity: source.entity,
    legacyId: source.legacyId,
    targetId,
    sourceHash,
    migrationVersion: 1,
  }
}

function addReferenceTarget(
  targets: Map<string, string>,
  source: LegacySourceReference,
  targetId: string
): void {
  const key = referenceKey(source)
  if (targets.has(key) || targetId.length === 0) fail('DUPLICATE_REFERENCE_TARGET')
  targets.set(key, targetId)
}

function requireTarget(
  targets: ReadonlyMap<string, string>,
  reference: LegacySourceReference
): string {
  const target = targets.get(referenceKey(reference))
  if (!target) fail('UNRESOLVED_PREPARED_REFERENCE')
  return target
}

function referenceKey(reference: LegacySourceReference): string {
  return `${reference.sourceKey}\0${reference.entity}\0${reference.physicalTable}\0${reference.legacyId}`
}

function mappingKey(entity: LegacyEntityName, legacyId: string): string {
  return `${entity}\0${legacyId}`
}

function canonicalNullableDate(value: string | null): string | null {
  return value === null ? null : canonicalDate(value)
}

function canonicalDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) fail('INVALID_PREPARED_DATE')
  return date.toISOString()
}

function isCanonicalUtcTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) && canonicalDate(value) === value
  )
}

function isVersionLabel(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)
}

function sameValue(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right)
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

class LegacyPreviewPersistenceError extends Error {}

function fail(code: string): never {
  throw new LegacyPreviewPersistenceError(`[legacy preview persistence] ${code}`)
}
