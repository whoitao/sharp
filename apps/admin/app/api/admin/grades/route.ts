import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const STAGES = ["小学", "初中", "高中", "大学"];

/** 年级字典：纯年级（初一/高一…），与科目、教材版本无关 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage");

  const grades = await prisma.grade.findMany({
    where: stage ? { stage } : undefined,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { chapters: true } } },
  });

  return NextResponse.json(
    grades.map((g) => ({
      id: g.id.toString(),
      name: g.name,
      stage: g.stage,
      sortOrder: g.sortOrder,
      chapterCount: g._count.chapters,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, stage, sortOrder } = body;
  if (!name?.trim() || !STAGES.includes(stage)) {
    return NextResponse.json({ error: "name 与合法 stage 必填" }, { status: 400 });
  }

  const grade = await prisma.grade.create({
    data: {
      name: name.trim(),
      stage,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(
    { id: grade.id.toString(), name: grade.name, stage: grade.stage, sortOrder: grade.sortOrder },
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
  if (body.stage !== undefined) {
    if (!STAGES.includes(body.stage)) return NextResponse.json({ error: "stage 非法" }, { status: 400 });
    data.stage = body.stage;
  }
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;

  const grade = await prisma.grade.update({ where: { id: BigInt(id) }, data });
  return NextResponse.json({
    id: grade.id.toString(),
    name: grade.name,
    stage: grade.stage,
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
