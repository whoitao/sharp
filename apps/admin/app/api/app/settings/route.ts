import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

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
  });
}

export async function PUT(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { unitSize, theme } = body;

  const data: Record<string, any> = {};
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
  });
}
