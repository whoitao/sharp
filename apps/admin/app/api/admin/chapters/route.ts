import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function serializeNode(n: any): any {
  return {
    id: n.id.toString(),
    gradeId: n.gradeId.toString(),
    parentId: n.parentId?.toString() ?? null,
    publisherId: n.publisherId?.toString() ?? null,
    name: n.name,
    sortOrder: n.sortOrder,
    children: (n.children ?? []).map(serializeNode),
  };
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const gradeId = url.searchParams.get("gradeId");
  const publisherId = url.searchParams.get("publisherId");
  if (!gradeId) return NextResponse.json({ error: "gradeId required" }, { status: 400 });

  // 查出该 grade 归属的 publisher，回填章节的 publisherId 冗余字段
  const grade = await prisma.grade.findUnique({ where: { id: BigInt(gradeId) }, select: { publisherId: true } });
  if (!grade) return NextResponse.json({ error: "grade not found" }, { status: 404 });

  const all = await prisma.chapter.findMany({
    where: { gradeId: BigInt(gradeId), publisherId: publisherId ? BigInt(publisherId) : undefined },
    include: { children: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });

  // 构建树：children include 只拿直接子节点，需手动按 parentId 聚合
  const byId = new Map(all.map((n) => [n.id.toString(), n]));
  const rootIds: string[] = [];
  for (const n of all) {
    if (n.parentId == null || !byId.has(n.parentId.toString())) rootIds.push(n.id.toString());
  }
  const buildTree = (ids: string[]): any[] => {
    const nodes = ids.map((id) => byId.get(id)).filter((n): n is NonNullable<typeof n> => n != null);
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id));
    return nodes.map((n) => {
      const childIds: string[] = [];
      for (const c of all) {
        if (c.parentId?.toString() === n.id.toString()) childIds.push(c.id.toString());
      }
      return serializeNode({ ...n, children: buildTree(childIds) });
    });
  };

  return NextResponse.json(buildTree(rootIds));
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const body = await request.json();
  const { gradeId, parentId, name, sortOrder } = body;
  if (!gradeId || !name?.trim()) return NextResponse.json({ error: "gradeId/name required" }, { status: 400 });
  const grade = await prisma.grade.findUnique({ where: { id: BigInt(gradeId) }, select: { publisherId: true } });
  if (!grade) return NextResponse.json({ error: "grade not found" }, { status: 404 });
  const ch = await prisma.chapter.create({
    data: {
      gradeId: BigInt(gradeId),
      parentId: parentId ? BigInt(parentId) : null,
      publisherId: grade.publisherId,
      name: name.trim(),
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(serializeNode(ch), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await request.json();
  const data: any = {};
  if (body.parentId !== undefined) data.parentId = body.parentId ? BigInt(body.parentId) : null;
  if (body.name) data.name = body.name.trim();
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;
  const ch = await prisma.chapter.update({ where: { id: BigInt(id) }, data });
  return NextResponse.json(serializeNode(ch));
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const bigId = BigInt(id);
  // 级联删除所有后代：先递归收集所有后代 id，再按序删除
  const all = await prisma.chapter.findMany({ select: { id: true, parentId: true } });
  const toDelete: bigint[] = [];
  const collect = (pid: bigint) => {
    for (const c of all) {
      if (c.parentId === pid) {
        toDelete.push(c.id);
        collect(c.id);
      }
    }
  };
  collect(bigId);
  // 从叶子到根排序（倒序），确保删除顺序不违反 FK
  const sorted = toDelete.sort((a, b) => Number(b - a));
  for (const cid of sorted) await prisma.chapter.delete({ where: { id: cid } });
  await prisma.chapter.delete({ where: { id: bigId } });
  return NextResponse.json({ ok: true });
}
