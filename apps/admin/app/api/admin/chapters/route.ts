import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function serializeNode(n: any): any {
  return {
    id: n.id.toString(),
    textbookId: n.textbookId.toString(),
    parentId: n.parentId?.toString() ?? null,
    level: n.level,
    name: n.name,
    sortOrder: n.sortOrder,
    questionCount: n.questionCount ?? 0,
    children: (n.children ?? []).map(serializeNode),
  };
}

/**
 * 章节树：按教材过滤（textbookId），也兼容按 学段/科目/年级/版本 过滤（题目选择器用）。
 * level 1=章 2=节，树根是章。
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const textbookId = url.searchParams.get("textbookId");
  const stageId = url.searchParams.get("stageId");
  const subjectId = url.searchParams.get("subjectId");
  const gradeId = url.searchParams.get("gradeId");
  const publisherId = url.searchParams.get("publisherId");

  if (!textbookId && !subjectId && !stageId && !gradeId && !publisherId) {
    return NextResponse.json(
      { error: "textbookId or one of stageId/subjectId/gradeId/publisherId required" },
      { status: 400 },
    );
  }

  const textbookWhere = {
    stageId: stageId ? BigInt(stageId) : undefined,
    subjectId: subjectId ? BigInt(subjectId) : undefined,
    gradeId: gradeId ? BigInt(gradeId) : undefined,
    publisherId: publisherId ? BigInt(publisherId) : undefined,
  };

  const all = await prisma.chapter.findMany({
    where: {
      ...(textbookId ? { textbookId: BigInt(textbookId) } : { textbook: textbookWhere }),
    },
    include: {
      textbook: {
        select: {
          stageId: true,
          subjectId: true,
          gradeId: true,
          publisherId: true,
          semester: true,
          sortOrder: true,
        },
      },
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

  // 根节点排序：学段 → 科目 → 年级 → 版本 → 学期 → 教材排序
  const semesterRank = (semester: number) =>
    semester === 1 ? 0 : semester === 2 ? 1 : semester === 0 ? 2 : 3;
  const bigCompare = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);
  const rootCompare = (a: any, b: any) => {
    const ta = a.textbook;
    const tb = b.textbook;
    return (
      bigCompare(ta.stageId, tb.stageId) ||
      bigCompare(ta.subjectId, tb.subjectId) ||
      bigCompare(ta.gradeId, tb.gradeId) ||
      bigCompare(ta.publisherId, tb.publisherId) ||
      semesterRank(ta.semester) - semesterRank(tb.semester) ||
      ta.sortOrder - tb.sortOrder ||
      a.sortOrder - b.sortOrder ||
      Number(a.id - b.id)
    );
  };

  const buildTree = (ids: string[], isRoot = false): any[] => {
    const nodes = ids
      .map((id) => byId.get(id))
      .filter((n): n is NonNullable<typeof n> => n != null);
    nodes.sort(isRoot ? rootCompare : (a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id));
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
  const { textbookId, parentId, name, sortOrder } = body;
  if (!textbookId || !name?.trim()) {
    return NextResponse.json({ error: "textbookId/name 必填" }, { status: 400 });
  }

  const textbook = await prisma.textbook.findUnique({ where: { id: BigInt(textbookId) } });
  if (!textbook) return NextResponse.json({ error: "教材不存在" }, { status: 400 });

  let level = 1;
  let parentBigInt: bigint | null = null;
  if (parentId) {
    const parent = await prisma.chapter.findUnique({ where: { id: BigInt(parentId) } });
    if (!parent) return NextResponse.json({ error: "parent not found" }, { status: 400 });
    if (parent.textbookId !== textbook.id) {
      return NextResponse.json({ error: "父章节不属于该教材" }, { status: 400 });
    }
    if (parent.level >= 2) {
      return NextResponse.json({ error: "章节最多两级（章 → 节）" }, { status: 400 });
    }
    parentBigInt = parent.id;
    level = parent.level + 1;
  }

  const ch = await prisma.chapter.create({
    data: {
      textbookId: textbook.id,
      parentId: parentBigInt,
      level,
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

  for (const cid of toDelete.sort((a, b) => Number(b - a))) {
    await prisma.chapter.delete({ where: { id: cid } });
  }
  await prisma.chapter.delete({ where: { id: bigId } });
  return NextResponse.json({ ok: true });
}
