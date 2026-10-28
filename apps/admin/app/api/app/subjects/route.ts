import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const serialize = (s: any) => ({
    id: s.id.toString(),
    name: s.name,
    icon: s.icon,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });

  return NextResponse.json(subjects.map(serialize));
}
