/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md guarded disposable preview import CLI
 * @related_to   legacy-preview-import.ts delegates all safety decisions to the tested runner
 * @known_issues The process smoke test exercises rejection only and never creates a Prisma client
 */
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)

describe('legacy preview import CLI', () => {
  it('emits one redacted report and exits one before environment or Prisma loading on invalid args', async () => {
    const failure = await captureFailure()

    expect(failure.code).toBe(1)
    expect(failure.stderr).toBe('')
    expect(failure.stdout.trim().split('\n')).toHaveLength(1)
    expect(JSON.parse(failure.stdout)).toEqual({
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
    expect(failure.stdout).not.toContain('private-password')
    expect(failure.stdout).not.toContain('production.example.test')
  })
})

async function captureFailure(): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    await executeFile(
      join(process.cwd(), 'node_modules/.bin/tsx'),
      ['scripts/legacy-preview-import.ts'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          APP_RUNTIME_MODE: 'invalid-mode-proves-env-was-not-loaded',
          DATABASE_URL: 'postgresql://preview:private-password@production.example.test:5432/live',
        },
      }
    )
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'stdout' in error &&
      'stderr' in error &&
      typeof error.code === 'number' &&
      typeof error.stdout === 'string' &&
      typeof error.stderr === 'string'
    ) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr }
    }
  }
  throw new Error('Expected preview import CLI to reject before database setup.')
}
