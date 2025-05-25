import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { CTIProvider } from '@/components/cti/cti-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Salon Management',
  description: 'Manage your salon appointments and staff',
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CTIProvider>
          {children}
        </CTIProvider>
      </body>
    </html>
  )
}
