/**
 * @design_doc   Notion task #281 store settings save error
 * @related_to   Store settings API optional website validation
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { normalizeOptionalUrl } from './store-input'

describe('normalizeOptionalUrl', () => {
  it('treats an empty website field as omitted instead of an invalid URL', () => {
    expect(normalizeOptionalUrl('')).toBeUndefined()
    expect(normalizeOptionalUrl('   ')).toBeUndefined()
    expect(normalizeOptionalUrl('https://example.com')).toBe('https://example.com')
  })
})
