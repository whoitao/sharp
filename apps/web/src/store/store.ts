import { configureStore } from "@reduxjs/toolkit";

// 占位 reducer，后续新增 slice 时替换
const placeholderReducer = (state: Record<string, unknown> = {}) => state;

export const makeStore = () => {
  return configureStore({
    reducer: {
      app: placeholderReducer,
    },
    // RTK 的 devtools enhancer 初始化时会调用 Math.random() 生成实例 id，
    // Next 16 预渲染会拦截该不稳定值导致 prerender 失败。
    // 统一关闭 devtools（如需调试可在浏览器端单独开启），保证构建稳定。
    devTools: false,
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
