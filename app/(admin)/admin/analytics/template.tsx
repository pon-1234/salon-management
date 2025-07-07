'use client'

import { useEffect } from 'react'

export default function AnalyticsTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ページ遷移時にスクロール位置をトップに戻す
    window.scrollTo(0, 0)
  }, [])

  return <>{children}</>
}
