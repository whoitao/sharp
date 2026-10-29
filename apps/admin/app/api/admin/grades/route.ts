import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const publisherId = url.searchParams.get("publisherId");
  const where: any = {};
  if (subjectId) where.subjectId = BigInt(subjectId);
  if (publisherId) where.publisherId = BigInt(publisherId);

  const grades = await prisma.grade.findMany({
    where,
    orderBy: [
      { subjectId: "asc" },
      { publisherId: "asc" },
      { level: "asc" },
      { semester: "asc" },
    ],
    include: {
      subject: { select: { id: true, name: true } },
      publisher: { select: { id: true, name: true } },
      _count: { select: { chapters: true } },
    },
  });
  return NextResponse.json(
    grades.map((g) => ({
      id: g.id.toString(),
      subjectId: g.subjectId.toString(),
      subjectName: g.subject.name,
      publisherId: g.publisherId.toString(),
      publisherName: g.publisher.name,
      level: g.level,
      semester: g.semester,
      name: g.name,
      sortOrder: g.sortOrder,
      chapterCount: g._count.chapters,
    }))
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const body = await request.json();
  const { subjectId, publisherId, level, semester, name, sortOrder } = body;
  if (!subjectId || !publisherId || level == null || semester == null) {
    return NextResponse.json({ error: "subjectId/publisherId/level/semester required" }, { status: 400 });
  }
  const grade = await prisma.grade.create({
    data: {
      subjectId: BigInt(subjectId),
      publisherId: BigInt(publisherId),
      level,
      semester,
      name: name?.trim() ?? `${level}年级${semester === 1 ? "上" : semester === 2 ? "下" : ""}`,
      sortOrder: sortOrder ?? level * 10 + semester,
    },
  });
  return NextResponse.json({ id: grade.id.toString(), name: grade.name }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await request.json();
  const data: any = {};
  if (body.subjectId) data.subjectId = BigInt(body.subjectId);
  if (body.publisherId) data.publisherId = BigInt(body.publisherId);
  if (body.level != null) data.level = body.level;
  if (body.semester != null) data.semester = body.semester;
  if (body.name) data.name = body.name.trim();
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;
  const g = await prisma.grade.update({ where: { id: BigInt(id) }, data });
  return NextResponse.json({ id: g.id.toString(), name: g.name });
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.grade.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
