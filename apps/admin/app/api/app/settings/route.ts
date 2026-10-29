import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });

  return NextResponse.json({
    userId: appUser.id,
    unitSize: settings?.unitSize ?? 20,
    theme: settings?.theme ?? "system",
    language: settings?.language ?? "zh",
    density: settings?.density ?? "comfortable",
    // 全局学习范围：年级 + 科目 + 教材版本
    gradeId: settings?.gradeId?.toString() ?? null,
    subjectId: settings?.subjectId?.toString() ?? null,
    publisherId: settings?.publisherId?.toString() ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { unitSize, theme, language, density, gradeId, subjectId, publisherId } = body;

  const data: Record<string, any> = {};

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
  });

  return NextResponse.json({
    userId: settings.userId,
    unitSize: settings.unitSize,
    theme: settings.theme,
    language: settings.language,
    density: settings.density,
    gradeId: settings.gradeId?.toString() ?? null,
    subjectId: settings.subjectId?.toString() ?? null,
    publisherId: settings.publisherId?.toString() ?? null,
  });
}
