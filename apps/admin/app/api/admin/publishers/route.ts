import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const pubs = await prisma.publisher.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { grades: true, chapters: true } } },
  });
  return NextResponse.json(
    pubs.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      gradeCount: p._count.grades,
      chapterCount: p._count.chapters,
    }))
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const pub = await prisma.publisher.create({ data: { name: name.trim() } });
  return NextResponse.json({ id: pub.id.toString(), name: pub.name }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { name } = await request.json();
  const pub = await prisma.publisher.update({
    where: { id: BigInt(id) },
    data: { name: name?.trim() ?? undefined },
  });
  return NextResponse.json({ id: pub.id.toString(), name: pub.name });
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.publisher.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
