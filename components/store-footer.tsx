import Link from 'next/link'
import { Phone } from 'lucide-react'
import { Store } from '@/lib/store/types'

interface StoreFooterProps {
  store: Store
}

export function StoreFooter({ store }: StoreFooterProps) {
  const socialLinks = [
    { name: 'Twitter', href: '#', icon: TwitterIcon },
    { name: 'LINE', href: '#', icon: LineIcon },
    { name: 'Ameba', href: '#', icon: AmebaIcon },
    { name: 'YouTube', href: '#', icon: YouTubeIcon },
  ]

  const footerLinks = [
    { name: '求人情報', href: `/${store.slug}/recruitment` },
    { name: 'プライバシーポリシー', href: '/privacy' },
    { name: 'ご利用規約', href: '/terms' },
  ]

  const externalLinks = [
    { name: '高収入求人情報', href: '#' },
    { name: 'リンク集', href: '#' },
    { name: 'GROUP総合TOP', href: '#' },
  ]

  return (
    <footer className="border-t border-[#3b2e1f] bg-[#0c0c0c] text-[#f5e6c4]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Main Footer Content */}
        <div className="space-y-6 text-center">
          {/* Store Title */}
          <div className="space-y-2">
            <p className="luxury-display text-sm tracking-[0.4em] text-[#d7b46a]">
              OFFICIAL SITE
            </p>
            <h3 className="text-xl font-semibold md:text-2xl">
              {store.name.replace('店', '')}の回春エステなら贅沢密着トリートメント
            </h3>
          </div>

          {/* Phone Number */}
          <div className="flex items-center justify-center gap-2 text-2xl font-bold md:text-3xl">
            <Phone className="h-6 w-6 text-[#f3d08a] md:h-8 md:w-8" />
            <a href={`tel:${store.phone}`} className="transition-colors hover:text-[#f6d48a]">
              ({store.phone})
            </a>
          </div>

          {/* Opening Hours */}
          <p className="text-sm text-[#d7c39c] md:text-base">
            営業時間 {store.openingHours.weekday.open}～翌
            {store.openingHours.weekday.close.split(':')[0]}:00
          </p>

          {/* Social Media Links */}
          <div className="flex justify-center gap-6 py-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                className="text-[#cbb88f] transition-colors hover:text-[#f6d48a]"
                aria-label={social.name}
              >
                <social.icon className="h-8 w-8" />
              </a>
            ))}
          </div>

          {/* Footer Links */}
          <div className="border-t border-[#2f2416] pt-6 text-sm text-[#cbb88f]">
            <div className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="transition-colors hover:text-[#f6d48a]"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {externalLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="transition-colors hover:text-[#f6d48a]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Social Media Icons
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.28 2 11.53c0 2.36.91 4.51 2.41 6.19.17.19.18.49.06.7l-.67 1.51c-.14.31.2.64.52.5l1.63-.7c.21-.09.45-.04.62.11 1.35.91 2.97 1.46 4.73 1.46 5.52 0 10-4.28 10-9.53C22 6.28 17.52 2 12 2zm-5.5 9.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3zm2.5.5c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3c0 .28-.22.5-.5.5zm3.5-.5c0 .19-.11.36-.28.44-.06.03-.12.04-.18.04-.12 0-.24-.04-.33-.13l-1.5-1.5c-.09-.09-.14-.21-.14-.35V8.5c0-.28.22-.5.5-.5s.5.22.5.5v1.29l1.15 1.15c.12.12.17.29.13.46-.02.08-.06.15-.12.21l-.23.23v.66c0 .28-.22.5-.5.5zm3.5 0c0 .28-.22.5-.5.5h-1.5c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5h1.5c.28 0 .5.22.5.5s-.22.5-.5.5H15v.5h1c.28 0 .5.22.5.5s-.22.5-.5.5h-1v.5h1c.28 0 .5.22.5.5z" />
    </svg>
  )
}

function AmebaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M12 7a3 3 0 0 1 3 3c0 1.5-1 2.5-2 3.5S11 16 11 17m1-10v.01M12 21v.01"
        strokeLinecap="round"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z" />
    </svg>
  )
}
