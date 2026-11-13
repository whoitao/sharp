import {
  FeedbackError,
  createFeedback,
  listUserFeedbacks,
} from "@/lib/feedback";
import { requireAppUser } from "@/lib/middleware";
import { parsePageParams } from "@/lib/query";
import { checkLimit, recordFailure } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/** 提交频率：同一用户 1 分钟 1 条、1 小时 5 条（进程内计数，多实例会放大） */
function checkSubmitRate(userId: string): NextResponse | null {
  const minute = checkLimit(`feedback:min:${userId}`, 1, 60_000);
  if (!minute.allowed) {
    return NextResponse.json(
      { error: "提交过于频繁，请稍后再试", code: "RATE_LIMITED", retryAfter: minute.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(minute.retryAfterSeconds) } },
    );
  }
  const hour = checkLimit(`feedback:hour:${userId}`, 5, 3600_000);
  if (!hour.allowed) {
    return NextResponse.json(
      { error: "提交过于频繁，请稍后再试", code: "RATE_LIMITED", retryAfter: hour.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(hour.retryAfterSeconds) } },
    );
  }
  return null;
}

/** 我的反馈列表 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const url = new URL(request.url);
  const { page, pageSize, skip } = parsePageParams(url.searchParams, { defaultPageSize: 20 });
  const status = url.searchParams.get("status") ?? undefined;

  const result = await listUserFeedbacks(appUser.id, { page, pageSize, skip, status });
  return NextResponse.json({ ...result, page, pageSize });
}

/** 提交反馈：正文为富文本 HTML，服务端清洗后落库 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const limited = checkSubmitRate(appUser.id);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawSource = (request.headers.get("x-client-source") ?? "web").toLowerCase();
  const source = rawSource === "app" || rawSource === "mobile" ? "app" : "web";

  try {
    const feedback = await createFeedback({
      userId: appUser.id,
      contentHtml: body.content,
      category: typeof body.category === "string" ? body.category : null,
      source,
      pageContext: typeof body.pageContext === "string" ? body.pageContext : null,
      clientVersion: typeof body.clientVersion === "string" ? body.clientVersion : null,
      contact: typeof body.contact === "string" ? body.contact : null,
    });

    recordFailure(`feedback:min:${appUser.id}`, 60_000);
    recordFailure(`feedback:hour:${appUser.id}`, 3600_000);

    return NextResponse.json(
      { id: feedback.id, status: feedback.status, createdAt: feedback.createdAt },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof FeedbackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[feedback] create failed", err);
    return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 500 });
  }
}
