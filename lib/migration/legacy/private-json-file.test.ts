/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md private canonical migration inputs
 * @related_to   preview-import-runner.ts reads manifest, export, and control JSON through this gate
 * @known_issues Tests use owner-only temporary fixtures and never read production migration data
 */
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { hasPrivateLegacyJsonPermissions, readPrivateLegacyJsonText } from './private-json-file'

describe('readPrivateLegacyJsonText', () => {
  let temporaryRoot = ''
  let inputPath = ''

  beforeEach(async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'salon-private-json-test-'))
    inputPath = join(temporaryRoot, 'canonical-export.json')
    await writeFile(inputPath, '{"version":1}\n', { mode: 0o600 })
    await chmod(inputPath, 0o600)
  })

  afterEach(async () => {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true })
  })

  it('reads a bounded owner-only absolute JSON file', async () => {
    await expect(readPrivateLegacyJsonText(inputPath, 1024)).resolves.toBe('{"version":1}\n')
  })

  it('rejects group-readable or world-readable migration data', async () => {
    await chmod(inputPath, 0o640)

    await expect(readPrivateLegacyJsonText(inputPath, 1024)).rejects.toThrow(
      'Private migration JSON access was rejected.'
    )
  })

  it('requires the private JSON file to be owned by the execution UID', () => {
    expect(hasPrivateLegacyJsonPermissions({ uid: 501, mode: 0o600 }, 502)).toBe(false)
    expect(hasPrivateLegacyJsonPermissions({ uid: 501, mode: 0o600 }, 501)).toBe(true)
  })

  it.each(['relative.json', '/'])('rejects a non-absolute or root path: %s', async (path) => {
    await expect(readPrivateLegacyJsonText(path, 1024)).rejects.toThrow(
      'Private migration JSON access was rejected.'
    )
  })

  it('rejects symbolic links and directories', async () => {
    const linkPath = join(temporaryRoot, 'linked.json')
    const directoryPath = join(temporaryRoot, 'directory.json')
    await symlink(inputPath, linkPath)
    await mkdir(directoryPath)

    await expect(readPrivateLegacyJsonText(linkPath, 1024)).rejects.toThrow(
      'Private migration JSON access was rejected.'
    )
    await expect(readPrivateLegacyJsonText(directoryPath, 1024)).rejects.toThrow(
      'Private migration JSON access was rejected.'
    )
  })

  it('rejects oversized and invalid UTF-8 files', async () => {
    await expect(readPrivateLegacyJsonText(inputPath, 2)).rejects.toThrow(
      'Private migration JSON access was rejected.'
    )
    await writeFile(inputPath, Buffer.from([0xff]), { mode: 0o600 })
    await chmod(inputPath, 0o600)
    await expect(readPrivateLegacyJsonText(inputPath, 1024)).rejects.toThrow(
      'Private migration JSON access was rejected.'
    )
  })

  it('never exposes the private path or filesystem error text', async () => {
    const missingPath = join(temporaryRoot, 'password-customer-export.json')

    const error = await captureError(() => readPrivateLegacyJsonText(missingPath, 1024))

    expect(error.message).toBe('Private migration JSON access was rejected.')
    expect(error.message).not.toContain(temporaryRoot)
    expect(error.message).not.toContain('password-customer')
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
