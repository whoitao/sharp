import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");

  const where: any = {};
  if (subjectId) {
    where.subjectId = BigInt(subjectId);
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

  const serialize = (kp: any) => ({
    id: kp.id.toString(),
    name: kp.name,
    parentId: kp.parentId?.toString() ?? null,
    subjectId: kp.subjectId?.toString() ?? null,
    sortOrder: kp.sortOrder,
    questionCount: kp._count.questions,
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
      });
  };

  return NextResponse.json(buildTree(null));
}
