import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { textbookCoverPublicUrl } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

const SEMESTER_LABEL: Record<number, string> = { 0: "全一册", 1: "上册", 2: "下册" };

/** 当前教材的完整展示信息：导航栏胶囊、/learn 横幅、我的教材页共用一份全局状态 */
async function textbookSummary(
  textbook: {
    id: bigint;
    name: string;
    semester: number;
    coverUrl: string | null;
    subject: { id: bigint; name: string };
    stage: { id: bigint; name: string };
    grade: { id: bigint; name: string; sortOrder: number };
    publisher: { id: bigint; name: string };
  } | null,
) {
  if (!textbook) return null;
  // 章节数 / 题数随当前教材一起返回，切换后无需前端再单独取数
  const [chapterCount, questionCount] = await Promise.all([
    prisma.chapter.count({ where: { textbookId: textbook.id } }),
    prisma.question.count({ where: { chapter: { textbookId: textbook.id } } }),
  ]);
  return {
    id: textbook.id.toString(),
    name: textbook.name,
    subjectId: textbook.subject.id.toString(),
    subjectName: textbook.subject.name,
    stageId: textbook.stage.id.toString(),
    stageName: textbook.stage.name,
    gradeId: textbook.grade.id.toString(),
    gradeName: textbook.grade.name,
    gradeSortOrder: textbook.grade.sortOrder,
    publisherId: textbook.publisher.id.toString(),
    publisherName: textbook.publisher.name,
    semester: textbook.semester,
    semesterLabel: SEMESTER_LABEL[textbook.semester] ?? "",
    coverUrl: textbook.coverUrl ? textbookCoverPublicUrl(textbook.coverUrl) : null,
    chapterCount,
    questionCount,
    selected: true,
  };
}

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
    include: {
      textbook: {
        include: {
          subject: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true } },
          grade: { select: { id: true, name: true, sortOrder: true } },
          publisher: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    userId: appUser.id,
    unitSize: settings?.unitSize ?? 20,
    theme: settings?.theme ?? "system",
    language: settings?.language ?? "zh",
    density: settings?.density ?? "comfortable",
    // 「我的教材」全局单选 + 由教材反推的学习范围
    textbookId: settings?.textbookId?.toString() ?? null,
    textbook: await textbookSummary(settings?.textbook ?? null),
    gradeId: settings?.gradeId?.toString() ?? null,
    subjectId: settings?.subjectId?.toString() ?? null,
    publisherId: settings?.publisherId?.toString() ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { unitSize, theme, language, density, textbookId, gradeId, subjectId, publisherId } = body;

  const data: Record<string, any> = {};

  // 「我的教材」：选中教材时，年级/科目/版本一律由教材反推并同步写入
  if (textbookId !== undefined) {
    if (textbookId === null) {
      data.textbookId = null;
    } else {
      const textbook = await prisma.textbook.findUnique({
        where: { id: BigInt(textbookId) },
        select: { id: true, gradeId: true, subjectId: true, publisherId: true },
      });
      if (!textbook) return NextResponse.json({ error: "textbook not found" }, { status: 400 });
      data.textbookId = textbook.id;
      data.gradeId = textbook.gradeId;
      data.subjectId = textbook.subjectId;
      data.publisherId = textbook.publisherId;
    }
  }

  if (gradeId !== undefined) {
    if (gradeId === null) {
      data.gradeId = null;
    } else {
      const exists = await prisma.grade.findUnique({ where: { id: BigInt(gradeId) } });
      if (!exists) return NextResponse.json({ error: "grade not found" }, { status: 400 });
      data.gradeId = BigInt(gradeId);
    }
  }
  if (subjectId !== undefined) {
    if (subjectId === null) {
      data.subjectId = null;
    } else {
      const exists = await prisma.subject.findUnique({ where: { id: BigInt(subjectId) } });
      if (!exists) return NextResponse.json({ error: "subject not found" }, { status: 400 });
      data.subjectId = BigInt(subjectId);
    }
  }
  if (publisherId !== undefined) {
    if (publisherId === null) {
      data.publisherId = null;
    } else {
      const exists = await prisma.publisher.findUnique({ where: { id: BigInt(publisherId) } });
      if (!exists) {
        return NextResponse.json({ error: "publisher not found" }, { status: 400 });
      }
      data.publisherId = BigInt(publisherId);
    }
  }
  if (unitSize !== undefined) {
    if (unitSize < 5 || unitSize > 100) {
      return NextResponse.json(
        { error: "unitSize must be between 5 and 100" },
        { status: 400 }
      );
    }
    data.unitSize = unitSize;
  }
  if (theme !== undefined) {
    if (!["light", "dark", "system"].includes(theme)) {
      return NextResponse.json(
        { error: "theme must be 'light', 'dark', or 'system'" },
        { status: 400 }
      );
    }
    data.theme = theme;
  }
  if (language !== undefined) {
    if (!["zh", "en"].includes(language)) {
      return NextResponse.json(
        { error: "language must be 'zh' or 'en'" },
        { status: 400 }
      );
    }
    data.language = language;
  }
  if (density !== undefined) {
    if (!["compact", "comfortable", "spacious"].includes(density)) {
      return NextResponse.json(
        { error: "density must be 'compact', 'comfortable', or 'spacious'" },
        { status: 400 }
      );
    }
    data.density = density;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: appUser.id },
    update: data,
    create: {
      userId: appUser.id,
      ...data,
    },
    include: {
      textbook: {
        include: {
          subject: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true } },
          grade: { select: { id: true, name: true, sortOrder: true } },
          publisher: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    userId: settings.userId,
    unitSize: settings.unitSize,
    theme: settings.theme,
    language: settings.language,
    density: settings.density,
    textbookId: settings.textbookId?.toString() ?? null,
    textbook: await textbookSummary(settings.textbook),
    gradeId: settings.gradeId?.toString() ?? null,
    subjectId: settings.subjectId?.toString() ?? null,
    publisherId: settings.publisherId?.toString() ?? null,
  });
}
