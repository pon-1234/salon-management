import type { Metadata } from 'next'
import { Noto_Sans_JP, Playfair_Display } from 'next/font/google'
import '../styles/globals.css'
import { StoreProvider } from '@/contexts/store-context'
import { AuthProvider } from '@/contexts/auth-context'

const bodyFont = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
})

const displayFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: '金の玉クラブ | GOLD ESTHE GROUP',
  description: '密着度の高い性感睾丸マッサージ専門店「金の玉クラブ」公式サイト',
  generator: 'v0.dev',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
