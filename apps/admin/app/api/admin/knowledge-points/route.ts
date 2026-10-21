import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");

  const where: any = {};
  if (subjectId) {
    where.subjectId = BigInt(subjectId);
  }

  const knowledgePoints = await prisma.knowledgePoint.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  const serialize = (kp: any) => ({
    id: kp.id.toString(),
    name: kp.name,
    parentId: kp.parentId?.toString() ?? null,
    subjectId: kp.subjectId?.toString() ?? null,
    sortOrder: kp.sortOrder,
    questionCount: kp._count.questions,
    createdAt: kp.createdAt,
    updatedAt: kp.updatedAt,
  });

  const items = knowledgePoints.map(serialize);

  const buildTree = (parentId: string | null): any[] => {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(item.id),
      }));
  };

  return NextResponse.json(buildTree(null));
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, parentId, subjectId, sortOrder } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const data: any = {
    name: name.trim(),
    sortOrder: sortOrder ?? 0,
  };
  if (parentId) data.parentId = BigInt(parentId);
  if (subjectId) data.subjectId = BigInt(subjectId);

  const kp = await prisma.knowledgePoint.create({ data });

  return NextResponse.json(
    {
      id: kp.id.toString(),
      name: kp.name,
      parentId: kp.parentId?.toString() ?? null,
      subjectId: kp.subjectId?.toString() ?? null,
      sortOrder: kp.sortOrder,
      createdAt: kp.createdAt,
    },
    { status: 201 }
  );
}
