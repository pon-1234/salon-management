/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline file workflow
 * @related_to   dry-run.ts and scripts/legacy-migration-dry-run.ts
 * @known_issues The runner transforms canonical JSON exports; MySQL extraction is separate
 */
import { chmod, lstat, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createLegacyMigrationDryRunFileIo,
  executeLegacyMigrationFileDryRun,
  parseLegacyMigrationCliArgs,
} from './file-runner'

const manifest = JSON.stringify({
  version: 1,
  sources: [
    {
      sourceKey: 'gold-main',
      utcOffsetMinutes: 540,
      storeMappings: [
        {
          legacyStoreId: 'legacy-gold',
          targetStoreId: 'gold',
          targetStoreSlug: 'gold',
          targetStoreTimezone: 'Asia/Tokyo',
        },
      ],
    },
  ],
})

const exportJson = JSON.stringify({
  sourceKey: 'gold-main',
  rows: {
    stores: [],
    courses: [],
    casts: [],
    customers: [],
    reservations: [],
    castSchedules: [],
    pointHistories: [],
  },
})

describe('legacy migration file dry-run', () => {
  it('requires explicit input and output arguments', () => {
    expect(() => parseLegacyMigrationCliArgs(['--manifest', 'manifest.json'])).toThrowError(
      'Legacy migration dry-run arguments were rejected.'
    )
  })

  it('rejects sensitive and report outputs outside their ignored workspace directories', () => {
    expect(() =>
      parseLegacyMigrationCliArgs([
        '--manifest',
        'manifest.json',
        '--export',
        'export.json',
        '--output',
        'unsafe-output.json',
        '--report',
        'migration-reports/report.json',
      ])
    ).toThrowError('Legacy migration dry-run arguments were rejected.')
  })

  it('writes transformed PII only to the private output and a redacted report separately', async () => {
    const writes = new Map<string, string>()
    const io = {
      readPrivateText: vi.fn(async (path: string) => {
        if (path.endsWith('manifest.json')) return manifest
        if (path.endsWith('export.json')) return exportJson
        throw new Error('unexpected path')
      }),
      writePrivateText: vi.fn(async (path: string, value: string) => {
        writes.set(path, value)
      }),
    }

    const result = await executeLegacyMigrationFileDryRun(
      [
        '--manifest',
        'manifest.json',
        '--export',
        'export.json',
        '--output',
        'migration-data/intermediate.json',
        '--report',
        'migration-reports/report.json',
      ],
      '/workspace',
      io
    )

    expect(result.exitCode).toBe(2)
    expect(writes.has('/workspace/migration-data/intermediate.json')).toBe(true)
    expect(writes.has('/workspace/migration-reports/report.json')).toBe(true)
    const report = JSON.parse(writes.get('/workspace/migration-reports/report.json') ?? '{}')
    expect(report).toEqual(
      expect.objectContaining({ readyForPersistence: false, persistenceAdapterReady: false })
    )
    expect(report).not.toHaveProperty('result')
    expect(report).not.toHaveProperty('records')
  })

  it('rejects duplicate JSON keys before transformation without leaking parser input', async () => {
    const privateMarker = 'password-secret-duplicate-key'
    const io = {
      readPrivateText: vi.fn(async (path: string) =>
        path.endsWith('manifest.json')
          ? `{"version":1,"version":2,"${privateMarker}":true}`
          : exportJson
      ),
      writePrivateText: vi.fn(),
    }

    const result = await executeLegacyMigrationFileDryRun(validArguments(), '/workspace', io)

    expect(result).toEqual({
      exitCode: 1,
      readyForPersistence: false,
      message: 'Legacy migration dry-run input was rejected.',
    })
    expect(JSON.stringify(result)).not.toContain(privateMarker)
    expect(io.writePrivateText).not.toHaveBeenCalled()
  })

  it('redacts raw private input and output adapter errors', async () => {
    const inputIo = {
      readPrivateText: vi
        .fn()
        .mockRejectedValue(new Error('/private/password-customer-export.json: permission denied')),
      writePrivateText: vi.fn(),
    }
    const inputResult = await executeLegacyMigrationFileDryRun(
      validArguments(),
      '/workspace',
      inputIo
    )

    expect(inputResult.message).toBe('Legacy migration dry-run input was rejected.')
    expect(JSON.stringify(inputResult)).not.toContain('/private')
    expect(JSON.stringify(inputResult)).not.toContain('password-customer')

    const outputIo = {
      readPrivateText: vi.fn(async (path: string) =>
        path.endsWith('manifest.json') ? manifest : exportJson
      ),
      writePrivateText: vi
        .fn()
        .mockRejectedValue(new Error('/private/migration-data/customer-secret.json: EEXIST')),
    }
    const outputResult = await executeLegacyMigrationFileDryRun(
      validArguments(),
      '/workspace',
      outputIo
    )

    expect(outputResult.message).toBe('Legacy migration dry-run output was rejected.')
    expect(JSON.stringify(outputResult)).not.toContain('/private')
    expect(JSON.stringify(outputResult)).not.toContain('customer-secret')
  })

  it('rejects arbitrary argument text without echoing it', () => {
    const privateMarker = '--password-secret-path'

    expect(() => parseLegacyMigrationCliArgs([privateMarker, '/private/value'])).toThrow(
      'Legacy migration dry-run arguments were rejected.'
    )
    try {
      parseLegacyMigrationCliArgs([privateMarker, '/private/value'])
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(privateMarker)
      expect(JSON.stringify(error)).not.toContain('/private/value')
    }
  })
})

