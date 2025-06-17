/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Tắt ESLint trong quá trình build (không khuyến khích)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Tắt type checking trong quá trình build (không khuyến khích)
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
