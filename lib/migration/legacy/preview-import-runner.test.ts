/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md guarded disposable preview import command
 * @related_to   preview-prepare.ts, preview-persistence.ts, and snapshot-package.ts form its gates
 * @known_issues Tests use in-memory ports only and never instantiate Prisma or connect to a database
 */
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  executeLegacyPreviewImport,
  parseLegacyPreviewImportArgs,
  serializeLegacyPreviewImportReport,
  type LegacyPreviewDatabaseRuntime,
  type LegacyPreviewImportRunnerDependencies,
} from './preview-import-runner'
import {
  type LegacyPreviewMapping,
  type LegacyPreviewStoredRun,
  type LegacyPreviewStoredTarget,
  type LegacyPreviewStoreProjection,
  type LegacyPreviewTargetRow,
  type LegacyPreviewTransactionPort,
} from './preview-persistence'
import {
  calculateLegacyCanonicalJsonSha256,
  calculateLegacyMigrationManifestSha256,
} from './preview-prepare'
import type { LegacyPreviewImageImportIo } from './preview-image-import'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT } from './preview-safety'
import type { LegacySnapshotPackageFilesystem } from './snapshot-package-fs'
import { validateLegacySnapshotPackageManifest } from './snapshot-package'

const marker = '01JZ8QFQ05J6JNRQY3YW7M0V55'
const databaseUrl = 'postgresql://preview:private-password@127.0.0.1:5432/salon_qa_preview'
const storageRoot = '/srv/salon-preview-storage/images'
const inputPaths = {
  manifest: '/private/migration/manifest.json',
  export: '/private/migration/canonical-export.json',
  control: '/private/migration/control.json',
}
const validArgv = [
  '--manifest',
  inputPaths.manifest,
  '--export',
  inputPaths.export,
  '--control',
  inputPaths.control,
  '--package-root',
  '/private/snapshot-package',
  '--snapshot-manifest',
  'snapshot-package.manifest.json',
  '--snapshot-policy',
  '/approved/snapshot-policy.json',
  '--confirm-database',
  'salon_qa_preview',
  '--confirm-marker',
  marker,
  '--confirm-storage-root',
  storageRoot,
  '--ack',
  LEGACY_PREVIEW_ACKNOWLEDGEMENT,
]

describe('parseLegacyPreviewImportArgs', () => {
  it('requires explicit private inputs, verified snapshot inputs, and separate operator confirmation', () => {
    expect(parseLegacyPreviewImportArgs(validArgv)).toEqual({
      manifestPath: inputPaths.manifest,
      exportPath: inputPaths.export,
      controlPath: inputPaths.control,
      packageRoot: '/private/snapshot-package',
      snapshotManifestPath: 'snapshot-package.manifest.json',
      snapshotPolicyPath: '/approved/snapshot-policy.json',
      confirmedDatabaseName: 'salon_qa_preview',
      confirmedMarker: marker,
      confirmedStorageRoot: storageRoot,
      acknowledgement: LEGACY_PREVIEW_ACKNOWLEDGEMENT,
    })
  })

  const rejectedArguments: string[][] = [
    [],
    [...validArgv, '--database-url', databaseUrl],
    [...validArgv, '--ssh-host', 'production.example.test'],
    [...validArgv, '--manifest', '/private/other.json'],
    replaceArgument(validArgv, '--manifest', 'relative.json'),
    replaceArgument(validArgv, '--export', inputPaths.manifest),
    replaceArgument(validArgv, '--package-root', '/'),
    replaceArgument(validArgv, '--snapshot-manifest', '../snapshot.json'),
    replaceArgument(validArgv, '--snapshot-policy', 'relative-policy.json'),
    replaceArgument(validArgv, '--confirm-database', 'salon_production'),
    replaceArgument(validArgv, '--confirm-marker', 'weak'),
    replaceArgument(validArgv, '--confirm-storage-root', 'relative-preview-storage'),
    replaceArgument(validArgv, '--confirm-storage-root', '/srv/salon-storage/images'),
    replaceArgument(validArgv, '--ack', 'IMPORT_ANY_DATABASE'),
  ]

  it.each(rejectedArguments.map((argv) => [argv] as const))(
    'rejects incomplete, credential-bearing, ambiguous, or unsafe arguments without echoing values',
    (argv) => {
      expect(() => parseLegacyPreviewImportArgs(argv)).toThrow(
        'Preview import arguments were rejected.'
      )
    }
  )
})

