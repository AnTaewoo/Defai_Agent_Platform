/** @type {import('next').NextConfig} */
const nextConfig = {
  // 개발 환경 프록시/터널 도메인에서의 HMR·정적 자산 요청 허용(Next 14.2+ cross-origin 경고).
  allowedDevOrigins: ["vite-localhost.antaewoo.com"],

  // 브라우저 → HTTPS 프론트엔드 → HTTP 백엔드 mixed-content 우회:
  // /api/* 요청을 Next.js dev 서버가 서버사이드에서 localhost:8001로 프록시.
  async rewrites() {
    const backendBase = process.env.BACKEND_URL ?? "http://localhost:8001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
