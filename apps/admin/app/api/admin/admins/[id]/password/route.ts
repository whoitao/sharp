import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { resolveActor } from "@/lib/admin-guard";
import { hashPassword } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";

// 重置管理员密码；非 super 不得修改 super 账号
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await requirePermission(request, "admins");
  if (current instanceof NextResponse) return current;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const target = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, role: true, adminRole: { select: { code: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "管理员不存在" }, { status: 404 });
    }

    const actor = await resolveActor(current);
    const targetRole = target.adminRole?.code ?? target.role;
    if (targetRole === "super" && actor.role !== "super") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.admin.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "admin/admins/password");
  }
}
