import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 撤回已发布消息：保留已读记录用于审计 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await prisma.notification.findUnique({ where: { id: BigInt(id) } });
    if (!existing) return NextResponse.json({ error: "消息不存在" }, { status: 404 });
    if (existing.status !== "published") {
      return NextResponse.json({ error: "仅已发布的消息可以撤回" }, { status: 409 });
    }

    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: { status: "revoked", revokedAt: new Date() },
    });
    return NextResponse.json({ id: notification.id.toString(), status: notification.status });
  } catch (err) {
    return handleRouteError(err, "notifications revoke");
  }
}
