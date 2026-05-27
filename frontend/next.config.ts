import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.onrender.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
}

export default nextConfig
