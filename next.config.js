/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ REMOVE THIS LINE - it breaks authentication
  // output: 'export',
  
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
}

module.exports = nextConfig
