import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const { name, icon, sortOrder } = body;

  const data: Record<string, any> = {};
  if (name !== undefined) data.name = name.trim();
  if (icon !== undefined) data.icon = icon || null;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const subject = await prisma.subject.update({
    where: { id: BigInt(id) },
    data,
  });

  return NextResponse.json({
    id: subject.id.toString(),
    name: subject.name,
    icon: subject.icon,
    sortOrder: subject.sortOrder,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  await prisma.subject.delete({
    where: { id: BigInt(id) },
  });

  return NextResponse.json({ success: true });
}
