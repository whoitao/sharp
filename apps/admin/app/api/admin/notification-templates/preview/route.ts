import { requirePermission } from "@/lib/middleware";
import { parseVariableDeclarations, renderText, type VariableValues } from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";

/**
 * 模板实时预览：与正式发送共用 renderText，保证「预览正常 = 发出正常」。
 * 兼容两种入参：variables 既可以是声明数组（配合 values），也可以是取值对象（PRD 示例）。
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawVariables = body.variables;
  const declarations = parseVariableDeclarations(
    Array.isArray(body.declarations) ? body.declarations : Array.isArray(rawVariables) ? rawVariables : [],
  );

  const values: VariableValues =
    body.values && typeof body.values === "object" && !Array.isArray(body.values)
      ? (body.values as VariableValues)
      : rawVariables && typeof rawVariables === "object" && !Array.isArray(rawVariables)
        ? (rawVariables as VariableValues)
        : {};

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
    missing: [...new Set([...title.missing, ...content.missing, ...action.missing])],
    unknown: [...new Set([...title.unknown, ...content.unknown, ...action.unknown])],
  });
}
