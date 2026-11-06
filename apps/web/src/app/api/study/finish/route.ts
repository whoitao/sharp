import { adminApiBase } from "@/lib/auth/config";
import { isSameOrigin } from "@/lib/auth/csrf";
import { readSessionToken } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

/**
 * Web 答题结算（幂等）。
 *
 * 为什么不在页面里直接打 /api/app/study/finish：
 * 后端每次调用都会新建一条 StudyAttempt，没有幂等键；重复点击或网络重试
 * 会重复累计答题数。移动端历史上也是这么调的，不能在 /api/app/** 里改行为，
 * 因此在 Web 的 BFF 层按 clientSessionId 做一次「成功即缓存」的幂等。
 *
 * 局限（已在交付说明中披露）：
 * - 缓存是进程内的，实例重启或多实例部署时可能各自放行一次。
 * - 结算结果仍以客户端上报为准，BFF 只能保证计数与作答明细自洽。
 */

interface AnswerInput {
  questionId: string;
  selectedKeys: string[];
  isCorrect: boolean;
}

interface FinishPayload {
  /** 章节模式为章节 id；知识点/题库模式为 null（校验由 admin 侧按 subjectId 完成） */
  chapterId: string | null;
  unitIndex: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  answers: AnswerInput[];
  clientSessionId: string;
  gradeId?: string | null;
  subjectId?: string | null;
  knowledgePointId?: string | null;
  tagIds?: string[];
}

interface CachedResponse {
  status: number;
  body: string;
  contentType: string;
  idempotent: "hit" | "miss";
}

const MAX_CACHED_SESSIONS = 500;

const settled = new Map<string, CachedResponse>();
const inflight = new Map<string, Promise<CachedResponse>>();

function remember(key: string, value: CachedResponse) {
  settled.set(key, value);
  if (settled.size > MAX_CACHED_SESSIONS) {
    const oldest = settled.keys().next().value;
    if (oldest !== undefined) settled.delete(oldest);
  }
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function normalizeAnswer(raw: unknown): AnswerInput | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const questionId = typeof item.questionId === "string" ? item.questionId : null;
  if (!questionId || !/^\d+$/.test(questionId)) return null;
  const selectedKeys = Array.isArray(item.selectedKeys)
    ? item.selectedKeys.filter((key): key is string => typeof key === "string")
    : [];
  return { questionId, selectedKeys, isCorrect: item.isCorrect === true };
}

function parsePayload(body: unknown): FinishPayload | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const chapterId =
    typeof raw.chapterId === "string" && /^\d+$/.test(raw.chapterId)
      ? raw.chapterId
      : null;
  const subjectId =
    typeof raw.subjectId === "string" && /^\d+$/.test(raw.subjectId)
      ? raw.subjectId
      : null;
  const knowledgePointId =
    typeof raw.knowledgePointId === "string" && /^\d+$/.test(raw.knowledgePointId)
      ? raw.knowledgePointId
      : null;
  const clientSessionId =
    typeof raw.clientSessionId === "string" ? raw.clientSessionId.trim() : "";
  const answers = Array.isArray(raw.answers)
    ? raw.answers.map(normalizeAnswer).filter((item): item is AnswerInput => item !== null)
    : null;

  // 章节模式必须有 chapterId；知识点/题库模式必须有 subjectId（与 admin 侧校验口径一致）
  if (
    (!chapterId && !subjectId) ||
    !clientSessionId ||
    clientSessionId.length > 128 ||
    !isNonNegativeInt(raw.unitIndex) ||
    !isNonNegativeInt(raw.durationSeconds) ||
    !answers ||
    answers.length !== (raw.answers as unknown[]).length
  ) {
    return null;
  }

  // 计数以作答明细重算，避免客户端上报的 correctCount/wrongCount 自相矛盾
  const correctCount = answers.filter((answer) => answer.isCorrect).length;

  return {
    chapterId,
    unitIndex: raw.unitIndex,
    correctCount,
    wrongCount: answers.length - correctCount,
    durationSeconds: raw.durationSeconds,
    answers,
    clientSessionId,
    gradeId: typeof raw.gradeId === "string" ? raw.gradeId : null,
    subjectId,
    knowledgePointId,
    tagIds: Array.isArray(raw.tagIds)
      ? raw.tagIds.filter((tag): tag is string => typeof tag === "string")
      : undefined,
  };
}

async function forward(token: string, payload: FinishPayload): Promise<CachedResponse> {
  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBase()}/api/app/study/finish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return {
      status: 502,
      body: JSON.stringify({ error: "Upstream unavailable", code: "UPSTREAM_UNAVAILABLE" }),
      contentType: "application/json",
      idempotent: "miss",
    };
  }

  return {
    status: upstream.status,
    body: await upstream.text(),
    contentType: upstream.headers.get("content-type") ?? "application/json",
    idempotent: "miss",
  };
}

async function settleOnce(
  key: string,
  token: string,
  payload: FinishPayload,
): Promise<CachedResponse> {
  const cached = settled.get(key);
  if (cached) return { ...cached, idempotent: "hit" };

  // 并发重复提交共享同一个上游请求
  const pending = inflight.get(key);
  if (pending) {
    const result = await pending;
    return { ...result, idempotent: "hit" };
  }

  const task = (async () => {
    const result = await forward(token, payload);
    // 只有成功结算才记入幂等表；失败保留重试能力
    if (result.status >= 200 && result.status < 300) remember(key, result);
    return result;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export async function POST(request: NextRequest) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin", code: "INVALID_ORIGIN" },
      { status: 403 },
    );
  }

  let payload: FinishPayload | null = null;
  try {
    payload = parsePayload(await request.json());
  } catch {
    payload = null;
  }
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // 会话标识由用户维度隔离，避免不同账号的 clientSessionId 撞车；
  // 章节与知识点两种范围分别拼 key，防止同 unitIndex 的不同范围互相命中幂等缓存
  const scopeKey = payload.chapterId
    ? `c${payload.chapterId}`
    : `s${payload.subjectId}:kp${payload.knowledgePointId ?? ""}`;
  const key = `${token}:${scopeKey}:${payload.unitIndex}:${payload.clientSessionId}`;
  const result = await settleOnce(key, token, payload);

  return new NextResponse(result.body, {
    status: result.status,
    headers: {
      "content-type": result.contentType,
      "cache-control": "no-store",
      "x-quiz-idempotent": result.idempotent,
    },
  });
}
