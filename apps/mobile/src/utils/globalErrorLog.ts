import { appendCrash } from './crashLog';

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;

interface ErrorUtilsLike {
  getGlobalHandler(): GlobalErrorHandler | null | undefined;
  setGlobalHandler(handler: GlobalErrorHandler): void;
}

let installed = false;

/**
 * 把渲染期之外的 JS 异常（事件回调、定时器、Promise）也写进崩溃日志。
 * ErrorBoundary 只能接住 render 阶段的错误，这一层才是"闪退"的兜底留痕。
 */
export function installGlobalErrorLog(): void {
  if (installed) return;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return;
  installed = true;

  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void appendCrash('GlobalJS', error, `isFatal=${String(isFatal)}`);
    // 保留原 handler：开发期仍然要弹红屏/LogBox
    if (previous) previous(error, isFatal);
  });
}
