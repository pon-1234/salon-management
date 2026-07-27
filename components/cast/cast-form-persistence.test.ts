/**
 * @design_doc   Cast profile fields accepted by the persisted Cast API contract
 * @related_to   CastForm, app/api/cast/route.ts, Prisma Cast model
 * @known_issues Additional private cast contact fields require an approved schema before UI exposure
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'cast-form.tsx'), 'utf8')

describe('CastForm persistence contract', () => {
  it.each(['phone', 'email', 'password', 'birthDate', 'registrationDate', 'blogId', 'twitterId'])(
    'does not display the non-persisted %s field',
    (field) => {
      expect(source).not.toContain(`name="${field}"`)
    }
  )
})
