import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getAllDescendantIds(kpId: bigint): Promise<bigint[]> {
  const ids: bigint[] = [kpId];
  const children = await prisma.knowledgePoint.findMany({
    where: { parentId: kpId },
    select: { id: true },
  });
  for (const child of children) {
    const childIds = await getAllDescendantIds(child.id);
    ids.push(...childIds);
  }
  return ids;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  const allKpIds = await getAllDescendantIds(BigInt(id));

  const where = {
    knowledgePointId: { in: allKpIds },
  };

  const [relations, total] = await Promise.all([
    prisma.questionKnowledgePoint.findMany({
      where,
      select: { questionId: true },
      distinct: ["questionId"],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.questionKnowledgePoint.count({
      where: {
        knowledgePointId: { in: allKpIds },
        question: {},
      },
    }),
  ]);

  const questionIds = relations.map((r) => r.questionId);

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
    .filter(Boolean);

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
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
    total: questionIds.length,
    page,
    pageSize,
  });
}
