import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 解析学段：优先 stageId，其次按学段名称匹配；两者都无效返回 null */
async function resolveStageId(
  stageId?: string | number | null,
  stageName?: string | null,
): Promise<bigint | null> {
  if (stageId != null && stageId !== "") {
    const stage = await prisma.stage.findUnique({
      where: { id: BigInt(stageId) },
      select: { id: true },
    });
    return stage?.id ?? null;
  }
  if (stageName) {
    const stage = await prisma.stage.findUnique({
      where: { name: stageName },
      select: { id: true },
    });
    return stage?.id ?? null;
  }
  return null;
}

/** 年级字典：纯年级（初一/高一…），与科目、教材版本无关 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const stageId = url.searchParams.get("stageId");
  const stageName = url.searchParams.get("stage");

  const grades = await prisma.grade.findMany({
    where: stageId
      ? { stageId: BigInt(stageId) }
      : stageName
        ? { stage: { name: stageName } }
        : undefined,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { chapters: true } }, stage: { select: { name: true } } },
  });

  return NextResponse.json(
    grades.map((g) => ({
      id: g.id.toString(),
      name: g.name,
      stageId: g.stageId.toString(),
      stage: g.stage.name,
      sortOrder: g.sortOrder,
      chapterCount: g._count.chapters,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, stageId, stage, sortOrder } = body;
  const resolvedStageId = await resolveStageId(stageId, stage);
  if (!name?.trim() || !resolvedStageId) {
    return NextResponse.json({ error: "name 与合法 stageId 必填" }, { status: 400 });
  }

  const grade = await prisma.grade.create({
    data: {
      name: name.trim(),
      stageId: resolvedStageId,
      sortOrder: sortOrder ?? 0,
    },
    include: { stage: { select: { name: true } } },
  });
  return NextResponse.json(
    {
      id: grade.id.toString(),
      name: grade.name,
      stageId: grade.stageId.toString(),
      stage: grade.stage.name,
      sortOrder: grade.sortOrder,
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.stageId !== undefined || body.stage !== undefined) {
    const resolvedStageId = await resolveStageId(body.stageId, body.stage);
    if (!resolvedStageId) return NextResponse.json({ error: "stageId 非法" }, { status: 400 });
    data.stageId = resolvedStageId;
  }
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;

  const grade = await prisma.grade.update({
    where: { id: BigInt(id) },
    data,
    include: { stage: { select: { name: true } } },
  });
  return NextResponse.json({
    id: grade.id.toString(),
    name: grade.name,
    stageId: grade.stageId.toString(),
    stage: grade.stage.name,
    sortOrder: grade.sortOrder,
  });
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const bigId = BigInt(id);
  const [chapterCount, questionCount] = await Promise.all([
    prisma.chapter.count({ where: { gradeId: bigId } }),
    prisma.question.count({ where: { gradeId: bigId } }),
  ]);
  if (chapterCount > 0 || questionCount > 0) {
    return NextResponse.json(
      { error: `该年级仍有 ${chapterCount} 个章节、${questionCount} 道题目，不能删除` },
      { status: 409 },
    );
  }
  await prisma.grade.delete({ where: { id: bigId } });
  return NextResponse.json({ ok: true });
}
