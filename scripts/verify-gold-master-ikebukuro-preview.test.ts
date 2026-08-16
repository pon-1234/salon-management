/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md V5 non-writing artifact verification command
 * @related_to   verify-gold-master-ikebukuro-preview.ts writes owner-only redacted evidence
 * @known_issues Uses injected artifact verification and never connects to a database
 */
import { mkdtemp, mkdir, lstat, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GoldMasterPreviewVerificationControl } from '@/lib/preview-uat/gold-master-verification'
import { PREVIEW_UAT_EMPTY_TABLES } from '@/lib/preview-uat/setup'
import {
  GOLD_MASTER_PREVIEW_CONTROL_ACKNOWLEDGEMENT,
  createGoldMasterPreviewVerifierFileIo,
  runGoldMasterPreviewVerification,
} from './verify-gold-master-ikebukuro-preview'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

function control(suffix = 'a'): GoldMasterPreviewVerificationControl {
  const models = Object.fromEntries(
    PREVIEW_UAT_EMPTY_TABLES.map((model) => [
      model,
      { count: 0, fieldCount: 1, canonicalSha256: '7'.repeat(64) },
    ])
  ) as GoldMasterPreviewVerificationControl['models']

  return {
    version: 1,
    evidenceScope: 'ikebukuro-preview-artifact',
    snapshot: {
      schemaVersion: 4,
      sha256: suffix.repeat(64),
      cutoffAt: '2026-08-14T10:31:10.000Z',
      scheduleFrom: '2026-08-01',
      scheduleTo: '2026-09-30',
      reservationFrom: '2026-01-01',
      sourceRowCounts: { customers: 1 },
    },
    images: {
      manifestVersion: 1,
      manifestSha256: 'b'.repeat(64),
      fileCount: 0,
      byteCount: 0,
      inventorySha256: 'c'.repeat(64),
      canonicalSha256: 'd'.repeat(64),
    },
    migrations: { count: 0, canonicalSha256: 'e'.repeat(64), entries: [] },
    models,
    fixtureCanonicalSha256: 'f'.repeat(64),
    aggregates: {
      customers: {
        count: 0,
        active: 0,
        blocked: 0,
        pending: 0,
        withdrawn: 0,
        unknown: 0,
        regularStage: 0,
        silverStage: 0,
        goldStage: 0,
        platinumStage: 0,
        godStage: 0,
        regularMember: 0,
        vipMember: 0,
        points: 0,
        lastLogin: 0,
        lastVisit: 0,
        emailVerified: 0,
        smsEnabled: 0,
        emailNotificationEnabled: 0,
        distinctPhones: 0,
        distinctEmails: 0,
      },
      reservations: {
        count: 0,
        completed: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        settlementPending: 0,
        cash: 0,
        creditCard: 0,
        paymentReference: 0,
        designationNone: 0,
        designationPanel: 0,
        designationRegular: 0,
        price: 0,
        storeRevenue: 0,
        staffRevenue: 0,
        designationFee: 0,
        transportationFee: 0,
        additionalFee: 0,
        hotelExpense: 0,
        discountAmount: 0,
        welfareExpense: 0,
        pointsUsed: 0,
      },
      reservationOptions: { count: 0, price: 0, storeShare: 0, castShare: 0 },
      courses: { count: 0, price: 0, storeShare: 0, castShare: 0 },
      options: { count: 0, price: 0, storeShare: 0, castShare: 0 },
      schedules: { count: 0, available: 0, unavailable: 0 },
      reviews: { count: 0, published: 0 },
    },
  }
}

const snapshotPath = '/private/snapshot.json'
const manifestPath = '/private/images.json'
const imageRoot = '/private/images'

