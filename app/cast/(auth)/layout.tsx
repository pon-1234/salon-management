import type { ReactNode } from 'react'

export default function CastAuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-muted/20">{children}</div>
}
