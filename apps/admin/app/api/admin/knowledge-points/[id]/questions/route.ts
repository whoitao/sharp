import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { handleRouteError } from "@/lib/http";
import { parseBigIntId, parsePageParams } from "@/lib/query";

/** 一次性查出整棵知识点树，在内存里收集后代，避免按层级递归查库（N+1）。 */
async function getAllDescendantIds(kpId: bigint): Promise<bigint[]> {
  const all = await prisma.knowledgePoint.findMany({
    select: { id: true, parentId: true },
  });
  const childrenMap = new Map<string, bigint[]>();
  for (const kp of all) {
    const key = kp.parentId?.toString() ?? "";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(kp.id);
  }

  const ids: bigint[] = [kpId];
  const collect = (id: bigint) => {
    for (const childId of childrenMap.get(id.toString()) ?? []) {
      ids.push(childId);
      collect(childId);
    }
  };
  collect(kpId);
  return ids;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "knowledge-points");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const kpId = parseBigIntId(id, "id");
    const { page, pageSize, skip } = parsePageParams(new URL(request.url).searchParams, {
      defaultPageSize: 20,
    });

    const allKpIds = await getAllDescendantIds(kpId);

    // distinct 题目数 + 当前页题目 id 都用同一套去重口径，保证 total 与列表一致
    const [countRows, pageRows] = await Promise.all([
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "questionId")::int AS count
        FROM "QuestionKnowledgePoint"
        WHERE "knowledgePointId" IN (${Prisma.join(allKpIds)})
      `),
      prisma.$queryRaw<Array<{ questionId: bigint }>>(Prisma.sql`
        SELECT DISTINCT "questionId"
        FROM "QuestionKnowledgePoint"
        WHERE "knowledgePointId" IN (${Prisma.join(allKpIds)})
        ORDER BY "questionId"
        LIMIT ${pageSize} OFFSET ${skip}
      `),
    ]);

    const total = countRows[0]?.count ?? 0;
    const questionIds = pageRows.map((r) => r.questionId);

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        options: { orderBy: { sortNo: "asc" } },
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
      },
    });

    const questionMap = new Map(questions.map((q) => [q.id.toString(), q]));
    const ordered = questionIds
      .map((qid) => questionMap.get(qid.toString()))
      .filter((q): q is NonNullable<typeof q> => q != null);

    const serialize = (q: any) => ({
      ...q,
      id: q.id.toString(),
      subjectId: q.subjectId?.toString() ?? null,
      options: q.options.map((o: any) => ({
        ...o,
        id: o.id.toString(),
        questionId: o.questionId.toString(),
      })),
      knowledgePoints: q.knowledgePoints.map((qkp: any) => ({
        id: qkp.knowledgePoint.id.toString(),
        name: qkp.knowledgePoint.name,
        parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
      })),
    });

    return NextResponse.json({
      items: ordered.map(serialize),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    return handleRouteError(err, "admin/knowledge-points/questions");
  }
}
