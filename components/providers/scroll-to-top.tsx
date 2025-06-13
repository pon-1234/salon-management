'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // windowのスクロールとmain要素のスクロールの両方をリセット
    window.scrollTo(0, 0)
    
    // admin layoutのmain要素をスクロールトップに
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.scrollTop = 0
    }
    
    // 念のため、overflow-autoが設定されている要素もリセット
    const scrollableElements = document.querySelectorAll('[class*="overflow-auto"], [class*="overflow-scroll"]')
    scrollableElements.forEach(element => {
      element.scrollTop = 0
    })
  }, [pathname])

  return null
}