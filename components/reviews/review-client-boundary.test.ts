/**
 * @design_doc   Public review client/server dependency boundary
 * @related_to   ReviewSubmissionForm and persisted review service
 * @known_issues None
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const reviewsComponentDirectory = join(process.cwd(), 'components/reviews')
const publicMapperPath = join(process.cwd(), 'lib/reviews/public-mapper.ts')
const persistedServerImport =
  /from ['"](?:@\/lib\/(?:config\/env|db)|@\/lib\/reviews\/(?:public|service)|@prisma\/client)['"]/

describe('public review client boundary', () => {
  it('keeps every client component away from persisted server review modules', () => {
    const clientSources = readdirSync(reviewsComponentDirectory)
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => ({
        name,
        source: readFileSync(join(reviewsComponentDirectory, name), 'utf8'),
      }))
      .filter(({ source }) => /^['"]use client['"]/m.test(source))

    expect(clientSources.length).toBeGreaterThan(0)
    for (const { name, source } of clientSources) {
      expect(source, name).not.toMatch(persistedServerImport)
    }

    expect(readFileSync(publicMapperPath, 'utf8'), 'public-mapper.ts').not.toMatch(
      persistedServerImport
    )
  })
})
