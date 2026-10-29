import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

async function getAllCategoryIds(categoryId: bigint): Promise<bigint[]> {
  const ids: bigint[] = [categoryId];
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  for (const child of children) {
    const childIds = await getAllCategoryIds(child.id);
    ids.push(...childIds);
  }
  return ids;
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "multipart form data required" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;
  const categoryIdRaw = formData.get("categoryId");

  if (!file || !categoryIdRaw) {
    return NextResponse.json(
      { error: "categoryId and file are required" },
      { status: 400 }
    );
  }

  const selectedCategoryId = BigInt(String(categoryIdRaw));

  try {
    const allCategoryIds = await getAllCategoryIds(selectedCategoryId);

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: "",
      raw: false,
    });

    // 跳过表头示例：sheet_to_json 默认把第一行当 header
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2; // excel 行号（1=header）
      try {
        // type
        const typeRaw = String(row.type ?? "").trim();
        const type = parseInt(typeRaw, 10);
        if (![1, 2, 3, 4].includes(type)) {
          errors.push(`Row ${rowNo}: Invalid type "${typeRaw}"`);
          continue;
        }

        // content
        const content = String(row.content ?? "").trim();
        if (!content) {
          errors.push(`Row ${rowNo}: content is required`);
          continue;
        }

        // category_id（可选，默认使用导入时选中的分类）
        let targetCategoryId = selectedCategoryId;
        const cidRaw = String(row.category_id ?? "").trim();
        if (cidRaw) {
          const cid = BigInt(cidRaw);
          if (allCategoryIds.includes(cid)) {
            targetCategoryId = cid;
          } else {
            errors.push(
              `Row ${rowNo}: category_id "${cidRaw}" not in selected category tree`
            );
            continue;
          }
        }

        // subject_id（可选）
        let subjectId: bigint | null = null;
        const subRaw = String(row.subject_id ?? "").trim();
        if (subRaw) {
          const sid = BigInt(subRaw);
          const exists = await prisma.subject.findUnique({ where: { id: sid } });
          if (!exists) {
            errors.push(`Row ${rowNo}: subject_id "${subRaw}" not found`);
            continue;
          }
          subjectId = sid;
        }

        // chapter_id（可选）：教材章节归属，传了必须存在
        let chapterId: bigint | null = null;
        const chapRaw = String(row.chapter_id ?? "").trim();
        if (chapRaw) {
          const cid = BigInt(chapRaw);
          const chapter = await prisma.chapter.findUnique({ where: { id: cid } });
          if (!chapter) {
            errors.push(`Row ${rowNo}: chapter_id "${chapRaw}" not found`);
            continue;
          }
          chapterId = cid;
        }

        // source（可选）：exam 真题 / textbook 教材同步 / mock 模拟 / custom 自建
        const source = String(row.source ?? "").trim() || "custom";
        if (!["exam", "textbook", "mock", "custom"].includes(source)) {
          errors.push(`Row ${rowNo}: Invalid source "${source}"`);
          continue;
        }

        // knowledge_point_ids（可选，多个用 | 分隔）
        let kpIds: bigint[] = [];
        const kpRaw = String(row.knowledge_point_ids ?? "").trim();
        if (kpRaw) {
          const parts = kpRaw.split("|").map((s) => s.trim()).filter(Boolean);
          kpIds = parts.map((p) => BigInt(p));
          const existing = await prisma.knowledgePoint.findMany({
            where: { id: { in: kpIds } },
            select: { id: true },
          });
          if (existing.length !== kpIds.length) {
            const foundSet = new Set(existing.map((k: { id: bigint }) => k.id.toString()));
            const missing = kpIds.filter((id) => !foundSet.has(id.toString()));
            errors.push(
              `Row ${rowNo}: knowledge_point_ids not found: ${missing.join(",")}`
            );
            continue;
          }
        }

        // 选项
        const correctKeys = String(row.correct_keys ?? "")
          .split(",")
          .map((k) => k.trim().toUpperCase())
          .filter(Boolean);

        const optionEntries = (["A", "B", "C", "D", "E", "F"] as const)
          .map((key) => {
            const lower = key.toLowerCase() as "a" | "b" | "c" | "d" | "e" | "f";
            const col = `option_${lower}` as const;
            return {
              key,
              content: String(row[col] ?? "").trim(),
            };
          })
          .filter((o) => o.content !== "");

        if (optionEntries.length === 0) {
          errors.push(`Row ${rowNo}: No options provided`);
          continue;
        }

        // 校验 correct_keys 都在已存在的选项中
        const validKeys = new Set<string>(optionEntries.map((o) => o.key as string));
        const invalidKeys = correctKeys.filter((k) => !validKeys.has(k));
        if (invalidKeys.length > 0) {
          errors.push(
            `Row ${rowNo}: correct_keys [${invalidKeys.join(",")}] not in options`
          );
          continue;
        }

        const difficulty = parseInt(String(row.difficulty ?? "").trim(), 10) || 1;
        const score = parseInt(String(row.score ?? "").trim(), 10) || 1;
        const sortOrder = parseInt(String(row.sort_order ?? "").trim(), 10) || 0;
        const analysis = String(row.analysis ?? "").trim() || null;

        await prisma.question.create({
          data: {
            categoryId: targetCategoryId,
            subjectId,
            type,
            content,
            analysis,
            difficulty,
            score,
            sortOrder,
            chapterId,
            source,
            options: {
              create: optionEntries.map((o, idx) => ({
                optionKey: o.key,
                content: o.content,
                isCorrect: correctKeys.includes(o.key),
                sortNo: idx,
              })),
            },
            knowledgePoints: kpIds.length
              ? {
                  create: kpIds.map((id) => ({ knowledgePointId: id })),
                }
              : undefined,
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${rowNo}: ${err.message}`);
      }
    }

    return NextResponse.json({
      imported,
      total: rows.length,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Excel parse error: ${err.message}` },
      { status: 400 }
    );
  }
}
