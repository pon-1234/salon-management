/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md guarded disposable preview import command
 * @related_to   snapshot-package.ts, preview-prepare.ts, and preview-persistence.ts form its gates
 * @known_issues Raw production snapshot extraction remains a separate read-only operational step
 */
import { createHash } from 'node:crypto'
import { isAbsolute, parse, resolve } from 'node:path'

import { readPrivateLegacyJsonText } from './private-json-file'
import { createLegacyPreviewImageFilesystemIo } from './preview-image-filesystem'
import {
  executeLegacyPreviewImageImport,
  preflightLegacyPreviewImageTarget,
  prepareLegacyPreviewImageImport,
  type LegacyPreviewImageImportIo,
  type LegacyPreviewImageImportPlan,
  type LegacyPreviewImageImportReport,
} from './preview-image-import'
import {
  persistLegacyPreviewImport,
  type LegacyPreviewDisabledCredentialFactory,
  type LegacyPreviewExecutionControls,
  type LegacyPreviewPersistencePort,
  type LegacyPreviewPersistenceReport,
} from './preview-persistence'
import {
  calculateLegacyCanonicalJsonSha256,
  prepareLegacyPreviewImport,
  type PreparedLegacyPreviewImport,
} from './preview-prepare'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT, assertLegacyPreviewTarget } from './preview-safety'
import {
  createLegacySnapshotPackageFilesystem,
  readLegacySnapshotPolicyText,
  type LegacySnapshotPackageFilesystem,
} from './snapshot-package-fs'
import { parseLegacySnapshotPackagePolicyFile } from './snapshot-package-runner'
import {
  deriveLegacyApprovedSourceTables,
  validateLegacySnapshotPackageManifest,
  verifyLegacySnapshotPackage,
  type LegacySnapshotPackageManifestV1,
  type LegacySnapshotPackagePolicy,
} from './snapshot-package'
import { parseStrictJson } from './strict-json'
import { LEGACY_ENTITY_NAMES, type LegacyEntityName } from './types'

export interface LegacyPreviewImportArgs {
  manifestPath: string
  exportPath: string
  controlPath: string
  packageRoot: string
  snapshotManifestPath: string
  snapshotPolicyPath: string
  confirmedDatabaseName: string
  confirmedMarker: string
  confirmedStorageRoot: string
  acknowledgement: typeof LEGACY_PREVIEW_ACKNOWLEDGEMENT
}

export interface LegacyPreviewValidatedEnvironment {
  runtimeMode: string | undefined
  outboundDeliveryMode: string | undefined
  databaseUrl: string | undefined
  configuredMarker: string | undefined
  storageRoot: string | undefined
}

export interface LegacyPreviewDatabaseRuntime {
  persistence: LegacyPreviewPersistencePort
  credentialFactory: LegacyPreviewDisabledCredentialFactory
  disconnect: () => Promise<void>
}

type ValidatedLegacyPreviewExecutionControls = LegacyPreviewExecutionControls & {
  databaseUrl: string
  storageRoot: string
}

export interface LegacyPreviewImportRunnerDependencies {
  loadValidatedEnvironment: () => Promise<LegacyPreviewValidatedEnvironment>
  readPrivateText: (filePath: string, maximumBytes: number) => Promise<string>
  createSnapshotFilesystem: (rootPath: string) => Promise<LegacySnapshotPackageFilesystem>
  readSnapshotPolicyText: (filePath: string, maximumBytes: number) => Promise<string>
  createImageFilesystem: (sourceRoot: string, targetRoot: string) => LegacyPreviewImageImportIo
  createDatabase: (databaseUrl: string) => Promise<LegacyPreviewDatabaseRuntime>
  now: () => Date
}

type SuccessfulCounts = LegacyPreviewPersistenceReport['counts']
type RejectedCounts = Record<LegacyEntityName, 0> & { mappings: 0 }

interface LegacyPreviewImageImportSummary {
  status: 'skipped-empty' | 'persisted' | 'rejected-with-residual-files'
  imageManifestSha256: string | null
  planDigest: string | null
  plannedFileCount: number
  verifiedByteCount: number
  createdFileCount: number
  reusedFileCount: number
  rolledBackFileCount: number
}

