/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API 프록시 설정 (CORS 우회)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*', // 백엔드 주소
      },
    ];
  },
};

module.exports = nextConfig;
