/**
 * @design_doc   docs/ROUTING_STRUCTURE.md secure LINE cast registration flow
 * @related_to   CastForm must not bypass the one-time token endpoint
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'cast-form.tsx'), 'utf8')

describe('CastForm LINE security boundary', () => {
  it('does not accept or submit a directly managed LINE user ID', () => {
    expect(source).not.toContain('name="lineUserId"')
    expect(source).not.toContain('payload.lineUserId')
    expect(source).not.toContain('lineUserId: cast?.lineUserId')
  })
})
