/**
 * 屏蔽 React 19 + react-native-web 里我们改不动的三方库内部噪音。
 * 例如 RNW 0.20 的 createDOMProps 仍在兼容旧的 `props.pointerEvents`，
 * React 19 对这类非标准 DOM props 会发出弃用提示，业务代码又没法改它。
 */

let installed = false;

/** 已知的、应当静默的 RNW / React 内部弃用提示子串 */
const FILTERED_WARN_MESSAGES: readonly string[] = [
  'props.pointerEvents is deprecated',
];

/** 已知的、应当静默的 RNW / React 内部弃用提示子串 */
const FILTERED_ERROR_MESSAGES: readonly string[] = [];

function shouldFilter(message: unknown, blockedList: readonly string[]): boolean {
  if (typeof message !== 'string') return false;
  return blockedList.some((needle) => message.includes(needle));
}

export function installConsoleFilters(): void {
  if (installed) return;
  // 只在 web 端启用过滤，原生端（iOS / Android）没有 React 19 DOM props 这一层校验
  if (!(globalThis as { __DEV__?: boolean }).__DEV__) {
    // 生产构建下也不需要这个 hook
    return;
  }
  installed = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    if (shouldFilter(args[0], FILTERED_WARN_MESSAGES)) return;
    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    if (shouldFilter(args[0], FILTERED_ERROR_MESSAGES)) return;
    originalError(...args);
  };
}
