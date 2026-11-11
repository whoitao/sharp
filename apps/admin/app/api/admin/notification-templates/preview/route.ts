import { requirePermission } from "@/lib/middleware";
import {
  parseVariableDeclarations,
  renderText,
  resolveAutoFillValues,
  type VariableValues,
} from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";

/**
 * 模板实时预览：与正式发送共用 renderText，保证「预览正常 = 发出正常」。
 * 传入 userId 时，未显式填写的变量会按 autoFill 规则自动回填真实用户数据。
 * 兼容两种入参：variables 既可以是声明数组（配合 values），也可以是取值对象。
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawVariables = body.variables;
  const userId = typeof body.userId === "string" && body.userId.trim() !== "" ? body.userId.trim() : null;
  const declarations = parseVariableDeclarations(
    Array.isArray(body.declarations) ? body.declarations : Array.isArray(rawVariables) ? rawVariables : [],
  );

  const explicit: VariableValues =
    body.values && typeof body.values === "object" && !Array.isArray(body.values)
      ? (body.values as VariableValues)
      : rawVariables && typeof rawVariables === "object" && !Array.isArray(rawVariables)
        ? (rawVariables as VariableValues)
        : {};

  // 自动回填：前端没填的 user-scoped 变量从真实用户数据取
  const values = await resolveAutoFillValues(declarations, userId, explicit);

  const title = renderText(String(body.titleTemplate ?? ""), declarations, values);
  const content = renderText(String(body.bodyTemplate ?? ""), declarations, values);
  const actionType = String(body.actionType ?? "none");
  const actionTemplate = String(body.actionValueTemplate ?? "");
  const action =
    actionType !== "none" && actionTemplate
      ? renderText(actionTemplate, declarations, values)
      : { text: "", missing: [], unknown: [] };

  return NextResponse.json({
    title: title.text,
    body: content.text,
    actionValue: action.text || null,
    resolvedVariables: declarations.length > 0 ? values : null,
    missing: [...new Set([...title.missing, ...content.missing, ...action.missing])],
    unknown: [...new Set([...title.unknown, ...content.unknown, ...action.unknown])],
  });
}
