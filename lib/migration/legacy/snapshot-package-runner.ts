/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package verification CLI
 * @related_to   snapshot-package-fs.ts guards filesystem access; snapshot-package.ts verifies artifacts
 * @known_issues The runner only verifies an offline package and has no database, SSH, or import capability
 */
import { isAbsolute, parse, resolve } from 'node:path'

import {
  createLegacySnapshotPackageFilesystem,
  readLegacySnapshotPolicyText,
  type LegacySnapshotPackageFilesystem,
} from './snapshot-package-fs'
import {
  verifyLegacySnapshotPackage,
  type LegacySnapshotPackagePolicy,
  type LegacySnapshotPackageVerificationResult,
} from './snapshot-package'
import { parseStrictJson } from './strict-json'

export interface LegacySnapshotPackageVerificationArgs {
  packageRoot: string
  manifestPath: string
  policyPath: string
}

export interface LegacySnapshotPackageRunnerDependencies {
  createFilesystem: (rootPath: string) => Promise<LegacySnapshotPackageFilesystem>
  readPolicyText: (policyPath: string, maximumBytes: number) => Promise<string>
}

export interface LegacySnapshotPackageRunnerExecution {
  exitCode: 0 | 1
  report: LegacySnapshotPackageVerificationResult
}

const ARGUMENT_FLAGS = new Set(['--package-root', '--manifest', '--policy'])
const POLICY_FIELDS = new Set([
  'version',
  'expectedSourceKey',
  'expectedAuthoritativeOrigin',
  'expectedExtractorVersion',
  'expectedTransformationPolicyVersion',
  'requiredTables',
  'expectedSchemaOnlySqlSha256',
  'expectedStaticCatalogSha256',
])
const POLICY_TABLE_FIELDS = new Set(['origin', 'physicalTable', 'usage'])
const SAFE_RELATIVE_JSON_PATH_PATTERN = /^[A-Za-z0-9._/-]+\.json$/u
const MAXIMUM_MANIFEST_BYTES = 4 * 1024 * 1024
const MAXIMUM_POLICY_BYTES = 256 * 1024

const defaultDependencies: LegacySnapshotPackageRunnerDependencies = {
  createFilesystem: createLegacySnapshotPackageFilesystem,
  readPolicyText: readLegacySnapshotPolicyText,
}

export function parseLegacySnapshotPackageVerificationArgs(
  argv: string[]
): LegacySnapshotPackageVerificationArgs {
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

    const packageRoot = values.get('--package-root')
    const manifestPath = values.get('--manifest')
    const policyPath = values.get('--policy')
    if (!packageRoot || !manifestPath || !policyPath) throw argumentError()
    if (
      !isAbsolute(packageRoot) ||
      packageRoot.includes('\0') ||
      resolve(packageRoot) !== packageRoot ||
      parse(packageRoot).root === packageRoot
    ) {
      throw argumentError()
    }
    if (!isSafeRelativeJsonPath(manifestPath)) throw argumentError()
    if (
      !isAbsolute(policyPath) ||
      policyPath.includes('\0') ||
      policyPath.includes('\\') ||
      resolve(policyPath) !== policyPath ||
      !policyPath.endsWith('.json')
    ) {
      throw argumentError()
    }
    return { packageRoot, manifestPath, policyPath }
  } catch {
    throw argumentError()
  }
}

export async function executeLegacySnapshotPackageVerification(
  argv: string[],
  dependencies: LegacySnapshotPackageRunnerDependencies = defaultDependencies
): Promise<LegacySnapshotPackageRunnerExecution> {
  try {
    const args = parseLegacySnapshotPackageVerificationArgs(argv)
    const filesystem = await dependencies.createFilesystem(args.packageRoot)
    const [manifestText, policyText] = await Promise.all([
      filesystem.readTextFile(args.manifestPath, MAXIMUM_MANIFEST_BYTES),
      dependencies.readPolicyText(args.policyPath, MAXIMUM_POLICY_BYTES),
    ])
    const manifestInput = parseStrictJson(manifestText, MAXIMUM_MANIFEST_BYTES)
    const policyInput = parseStrictJson(policyText, MAXIMUM_POLICY_BYTES)
    const policy = parseLegacySnapshotPackagePolicyFile(policyInput)
    if (!policy) return rejectedExecution()

    const report = await verifyLegacySnapshotPackage(manifestInput, policy, filesystem)
    return { exitCode: report.success ? 0 : 1, report }
  } catch {
    return rejectedExecution()
  }
}

export function serializeLegacySnapshotPackageVerificationReport(
  report: LegacySnapshotPackageVerificationResult
): string {
  return `${JSON.stringify(report)}\n`
}

export function parseLegacySnapshotPackagePolicyFile(
  input: unknown
): LegacySnapshotPackagePolicy | null {
  if (!isRecord(input) || !hasExactFields(input, POLICY_FIELDS) || input.version !== 1) {
    return null
  }
  if (
    typeof input.expectedSourceKey !== 'string' ||
    typeof input.expectedAuthoritativeOrigin !== 'string' ||
    typeof input.expectedExtractorVersion !== 'string' ||
    typeof input.expectedTransformationPolicyVersion !== 'string' ||
    typeof input.expectedSchemaOnlySqlSha256 !== 'string' ||
    typeof input.expectedStaticCatalogSha256 !== 'string' ||
    !Array.isArray(input.requiredTables) ||
    input.requiredTables.length === 0
  ) {
    return null
  }

  const requiredTables: LegacySnapshotPackagePolicy['requiredTables'][number][] = []
  const identities = new Set<string>()
  for (const candidate of input.requiredTables) {
    if (
      !isRecord(candidate) ||
      !hasExactFields(candidate, POLICY_TABLE_FIELDS) ||
      typeof candidate.origin !== 'string' ||
      typeof candidate.physicalTable !== 'string' ||
      (candidate.usage !== 'canonical-source' && candidate.usage !== 'reconciliation-only')
    ) {
      return null
    }
    const identity = `${candidate.origin}\0${candidate.physicalTable}`
    if (identities.has(identity)) return null
    identities.add(identity)
    requiredTables.push({
      origin: candidate.origin,
      physicalTable: candidate.physicalTable,
      usage: candidate.usage,
    })
  }

  return {
    expectedSourceKey: input.expectedSourceKey,
    expectedAuthoritativeOrigin: input.expectedAuthoritativeOrigin,
    expectedExtractorVersion: input.expectedExtractorVersion,
    expectedTransformationPolicyVersion: input.expectedTransformationPolicyVersion,
    requiredTables,
    expectedSchemaOnlySqlSha256: input.expectedSchemaOnlySqlSha256,
    expectedStaticCatalogSha256: input.expectedStaticCatalogSha256,
  }
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

function hasExactFields(input: Record<string, unknown>, supported: ReadonlySet<string>): boolean {
  const fields = Object.keys(input)
  return fields.length === supported.size && fields.every((field) => supported.has(field))
}

function rejectedExecution(): LegacySnapshotPackageRunnerExecution {
  return {
    exitCode: 1,
    report: {
      success: false,
      evidenceScope: 'none',
      checksumStatus: 'not-checked',
      verifiedFileCount: 0,
      verifiedTableCount: 0,
      verifiedRowCount: 0,
      verifiedByteCount: 0,
      issues: [
        {
          code: 'MANIFEST_REJECTED',
          message: 'Snapshot verification inputs were rejected.',
        },
      ],
    },
  }
}

function argumentError(): Error {
  return new Error('Snapshot verification arguments were rejected.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
