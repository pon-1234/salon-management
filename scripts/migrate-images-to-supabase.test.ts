/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md image migration safety boundary
 * @related_to   package.json; scripts/migrate-images-to-supabase.ts
 * @known_issues A checksum-verified VPS image importer is still required
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('retired Supabase image migration', () => {
  it('cannot be invoked as a package command or mutate storage and database state', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    const source = readFileSync(
      join(process.cwd(), 'scripts', 'migrate-images-to-supabase.ts'),
      'utf8'
    )

    expect(packageJson.scripts).not.toHaveProperty('migrate:images')
    expect(source).toContain('retired')
    expect(source).not.toContain('new PrismaClient')
    expect(source).not.toContain('createClient(')
    expect(source).not.toContain('.upload(')
    expect(source).not.toContain('.update(')
  })
})