describe('executeLegacyPreviewImport', () => {
  it('verifies the package, binds its provenance, prepares rows, and persists through one guarded runtime', async () => {
    const fixture = createFixture()
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(0)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: true,
        evidenceScope: 'canonical-preview-only',
        status: 'verified-and-persisted',
        migrationManifestSha256: fixture.control.migrationManifestSha256,
        canonicalExportSha256: fixture.control.canonicalExportSha256,
        snapshotManifestSha256: fixture.control.snapshotManifestSha256,
        canonicalDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
        counts: expect.objectContaining({
          stores: { created: 0, reused: 0, verified: 1 },
          mappings: { created: 1, reused: 0 },
        }),
        imageImport: {
          status: 'skipped-empty',
          imageManifestSha256: null,
          planDigest: null,
          plannedFileCount: 0,
          verifiedByteCount: 0,
          createdFileCount: 0,
          reusedFileCount: 0,
          rolledBackFileCount: 0,
        },
        issues: [],
      })
    )
    expect(dependencies.createDatabase).toHaveBeenCalledOnce()
    expect(dependencies.createDatabase).toHaveBeenCalledWith(databaseUrl)
    expect(dependencies.databaseRuntime.disconnect).toHaveBeenCalledOnce()
    expect(dependencies.createImageFilesystem).toHaveBeenCalledWith(
      '/private/snapshot-package',
      storageRoot
    )
    expect(dependencies.imageIo.inspectTargetIdentity).toHaveBeenCalledOnce()
    expect(dependencies.imageIo.inspectTargetInventory).toHaveBeenCalledOnce()

    const output = serializeLegacyPreviewImportReport(execution.report)
    expect(output.trim().split('\n')).toHaveLength(1)
    expect(output).not.toContain('Gold Salon')
    expect(output).not.toContain('legacy-main')
    expect(output).not.toContain(marker)
    expect(output).not.toContain('private-password')
    expect(output).not.toContain('/private/')
    expect(output).not.toContain('legacy_main.shops')
  })

  it('strictly verifies and copies every referenced image before creating the database', async () => {
    const fixture = createFixture({ withImages: true })
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(0)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: true,
        status: 'verified-and-persisted',
        imageImport: {
          status: 'persisted',
          imageManifestSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
          planDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
          plannedFileCount: 1,
          verifiedByteCount: 10,
          createdFileCount: 1,
          reusedFileCount: 0,
          rolledBackFileCount: 0,
        },
      })
    )
    expect(dependencies.createImageFilesystem).toHaveBeenCalledWith(
      '/private/snapshot-package',
      storageRoot
    )
    expect(dependencies.imageIo.inspectSource).toHaveBeenCalledOnce()
    expect(dependencies.imageIo.copyExclusive).toHaveBeenCalledOnce()
    expect(vi.mocked(dependencies.imageIo.copyExclusive).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(dependencies.createDatabase).mock.invocationCallOrder[0]
    )

    const output = serializeLegacyPreviewImportReport(execution.report)
    expect(output).not.toContain('/srv/')
    expect(output).not.toContain('/private/')
    expect(output).not.toContain('legacy-main')
    expect(output).not.toContain('legacy_main.shops')
  })

  it('rejects cast image references when the verified package has no public image manifest', async () => {
    const fixture = createFixture({ withImages: true, omitImageManifest: true })
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createImageFilesystem).not.toHaveBeenCalled()
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('validates and rejects a dirty preview volume even when the snapshot has no images', async () => {
    const fixture = createFixture()
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.imageIo.inspectTargetInventory).mockResolvedValue([
      'stale/private-image.jpg',
    ])

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(2)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: false,
        status: 'image-import-rejected-with-residual-files',
        imageImport: expect.objectContaining({
          status: 'rejected-with-residual-files',
          plannedFileCount: 0,
        }),
      })
    )
    expect(dependencies.imageIo.inspectTargetIdentity).toHaveBeenCalledOnce()
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
    expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('private-image.jpg')
  })

  it('rejects an unverified preview image target identity even when the snapshot has no images', async () => {
    const fixture = createFixture()
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.imageIo.inspectTargetIdentity).mockResolvedValue({
      realRoot: storageRoot,
      environment: 'production',
      targetId: marker,
    })

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.imageIo.inspectTargetIdentity).toHaveBeenCalledOnce()
    expect(dependencies.imageIo.inspectTargetInventory).not.toHaveBeenCalled()
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('rejects duplicate keys in the verified public image manifest before copying or creating the database', async () => {
    const fixture = createFixture({
      withImages: true,
      rawImageManifestText: '{"version":1,"version":1}',
    })
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createImageFilesystem).not.toHaveBeenCalled()
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('does not create the database when image source preflight fails', async () => {
    const fixture = createFixture({ withImages: true })
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.imageIo.inspectSource).mockRejectedValue(
      new Error('/private/snapshot-package/public/cast-7.jpg could not be read')
    )

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.imageIo.copyExclusive).not.toHaveBeenCalled()
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
    expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('/private/')
  })

  it('reports residual image state and never starts the database when image rollback fails', async () => {
    const fixture = createFixture({ withImages: true })
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.imageIo.copyExclusive).mockImplementation(async (file) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: file.sizeBytes,
      sha256: 'f'.repeat(64),
      mediaType: file.mediaType,
      width: file.width,
      height: file.height,
    }))
    vi.mocked(dependencies.imageIo.rollbackCreated).mockRejectedValue(
      new Error('/srv/salon-preview-storage/images could not roll back')
    )

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(2)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: false,
        status: 'image-import-rejected-with-residual-files',
        imageImport: expect.objectContaining({
          status: 'rejected-with-residual-files',
          createdFileCount: 1,
          rolledBackFileCount: 0,
        }),
        issues: [expect.objectContaining({ code: 'IMAGE_IMPORT_REJECTED_WITH_RESIDUAL_FILES' })],
      })
    )
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
    expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('/srv/')
  })

  it('requires volume destruction when a failed copy may have left its current target behind', async () => {
    const fixture = createFixture({ withImages: true })
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.imageIo.copyExclusive).mockRejectedValue(
      new Error('/srv/salon-preview-storage/images partial copy cleanup failed')
    )
    vi.mocked(dependencies.imageIo.inspectTarget)
      .mockResolvedValueOnce(null)
      .mockImplementation(async (file) => ({
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        mediaType: file.mediaType,
        width: file.width,
        height: file.height,
      }))

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(2)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: false,
        status: 'image-import-rejected-with-residual-files',
        imageImport: expect.objectContaining({ status: 'rejected-with-residual-files' }),
      })
    )
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
    expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('/srv/')
  })

  it.each([
    ['conflicting', 'conflict'],
    ['non-regular', 'non-regular'],
    ['symlinked', 'symlink'],
    ['uninspectable', 'inspection-error'],
  ] as const)(
    'requires volume destruction when a planned target is already %s',
    async (_description, targetState) => {
      const fixture = createFixture({ withImages: true })
      const dependencies = createDependencies(fixture)
      if (targetState === 'inspection-error') {
        vi.mocked(dependencies.imageIo.inspectTarget).mockRejectedValue(
          new Error('/srv/salon-preview-storage/images could not be inspected')
        )
      } else {
        vi.mocked(dependencies.imageIo.inspectTarget).mockImplementation(async (file) => ({
          isFile: targetState !== 'non-regular',
          isSymbolicLink: targetState === 'symlink',
          sizeBytes: file.sizeBytes,
          sha256: targetState === 'conflict' ? 'f'.repeat(64) : file.sha256,
          mediaType: file.mediaType,
          width: file.width,
          height: file.height,
        }))
      }

      const execution = await executeLegacyPreviewImport(validArgv, dependencies)

      expect(execution.exitCode).toBe(2)
      expect(execution.report).toEqual(
        expect.objectContaining({
          success: false,
          status: 'image-import-rejected-with-residual-files',
          imageImport: expect.objectContaining({ status: 'rejected-with-residual-files' }),
        })
      )
      expect(dependencies.imageIo.copyExclusive).not.toHaveBeenCalled()
      expect(dependencies.createDatabase).not.toHaveBeenCalled()
      expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('/srv/')
    }
  )

  it('reports persistent images and explicit destruction guidance when database creation fails afterward', async () => {
    const fixture = createFixture({ withImages: true })
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.createDatabase).mockRejectedValue(
      new Error(`${databaseUrl} could not connect after image copy`)
    )

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(2)
    expect(execution.report).toEqual({
      success: false,
      evidenceScope: 'none',
      status: 'images-persisted-database-rejected',
      counts: {
        stores: 0,
        courses: 0,
        casts: 0,
        customers: 0,
        reservations: 0,
        castSchedules: 0,
        pointHistories: 0,
        mappings: 0,
      },
      imageImport: {
        status: 'persisted',
        imageManifestSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        planDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
        plannedFileCount: 1,
        verifiedByteCount: 10,
        createdFileCount: 1,
        reusedFileCount: 0,
        rolledBackFileCount: 0,
      },
      issues: [
        {
          code: 'DATABASE_REJECTED_AFTER_IMAGE_PERSISTENCE',
          message:
            'Database persistence failed after preview images were persisted; destroy the disposable preview database and preview storage volume before retrying.',
        },
      ],
    })
    expect(dependencies.imageIo.copyExclusive).toHaveBeenCalledOnce()
    expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('private-password')
  })

  it.each([
    ['runtime mode', { runtimeMode: 'live' }],
    ['outbound mode', { outboundDeliveryMode: 'provider' }],
    [
      'database URL',
      { databaseUrl: 'postgresql://preview:secret@127.0.0.1:5432/salon_production' },
    ],
    ['configured marker', { configuredMarker: 'DIFFERENT_PREVIEW_MARKER_12345' }],
    ['storage root', { storageRoot: '/srv/salon-storage/images' }],
    ['different preview storage root', { storageRoot: '/srv/other-preview-storage/images' }],
  ])(
    'rejects an unsafe %s before reading private files or creating Prisma',
    async (_, envOverride) => {
      const dependencies = createDependencies(createFixture(), { envOverride })

      const execution = await executeLegacyPreviewImport(validArgv, dependencies)

      expectRejected(execution)
      expect(dependencies.readPrivateText).not.toHaveBeenCalled()
      expect(dependencies.createSnapshotFilesystem).not.toHaveBeenCalled()
      expect(dependencies.createDatabase).not.toHaveBeenCalled()
    }
  )

  it('rejects invalid CLI arguments before loading environment configuration or creating Prisma', async () => {
    const dependencies = createDependencies(createFixture())

    const execution = await executeLegacyPreviewImport(
      [...validArgv, '--ssh-key', '/private/id_ed25519'],
      dependencies
    )

    expectRejected(execution)
    expect(dependencies.loadValidatedEnvironment).not.toHaveBeenCalled()
    expect(dependencies.readPrivateText).not.toHaveBeenCalled()
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it.each(['manifest', 'export', 'control'] as const)(
    'rejects duplicate keys in strict %s JSON before creating Prisma',
    async (inputName) => {
      const fixture = createFixture()
      const dependencies = createDependencies(fixture)
      const selectedPath = inputPaths[inputName]
      vi.mocked(dependencies.readPrivateText).mockImplementation(async (path) =>
        path === selectedPath ? '{"version":1,"version":1}' : fixture.privateTextByPath[path]
      )

      const execution = await executeLegacyPreviewImport(validArgv, dependencies)

      expectRejected(execution)
      expect(dependencies.createDatabase).not.toHaveBeenCalled()
    }
  )

  it('rejects a failed snapshot artifact verification before creating Prisma', async () => {
    const dependencies = createDependencies(createFixture())
    vi.mocked(dependencies.snapshotFilesystem.inspectFile).mockResolvedValue({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: 10,
      sha256: 'f'.repeat(64),
      rowCount: 1,
    })

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('rejects a self-asserted snapshot manifest digest before creating Prisma', async () => {
    const fixture = createFixture({ controlSnapshotSha256: 'f'.repeat(64) })
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('rejects a wrong canonical export with matching table names and row counts before creating Prisma', async () => {
    const fixture = createFixture()
    const wrongExport = structuredClone(fixture.export)
    wrongExport.rows.stores[0].display_name = 'Wrong Same-Count Salon'
    fixture.control.canonicalExportSha256 = calculateLegacyCanonicalJsonSha256(wrongExport)
    fixture.privateTextByPath[inputPaths.export] = JSON.stringify(wrongExport)
    fixture.privateTextByPath[inputPaths.control] = JSON.stringify(fixture.control)
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('rejects when the verified package export bytes change before the authoritative read', async () => {
    const fixture = createFixture()
    const dependencies = createDependencies(fixture)
    vi.mocked(dependencies.snapshotFilesystem.readTextFile).mockImplementation(async (path) =>
      path === fixture.snapshotManifest.canonicalExportInventory.path
        ? `${JSON.stringify(fixture.export)}\n`
        : JSON.stringify(fixture.snapshotManifest)
    )

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('accepts a semantically identical private export copy with different JSON formatting', async () => {
    const fixture = createFixture()
    fixture.privateTextByPath[inputPaths.export] = JSON.stringify(fixture.export, null, 2)
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(0)
    expect(dependencies.createDatabase).toHaveBeenCalledOnce()
  })

  it('rejects a self-asserted approved table list that differs from the verified origin-qualified package', async () => {
    const fixture = createFixture({ snapshotOrigin: 'different_origin' })
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('rejects source, cutoff, or extractor provenance drift before creating Prisma', async () => {
    const fixtures = [
      createFixture({ snapshotSourceKey: 'another-source' }),
      createFixture({ snapshotCutoffAt: '2025-07-11T09:01:00+09:00' }),
      createFixture({ snapshotExtractorVersion: '2.0.0' }),
    ]

    for (const fixture of fixtures) {
      const dependencies = createDependencies(fixture)
      const execution = await executeLegacyPreviewImport(validArgv, dependencies)
      expectRejected(execution)
      expect(dependencies.createDatabase).not.toHaveBeenCalled()
    }
  })

  it('rejects a transformation policy version not pinned by the snapshot policy', async () => {
    const fixture = createFixture()
    fixture.snapshotPolicy.expectedTransformationPolicyVersion = 'different-approved-policy'
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('rejects preparation blockers before creating Prisma', async () => {
    const fixture = createFixture()
    fixture.export.rows.stores[0].name = ''
    fixture.control.canonicalExportSha256 = calculateLegacyCanonicalJsonSha256(fixture.export)
    fixture.privateTextByPath[inputPaths.export] = JSON.stringify(fixture.export)
    fixture.privateTextByPath[inputPaths.control] = JSON.stringify(fixture.control)
    const dependencies = createDependencies(fixture)

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expectRejected(execution)
    expect(dependencies.createDatabase).not.toHaveBeenCalled()
  })

  it('redacts database creation and persistence errors, and disconnects an opened runtime', async () => {
    const creationDependencies = createDependencies(createFixture())
    vi.mocked(creationDependencies.createDatabase).mockRejectedValue(
      new Error(`${databaseUrl} could not connect`)
    )

    const creationFailure = await executeLegacyPreviewImport(validArgv, creationDependencies)

    expectRejected(creationFailure)
    expect(serializeLegacyPreviewImportReport(creationFailure.report)).not.toContain(
      'private-password'
    )

    const persistenceDependencies = createDependencies(createFixture())
    vi.mocked(
      persistenceDependencies.databaseRuntime.persistence.withSerializableTransaction
    ).mockRejectedValue(new Error('Gold Salon user@example.com failed'))

    const persistenceFailure = await executeLegacyPreviewImport(validArgv, persistenceDependencies)
    const output = serializeLegacyPreviewImportReport(persistenceFailure.report)

    expectRejected(persistenceFailure)
    expect(persistenceDependencies.databaseRuntime.disconnect).toHaveBeenCalledOnce()
    expect(output).not.toContain('Gold Salon')
    expect(output).not.toContain('user@example.com')
  })

  it('reports a committed import distinctly when only disconnect fails afterward', async () => {
    const dependencies = createDependencies(createFixture())
    vi.mocked(dependencies.databaseRuntime.disconnect).mockRejectedValue(
      new Error(`${databaseUrl} disconnect failed`)
    )

    const execution = await executeLegacyPreviewImport(validArgv, dependencies)

    expect(execution.exitCode).toBe(2)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: true,
        status: 'persisted-with-disconnect-warning',
        issues: [
          {
            code: 'DATABASE_DISCONNECT_WARNING',
            message:
              'Preview rows were committed, but database disconnect failed; verify by an exact rerun.',
          },
        ],
      })
    )
    expect(serializeLegacyPreviewImportReport(execution.report)).not.toContain('private-password')
  })
})

interface FixtureOptions {
  snapshotOrigin?: string
  snapshotSourceKey?: string
  snapshotCutoffAt?: string
  snapshotExtractorVersion?: string
  controlSnapshotSha256?: string
  withImages?: boolean
  omitImageManifest?: boolean
  rawImageManifestText?: string
}

function createFixture(options: FixtureOptions = {}) {
  const canonicalOrigin = 'legacy_main'
  const snapshotOrigin = options.snapshotOrigin ?? canonicalOrigin
  const snapshotSourceKey = options.snapshotSourceKey ?? 'legacy-main'
  const snapshotCutoffAt = options.snapshotCutoffAt ?? '2025-07-11T09:00:00+09:00'
  const snapshotExtractorVersion = options.snapshotExtractorVersion ?? '1.0.0'
  const tableHash = 'a'.repeat(64)
  const schemaHash = 'b'.repeat(64)
  const catalogHash = 'c'.repeat(64)
  const qualifiedTable = `${canonicalOrigin}.shops`
  const legacyStoreId = `${qualifiedTable}:store-1`
  const legacyCastId = `${qualifiedTable}:cast-7`
  const imageUrl = '/salon-uploads/casts/legacy-main/cast-7/main.jpg'
  const imageManifest = {
    version: 1 as const,
    sourceKey: 'legacy-main',
    capturedAt: '2025-07-11T00:00:00.000Z',
    files: [
      {
        sourcePath: 'public/girls/cast-7/main.jpg',
        targetPath: 'casts/legacy-main/cast-7/main.jpg',
        owner: {
          sourceKey: 'legacy-main',
          entity: 'casts' as const,
          physicalTable: qualifiedTable,
          legacyId: legacyCastId,
        },
        slot: 1,
        mediaType: 'image/jpeg' as const,
        width: 800,
        height: 1200,
        sha256: 'd'.repeat(64),
        sizeBytes: 10,
        visibility: 'public' as const,
      },
    ],
  }
  const imageManifestText = options.rawImageManifestText ?? JSON.stringify(imageManifest)
  const imageManifestRawHash = createHash('sha256').update(imageManifestText, 'utf8').digest('hex')
  const exportInput = {
    sourceKey: 'legacy-main',
    rows: {
      stores: [
        {
          source_table: qualifiedTable,
          id: legacyStoreId,
          name: 'Gold',
          display_name: 'Gold Salon',
          phone: '0312345678',
          email: 'store@example.com',
          address: 'Tokyo',
          is_active: true,
          created_at: '2024-01-02 12:34:56',
        },
      ],
      courses: [],
      casts: options.withImages
        ? [
            {
              source_table: qualifiedTable,
              id: legacyCastId,
              store_id: legacyStoreId,
              name: 'Alice',
              age: 24,
              height: 160,
              bust: 'C',
              waist: 58,
              hip: 84,
              type: 'standard',
              image: imageUrl,
              images: [],
              description: 'Profile',
              panel_designation_rank: 0,
              regular_designation_rank: 0,
              net_reservation: true,
              work_status: 'active',
              created_at: '2024-01-02 12:34:56',
            },
          ]
        : [],
      customers: [],
      reservations: [],
      castSchedules: [],
      pointHistories: [],
    },
  }
  const canonicalExportText = JSON.stringify(exportInput)
  const canonicalExportRawHash = createHash('sha256')
    .update(canonicalExportText, 'utf8')
    .digest('hex')
  const snapshotManifest = {
    version: 1 as const,
    sourceKey: snapshotSourceKey,
    timezone: 'Asia/Tokyo' as const,
    capturedAt: '2025-07-11T08:59:00+09:00',
    cutoffAt: snapshotCutoffAt,
    authoritativeOrigin: 'legacy-prod-01',
    extractorVersion: snapshotExtractorVersion,
    consistency: 'transaction-snapshot' as const,
    canonicalExportInventory: {
      path: 'canonical/canonical-export.json',
      sha256: canonicalExportRawHash,
    },
    tables: [
      {
        origin: snapshotOrigin,
        physicalTable: 'shops',
        usage: 'canonical-source' as const,
        path: 'tables/shops.ndjson',
        rowCount: options.withImages ? 2 : 1,
        sha256: tableHash,
      },
    ],
    schemaOnlySqlInventory: {
      path: 'inventory/database.schema.sql',
      sha256: schemaHash,
    },
    staticCatalogInventory: {
      path: 'inventory/course-catalog.json',
      sha256: catalogHash,
    },
    ...(options.withImages && !options.omitImageManifest
      ? {
          publicImageManifest: {
            path: 'inventory/public-images.json',
            sha256: imageManifestRawHash,
          },
        }
      : {}),
  }
  const snapshotPolicy = {
    version: 1 as const,
    expectedSourceKey: snapshotSourceKey,
    expectedAuthoritativeOrigin: 'legacy-prod-01',
    expectedExtractorVersion: snapshotExtractorVersion,
    expectedTransformationPolicyVersion: 'legacy-preview-policy-v1',
    requiredTables: [
      { origin: snapshotOrigin, physicalTable: 'shops', usage: 'canonical-source' as const },
    ],
    expectedSchemaOnlySqlSha256: schemaHash,
    expectedStaticCatalogSha256: catalogHash,
  }
  const validation = validateLegacySnapshotPackageManifest(snapshotManifest, {
    ...snapshotPolicy,
    requiredTables: snapshotPolicy.requiredTables,
  })
  if (!validation.success) throw new Error('Fixture snapshot must be valid.')

  const manifest = {
    version: 1 as const,
    sources: [
      {
        sourceKey: 'legacy-main',
        utcOffsetMinutes: 540,
        storeMappings: [
          {
            legacyStoreId,
            targetStoreId: 'gold',
            targetStoreSlug: 'gold',
            targetStoreTimezone: 'Asia/Tokyo' as const,
          },
        ],
      },
    ],
  }
  const control = {
    version: 1 as const,
    sourceKey: 'legacy-main',
    cutoffAt: '2025-07-11T00:00:00.000Z',
    migrationManifestSha256: calculateLegacyMigrationManifestSha256(manifest),
    canonicalExportSha256: calculateLegacyCanonicalJsonSha256(exportInput),
    snapshotManifestSha256: options.controlSnapshotSha256 ?? validation.manifestSha256,
    extractorVersion: '1.0.0',
    transformationPolicyVersion: 'legacy-preview-policy-v1',
    approvedSourceTables: [qualifiedTable],
    expectedInputCounts: {
      stores: 1,
      courses: 0,
      casts: options.withImages ? 1 : 0,
      customers: 0,
      reservations: 0,
      castSchedules: 0,
      pointHistories: 0,
    },
  }
  const privateTextByPath: Record<string, string> = {
    [inputPaths.manifest]: JSON.stringify(manifest),
    [inputPaths.export]: JSON.stringify(exportInput),
    [inputPaths.control]: JSON.stringify(control),
  }
  return {
    snapshotManifest,
    snapshotPolicy,
    manifest,
    export: exportInput,
    imageManifest,
    imageManifestText,
    control,
    privateTextByPath,
    artifactHashes: {
      'tables/shops.ndjson': tableHash,
      'canonical/canonical-export.json': canonicalExportRawHash,
      'inventory/database.schema.sql': schemaHash,
      'inventory/course-catalog.json': catalogHash,
      'inventory/public-images.json': imageManifestRawHash,
    } as Record<string, string>,
  }
}

function createDependencies(
  fixture: ReturnType<typeof createFixture>,
  options: {
    envOverride?: Partial<{
      runtimeMode: string
      outboundDeliveryMode: string
      databaseUrl: string
      configuredMarker: string
      storageRoot: string
    }>
  } = {}
): LegacyPreviewImportRunnerDependencies & {
  databaseRuntime: LegacyPreviewDatabaseRuntime
  snapshotFilesystem: LegacySnapshotPackageFilesystem
  imageIo: LegacyPreviewImageImportIo
} {
  const mappings: LegacyPreviewMapping[] = []
  const targets = new Map<string, LegacyPreviewStoredTarget>()
  let run: LegacyPreviewStoredRun | null = null
  const store: LegacyPreviewStoreProjection = {
    id: 'gold',
    slug: 'gold',
    timezone: 'Asia/Tokyo',
    name: 'Gold',
    displayName: 'Gold Salon',
    phone: '+81312345678',
    email: 'store@example.com',
    address: 'Tokyo',
    isActive: true,
  }
  const transaction: LegacyPreviewTransactionPort = {
    acquireSourceLock: vi.fn().mockResolvedValue(undefined),
    readTargetIdentity: vi.fn().mockResolvedValue({
      databaseName: 'salon_qa_preview',
      environment: 'staging-preview',
      marker,
    }),
    readMappings: vi.fn(async () => structuredClone(mappings)),
    readRun: vi.fn(async () => structuredClone(run)),
    readAggregateCounts: vi.fn(async () => {
      const countTargets = (entity: LegacyPreviewTargetRow['entity']) =>
        [...targets.values()].filter(
          (target) =>
            typeof target.projection === 'object' &&
            target.projection !== null &&
            'entity' in target.projection &&
            target.projection.entity === entity
        ).length
      return {
        stores: 1,
        courses: countTargets('courses'),
        casts: countTargets('casts'),
        customers: countTargets('customers'),
        castSchedules: countTargets('castSchedules'),
        reservations: countTargets('reservations'),
        pointHistories: countTargets('pointHistories'),
        mappings: mappings.length,
        runs: run === null ? 0 : 1,
      }
    }),
    readStore: vi.fn(async (targetId) => (targetId === 'gold' ? store : null)),
    readTarget: vi.fn(async (entity, targetId) =>
      structuredClone(targets.get(`${entity}:${targetId}`) ?? null)
    ),
    findNaturalKeyConflict: vi.fn().mockResolvedValue(null),
    createTarget: vi.fn(async (row, customerCredential) => {
      targets.set(`${row.entity}:${row.data.id}`, {
        projection: structuredClone(row),
        customerCredential,
      })
    }),
    createMapping: vi.fn(async (mapping) => {
      mappings.push(structuredClone(mapping))
    }),
    createRun: vi.fn(async (provenance) => {
      run = {
        ...structuredClone(provenance),
        createdAt: '2026-07-20T03:00:00.000Z',
      }
    }),
  }
  const databaseRuntime: LegacyPreviewDatabaseRuntime = {
    persistence: {
      withSerializableTransaction: vi.fn(async (operation) => operation(transaction)),
    },
    credentialFactory: {
      createDisabledCredential: vi
        .fn()
        .mockResolvedValue(`!legacy-preview-disabled!$2b$12$${'a'.repeat(53)}`),
    },
    disconnect: vi.fn().mockResolvedValue(undefined),
  }
  const snapshotFilesystem: LegacySnapshotPackageFilesystem = {
    readTextFile: vi.fn(async (path) => {
      if (path === fixture.snapshotManifest.canonicalExportInventory.path) {
        return JSON.stringify(fixture.export)
      }
      if (
        'publicImageManifest' in fixture.snapshotManifest &&
        path === fixture.snapshotManifest.publicImageManifest?.path
      ) {
        return fixture.imageManifestText
      }
      return JSON.stringify(fixture.snapshotManifest)
    }),
    inspectFile: vi.fn(async (path, kind) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: 10,
      sha256: fixture.artifactHashes[path],
      ...(kind === 'table'
        ? {
            rowCount:
              fixture.snapshotManifest.tables.find((table) => table.path === path)?.rowCount ?? 0,
          }
        : {}),
    })),
  }
  const imageIo: LegacyPreviewImageImportIo = {
    inspectTargetIdentity: vi.fn().mockResolvedValue({
      realRoot: storageRoot,
      environment: 'staging-preview',
      targetId: marker,
    }),
    inspectTargetInventory: vi.fn().mockResolvedValue([]),
    inspectSource: vi.fn().mockImplementation(async (file) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      mediaType: file.mediaType,
      width: file.width,
      height: file.height,
    })),
    inspectTarget: vi.fn().mockResolvedValue(null),
    copyExclusive: vi.fn().mockImplementation(async (file) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      mediaType: file.mediaType,
      width: file.width,
      height: file.height,
    })),
    rollbackCreated: vi.fn().mockResolvedValue(undefined),
  }
  return {
    loadValidatedEnvironment: vi.fn().mockResolvedValue({
      runtimeMode: 'preview',
      outboundDeliveryMode: 'disabled',
      databaseUrl,
      configuredMarker: marker,
      storageRoot,
      ...options.envOverride,
    }),
    readPrivateText: vi.fn(async (path) => fixture.privateTextByPath[path]),
    createSnapshotFilesystem: vi.fn().mockResolvedValue(snapshotFilesystem),
    readSnapshotPolicyText: vi.fn().mockResolvedValue(JSON.stringify(fixture.snapshotPolicy)),
    createImageFilesystem: vi.fn().mockReturnValue(imageIo),
    createDatabase: vi.fn().mockResolvedValue(databaseRuntime),
    now: () => new Date('2025-07-12T00:00:00.000Z'),
    databaseRuntime,
    snapshotFilesystem,
    imageIo,
  }
}

function expectRejected(execution: { exitCode: number; report: unknown }): void {
  expect(execution.exitCode).toBe(1)
  expect(execution.report).toEqual({
    success: false,
    evidenceScope: 'none',
    status: 'rejected',
    counts: {
      stores: 0,
      courses: 0,
      casts: 0,
      customers: 0,
      reservations: 0,
      castSchedules: 0,
      pointHistories: 0,
      mappings: 0,
    },
    issues: [
      {
        code: 'PREVIEW_IMPORT_REJECTED',
        message: 'Preview import was rejected by a safety or integrity gate.',
      },
    ],
  })
}

function replaceArgument(argv: string[], flag: string, value: string): string[] {
  const result = [...argv]
  const index = result.indexOf(flag)
  if (index < 0) throw new Error('Fixture flag is missing.')
  result[index + 1] = value
  return result
}
