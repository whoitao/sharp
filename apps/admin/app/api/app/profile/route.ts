import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GENDERS = new Set(["male", "female"]);
// 中国大陆手机号：1 开头 11 位
const PHONE_RE = /^1\d{10}$/;

/**
 * 更新当前用户资料：昵称 / 性别 / 手机号，均为可选字段，至少传一个。
 * PATCH body: { nickname?: string; gender?: "male" | "female"; phone?: string }
 */
export async function PATCH(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  let body: { nickname?: unknown; gender?: unknown; phone?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const data: { nickname?: string; gender?: string; phone?: string } = {};

  if (body?.nickname !== undefined) {
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    if (!nickname) {
      return NextResponse.json({ error: "nickname is required" }, { status: 400 });
    }
    if (nickname.length > 24) {
      return NextResponse.json(
        { error: "nickname must be at most 24 characters" },
        { status: 400 }
      );
    }
    data.nickname = nickname;
  }

  if (body?.gender !== undefined) {
    if (typeof body.gender !== "string" || !GENDERS.has(body.gender)) {
      return NextResponse.json({ error: "invalid gender" }, { status: 400 });
    }
    data.gender = body.gender;
  }

  if (body?.phone !== undefined) {
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "invalid phone" }, { status: 400 });
    }
    data.phone = phone;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: appUser.id },
    data,
    select: { nickname: true, gender: true, phone: true },
  });

  return NextResponse.json(user);
}
