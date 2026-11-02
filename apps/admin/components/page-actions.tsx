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

// 页面标题注入：子页面可用自定义内容（如 Tab 栏）替换顶栏标题
export const PageTitleContext = createContext<{
  setTitle: (node: React.ReactNode) => void;
}>({ setTitle: () => {} });

export function usePageTitle(node: React.ReactNode) {
  const { setTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(node);
    return () => setTitle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}
