import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 빌드 시 TypeScript 에러 무시
    ignoreBuildErrors: true,
  },
  /* config options here */
  reactStrictMode: true,
};

export default nextConfig;
