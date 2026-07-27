/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md management settings write-operation checks
 * @related_to   OptionInfoPage: provides the administrator option add/edit dialog
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

describe('OptionInfoPage dialog viewport behavior', () => {
  it('keeps every option form control reachable in a short viewport', () => {
    expect(source).toContain('max-h-[calc(100dvh-2rem)]')
    expect(source).toContain('overflow-y-auto')
  })
})
