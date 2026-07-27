/**
 * @design_doc   Preview UAT must remain visually distinguishable from the live system
 * @related_to   preview-environment-banner.tsx, app/layout.tsx, lib/config/env.ts
 * @known_issues The snapshot cutoff is supplied by the controlled preview deployment
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PreviewEnvironmentBanner } from './preview-environment-banner'

describe('PreviewEnvironmentBanner', () => {
  it('renders nothing in live mode', () => {
    expect(
      renderToStaticMarkup(<PreviewEnvironmentBanner runtimeMode="live" snapshotCutoff={null} />)
    ).toBe('')
  })

  it('server-renders a persistent disposable-data warning before a snapshot is loaded', () => {
    const markup = renderToStaticMarkup(
      <PreviewEnvironmentBanner runtimeMode="preview" snapshotCutoff={null} />
    )

    expect(markup).toContain('確認環境')
    expect(markup).toContain('確認用データはまだ投入されていません')
    expect(markup).toContain('データは予告なく初期化されます')
    expect(markup).toContain('position:sticky')
  })

  it('server-renders only the validated snapshot cutoff metadata', () => {
    const markup = renderToStaticMarkup(
      <PreviewEnvironmentBanner runtimeMode="preview" snapshotCutoff="2026-07-20T03:15:00.000Z" />
    )

    expect(markup).toContain('データ基準日時')
    expect(markup).toContain('2026-07-20T03:15:00.000Z')
    expect(markup).toContain('dateTime="2026-07-20T03:15:00.000Z"')
    expect(markup).toContain('移行内容は確認中で、本番切替は未承認です')
    expect(markup).not.toContain('まだ投入されていません')
  })

  it('is not mounted by the server root layout because it obscures the review screens', () => {
    const layoutSource = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8')

    expect(layoutSource).not.toContain("from '@/components/shared/preview-environment-banner'")
    expect(layoutSource).not.toContain('<PreviewEnvironmentBanner')
  })
})
