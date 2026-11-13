import { FeedbackError, addUserReply, getUserFeedback } from "@/lib/feedback";
import { requireAppUser } from "@/lib/middleware";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** 我的反馈详情：打开即标记已读，返回对外回复时间线 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  const feedback = await getUserFeedback(appUser.id, id);
  if (!feedback) {
    return NextResponse.json({ error: "反馈不存在", code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(feedback);
}

/** 用户追问（纯文本） */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const reply = await addUserReply(appUser.id, id, body.content);
    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    if (err instanceof FeedbackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[feedback] user reply failed", err);
    return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 500 });
  }
}
