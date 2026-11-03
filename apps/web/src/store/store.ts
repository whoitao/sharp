import { configureStore } from "@reduxjs/toolkit";

// 占位 state，后续新增 slice 时替换
const initialState = { app: {} as Record<string, unknown> };

// 这里必须传「函数」而不是 { app: reducer } 切片对象：
// redux 5 在非 production 环境下由 combineReducers 的 PROBE_UNKNOWN_ACTION
// 调用 Math.random()，Next 16 会把 Client Component 里的该调用判定为
// 不稳定值并报错（Next.js encountered the unstable value Math.random()）。
const rootReducer = (state = initialState, _action: { type: string }) => state;

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    // RTK 的 devtools enhancer 同样依赖随机 id，统一关闭以保证预渲染稳定。
    devTools: false,
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
