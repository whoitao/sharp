import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  const serialize = (s: any) => ({
    ...s,
    id: s.id.toString(),
    questionCount: s._count.questions,
  });

  return NextResponse.json(subjects.map(serialize));
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, icon, sortOrder } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const subject = await prisma.subject.create({
    data: {
      name: name.trim(),
      icon: icon || null,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json(
    {
      id: subject.id.toString(),
      name: subject.name,
      icon: subject.icon,
      sortOrder: subject.sortOrder,
      createdAt: subject.createdAt,
    },
    { status: 201 }
  );
}
