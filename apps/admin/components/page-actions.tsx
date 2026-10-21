"use client";

import { createContext, useContext, useEffect } from "react";

// 页面操作按钮注入 Context：子页面可以把操作按钮渲染到顶部标题栏右侧
export const PageActionsContext = createContext<{
  setActions: (node: React.ReactNode) => void;
}>({ setActions: () => {} });

export function usePageActions(node: React.ReactNode) {
  const { setActions } = useContext(PageActionsContext);
  useEffect(() => {
    setActions(node);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}
