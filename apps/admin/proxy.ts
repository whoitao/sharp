import { NextRequest, NextResponse } from "next/server";

// 允许跨域的来源（通配 localhost:* 和 *.whoitao.top）
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  // 本地开发：http(s)://localhost:*
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // 本地 LAN IP（如 Expo Go 真机）：http://192.168.x.x:* / http://10.x.x.x:* / http://172.16-31.x.x:*
  if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  // 生产域名
  if (origin.endsWith(".whoitao.top") || origin === "https://admin.sharp.whoitao.top") return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Expose-Headers": "Content-Length",
    "Access-Control-Max-Age": "86400",
  };
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  // OPTIONS preflight — 直接返回 204 + 所有 CORS 头
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // 普通请求 — 走 NextResponse.next()
  const response = NextResponse.next();
  for (const [k, v] of Object.entries(cors)) {
    response.headers.set(k, v);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
