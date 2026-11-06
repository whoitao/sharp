import { getSession } from "@/lib/auth/session";
import { avatarPublicUrl } from "@/lib/profile/avatar";
import { NextResponse } from "next/server";

/**
 * 浏览器侧读取当前会话。
 * 头像在 DB 里只存相对路径，这里补成可直接用于 <img> 的完整地址；
 * 每次上传都会生成新的随机文件名，因此不需要额外的缓存版本参数。
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...user,
      avatarUrl: user.avatar ? avatarPublicUrl(user.avatar) : null,
    },
  });
}
