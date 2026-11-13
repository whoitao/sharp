import { FeedbackError, addAdminReply } from "@/lib/feedback";
import { requirePermission } from "@/lib/middleware";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** 管理员回复 / 内部备注 */
export async function POST(request: NextRequest, { params }: RouteContext) {
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
    const reply = await addAdminReply({
      feedbackId: id,
      adminId: admin.id,
      rawContent: body.content,
      isInternal: body.isInternal === true,
    });
    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    if (err instanceof FeedbackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[admin-feedback] reply failed", err);
    return NextResponse.json({ error: "回复失败" }, { status: 500 });
  }
}
