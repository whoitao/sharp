import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const adminRecord = await prisma.admin.findUnique({
    where: { id: admin.id },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  if (!adminRecord) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  return NextResponse.json(adminRecord);
}
