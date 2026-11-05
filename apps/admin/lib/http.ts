import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InvalidParamError } from "./query";

/** 统一错误响应：对外只返回稳定文案，不暴露 Prisma/内部异常细节。 */
export function apiError(
  status: number,
  error: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * 统一异常映射：
 * - 参数非法 / zod 校验失败 → 400
 * - P2025（记录不存在）→ 404
 * - P2002（唯一键冲突）/ P2003（外键约束）→ 409
 * - 其他 → 500（仅服务端日志记录原始异常）
 */
export function handleRouteError(err: unknown, context: string): NextResponse {
  if (err instanceof InvalidParamError) {
    return apiError(400, `参数 ${err.param} 非法`);
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path?.join(".") || "参数";
    return apiError(400, `${field} 非法`);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return apiError(404, "记录不存在");
    if (err.code === "P2002") return apiError(409, "记录已存在");
    if (err.code === "P2003") return apiError(409, "存在关联数据，操作被拒绝");
  }
  console.error(`[${context}]`, err);
  return apiError(500, "Internal server error");
}
