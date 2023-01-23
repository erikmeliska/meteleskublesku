/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['meteleskublesku.cz','localhost','meteleskublesku.ixy.sk','127.0.0.1'],
  },
  output: 'standalone'
}

module.exports = nextConfig
