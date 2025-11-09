/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Front-end only: generate a static export suitable for any CDN
  output: 'export',
}

export default nextConfig
