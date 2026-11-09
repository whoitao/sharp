import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { textbookCoverPublicUrl } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

const SEMESTER_LABEL: Record<number, string> = { 0: "全一册", 1: "上册", 2: "下册" };

/**
 * 「我的教材」列表：返回已有章节的教材，按 学段 → 科目 分组。
 * selected 由用户设置的全局单选 textbookId 决定。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const settings = await prisma.userSettings.findUnique({ where: { userId: appUser.id } });
  const selectedId = settings?.textbookId?.toString() ?? null;

  // 学段 tab 固定展示全部学段（四个学段四等分），没有教材的学段返回空科目列表
  const [stagesDict, textbooks] = await Promise.all([
    prisma.stage.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.textbook.findMany({
      // 只要教材下还有章节就展示，不再要求章节里已有题目
      where: { chapters: { some: {} } },
      include: {
        subject: { select: { id: true, name: true, icon: true, sortOrder: true } },
        stage: { select: { id: true, name: true, sortOrder: true } },
        grade: { select: { id: true, name: true, sortOrder: true } },
        publisher: { select: { id: true, name: true } },
      },
      orderBy: [
        { stageId: "asc" },
        { subjectId: "asc" },
        { gradeId: "asc" },
        { semester: "asc" },
        { sortOrder: "asc" },
      ],
    }),
  ]);

  if (stagesDict.length === 0) return NextResponse.json({ stages: [] });

  const textbookIds = textbooks.map((t) => t.id);
  const [chapters, questionGroups] = await Promise.all([
    prisma.chapter.findMany({
      where: { textbookId: { in: textbookIds } },
      select: { id: true, textbookId: true },
    }),
    prisma.question.groupBy({ by: ["chapterId"], _count: { _all: true } }),
  ]);
  const questionByChapter = new Map(
    questionGroups.map((g) => [g.chapterId?.toString() ?? "", g._count._all]),
  );
  const counts = new Map<string, { chapterCount: number; questionCount: number }>();
  for (const c of chapters) {
    const key = c.textbookId.toString();
    const entry = counts.get(key) ?? { chapterCount: 0, questionCount: 0 };
    entry.chapterCount += 1;
    entry.questionCount += questionByChapter.get(c.id.toString()) ?? 0;
    counts.set(key, entry);
  }

  // 学段 / 科目分组，顺序沿用字典表的 sortOrder
  const stageMap = new Map<
    string,
    {
      id: string;
      name: string;
      sortOrder: number;
      subjects: Map<
        string,
        {
          id: string;
          name: string;
          icon: string | null;
          sortOrder: number;
          textbooks: Record<string, unknown>[];
        }
      >;
    }
  >();

  for (const stage of stagesDict) {
    stageMap.set(stage.id.toString(), {
      id: stage.id.toString(),
      name: stage.name,
      sortOrder: stage.sortOrder,
      subjects: new Map(),
    });
  }

  for (const t of textbooks) {
    const stageKey = t.stage.id.toString();
    if (!stageMap.has(stageKey)) {
      stageMap.set(stageKey, {
        id: stageKey,
        name: t.stage.name,
        sortOrder: t.stage.sortOrder,
        subjects: new Map(),
      });
    }
    const stage = stageMap.get(stageKey)!;
    const subjectKey = t.subject.id.toString();
    if (!stage.subjects.has(subjectKey)) {
      stage.subjects.set(subjectKey, {
        id: subjectKey,
        name: t.subject.name,
        icon: t.subject.icon ?? null,
        sortOrder: t.subject.sortOrder,
        textbooks: [],
      });
    }
    const count = counts.get(t.id.toString()) ?? { chapterCount: 0, questionCount: 0 };
    stage.subjects.get(subjectKey)!.textbooks.push({
      id: t.id.toString(),
      name: t.name,
      subjectId: t.subject.id.toString(),
      subjectName: t.subject.name,
      stageId: t.stage.id.toString(),
      stageName: t.stage.name,
      gradeId: t.grade.id.toString(),
      gradeName: t.grade.name,
      gradeSortOrder: t.grade.sortOrder,
      publisherId: t.publisher.id.toString(),
      publisherName: t.publisher.name,
      semester: t.semester,
      semesterLabel: SEMESTER_LABEL[t.semester] ?? "",
      coverUrl: t.coverUrl ? textbookCoverPublicUrl(t.coverUrl) : null,
      chapterCount: count.chapterCount,
      questionCount: count.questionCount,
      selected: t.id.toString() === selectedId,
    });
  }

  const stages = [...stageMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      subjects: [...stage.subjects.values()]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((subject) => ({
          id: subject.id,
          name: subject.name,
          icon: subject.icon,
          textbooks: subject.textbooks.sort(
            (a: any, b: any) =>
              a.gradeSortOrder - b.gradeSortOrder || a.semester - b.semester,
          ),
        })),
    }));

  return NextResponse.json({ stages, selectedTextbookId: selectedId });
}
