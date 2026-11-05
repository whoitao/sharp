/**
 * 进程内滑动窗口限流：记录每个 key 在窗口内的失败次数。
 * 多实例部署时各实例独立计数，实际阈值会被放大（实例数 × limit），
 * 需要全局限流时应替换为 Redis 等共享存储。
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
}

export interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** 检查是否已超过窗口内允许的失败次数（只读）。 */
export function checkLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** 记录一次失败。 */
export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
}

/** 成功后清零（例如账号维度）。 */
export function resetLimit(key: string) {
  buckets.delete(key);
}

/**
 * 从请求头取客户端 IP。
 * 不再信任 x-forwarded-for 的第一个条目（客户端可任意伪造）；
 * 优先使用反代写入的 x-real-ip，否则取 XFF 里代理最后追加的地址。
 * 前提：服务部署在可信反向代理之后，由代理覆盖/追加这两个头。
 */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return "unknown";
}
