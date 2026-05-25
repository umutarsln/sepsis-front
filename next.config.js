/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /api/* → app/api/[...path]/route.ts (timeout + retry proxy)
}

module.exports = nextConfig
