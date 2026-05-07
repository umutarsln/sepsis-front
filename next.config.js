/** @type {import('next').NextConfig} */
/**
 * Backend API URL'ini normalize eder.
 *
 * Env boşsa localhost varsayılanı kullanılır ve sondaki "/" temizlenir.
 */
const resolveBackendApiUrl = () => {
  const fallback = 'http://localhost:8000'
  const raw = process.env.BACKEND_API_URL ?? fallback
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendApiUrl = resolveBackendApiUrl()
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig

