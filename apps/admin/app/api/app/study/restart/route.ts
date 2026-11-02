import { requireAppUser } from "@/lib/middleware";
import { NextRequest, NextResponse } from "next/server";

// 历史不可变：学习事实只追加不删除，「再学一次」不再清除任何记录。
// 保留接口以兼容旧版客户端，重复学习会在 finish 时产生新的一条记录。
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  return NextResponse.json({ success: true, cleared: false });
}
