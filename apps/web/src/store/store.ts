import { configureStore } from "@reduxjs/toolkit";

// 占位 reducer，后续新增 slice 时替换
const placeholderReducer = (state: Record<string, unknown> = {}) => state;

export const makeStore = () => {
  return configureStore({
    reducer: {
      app: placeholderReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
