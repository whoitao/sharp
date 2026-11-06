import { isSameOrigin } from "@/lib/auth/csrf";
import { destroySession } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/auth/logout：清除会话 Cookie */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin", code: "INVALID_ORIGIN" },
      { status: 403 },
    );
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
