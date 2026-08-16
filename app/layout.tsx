/**
 * @design_doc   ui-improvement-instructions.md U-1 toast wiring
 * @related_to   Toaster, AuthProvider, RealtimeProvider, StoreProvider: global app shell providers
 * @known_issues Route-specific client pages still rely on nearest layout metadata
 */
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { StoreProvider } from '@/contexts/store-context'
import { AuthProvider } from '@/contexts/auth-context'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { Toaster } from '@/components/ui/toaster'

// Preserve the current runtime-rendered shell while preview access remains gateway-controlled.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: 'GOLD ESTHE GROUP',
    template: '%s | GOLD ESTHE GROUP',
  },
  description: '店舗・予約管理システム',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthProvider>
          <RealtimeProvider>
            <StoreProvider>
              {children}
              <Toaster />
            </StoreProvider>
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
