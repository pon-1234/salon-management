/**
 * @design_doc   Email HTML output encoding tests
 * @related_to   lib/email/html.ts, notification email composers
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'
import { escapeHtmlText } from './html'

describe('escapeHtmlText', () => {
  it('escapes every character with special meaning in HTML text', () => {
    expect(escapeHtmlText(`<img title="owner's"> & text`)).toBe(
      '&lt;img title=&quot;owner&#39;s&quot;&gt; &amp; text'
    )
  })

  it('preserves ordinary text and line breaks', () => {
    expect(escapeHtmlText('お名前: 山田 太郎\n年齢: 28')).toBe('お名前: 山田 太郎\n年齢: 28')
  })
})
