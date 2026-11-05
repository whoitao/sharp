import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/http";
import { parseBigIntParam } from "@/lib/query";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "knowledge-points");
  if (admin instanceof NextResponse) return admin;

  try {
    const { searchParams } = new URL(request.url);
    const subjectId = parseBigIntParam(searchParams.get("subjectId"), "subjectId");
    const stageId = parseBigIntParam(searchParams.get("stageId"), "stageId");

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where: { subjectId, stageId },
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
    stageId: kp.stageId.toString(),
    sortOrder: kp.sortOrder,
    questionCount: kp._count.questions,
    createdAt: kp.createdAt,
    updatedAt: kp.updatedAt,
  });

  const items = knowledgePoints.map(serialize);

  // parentId → children 索引：避免每一层都 filter 一遍全量数组（O(n²)）
  const childrenMap = new Map<string | null, typeof items>();
  for (const item of items) {
    const key = item.parentId;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(item);
  }

  const buildTree = (parentId: string | null): any[] =>
    (childrenMap.get(parentId) ?? []).map((item) => ({
      ...item,
      children: buildTree(item.id),
    }));

  return NextResponse.json(buildTree(null));
  } catch (err) {
    return handleRouteError(err, "admin/knowledge-points");
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "knowledge-points");
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, parentId, subjectId, stageId, sortOrder } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // 学段可显式指定，也可从父节点继承；两者都没有则拒绝，避免产生跨学段脏数据
  let resolvedStageId: bigint | null = stageId ? BigInt(stageId) : null;
  let parentNode: { stageId: bigint; subjectId: bigint | null } | null = null;
  if (parentId) {
    parentNode = await prisma.knowledgePoint.findUnique({
      where: { id: BigInt(parentId) },
      select: { stageId: true, subjectId: true },
    });
    if (!parentNode) {
      return NextResponse.json({ error: "父知识点不存在" }, { status: 400 });
    }
    if (!resolvedStageId) resolvedStageId = parentNode.stageId;
    if (resolvedStageId !== parentNode.stageId) {
      return NextResponse.json({ error: "子知识点学段必须与父节点一致" }, { status: 400 });
    }
  }
  if (!resolvedStageId) {
    return NextResponse.json({ error: "stageId is required" }, { status: 400 });
  }

  const data: any = {
    name: name.trim(),
    sortOrder: sortOrder ?? 0,
    stageId: resolvedStageId,
  };
  if (parentId) data.parentId = BigInt(parentId);
  const resolvedSubjectId = subjectId
    ? BigInt(subjectId)
    : parentNode?.subjectId ?? null;
  if (resolvedSubjectId) data.subjectId = resolvedSubjectId;

  const kp = await prisma.knowledgePoint.create({ data });

  return NextResponse.json(
    {
      id: kp.id.toString(),
      name: kp.name,
      parentId: kp.parentId?.toString() ?? null,
      subjectId: kp.subjectId?.toString() ?? null,
      stageId: kp.stageId.toString(),
      sortOrder: kp.sortOrder,
      createdAt: kp.createdAt,
    },
    { status: 201 }
  );
}
