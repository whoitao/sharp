import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function serializeNode(n: any): any {
  return {
    id: n.id.toString(),
    gradeId: n.gradeId.toString(),
    subjectId: n.subjectId.toString(),
    publisherId: n.publisherId.toString(),
    parentId: n.parentId?.toString() ?? null,
    level: n.level,
    semester: n.semester ?? null,
    name: n.name,
    sortOrder: n.sortOrder,
    questionCount: n.questionCount ?? 0,
    children: (n.children ?? []).map(serializeNode),
  };
}

/**
 * 章节树：按 年级 + 科目 + 教材版本 过滤。
 * level 1=册（七年级上册）2=章 3=节，树根是册。
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const gradeId = url.searchParams.get("gradeId");
  const subjectId = url.searchParams.get("subjectId");
  const publisherId = url.searchParams.get("publisherId");
  if (!gradeId) return NextResponse.json({ error: "gradeId required" }, { status: 400 });

  const all = await prisma.chapter.findMany({
    where: {
      gradeId: BigInt(gradeId),
      subjectId: subjectId ? BigInt(subjectId) : undefined,
      publisherId: publisherId ? BigInt(publisherId) : undefined,
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });

  // 每个节点的题数 = 直属题目 + 所有子章节题目（归属唯一，向上聚合）
  const chapterIds = all.map((n) => n.id);
  const questionGroups = chapterIds.length
    ? await prisma.question.groupBy({
        by: ["chapterId"],
        where: { chapterId: { in: chapterIds } },
        _count: { _all: true },
      })
    : [];
  const directCount = new Map(
    questionGroups.map((g) => [g.chapterId?.toString() ?? "", g._count._all]),
  );
  const childrenMap = new Map<string, string[]>();
  for (const n of all) {
    const key = n.parentId?.toString() ?? "";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(n.id.toString());
  }
  const aggregate = (cid: string): number => {
    let total = directCount.get(cid) ?? 0;
    for (const child of childrenMap.get(cid) ?? []) total += aggregate(child);
    return total;
  };

  const byId = new Map(
    all.map((n) => [n.id.toString(), { ...n, questionCount: aggregate(n.id.toString()) }]),
  );
  const rootIds: string[] = [];
  for (const n of all) {
    if (n.parentId == null || !byId.has(n.parentId.toString())) rootIds.push(n.id.toString());
  }

  // 根节点（册）排序：年级 → 科目 → 教材版本 → 上册/下册
  // 年级、科目用各自的 sortOrder（未配置时按 id），教材版本按 publisher 创建顺序（id）
  const [gradeRows, subjectRows] = await Promise.all([
    prisma.grade.findMany({ select: { id: true, sortOrder: true } }),
    prisma.subject.findMany({ select: { id: true, sortOrder: true } }),
  ]);
  const gradeOrder = new Map(gradeRows.map((g) => [g.id.toString(), g.sortOrder]));
  const subjectOrder = new Map(subjectRows.map((s) => [s.id.toString(), s.sortOrder]));
  const idCompare = (a: any, b: any) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const bigCompare = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);
  // 1=上册 2=下册 0=全一册，其余（未设置）排最后
  const semesterRank = (semester: number | null) =>
    semester === 1 ? 0 : semester === 2 ? 1 : semester === 0 ? 2 : 3;
  const rootCompare = (a: any, b: any) =>
    (gradeOrder.get(a.gradeId.toString()) ?? 0) - (gradeOrder.get(b.gradeId.toString()) ?? 0) ||
    (subjectOrder.get(a.subjectId.toString()) ?? 0) - (subjectOrder.get(b.subjectId.toString()) ?? 0) ||
    bigCompare(a.subjectId, b.subjectId) ||
    bigCompare(a.publisherId, b.publisherId) ||
    semesterRank(a.semester) - semesterRank(b.semester) ||
    a.sortOrder - b.sortOrder ||
    idCompare(a, b);

  const buildTree = (ids: string[], isRoot = false): any[] => {
    const nodes = ids
      .map((id) => byId.get(id))
      .filter((n): n is NonNullable<typeof n> => n != null);
    nodes.sort(
      isRoot
        ? rootCompare
        : (a, b) => a.sortOrder - b.sortOrder || idCompare(a, b),
    );
    return nodes.map((n) => {
      const childIds: string[] = [];
      for (const c of all) {
        if (c.parentId?.toString() === n.id.toString()) childIds.push(c.id.toString());
      }
      return serializeNode({ ...n, children: buildTree(childIds) });
    });
  };

  return NextResponse.json(buildTree(rootIds, true));
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { gradeId, subjectId, publisherId, parentId, semester, name, sortOrder } = body;
  if (!gradeId || !subjectId || !publisherId || !name?.trim()) {
    return NextResponse.json(
      { error: "gradeId/subjectId/publisherId/name 必填" },
      { status: 400 },
    );
  }

  const [grade, subject, publisher] = await Promise.all([
    prisma.grade.findUnique({ where: { id: BigInt(gradeId) } }),
    prisma.subject.findUnique({ where: { id: BigInt(subjectId) } }),
    prisma.publisher.findUnique({ where: { id: BigInt(publisherId) } }),
  ]);
  if (!grade || !subject || !publisher) {
    return NextResponse.json({ error: "年级/科目/版本不存在" }, { status: 400 });
  }

  // 层级由父节点推导：无父节点是「册」，其余逐级为「章」「节」
  let level = 1;
  let parentBigInt: bigint | null = null;
  if (parentId) {
    const parent = await prisma.chapter.findUnique({ where: { id: BigInt(parentId) } });
    if (!parent) return NextResponse.json({ error: "parent not found" }, { status: 400 });
    parentBigInt = parent.id;
    level = parent.level + 1;
  }

  const ch = await prisma.chapter.create({
    data: {
      gradeId: BigInt(gradeId),
      subjectId: BigInt(subjectId),
      publisherId: BigInt(publisherId),
      parentId: parentBigInt,
      level,
      semester: level === 1 ? (semester ?? null) : null,
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
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;
  if (body.semester !== undefined) data.semester = body.semester;

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

  const ids = [bigId, ...toDelete];
  const questionCount = await prisma.question.count({ where: { chapterId: { in: ids } } });
  if (questionCount > 0) {
    return NextResponse.json(
      { error: `该章节（含子章节）下还有 ${questionCount} 道题目，请先移除题目归属再删除` },
      { status: 409 },
    );
  }

  // 从叶子到根排序（倒序），确保删除顺序不违反 FK
  const sorted = toDelete.sort((a, b) => Number(b - a));
  for (const cid of sorted) await prisma.chapter.delete({ where: { id: cid } });
  await prisma.chapter.delete({ where: { id: bigId } });
  return NextResponse.json({ ok: true });
}