describe('legacy migration dry-run filesystem adapter', () => {
  let temporaryRoot = ''

  afterEach(async () => {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true })
    temporaryRoot = ''
  })

  it('creates only owner-private output directories and exclusive JSON files', async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'legacy-dry-run-io-test-'))
    await chmod(temporaryRoot, 0o700)
    const io = createLegacyMigrationDryRunFileIo(temporaryRoot)
    const outputPath = join(temporaryRoot, 'migration-data', 'intermediate.json')

    await io.writePrivateText(outputPath, '{"safe":true}\n')

    const directoryStats = await lstat(join(temporaryRoot, 'migration-data'))
    const fileStats = await lstat(outputPath)
    expect(directoryStats.mode & 0o777).toBe(0o700)
    expect(fileStats.mode & 0o777).toBe(0o600)
    await expect(io.writePrivateText(outputPath, '{}\n')).rejects.toThrow(
      'Private migration dry-run output was rejected.'
    )
  })

  it('rejects permissive private inputs through the default guarded reader', async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'legacy-dry-run-io-test-'))
    const inputPath = join(temporaryRoot, 'customer-password-export.json')
    await writeFile(inputPath, '{}\n', { mode: 0o644 })
    await chmod(inputPath, 0o644)
    const io = createLegacyMigrationDryRunFileIo(temporaryRoot)

    const error = await captureError(() => io.readPrivateText(inputPath, 1024))

    expect(error.message).toBe('Private migration JSON access was rejected.')
    expect(JSON.stringify(error)).not.toContain(inputPath)
  })

  it('rejects a symbolic-link output directory without writing through it', async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'legacy-dry-run-io-test-'))
    const outsideDirectory = join(temporaryRoot, 'outside')
    await mkdir(outsideDirectory, { mode: 0o700 })
    await chmod(outsideDirectory, 0o700)
    await symlink(outsideDirectory, join(temporaryRoot, 'migration-reports'))
    const io = createLegacyMigrationDryRunFileIo(temporaryRoot)

    const error = await captureError(() =>
      io.writePrivateText(join(temporaryRoot, 'migration-reports', 'report.json'), '{}\n')
    )

    expect(error.message).toBe('Private migration dry-run output was rejected.')
    expect(JSON.stringify(error)).not.toContain(outsideDirectory)
    await expect(lstat(join(outsideDirectory, 'report.json'))).rejects.toThrow()
  })
})

function validArguments(): string[] {
  return [
    '--manifest',
    'manifest.json',
    '--export',
    'export.json',
    '--output',
    'migration-data/intermediate.json',
    '--report',
    'migration-reports/report.json',
  ]
}

async function captureError(operation: () => Promise<unknown>): Promise<Error> {
  try {
    await operation()
  } catch (error) {
    if (error instanceof Error) return error
  }
  throw new Error('Expected operation to reject.')
}
