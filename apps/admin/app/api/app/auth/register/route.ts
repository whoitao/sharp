import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// 公开注册只允许 web / mobile 两端；desktop 暂无注册入口只保留枚举值，
// admin 仅能由后台创建接口写入，避免外部伪造来源。
const PUBLIC_SOURCES = ["web", "mobile"] as const;
type PublicSource = (typeof PUBLIC_SOURCES)[number];

function isPublicSource(value: string): value is PublicSource {
  return (PUBLIC_SOURCES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    const source = (request.headers.get("x-client-source") ?? "web").toLowerCase();
    if (!isPublicSource(source)) {
      return NextResponse.json(
        { error: "Invalid registration source" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: "Username must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, source },
      select: { id: true, username: true, nickname: true, avatar: true, gender: true, phone: true, status: true, isTest: true, source: true, createdAt: true },
    });

    // Create default settings
    await prisma.userSettings.create({
      data: { userId: user.id },
    });

    return NextResponse.json(
      {
        user: {
          ...user,
          updatedAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
