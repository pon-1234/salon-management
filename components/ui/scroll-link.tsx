'use client'

import Link, { LinkProps } from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface ScrollLinkProps extends LinkProps {
  children: ReactNode
  className?: string
}

export function ScrollLink({ children, href, className, ...props }: ScrollLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    
    // スクロール位置をリセット
    window.scrollTo(0, 0)
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.scrollTop = 0
    }
    
    // ナビゲーション
    router.push(href.toString())
  }

  return (
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}