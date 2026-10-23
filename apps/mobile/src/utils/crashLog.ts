import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CrashEntry {
  /** ISO 时间戳 */
  at: string;
  /** 出错位置标识，如 StudyTab / App */
  scope: string;
  message: string;
  stack: string;
}

const CRASH_KEY = '@sharp/crash/v1';
const MAX_ENTRIES = 20;
const MAX_STACK_CHARS = 4000;
const MAX_MESSAGE_CHARS = 300;

/** 追加一条崩溃记录；任何异常都吞掉，记录日志本身不能把应用再搞崩 */
export async function appendCrash(scope: string, error: unknown, extra?: string): Promise<void> {
  try {
    const message =
      error instanceof Error ? error.message : String(error ?? 'Unknown error');
    const rawStack = error instanceof Error ? error.stack ?? '' : '';
    const stack = [rawStack, extra].filter(Boolean).join('\n').slice(0, MAX_STACK_CHARS);

    const entry: CrashEntry = {
      at: new Date().toISOString(),
      scope,
      message: message.slice(0, MAX_MESSAGE_CHARS),
      stack,
    };

    const next = [entry, ...(await readCrashes())].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(CRASH_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** 读取崩溃记录，最新在前；数据损坏时返回空数组 */
export async function readCrashes(): Promise<CrashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CrashEntry =>
        !!item && typeof (item as CrashEntry).at === 'string' && typeof (item as CrashEntry).message === 'string'
    );
  } catch {
    return [];
  }
}

export async function clearCrashes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CRASH_KEY);
  } catch {
    // ignore
  }
}
