/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   database-mutation-guard.js protects destructive development scripts
 * @known_issues None
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assertDevelopmentDatabaseMutation } from './database-mutation-guard.js'

const readProjectFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

describe('development database mutation guard', () => {
  it.each([undefined, '', 'production', ' production ', 'staging', 'preview'])(
    'blocks %s before a database mutation can start',
    (nodeEnv) => {
      expect(() => assertDevelopmentDatabaseMutation('full demo seed', nodeEnv)).toThrow(
        /development\/test-only.*full demo seed/i
      )
    }
  )

  it.each(['development', ' test '])(
    'keeps local development and test usage available for %s',
    (nodeEnv) => {
      expect(() => assertDevelopmentDatabaseMutation('test seed', nodeEnv)).not.toThrow()
    }
  )

  it.each([
    ['prisma/seed-full.ts', 'new PrismaClient()'],
    ['prisma/seed-chat-messages.ts', 'new PrismaClient()'],
    ['scripts/init-database.js', "require('child_process')"],
  ])('guards %s before its first database-capable dependency is initialized', (path, marker) => {
    const source = readProjectFile(path)
    const guardIndex = source.indexOf('assertDevelopmentDatabaseMutation(')
    const mutationCapabilityIndex = source.indexOf(marker)

    expect(guardIndex).toBeGreaterThanOrEqual(0)
    expect(mutationCapabilityIndex).toBeGreaterThan(guardIndex)
  })

  it('does not advertise fixed full-seed credentials', () => {
    const source = readProjectFile('prisma/seed-full.ts')

    expect(source).not.toContain("bcrypt.hash('admin123'")
    expect(source).not.toContain('admin@example.com / admin123')
  })
})
