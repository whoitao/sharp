import { configureStore } from "@reduxjs/toolkit";

// 占位 reducer，后续新增 slice 时替换
const placeholderReducer = (state: Record<string, unknown> = {}) => state;

export const makeStore = () => {
  return configureStore({
    reducer: {
      app: placeholderReducer,
    },
    // RTK 的 devtools enhancer 初始化时会调用 Math.random() 生成实例 id，
    // Next 16 预渲染（SSR pass）会拦截该不稳定值；服务端关闭 devtools，仅浏览器端启用
    devTools: typeof window !== "undefined",
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
