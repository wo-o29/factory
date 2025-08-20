import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 빌드 시 TypeScript 에러 무시
    ignoreBuildErrors: true,
  },
  // pageExtensions: ["page.tsx", "page.ts", "page.jsx", "page.js"],
  /* config options here */
  reactStrictMode: true,
};

export default nextConfig;
