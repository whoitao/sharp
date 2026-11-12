import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 首次登录「选择教材」引导的本地兜底标记。
 * 服务端 UserSettings.scopeHintSeenAt 是主标记；这里只负责：
 * 1) 服务端写入失败时，保证同一设备不重复弹；
 * 2) 记录「待上报」，下次启动设置加载后静默补写。
 */
const KEY_PREFIX = '@sharp/scope-hint-seen:';

interface ScopeHintRecord {
  /** 本设备处理引导的时间 */
  seenAt: string;
  /** true = 还没成功写入服务端 */
  pending: boolean;
}

const storageKey = (userId: string) => `${KEY_PREFIX}${userId}`;

async function readRecord(userId: string): Promise<ScopeHintRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScopeHintRecord>;
    if (!parsed?.seenAt) return null;
    return { seenAt: parsed.seenAt, pending: parsed.pending === true };
  } catch {
    return null;
  }
}

async function writeRecord(userId: string, record: ScopeHintRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(record));
  } catch {
    // 本地存储失败不阻塞引导关闭，服务端标记仍会尝试写入
  }
}

/** 本设备是否已处理过引导（无论是否已上报成功） */
export async function hasSeenScopeHint(userId: string): Promise<boolean> {
  return (await readRecord(userId)) !== null;
}

/** 标记本设备已处理引导，并记一笔待上报 */
export async function markScopeHintSeen(userId: string): Promise<void> {
  await writeRecord(userId, { seenAt: new Date().toISOString(), pending: true });
}

/** 是否有尚未成功上报服务端的标记 */
export async function hasPendingScopeHint(userId: string): Promise<boolean> {
  const record = await readRecord(userId);
  return record?.pending === true;
}

/** 服务端写入成功后清除待上报状态 */
export async function clearPendingScopeHint(userId: string): Promise<void> {
  const record = await readRecord(userId);
  if (!record) return;
  await writeRecord(userId, { ...record, pending: false });
}
