import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { applyScopeFilter } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const stageId = searchParams.get("stageId");
  const gradeIdRaw = searchParams.get("gradeId");
  const publisherIdRaw = searchParams.get("publisherId");
  const gradeId = gradeIdRaw ? BigInt(gradeIdRaw) : null;
  const publisherId = publisherIdRaw ? BigInt(publisherIdRaw) : null;

  const where: any = {};
  if (subjectId) {
    where.subjectId = BigInt(subjectId);
  }
  if (stageId) {
    where.stageId = BigInt(stageId);
  }

  const knowledgePoints = await prisma.knowledgePoint.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  // 年级/教材版本过滤：按「知识点 → 题目 → 年级 / 章节版本」链路重算每个知识点的题数
  // 与 units、study/start、知识点取题接口共用同一口径（教材版本不误伤无章节的真题/词汇题）
  const filtering = gradeId !== null || publisherId !== null;
  let filteredCounts: Map<string, number> | null = null;
  if (filtering) {
    const questionFilter = applyScopeFilter({}, { gradeId, publisherId });
    const grouped = await prisma.questionKnowledgePoint.groupBy({
      by: ["knowledgePointId"],
      where: { question: questionFilter },
      _count: { _all: true },
    });
    filteredCounts = new Map(
      grouped.map((g) => [g.knowledgePointId.toString(), g._count._all]),
    );
  }

  const serialize = (kp: any) => ({
    id: kp.id.toString(),
    name: kp.name,
    parentId: kp.parentId?.toString() ?? null,
    subjectId: kp.subjectId?.toString() ?? null,
    stageId: kp.stageId.toString(),
    sortOrder: kp.sortOrder,
    questionCount: filteredCounts
      ? (filteredCounts.get(kp.id.toString()) ?? 0)
      : kp._count.questions,
  });

  const items = knowledgePoints.map(serialize);

  const buildTree = (parentId: string | null): any[] => {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => {
        const children = buildTree(item.id);
        return {
          ...item,
          children,
          // 父节点的题数需要包含所有下级知识点，便于选择时判断分支体量
          questionCount: item.questionCount + children.reduce((sum, child) => sum + child.questionCount, 0),
        };
      })
      // 过滤模式下裁剪题数为 0 的空分支，用户只能看到当前年级/版本下有题可刷的知识点
      .filter((item) => (filtering ? item.questionCount > 0 : true));
  };

  return NextResponse.json(buildTree(null));
}
