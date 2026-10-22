import AsyncStorage from '@react-native-async-storage/async-storage';

/** 缓存有效期：24 小时 */
export const STUDY_CACHE_TTL = 24 * 60 * 60 * 1000;

const CACHE_PREFIX = '@sharp/study/';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function cacheKey(name: string, suffix?: string): string {
  return `${CACHE_PREFIX}${name}${suffix ? `:${suffix}` : ''}`;
}

/** 读取缓存，过期或不存在返回 null */
export async function getCached<T>(name: string, suffix?: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(name, suffix));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > STUDY_CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** 写入缓存 */
export async function setCached<T>(name: string, data: T, suffix?: string): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(cacheKey(name, suffix), JSON.stringify(entry));
  } catch {
    // 存储空间不足或序列化失败时静默忽略
  }
}

/** 判断学习页搜索数据是否全部有有效缓存（分类/科目/知识点） */
export async function hasStudyCache(): Promise<boolean> {
  const keys = [
    cacheKey('categories', '0'),
    cacheKey('subjects'),
    cacheKey('knowledgePoints'),
  ];
  try {
    const raws = await AsyncStorage.multiGet(keys);
    const now = Date.now();
    return raws.every(([, raw]) => {
      if (!raw) return false;
      try {
        const entry: CacheEntry<unknown> = JSON.parse(raw);
        return now - entry.timestamp <= STUDY_CACHE_TTL;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/** 清空学习页搜索缓存（用于手动刷新或登出） */
export async function clearStudyCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const studyKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (studyKeys.length > 0) await AsyncStorage.multiRemove(studyKeys);
  } catch {
    // ignore
  }
}
