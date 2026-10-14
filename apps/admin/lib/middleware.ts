import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, verifyAppToken } from "./auth";

export function getAdminUser(request: NextRequest): { id: string; username: string; role: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAdminToken(token);
}

export function requireAdmin(request: NextRequest): NextResponse | { id: string; username: string; role: string } {
  const user = getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export function getAppUser(request: NextRequest): { id: string; username: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAppToken(token);
}

export function requireAppUser(request: NextRequest): NextResponse | { id: string; username: string } {
  const user = getAppUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
