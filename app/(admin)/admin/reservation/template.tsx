'use client'

import { useEffect } from 'react'

export default function ReservationTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ページ遷移時にスクロール位置をリセット
    window.scrollTo(0, 0)
  }, [])

  return <>{children}</>
}