export type LegacyPreviewImportReport =
  | {
      success: true
      evidenceScope: 'canonical-preview-only'
      status: 'verified-and-persisted' | 'persisted-with-disconnect-warning'
      migrationManifestSha256: string
      canonicalExportSha256: string
      snapshotManifestSha256: string
      canonicalDigest: string
      counts: SuccessfulCounts
      imageImport: LegacyPreviewImageImportSummary
      issues:
        | []
        | [
            {
              code: 'DATABASE_DISCONNECT_WARNING'
              message: 'Preview rows were committed, but database disconnect failed; verify by an exact rerun.'
            },
          ]
    }
  | {
      success: false
      evidenceScope: 'none'
      status: 'images-persisted-database-rejected'
      counts: RejectedCounts
      imageImport: LegacyPreviewImageImportSummary & { status: 'persisted' }
      issues: [
        {
          code: 'DATABASE_REJECTED_AFTER_IMAGE_PERSISTENCE'
          message: 'Database persistence failed after preview images were persisted; destroy the disposable preview database and preview storage volume before retrying.'
        },
      ]
    }
  | {
      success: false
      evidenceScope: 'none'
      status: 'image-import-rejected-with-residual-files'
      counts: RejectedCounts
      imageImport: LegacyPreviewImageImportSummary & {
        status: 'rejected-with-residual-files'
      }
      issues: [
        {
          code: 'IMAGE_IMPORT_REJECTED_WITH_RESIDUAL_FILES'
          message: 'Image import failed and residual files may remain; the database was not started, and the disposable preview storage volume must be destroyed before retrying.'
        },
      ]
    }
  | {
      success: false
      evidenceScope: 'none'
      status: 'rejected'
      counts: RejectedCounts
      issues: [
        {
          code: 'PREVIEW_IMPORT_REJECTED'
          message: 'Preview import was rejected by a safety or integrity gate.'
        },
      ]
    }

export interface LegacyPreviewImportExecution {
  exitCode: 0 | 1 | 2
  report: LegacyPreviewImportReport
}

const ARGUMENT_FLAGS = new Set([
  '--manifest',
  '--export',
  '--control',
  '--package-root',
  '--snapshot-manifest',
  '--snapshot-policy',
  '--confirm-database',
  '--confirm-marker',
  '--confirm-storage-root',
  '--ack',
])
const SAFE_RELATIVE_JSON_PATH_PATTERN = /^[A-Za-z0-9._/-]+\.json$/u
const PREVIEW_DATABASE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*_preview$/u
const MARKER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{19,127}$/u
const MAXIMUM_MANIFEST_BYTES = 4 * 1024 * 1024
const MAXIMUM_CONTROL_BYTES = 4 * 1024 * 1024
const MAXIMUM_EXPORT_BYTES = 512 * 1024 * 1024
const MAXIMUM_SNAPSHOT_MANIFEST_BYTES = 4 * 1024 * 1024
const MAXIMUM_SNAPSHOT_POLICY_BYTES = 256 * 1024
const MAXIMUM_IMAGE_MANIFEST_BYTES = 4 * 1024 * 1024

const defaultDependencies: LegacyPreviewImportRunnerDependencies = {
  loadValidatedEnvironment: loadValidatedEnvironment,
  readPrivateText: readPrivateLegacyJsonText,
  createSnapshotFilesystem: createLegacySnapshotPackageFilesystem,
  readSnapshotPolicyText: readLegacySnapshotPolicyText,
  createImageFilesystem: (sourceRoot, targetRoot) =>
    createLegacyPreviewImageFilesystemIo({ sourceRoot, targetRoot }),
  createDatabase: createDefaultDatabaseRuntime,
  now: () => new Date(),
}

