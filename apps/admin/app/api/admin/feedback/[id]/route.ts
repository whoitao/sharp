import { FeedbackError, getFeedbackDetail, updateFeedbackStatus } from "@/lib/feedback";
import { requirePermission } from "@/lib/middleware";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** 后台反馈详情：含用户信息与完整时间线（内部备注也返回） */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requirePermission(request, "feedback");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const detail = await getFeedbackDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "反馈不存在", code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

/** 状态流转：closed / replied / pending */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requirePermission(request, "feedback");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await updateFeedbackStatus(id, body.status);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FeedbackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[admin-feedback] update status failed", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
