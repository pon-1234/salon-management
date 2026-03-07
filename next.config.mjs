import path from 'node:path'

if (!process.env.NEXTAUTH_URL?.trim()) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
}

if (!process.env.NEXTAUTH_URL_INTERNAL?.trim()) {
  process.env.NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['date-fns-tz'],
  images: {
    unoptimized: true,
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