export function parseLegacyPreviewImportArgs(argv: string[]): LegacyPreviewImportArgs {
  try {
    if (argv.length !== ARGUMENT_FLAGS.size * 2) throw argumentError()
    const values = new Map<string, string>()
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index]
      const value = argv[index + 1]
      if (!flag || !ARGUMENT_FLAGS.has(flag) || !value || values.has(flag)) {
        throw argumentError()
      }
      values.set(flag, value)
    }

    const manifestPath = requiredValue(values, '--manifest')
    const exportPath = requiredValue(values, '--export')
    const controlPath = requiredValue(values, '--control')
    const packageRoot = requiredValue(values, '--package-root')
    const snapshotManifestPath = requiredValue(values, '--snapshot-manifest')
    const snapshotPolicyPath = requiredValue(values, '--snapshot-policy')
    const confirmedDatabaseName = requiredValue(values, '--confirm-database')
    const confirmedMarker = requiredValue(values, '--confirm-marker')
    const confirmedStorageRoot = requiredValue(values, '--confirm-storage-root')
    const acknowledgement = requiredValue(values, '--ack')

    const privatePaths = [manifestPath, exportPath, controlPath]
    if (
      privatePaths.some((path) => !isSafeAbsoluteJsonPath(path)) ||
      new Set(privatePaths).size !== privatePaths.length ||
      !isSafeAbsoluteDirectoryPath(packageRoot) ||
      !isSafeRelativeJsonPath(snapshotManifestPath) ||
      !isSafeAbsoluteJsonPath(snapshotPolicyPath) ||
      !PREVIEW_DATABASE_NAME_PATTERN.test(confirmedDatabaseName) ||
      !MARKER_PATTERN.test(confirmedMarker) ||
      !isSafeAbsoluteDirectoryPath(confirmedStorageRoot) ||
      !hasPreviewPathSegment(confirmedStorageRoot) ||
      acknowledgement !== LEGACY_PREVIEW_ACKNOWLEDGEMENT
    ) {
      throw argumentError()
    }

    return {
      manifestPath,
      exportPath,
      controlPath,
      packageRoot,
      snapshotManifestPath,
      snapshotPolicyPath,
      confirmedDatabaseName,
      confirmedMarker,
      confirmedStorageRoot,
      acknowledgement,
    }
  } catch {
    throw argumentError()
  }
}

