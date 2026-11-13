import { listFeedbacks } from "@/lib/feedback";
import { requirePermission } from "@/lib/middleware";
import { parsePageParams } from "@/lib/query";
import { NextRequest, NextResponse } from "next/server";

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** 后台反馈列表：支持状态、来源、关键词、用户与时间范围筛选 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "feedback");
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const { page, pageSize, skip } = parsePageParams(url.searchParams, { defaultPageSize: 20 });

  const result = await listFeedbacks({
    status: url.searchParams.get("status") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    keyword: url.searchParams.get("keyword")?.trim() || undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    from: parseDate(url.searchParams.get("from")),
    to: parseDate(url.searchParams.get("to")),
    page,
    pageSize,
    skip,
  });

  return NextResponse.json({ ...result, page, pageSize });
}
