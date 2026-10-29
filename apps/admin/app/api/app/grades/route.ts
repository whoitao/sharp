import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 年级册别列表：必须按 subjectId + publisherId 过滤，教材版本跨科目共享但年级是科目维度 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const publisherId = url.searchParams.get("publisherId");

  if (!subjectId || !publisherId) {
    return NextResponse.json(
      { error: "subjectId and publisherId are required" },
      { status: 400 },
    );
  }

  const grades = await prisma.grade.findMany({
    where: { subjectId: BigInt(subjectId), publisherId: BigInt(publisherId) },
    orderBy: [{ level: "asc" }, { semester: "asc" }],
    include: { _count: { select: { chapters: true } } },
  });

  return NextResponse.json(
    grades.map((g) => ({
      id: g.id.toString(),
      subjectId: g.subjectId.toString(),
      publisherId: g.publisherId.toString(),
      level: g.level,
      semester: g.semester,
      name: g.name,
      sortOrder: g.sortOrder,
      chapterCount: g._count.chapters,
    })),
  );
}
