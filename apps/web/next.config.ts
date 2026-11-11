import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true, // 显式设置，避免警告
  async redirects() {
    // /docs 已下线，保留永久跳转避免外部收藏变成死链
    return [{ source: "/docs", destination: "/wiki", permanent: true }];
  },
};

export default nextConfig;
