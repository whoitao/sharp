import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { applyScopeFilter } from "@/lib/textbook";
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
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  const allKpIds = await getAllDescendantIds(BigInt(id));

  // 年级/教材版本过滤：与知识点树接口同一口径，保证「看到的树」和「刷到的题」一致
  const gradeIdRaw = searchParams.get("gradeId");
  const publisherIdRaw = searchParams.get("publisherId");
  const questionFilter = applyScopeFilter(
    {},
    {
      gradeId: gradeIdRaw ? BigInt(gradeIdRaw) : null,
      publisherId: publisherIdRaw ? BigInt(publisherIdRaw) : null,
    },
  );

  const relations = await prisma.questionKnowledgePoint.findMany({
    where: {
      knowledgePointId: { in: allKpIds },
      ...(Object.keys(questionFilter).length > 0 ? { question: questionFilter } : {}),
    },
    select: { questionId: true },
    distinct: ["questionId"],
  });

  const questionIds = relations.map((r) => r.questionId);
  const total = questionIds.length;

  const pagedIds = questionIds.slice((page - 1) * pageSize, page * pageSize);

  const questions = await prisma.question.findMany({
    where: { id: { in: pagedIds } },
    include: {
      options: { orderBy: { sortNo: "asc" } },
      knowledgePoints: {
        include: { knowledgePoint: true },
      },
    },
  });

  const questionMap = new Map(questions.map((q) => [q.id.toString(), q]));
  const ordered = pagedIds
    .map((qid) => questionMap.get(qid.toString()))
    .filter(Boolean);

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    gradeId: q.gradeId?.toString() ?? null,
    subjectId: q.subjectId?.toString() ?? null,
    options: q.options.map((o: any) => ({
      ...o,
      id: o.id.toString(),
      questionId: o.questionId.toString(),
    })),
    knowledgePoints: q.knowledgePoints.map((qkp: any) => ({
      id: qkp.knowledgePoint.id.toString(),
      name: qkp.knowledgePoint.name,
    })),
  });

  return NextResponse.json({
    items: ordered.map(serialize),
    total,
    page,
    pageSize,
  });
}
