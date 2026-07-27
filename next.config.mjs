/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   deploy/xserver-vps/Dockerfile - Packages the standalone Next.js output
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import path from 'node:path'

if (!process.env.NEXTAUTH_URL_INTERNAL?.trim() && process.env.NEXTAUTH_URL?.trim()) {
  process.env.NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL
}

const scriptSource = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
].join(' ')

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src ${scriptSource}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), geolocation=(), microphone=()',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['date-fns-tz'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/staff/:path*',
        destination: '/cast/:path*',
        permanent: true,
      },
    ]
  },
  webpack(config) {
    config.resolve.alias = config.resolve.alias ?? {}
    config.resolve.alias['date-fns/locale/en-US'] = path.resolve(
      process.cwd(),
      'lib/date-fns-locale-en-US'
    )
    return config
  },
}

export default nextConfig
