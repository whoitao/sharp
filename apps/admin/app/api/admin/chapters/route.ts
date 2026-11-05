import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRouteError } from "@/lib/http";
import { parseBigIntId } from "@/lib/query";
import { chapterCreateSchema, chapterUpdateSchema, chaptersQuerySchema } from "@/lib/schemas";
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
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const { textbookId, stageId, subjectId, gradeId, publisherId } = chaptersQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!textbookId && !subjectId && !stageId && !gradeId && !publisherId) {
      return NextResponse.json(
        { error: "textbookId or one of stageId/subjectId/gradeId/publisherId required" },
        { status: 400 },
      );
    }

    const all = await prisma.chapter.findMany({
      where: {
        ...(textbookId
          ? { textbookId }
          : { textbook: { stageId, subjectId, gradeId, publisherId } }),
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

    // parentId → children 索引：避免每个节点都遍历全量数组（O(n²)）
    const childrenMap = new Map<string, string[]>();
    for (const n of all) {
      const key = n.parentId?.toString() ?? "";
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(n.id.toString());
    }

    const aggregateMemo = new Map<string, number>();
    const aggregate = (cid: string): number => {
      const memo = aggregateMemo.get(cid);
      if (memo !== undefined) return memo;
      let total = directCount.get(cid) ?? 0;
      for (const child of childrenMap.get(cid) ?? []) total += aggregate(child);
      aggregateMemo.set(cid, total);
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
      return nodes.map((n) =>
        serializeNode({
          ...n,
          children: buildTree(childrenMap.get(n.id.toString()) ?? []),
        }),
      );
    };

    return NextResponse.json(buildTree(rootIds, true));
  } catch (err) {
    return handleRouteError(err, "admin/chapters");
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const { textbookId, parentId, name, sortOrder } = chapterCreateSchema.parse(
      await request.json().catch(() => ({})),
    );

    const textbook = await prisma.textbook.findUnique({ where: { id: textbookId } });
    if (!textbook) return NextResponse.json({ error: "教材不存在" }, { status: 400 });

    let level = 1;
    let parentBigInt: bigint | null = null;
    if (parentId) {
      const parent = await prisma.chapter.findUnique({ where: { id: parentId } });
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
  } catch (err) {
    return handleRouteError(err, "admin/chapters/create");
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const id = parseBigIntId(new URL(request.url).searchParams.get("id") ?? "", "id");
    const body = chapterUpdateSchema.parse(await request.json().catch(() => ({})));

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.sortOrder != null) data.sortOrder = body.sortOrder;

    const ch = await prisma.chapter.update({ where: { id }, data });
    return NextResponse.json(serializeNode(ch));
  } catch (err) {
    return handleRouteError(err, "admin/chapters/update");
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const bigId = parseBigIntId(new URL(request.url).searchParams.get("id") ?? "", "id");

    // 只扫描目标章节所属教材的章节，避免全表读取
    const target = await prisma.chapter.findUnique({
      where: { id: bigId },
      select: { textbookId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    const siblings = await prisma.chapter.findMany({
      where: { textbookId: target.textbookId },
      select: { id: true, parentId: true },
    });

    const childrenMap = new Map<string, bigint[]>();
    for (const c of siblings) {
      const key = c.parentId?.toString() ?? "";
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(c.id);
    }

    const toDelete: bigint[] = [];
    const collect = (pid: bigint) => {
      for (const cid of childrenMap.get(pid.toString()) ?? []) {
        toDelete.push(cid);
        collect(cid);
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

    // 父子章节在同一条 deleteMany 中删除，放进事务保证原子性
    await prisma.$transaction([
      prisma.chapter.deleteMany({ where: { id: { in: ids } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "admin/chapters/delete");
  }
}