export async function executeLegacyPreviewImport(
  argv: string[],
  dependencies: LegacyPreviewImportRunnerDependencies = defaultDependencies
): Promise<LegacyPreviewImportExecution> {
  let args: LegacyPreviewImportArgs
  try {
    args = parseLegacyPreviewImportArgs(argv)
  } catch {
    return createLegacyPreviewImportRejectedExecution()
  }

  let controls: ValidatedLegacyPreviewExecutionControls
  try {
    const environment = await dependencies.loadValidatedEnvironment()
    controls = createPreflightControls(args, environment)
  } catch {
    return createLegacyPreviewImportRejectedExecution()
  }

  let prepared: PreparedLegacyPreviewImport
  let imageImport = createSkippedImageImportSummary()
  try {
    const snapshotFilesystem = await dependencies.createSnapshotFilesystem(args.packageRoot)
    const manifestText = await dependencies.readPrivateText(
      args.manifestPath,
      MAXIMUM_MANIFEST_BYTES
    )
    const exportText = await dependencies.readPrivateText(args.exportPath, MAXIMUM_EXPORT_BYTES)
    const controlText = await dependencies.readPrivateText(args.controlPath, MAXIMUM_CONTROL_BYTES)
    const snapshotManifestText = await snapshotFilesystem.readTextFile(
      args.snapshotManifestPath,
      MAXIMUM_SNAPSHOT_MANIFEST_BYTES
    )
    const snapshotPolicyText = await dependencies.readSnapshotPolicyText(
      args.snapshotPolicyPath,
      MAXIMUM_SNAPSHOT_POLICY_BYTES
    )

    const manifestInput = parseStrictJson(manifestText, MAXIMUM_MANIFEST_BYTES)
    const exportInput = parseStrictJson(exportText, MAXIMUM_EXPORT_BYTES)
    const controlInput = parseStrictJson(controlText, MAXIMUM_CONTROL_BYTES)
    const snapshotManifestInput = parseStrictJson(
      snapshotManifestText,
      MAXIMUM_SNAPSHOT_MANIFEST_BYTES
    )
    const snapshotPolicyInput = parseStrictJson(snapshotPolicyText, MAXIMUM_SNAPSHOT_POLICY_BYTES)
    const snapshotPolicy = parseLegacySnapshotPackagePolicyFile(snapshotPolicyInput)
    if (!snapshotPolicy) return createLegacyPreviewImportRejectedExecution()

    const snapshotValidation = validateLegacySnapshotPackageManifest(
      snapshotManifestInput,
      snapshotPolicy
    )
    if (!snapshotValidation.success) return createLegacyPreviewImportRejectedExecution()
    const snapshotVerification = await verifyLegacySnapshotPackage(
      snapshotValidation.data,
      snapshotPolicy,
      snapshotFilesystem
    )
    if (
      !snapshotVerification.success ||
      snapshotVerification.manifestSha256 !== snapshotValidation.manifestSha256
    ) {
      return createLegacyPreviewImportRejectedExecution()
    }

    const packageExportText = await snapshotFilesystem.readTextFile(
      snapshotValidation.data.canonicalExportInventory.path,
      MAXIMUM_EXPORT_BYTES
    )
    if (
      calculateRawFileSha256(packageExportText) !==
      snapshotValidation.data.canonicalExportInventory.sha256
    ) {
      return createLegacyPreviewImportRejectedExecution()
    }
    const packageExportInput = parseStrictJson(packageExportText, MAXIMUM_EXPORT_BYTES)
    if (
      calculateLegacyCanonicalJsonSha256(exportInput) !==
      calculateLegacyCanonicalJsonSha256(packageExportInput)
    ) {
      return createLegacyPreviewImportRejectedExecution()
    }

    const preparation = prepareLegacyPreviewImport(
      manifestInput,
      packageExportInput,
      controlInput,
      { customerCredential: 'generated-disabled-password-hash' },
      dependencies.now()
    )
    if (!preparation.success) return createLegacyPreviewImportRejectedExecution()
    const approvedSourceTables = deriveLegacyApprovedSourceTables(snapshotValidation.data)
    if (
      !isPreparedBoundToSnapshot(
        preparation.prepared,
        snapshotValidation.data,
        snapshotPolicy,
        snapshotValidation.manifestSha256,
        approvedSourceTables
      )
    ) {
      return createLegacyPreviewImportRejectedExecution()
    }
    prepared = preparation.prepared

    const imageManifestInventory = snapshotValidation.data.publicImageManifest
    let imagePlan: LegacyPreviewImageImportPlan | null = null
    if (!imageManifestInventory) {
      if (hasCastImageReferences(prepared)) {
        return createLegacyPreviewImportRejectedExecution()
      }
    } else {
      const imageManifestText = await snapshotFilesystem.readTextFile(
        imageManifestInventory.path,
        MAXIMUM_IMAGE_MANIFEST_BYTES
      )
      if (calculateRawFileSha256(imageManifestText) !== imageManifestInventory.sha256) {
        return createLegacyPreviewImportRejectedExecution()
      }
      const imageManifestInput = parseStrictJson(imageManifestText, MAXIMUM_IMAGE_MANIFEST_BYTES)
      const imagePreparation = prepareLegacyPreviewImageImport(prepared, imageManifestInput)
      if (!imagePreparation.success) return createLegacyPreviewImportRejectedExecution()

      prepared = imagePreparation.plan.prepared
      imagePlan = imagePreparation.plan
      imageImport = {
        ...createSkippedImageImportSummary(),
        imageManifestSha256: imagePreparation.plan.imageManifestSha256,
        planDigest: imagePreparation.plan.planDigest,
        plannedFileCount: imagePreparation.plan.files.length,
      }
    }

    const imageIo = dependencies.createImageFilesystem(args.packageRoot, controls.storageRoot)
    const imageSafety = {
      runtimeMode: controls.runtimeMode,
      outboundDeliveryMode: controls.outboundDeliveryMode,
      targetRoot: controls.storageRoot,
      expectedTargetRoot: args.confirmedStorageRoot,
      configuredTargetId: controls.configuredMarker,
      confirmedTargetId: args.confirmedMarker,
      acknowledgement: args.acknowledgement,
    }
    if (imagePlan && imagePlan.files.length > 0) {
      const imageReport = await executeLegacyPreviewImageImport(imagePlan, imageSafety, imageIo)
      imageImport = createImageImportSummary(imagePlan, imageReport)
      if (!imageReport.success) {
        return hasResidualImageState(imageReport)
          ? createResidualImageImportRejectedExecution(imageImport)
          : createLegacyPreviewImportRejectedExecution()
      }
    } else {
      const targetPreflight = await preflightLegacyPreviewImageTarget([], imageSafety, imageIo)
      if (!targetPreflight.success) {
        return hasResidualImageIssues(targetPreflight.issues)
          ? createResidualImageImportRejectedExecution(imageImport)
          : createLegacyPreviewImportRejectedExecution()
      }
    }
  } catch {
    return createLegacyPreviewImportRejectedExecution()
  }

  let databaseRuntime: LegacyPreviewDatabaseRuntime | null = null
  let persistenceReport: LegacyPreviewPersistenceReport | null = null
  let persistenceFailed = false
  let disconnectFailed = false
  try {
    databaseRuntime = await dependencies.createDatabase(controls.databaseUrl)
    persistenceReport = await persistLegacyPreviewImport(prepared, controls, {
      persistence: databaseRuntime.persistence,
      credentialFactory: databaseRuntime.credentialFactory,
    })
  } catch {
    persistenceFailed = true
  }

  if (databaseRuntime) {
    try {
      await databaseRuntime.disconnect()
    } catch {
      disconnectFailed = true
    }
  }
  if (persistenceFailed || !persistenceReport) {
    return imageImport.status === 'persisted'
      ? createImagesPersistedDatabaseRejectedExecution(imageImport)
      : createLegacyPreviewImportRejectedExecution()
  }

  const disconnectWarning = {
    code: 'DATABASE_DISCONNECT_WARNING' as const,
    message:
      'Preview rows were committed, but database disconnect failed; verify by an exact rerun.' as const,
  }
  return {
    exitCode: disconnectFailed ? 2 : 0,
    report: {
      success: true,
      evidenceScope: 'canonical-preview-only',
      status: disconnectFailed ? 'persisted-with-disconnect-warning' : 'verified-and-persisted',
      migrationManifestSha256: prepared.migrationManifestSha256,
      canonicalExportSha256: prepared.canonicalExportSha256,
      snapshotManifestSha256: prepared.snapshotManifestSha256,
      canonicalDigest: persistenceReport.canonicalDigest,
      counts: persistenceReport.counts,
      imageImport,
      issues: disconnectFailed ? [disconnectWarning] : [],
    },
  }
}

