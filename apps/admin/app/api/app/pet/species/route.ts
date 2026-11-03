import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 领养页：仅返回启用种类，含三个阶段形象与进化路线 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const species = await prisma.petSpecies.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(
    species.map((s) => ({
      id: s.id.toString(),
      code: s.code,
      name: s.name,
      theme: s.theme,
      icon: s.icon,
      tagline: s.tagline,
      stages: s.stages.map((stage) => ({
        id: stage.id,
        stageKey: stage.stageKey,
        name: stage.name,
        minLevel: stage.minLevel,
        maxLevel: stage.maxLevel,
        imageUrl: stage.imageUrl,
        idleLottieUrl: stage.idleLottieUrl,
        feedLottieUrl: stage.feedLottieUrl,
        evolveLottieUrl: stage.evolveLottieUrl,
      })),
    })),
  );
}
