"use client";

import { StoreProvider } from "@/store/provider";

// Next 16 的 Instant UI 校验不支持 dynamic(ssr: false)（会报 "Browser-only rendering"），
// 且 configureStore 已关闭 devTools，不会再触发 Math.random() 预渲染问题，直接渲染即可。
export function ClientStoreProvider({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