export function serializeLegacyPreviewImportReport(report: LegacyPreviewImportReport): string {
  return `${JSON.stringify(report)}\n`
}

function calculateRawFileSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function createPreflightControls(
  args: LegacyPreviewImportArgs,
  environment: LegacyPreviewValidatedEnvironment
): ValidatedLegacyPreviewExecutionControls {
  const databaseUrl = environment.databaseUrl
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('Preview database configuration is unavailable.')
  }
  const storageRoot = environment.storageRoot
  if (
    typeof storageRoot !== 'string' ||
    storageRoot !== args.confirmedStorageRoot ||
    !isSafeAbsoluteDirectoryPath(storageRoot) ||
    !hasPreviewPathSegment(storageRoot)
  ) {
    throw new Error('Preview storage configuration is unavailable.')
  }
  const controls: ValidatedLegacyPreviewExecutionControls = {
    runtimeMode: environment.runtimeMode,
    outboundDeliveryMode: environment.outboundDeliveryMode,
    databaseUrl,
    expectedDatabaseName: args.confirmedDatabaseName,
    configuredMarker: environment.configuredMarker,
    confirmedMarker: args.confirmedMarker,
    acknowledgement: args.acknowledgement,
    storageRoot,
  }

  assertLegacyPreviewTarget({
    ...controls,
    databaseMarker: environment.configuredMarker,
    databaseEnvironment: 'staging-preview',
  })
  return controls
}