function createArguments(cwd: string): string[] {
  return [
    '--snapshot',
    snapshotPath,
    '--image-manifest',
    manifestPath,
    '--image-source-root',
    imageRoot,
    '--write-control',
    join(cwd, 'migration-data', 'control.json'),
    '--report',
    join(cwd, 'migration-data', 'report.json'),
    '--post-import-sql',
    join(cwd, 'migration-data', 'post-import.sql'),
    '--ack',
    GOLD_MASTER_PREVIEW_CONTROL_ACKNOWLEDGEMENT,
  ]
}

describe('runGoldMasterPreviewVerification', () => {
  it('creates only redacted control, report, and read-only SQL through the injected file boundary', async () => {
    const cwd = '/workspace'
    const writes = new Map<string, string>()
    const writeOutput = vi.fn()
    const writeError = vi.fn()

    await expect(
      runGoldMasterPreviewVerification(createArguments(cwd), cwd, {
        computeControl: vi.fn(async () => control()),
        readControl: vi.fn(),
        writePrivateText: vi.fn(async (path, value) => {
          writes.set(path, value)
        }),
        writeOutput,
        writeError,
      })
    ).resolves.toBe(0)

    expect(writes.has(join(cwd, 'migration-data', 'control.json'))).toBe(true)
    expect(writes.has(join(cwd, 'migration-data', 'report.json'))).toBe(true)
    expect(writes.get(join(cwd, 'migration-data', 'post-import.sql'))).toContain(
      'V5_FULL_DATABASE_RECONCILIATION_OK'
    )
    expect(writeOutput).toHaveBeenCalledWith(
      'Ikebukuro preview artifact verification succeeded; review the redacted report.'
    )
    expect(writeError).not.toHaveBeenCalled()
    expect(JSON.stringify([...writes.values()])).not.toContain('/private')
  })

  it('returns a mismatch without writing post-import SQL when an approved control differs', async () => {
    const cwd = '/workspace'
    const writes = new Map<string, string>()
    const args = createArguments(cwd)
    args[args.indexOf('--write-control')] = '--control'

    await expect(
      runGoldMasterPreviewVerification(args, cwd, {
        computeControl: vi.fn(async () => control('a')),
        readControl: vi.fn(async () => control('9')),
        writePrivateText: vi.fn(async (path, value) => {
          writes.set(path, value)
        }),
        writeOutput: vi.fn(),
        writeError: vi.fn(),
      })
    ).resolves.toBe(2)

    expect(writes.has(join(cwd, 'migration-data', 'report.json'))).toBe(true)
    expect(writes.has(join(cwd, 'migration-data', 'post-import.sql'))).toBe(false)
    expect(writes.get(join(cwd, 'migration-data', 'report.json'))).toContain('CONTROL_MISMATCH')
  })

  it('rejects incomplete arguments before reading artifacts or writing files', async () => {
    const computeControl = vi.fn()
    const writePrivateText = vi.fn()

    await expect(
      runGoldMasterPreviewVerification([], '/workspace', {
        computeControl,
        readControl: vi.fn(),
        writePrivateText,
        writeOutput: vi.fn(),
        writeError: vi.fn(),
      })
    ).resolves.toBe(1)

    expect(computeControl).not.toHaveBeenCalled()
    expect(writePrivateText).not.toHaveBeenCalled()
  })
})

describe('createGoldMasterPreviewVerifierFileIo', () => {
  it('creates output files exclusively with owner-only mode', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'gold-master-verifier-'))
    temporaryRoots.push(cwd)
    const outputDirectory = join(cwd, 'migration-data')
    await mkdir(outputDirectory, { mode: 0o700 })
    const outputPath = join(outputDirectory, 'control.json')
    const io = createGoldMasterPreviewVerifierFileIo(cwd)

    await io.writePrivateText(outputPath, '{"redacted":true}\n')

    expect((await lstat(outputPath)).mode & 0o777).toBe(0o600)
    expect(await readFile(outputPath, 'utf8')).toBe('{"redacted":true}\n')
    await expect(io.writePrivateText(outputPath, '{}\n')).rejects.toThrow()
  })
})
