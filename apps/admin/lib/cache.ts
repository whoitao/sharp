/**
 * 进程内短 TTL 缓存：用于统计类只读接口，减少同一实例上的重复聚合查询。
 * 注意：多实例部署时各实例缓存互不共享，最多产生一个 TTL 的陈旧窗口。
 */
const MAX_ENTRIES = 100;

const store = new Map<string, { value: unknown; expiresAt: number }>();

export async function withTtlCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const value = await loader();
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, entry] of store) {
      if (entry.expiresAt <= now) store.delete(k);
    }
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** 测试/调试用：清空缓存。 */
export function clearTtlCache() {
  store.clear();
}