function isPreparedBoundToSnapshot(
  prepared: PreparedLegacyPreviewImport,
  snapshotManifest: LegacySnapshotPackageManifestV1,
  snapshotPolicy: LegacySnapshotPackagePolicy,
  manifestSha256: string,
  approvedSourceTables: readonly string[]
): boolean {
  let normalizedSnapshotCutoff: string
  try {
    normalizedSnapshotCutoff = new Date(snapshotManifest.cutoffAt).toISOString()
  } catch {
    return false
  }
  return (
    prepared.snapshotManifestSha256 === manifestSha256 &&
    prepared.sourceKey === snapshotManifest.sourceKey &&
    prepared.cutoffAt === normalizedSnapshotCutoff &&
    prepared.extractorVersion === snapshotManifest.extractorVersion &&
    prepared.extractorVersion === snapshotPolicy.expectedExtractorVersion &&
    prepared.transformationPolicyVersion === snapshotPolicy.expectedTransformationPolicyVersion &&
    sameStrings(prepared.approvedSourceTables, approvedSourceTables) &&
    hasExactSnapshotRowCounts(prepared, snapshotManifest, approvedSourceTables)
  )
}

function hasExactSnapshotRowCounts(
  prepared: PreparedLegacyPreviewImport,
  snapshotManifest: LegacySnapshotPackageManifestV1,
  approvedSourceTables: readonly string[]
): boolean {
  const canonicalCounts = new Map<string, number>()
  for (const entity of LEGACY_ENTITY_NAMES) {
    for (const preparedRecord of prepared.records[entity]) {
      const table = preparedRecord.record.source.physicalTable
      canonicalCounts.set(table, (canonicalCounts.get(table) ?? 0) + 1)
    }
  }
  return approvedSourceTables.every((table) => {
    const inventory = snapshotManifest.tables.find(
      ({ origin, physicalTable }) => `${origin}.${physicalTable}` === table
    )
    return inventory !== undefined && canonicalCounts.get(table) === inventory.rowCount
  })
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

async function loadValidatedEnvironment(): Promise<LegacyPreviewValidatedEnvironment> {
  const { env } = await import('@/lib/config/env')
  return {
    runtimeMode: env.runtimeMode,
    outboundDeliveryMode: env.outbound.deliveryMode,
    databaseUrl: env.database.url,
    configuredMarker: env.preview.targetId,
    storageRoot: env.storage.root,
  }
}

async function createDefaultDatabaseRuntime(
  databaseUrl: string
): Promise<LegacyPreviewDatabaseRuntime> {
  const [{ PrismaClient }, adapter] = await Promise.all([
    import('@prisma/client'),
    import('./preview-prisma-adapter'),
  ])
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  return {
    persistence: adapter.createPrismaLegacyPreviewPersistence(client),
    credentialFactory: new adapter.BcryptLegacyPreviewDisabledCredentialFactory(),
    disconnect: () => client.$disconnect(),
  }
}

function requiredValue(values: ReadonlyMap<string, string>, flag: string): string {
  const value = values.get(flag)
  if (!value) throw argumentError()
  return value
}

function isSafeAbsoluteJsonPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 4096 &&
    isAbsolute(path) &&
    !path.includes('\\') &&
    !path.includes('\0') &&
    resolve(path) === path &&
    parse(path).root !== path &&
    path.endsWith('.json')
  )
}

function isSafeAbsoluteDirectoryPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 4096 &&
    isAbsolute(path) &&
    !path.includes('\\') &&
    !path.includes('\0') &&
    resolve(path) === path &&
    parse(path).root !== path
  )
}

function hasPreviewPathSegment(path: string): boolean {
  return path
    .split('/')
    .filter(Boolean)
    .some((segment) => segment.toLowerCase().includes('preview'))
}

function isSafeRelativeJsonPath(path: string): boolean {
  if (
    path.length === 0 ||
    path.length > 512 ||
    isAbsolute(path) ||
    path.includes('\\') ||
    path.includes('\0') ||
    path !== path.normalize('NFKC') ||
    !SAFE_RELATIVE_JSON_PATH_PATTERN.test(path)
  ) {
    return false
  }
  return !path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
}

