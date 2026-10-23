type InFlightEntry = {
  promise: Promise<unknown>;
  /** 发起时快照的代号，用于识别「清缓存后仍复用旧请求结果」的情况 */
  generation: number;
};

const inFlight = new Map<string, InFlightEntry>();
let generation = 0;

/**
 * 合并同 key 的并发请求：多个屏幕同时挂载时只发一次网络请求。
 * 请求结束（成功或失败）后立即移除，不影响之后的主动刷新。
 */
export function dedupeInFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing && existing.generation === generation) {
    return existing.promise as Promise<T>;
  }

  const promise = task();
  const entry: InFlightEntry = { promise, generation };
  inFlight.set(key, entry);
  promise.finally(() => {
    if (inFlight.get(key) === entry) inFlight.delete(key);
  });
  return promise;
}

/** 本地缓存被清空后调用，使尚未结束的 in-flight 请求不再被复用 */
export function bumpInFlightGeneration(): void {
  generation += 1;
}
