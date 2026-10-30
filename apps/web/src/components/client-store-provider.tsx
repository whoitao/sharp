"use client";

import dynamic from "next/dynamic";

// StoreProvider 内部在 configureStore 时会调用 Math.random() 生成中间件实例 id，
// Next 16 预渲染会拦截该不稳定值导致 prerender 失败，因此将其标记为仅客户端渲染。
const StoreProvider = dynamic(
  () => import("@/store/provider").then((m) => m.StoreProvider),
  { ssr: false }
);

export function ClientStoreProvider({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