export function createLegacyPreviewImportRejectedExecution(): LegacyPreviewImportExecution {
  return {
    exitCode: 1,
    report: {
      success: false,
      evidenceScope: 'none',
      status: 'rejected',
      counts: createRejectedCounts(),
      issues: [
        {
          code: 'PREVIEW_IMPORT_REJECTED',
          message: 'Preview import was rejected by a safety or integrity gate.',
        },
      ],
    },
  }
}

function createImagesPersistedDatabaseRejectedExecution(
  imageImport: LegacyPreviewImageImportSummary
): LegacyPreviewImportExecution {
  return {
    exitCode: 2,
    report: {
      success: false,
      evidenceScope: 'none',
      status: 'images-persisted-database-rejected',
      counts: createRejectedCounts(),
      imageImport: { ...imageImport, status: 'persisted' },
      issues: [
        {
          code: 'DATABASE_REJECTED_AFTER_IMAGE_PERSISTENCE',
          message:
            'Database persistence failed after preview images were persisted; destroy the disposable preview database and preview storage volume before retrying.',
        },
      ],
    },
  }
}

function createResidualImageImportRejectedExecution(
  imageImport: LegacyPreviewImageImportSummary
): LegacyPreviewImportExecution {
  return {
    exitCode: 2,
    report: {
      success: false,
      evidenceScope: 'none',
      status: 'image-import-rejected-with-residual-files',
      counts: createRejectedCounts(),
      imageImport: { ...imageImport, status: 'rejected-with-residual-files' },
      issues: [
        {
          code: 'IMAGE_IMPORT_REJECTED_WITH_RESIDUAL_FILES',
          message:
            'Image import failed and residual files may remain; the database was not started, and the disposable preview storage volume must be destroyed before retrying.',
        },
      ],
    },
  }
}

function createSkippedImageImportSummary(): LegacyPreviewImageImportSummary {
  return {
    status: 'skipped-empty',
    imageManifestSha256: null,
    planDigest: null,
    plannedFileCount: 0,
    verifiedByteCount: 0,
    createdFileCount: 0,
    reusedFileCount: 0,
    rolledBackFileCount: 0,
  }
}

function createImageImportSummary(
  plan: LegacyPreviewImageImportPlan,
  report: LegacyPreviewImageImportReport
): LegacyPreviewImageImportSummary {
  return {
    status: report.success ? 'persisted' : 'rejected-with-residual-files',
    imageManifestSha256: plan.imageManifestSha256,
    planDigest: plan.planDigest,
    plannedFileCount: report.plannedFileCount,
    verifiedByteCount: report.verifiedByteCount,
    createdFileCount: report.createdFileCount,
    reusedFileCount: report.reusedFileCount,
    rolledBackFileCount: report.rolledBackFileCount,
  }
}

function hasResidualImageState(report: LegacyPreviewImageImportReport): boolean {
  return report.createdFileCount > 0 || hasResidualImageIssues(report.issues)
}

function hasResidualImageIssues(issues: LegacyPreviewImageImportReport['issues']): boolean {
  const residualIssueCodes = new Set<LegacyPreviewImageImportReport['issues'][number]['code']>([
    'ROLLBACK_FAILED',
    'TARGET_CONFLICT',
    'TARGET_FILE_NOT_REGULAR',
    'TARGET_FILE_SYMLINK',
    'TARGET_INVENTORY_CONFLICT',
    'TARGET_INVENTORY_INSPECTION_FAILED',
    'TARGET_INSPECTION_FAILED',
  ])
  return issues.some(({ code }) => residualIssueCodes.has(code))
}

function hasCastImageReferences(prepared: PreparedLegacyPreviewImport): boolean {
  return prepared.records.casts.some(
    ({ record }) => record.image !== null || record.images.length > 0
  )
}

function createRejectedCounts(): RejectedCounts {
  const entityCounts = Object.fromEntries(
    LEGACY_ENTITY_NAMES.map((entity) => [entity, 0])
  ) as Record<LegacyEntityName, 0>
  return { ...entityCounts, mappings: 0 }
}

function argumentError(): Error {
  return new Error('Preview import arguments were rejected.')
}
