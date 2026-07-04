/**
 * @design_doc   ui-improvement-instructions.md U-12 metadata
 * @related_to   cast/(auth), cast/(portal): cast-facing route groups
 * @known_issues Client child pages inherit this template until page split work
 */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: {
    default: 'キャストポータル',
    template: '%s | キャストポータル',
  },
  description: 'キャスト向けの出勤、予約、精算確認ポータルです。',
}

export default function CastRootLayout({ children }: { children: ReactNode }) {
  return children
}
