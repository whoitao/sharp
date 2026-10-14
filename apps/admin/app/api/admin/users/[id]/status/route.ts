import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !["active", "disabled"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be 'active' or 'disabled'." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(user);
}
