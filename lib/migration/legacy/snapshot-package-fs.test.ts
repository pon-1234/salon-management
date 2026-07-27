/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package filesystem gate
 * @related_to   snapshot-package.ts consumes the streamed inspection metadata produced here
 * @known_issues Tests use isolated temporary files and never inspect a legacy repository or database
 */
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { chmod, lstat, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createLegacySnapshotPackageFilesystem,
  hasPrivateSnapshotPermissions,
  readLegacySnapshotPolicyText,
} from './snapshot-package-fs'

describe('legacy snapshot package filesystem', () => {
  let temporaryParent = ''
  let packageRoot = ''

  beforeEach(async () => {
    temporaryParent = await mkdtemp(join(tmpdir(), 'salon-snapshot-package-test-'))
    packageRoot = join(temporaryParent, 'package')
    await mkdir(packageRoot, { mode: 0o700 })
    await mkdir(join(packageRoot, 'tables'), { mode: 0o700 })
    await mkdir(join(packageRoot, 'inventory'), { mode: 0o700 })
    await Promise.all([
      chmod(packageRoot, 0o700),
      chmod(join(packageRoot, 'tables'), 0o700),
      chmod(join(packageRoot, 'inventory'), 0o700),
    ])
  })

  afterEach(async () => {
    if (temporaryParent) await rm(temporaryParent, { recursive: true, force: true })
  })

  it.each(['', '.', '/'])(
    'rejects a missing, relative, or filesystem-root package root: %s',
    async (root) => {
      await expect(createLegacySnapshotPackageFilesystem(root)).rejects.toThrow(
        'Snapshot package filesystem access was rejected.'
      )
    }
  )

  it('rejects a symbolic-link package root without exposing its target', async () => {
    const linkedRoot = join(temporaryParent, 'linked-package')
    await symlink(packageRoot, linkedRoot)

    const error = await captureError(() => createLegacySnapshotPackageFilesystem(linkedRoot))

    expect(error.message).toBe('Snapshot package filesystem access was rejected.')
    expect(JSON.stringify(error)).not.toContain(packageRoot)
  })

  it.each([0o755, 0o750, 0o100, 0o400])(
    'rejects a package root without private owner read-and-traverse mode: %o',
    async (mode) => {
      await chmod(packageRoot, mode)
      try {
        await expect(createLegacySnapshotPackageFilesystem(packageRoot)).rejects.toThrow(
          'Snapshot package filesystem access was rejected.'
        )
      } finally {
        await chmod(packageRoot, 0o700)
      }
    }
  )

  it.each([0o644, 0o640, 0o200])(
    'rejects an artifact without private owner-readable mode: %o',
    async (mode) => {
      await chmod(packageRoot, 0o700)
      const artifactPath = join(packageRoot, 'tables/customers.ndjson')
      await writeFile(artifactPath, '{"id":1}\n', { mode })
      await chmod(artifactPath, mode)
      const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

      await expect(filesystem.inspectFile('tables/customers.ndjson', 'table')).rejects.toThrow(
        'Snapshot package filesystem access was rejected.'
      )
    }
  )

  it('requires the execution UID for both package directories and artifacts', () => {
    expect(hasPrivateSnapshotPermissions({ uid: 501, mode: 0o700 }, 502, 'directory')).toBe(false)
    expect(hasPrivateSnapshotPermissions({ uid: 501, mode: 0o600 }, 502, 'file')).toBe(false)
    expect(hasPrivateSnapshotPermissions({ uid: 501, mode: 0o700 }, 501, 'directory')).toBe(true)
    expect(hasPrivateSnapshotPermissions({ uid: 501, mode: 0o500 }, 501, 'directory')).toBe(true)
    expect(hasPrivateSnapshotPermissions({ uid: 501, mode: 0o600 }, 501, 'file')).toBe(true)
  })

  it('streams raw NDJSON once, hashes its exact bytes, and counts nonblank rows', async () => {
    const contents = '{"id":1}\n\n \t\r\n{"id":2}\n'
    const path = join(packageRoot, 'tables/customers.ndjson')
    await writePrivateFile(path, contents)
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    const inspection = await filesystem.inspectFile('tables/customers.ndjson', 'table')

    expect(inspection).toEqual({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: Buffer.byteLength(contents),
      sha256: createHash('sha256').update(contents).digest('hex'),
      rowCount: 2,
    })
  })

  it('hashes compressed bytes while counting nonblank rows after streaming gzip decompression', async () => {
    const compressed = gzipSync('{"id":1}\n  \n{"id":2}\n{"id":3}')
    await writePrivateFile(join(packageRoot, 'tables/customers.ndjson.gz'), compressed)
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    const inspection = await filesystem.inspectFile('tables/customers.ndjson.gz', 'table')

    expect(inspection).toEqual({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: compressed.byteLength,
      sha256: createHash('sha256').update(compressed).digest('hex'),
      rowCount: 3,
    })
  })

  it('streams non-table artifacts without interpreting their contents as NDJSON', async () => {
    const contents = 'CREATE TABLE example (id integer);\n'
    await writePrivateFile(join(packageRoot, 'inventory/database.schema.sql'), contents)
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    const inspection = await filesystem.inspectFile(
      'inventory/database.schema.sql',
      'schema-only-sql'
    )

    expect(inspection).toEqual({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: Buffer.byteLength(contents),
      sha256: createHash('sha256').update(contents).digest('hex'),
    })
  })

  it.each(['../outside.ndjson', '/tmp/outside.ndjson', 'tables\\outside.ndjson'])(
    'rejects an unsafe relative artifact path: %s',
    async (path) => {
      const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

      const error = await captureError(() => filesystem.inspectFile(path, 'table'))

      expect(error.message).toBe('Snapshot package filesystem access was rejected.')
      expect(JSON.stringify(error)).not.toContain(path)
    }
  )

  it('rejects final and intermediate symbolic links, including links escaping the package root', async () => {
    const outsideDirectory = join(temporaryParent, 'outside')
    await mkdir(outsideDirectory)
    await writePrivateFile(join(outsideDirectory, 'outside.ndjson'), '{"id":99}\n')
    await symlink(
      join(outsideDirectory, 'outside.ndjson'),
      join(packageRoot, 'tables/linked.ndjson')
    )
    await symlink(outsideDirectory, join(packageRoot, 'linked-directory'))
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    const finalLinkError = await captureError(() =>
      filesystem.inspectFile('tables/linked.ndjson', 'table')
    )
    const intermediateLinkError = await captureError(() =>
      filesystem.inspectFile('linked-directory/outside.ndjson', 'table')
    )

    expect(finalLinkError.message).toBe('Snapshot package filesystem access was rejected.')
    expect(intermediateLinkError.message).toBe('Snapshot package filesystem access was rejected.')
    expect(JSON.stringify([finalLinkError, intermediateLinkError])).not.toContain(outsideDirectory)
  })

  it('rejects directories and corrupt gzip data without exposing filesystem error text', async () => {
    await mkdir(join(packageRoot, 'tables/not-a-file.ndjson'))
    await writePrivateFile(join(packageRoot, 'tables/corrupt.ndjson.gz'), 'not gzip data')
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    const directoryError = await captureError(() =>
      filesystem.inspectFile('tables/not-a-file.ndjson', 'table')
    )
    const gzipError = await captureError(() =>
      filesystem.inspectFile('tables/corrupt.ndjson.gz', 'table')
    )

    expect(directoryError.message).toBe('Snapshot package filesystem access was rejected.')
    expect(gzipError.message).toBe('Snapshot package filesystem access was rejected.')
    expect(JSON.stringify([directoryError, gzipError])).not.toContain('not-a-file')
    expect(JSON.stringify([directoryError, gzipError])).not.toContain('corrupt')
  })

  it('reads only bounded UTF-8 control JSON through the guarded package root', async () => {
    const text = '{"version":1}\n'
    await writePrivateFile(join(packageRoot, 'snapshot-package.manifest.json'), text)
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    await expect(
      filesystem.readTextFile('snapshot-package.manifest.json', Buffer.byteLength(text))
    ).resolves.toBe(text)
    await expect(
      filesystem.readTextFile('snapshot-package.manifest.json', Buffer.byteLength(text) - 1)
    ).rejects.toThrow('Snapshot package filesystem access was rejected.')
  })

  it('accepts the preview runner canonical-export ceiling while still enforcing actual file size', async () => {
    const text = '{"sourceKey":"fixture","rows":{}}\n'
    await mkdir(join(packageRoot, 'canonical'), { mode: 0o700 })
    await writePrivateFile(join(packageRoot, 'canonical/export.json'), text)
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    await expect(filesystem.readTextFile('canonical/export.json', 512 * 1024 * 1024)).resolves.toBe(
      text
    )
  })

  it('rejects invalid UTF-8 control data', async () => {
    await writePrivateFile(join(packageRoot, 'snapshot-package.manifest.json'), Buffer.from([0xff]))
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    await expect(filesystem.readTextFile('snapshot-package.manifest.json', 100)).rejects.toThrow(
      'Snapshot package filesystem access was rejected.'
    )
  })

  it('reads a bounded absolute policy file only when it is a regular non-symlink file', async () => {
    const policyPath = join(temporaryParent, 'approved-policy.json')
    const policyLink = join(temporaryParent, 'linked-policy.json')
    const text = '{"approved":true}\n'
    await writePrivateFile(policyPath, text)
    await symlink(policyPath, policyLink)

    await expect(readLegacySnapshotPolicyText(policyPath, 1024)).resolves.toBe(text)
    await expect(readLegacySnapshotPolicyText(policyLink, 1024)).rejects.toThrow(
      'Snapshot policy filesystem access was rejected.'
    )
    await expect(readLegacySnapshotPolicyText('relative-policy.json', 1024)).rejects.toThrow(
      'Snapshot policy filesystem access was rejected.'
    )
  })

  it.each([0o644, 0o640, 0o200])(
    'rejects an absolute policy without private owner-readable mode: %o',
    async (mode) => {
      const policyPath = join(temporaryParent, 'permissive-policy.json')
      await writeFile(policyPath, '{"approved":true}\n', { mode })
      await chmod(policyPath, mode)

      await expect(readLegacySnapshotPolicyText(policyPath, 1024)).rejects.toThrow(
        'Snapshot policy filesystem access was rejected.'
      )
    }
  )

  it('detects that the package root remains a real directory', async () => {
    const filesystem = await createLegacySnapshotPackageFilesystem(packageRoot)

    expect((await lstat(packageRoot)).isDirectory()).toBe(true)
    expect(filesystem).toEqual(
      expect.objectContaining({
        inspectFile: expect.any(Function),
        readTextFile: expect.any(Function),
      })
    )
  })
})

async function captureError(operation: () => Promise<unknown>): Promise<Error> {
  try {
    await operation()
  } catch (error) {
    if (error instanceof Error) return error
  }
  throw new Error('Expected operation to reject.')
}

async function writePrivateFile(path: string, contents: string | Buffer): Promise<void> {
  await writeFile(path, contents, { mode: 0o600 })
  await chmod(path, 0o600)
}
