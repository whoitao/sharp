import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * 供 admin 保存站点设置后主动失效 Web 缓存。
 * 未配置 REVALIDATE_SECRET 时直接拒绝，避免任意请求清缓存。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "revalidate is not configured" }, { status: 503 });
  }
  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ error: "tag is required" }, { status: 400 });
  }

  // expire: 0 表示立即过期，保证保存后下一次请求就能读到新配置
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
