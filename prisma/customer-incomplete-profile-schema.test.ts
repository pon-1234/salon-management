/**
 * @design_doc   Backoffice name-only customer registration persistence contract
 * @related_to   Customer Prisma model and administrative customer creation API
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('incomplete backoffice customer profiles', () => {
  it('stores genuinely missing login and birth profile fields as null', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
    const customerModel = schema.match(/model Customer \{[\s\S]*?\n\}/u)?.[0]

    expect(customerModel).toMatch(/nameKana\s+String\?/u)
    expect(customerModel).toMatch(/email\s+String\?\s+@unique/u)
    expect(customerModel).toMatch(/password\s+String\?/u)
    expect(customerModel).toMatch(/birthDate\s+DateTime\?/u)

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260815020000_allow_incomplete_customer_profiles',
        'migration.sql'
      ),
      'utf8'
    )

    expect(migration.trimStart()).toMatch(/^BEGIN;/u)
    expect(migration).toContain('ALTER COLUMN "nameKana" DROP NOT NULL')
    expect(migration).toContain('ALTER COLUMN "email" DROP NOT NULL')
    expect(migration).toContain('ALTER COLUMN "password" DROP NOT NULL')
    expect(migration).toContain('ALTER COLUMN "birthDate" DROP NOT NULL')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/u)
    expect(migration).not.toMatch(/UPDATE\s+"Customer"/iu)
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"Customer"/iu)
  })
})
