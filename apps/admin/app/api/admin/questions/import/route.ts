import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { handleRouteError } from "@/lib/http";
import { parseBigIntId } from "@/lib/query";

/** 导入上限：避免超大文件/超长表格打爆内存与数据库连接池。 */
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 2000;
const BATCH_SIZE = 50;

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const;

function rawId(value: unknown): string {
  return String(value ?? "").trim();
}

function tryBigInt(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "multipart form data required" }, { status: 400 });
    }
    const file = formData.get("file") as File | null;
    const gradeIdRaw = formData.get("gradeId");

    if (!file || !gradeIdRaw) {
      return NextResponse.json({ error: "gradeId and file are required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `文件超过 ${MAX_FILE_BYTES / 1024 / 1024}MB 上限` },
        { status: 413 }
      );
    }

    const selectedGradeId = parseBigIntId(String(gradeIdRaw), "gradeId");
    const selectedGrade = await prisma.grade.findUnique({
      where: { id: selectedGradeId },
      select: { id: true },
    });
    if (!selectedGrade) {
      return NextResponse.json({ error: "gradeId not found" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: "",
      raw: false,
    });

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `单次最多导入 ${MAX_ROWS} 行，当前 ${rows.length} 行，请拆分文件` },
        { status: 413 }
      );
    }

    // 第一遍：收集本批次引用到的字典 id，一次性预加载，避免逐行查库（N+1）
    const gradeIds = new Set<bigint>([selectedGradeId]);
    const subjectIds = new Set<bigint>();
    const chapterIds = new Set<bigint>();
    const knowledgePointIds = new Set<bigint>();

    for (const row of rows) {
      const gradeId = tryBigInt(rawId(row.grade_id));
      if (gradeId) gradeIds.add(gradeId);
      const subjectId = tryBigInt(rawId(row.subject_id));
      if (subjectId) subjectIds.add(subjectId);
      const chapterId = tryBigInt(rawId(row.chapter_id));
      if (chapterId) chapterIds.add(chapterId);
      const kpRaw = rawId(row.knowledge_point_ids);
      if (kpRaw) {
        for (const part of kpRaw.split("|").map((s) => s.trim()).filter(Boolean)) {
          const kpId = tryBigInt(part);
          if (kpId) knowledgePointIds.add(kpId);
        }
      }
    }

    const [grades, subjects, chapterRecords, knowledgePoints] = await Promise.all([
      prisma.grade.findMany({
        where: { id: { in: Array.from(gradeIds) } },
        select: { id: true },
      }),
      prisma.subject.findMany({
        where: { id: { in: Array.from(subjectIds) } },
        select: { id: true },
      }),
      prisma.chapter.findMany({
        where: { id: { in: Array.from(chapterIds) } },
        select: {
          id: true,
          textbook: { select: { gradeId: true, subjectId: true } },
        },
      }),
      prisma.knowledgePoint.findMany({
        where: { id: { in: Array.from(knowledgePointIds) } },
        select: { id: true },
      }),
    ]);

    const gradeSet = new Set(grades.map((g) => g.id));
    const subjectSet = new Set(subjects.map((s) => s.id));
    const chapterMap = new Map(chapterRecords.map((c) => [c.id.toString(), c]));
    const kpSet = new Set(knowledgePoints.map((k) => k.id));

    const errors: string[] = [];
    const pending: Prisma.QuestionCreateInput[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2; // excel 行号（1=header）

      const typeRaw = String(row.type ?? "").trim();
      const type = parseInt(typeRaw, 10);
      if (![1, 2, 3, 4].includes(type)) {
        errors.push(`Row ${rowNo}: Invalid type "${typeRaw}"`);
        continue;
      }

      const content = String(row.content ?? "").trim();
      if (!content) {
        errors.push(`Row ${rowNo}: content is required`);
        continue;
      }

      let targetGradeId = selectedGradeId;
      const gidRaw = rawId(row.grade_id);
      if (gidRaw) {
        const gid = tryBigInt(gidRaw);
        if (!gid || !gradeSet.has(gid)) {
          errors.push(`Row ${rowNo}: grade_id "${gidRaw}" not found`);
          continue;
        }
        targetGradeId = gid;
      }

      let subjectId: bigint | null = null;
      const subRaw = rawId(row.subject_id);
      if (subRaw) {
        const sid = tryBigInt(subRaw);
        if (!sid || !subjectSet.has(sid)) {
          errors.push(`Row ${rowNo}: subject_id "${subRaw}" not found`);
          continue;
        }
        subjectId = sid;
      }

      let chapterId: bigint | null = null;
      const chapRaw = rawId(row.chapter_id);
      if (chapRaw) {
        const chapter = chapterMap.get(chapRaw);
        if (!chapter) {
          errors.push(`Row ${rowNo}: chapter_id "${chapRaw}" not found`);
          continue;
        }
        chapterId = chapter.id;
        targetGradeId = chapter.textbook.gradeId;
        subjectId = chapter.textbook.subjectId;
      }

      const source = String(row.source ?? "").trim() || "custom";
      if (!["exam", "textbook", "mock", "custom"].includes(source)) {
        errors.push(`Row ${rowNo}: Invalid source "${source}"`);
        continue;
      }

      let kpIds: bigint[] = [];
      const kpRaw = rawId(row.knowledge_point_ids);
      if (kpRaw) {
        const parts = kpRaw.split("|").map((s) => s.trim()).filter(Boolean);
        const parsed = parts.map((part) => tryBigInt(part));
        if (parsed.some((id) => id === null)) {
          errors.push(`Row ${rowNo}: knowledge_point_ids 含非法 id`);
          continue;
        }
        kpIds = parsed as bigint[];
        const missing = kpIds.filter((id) => !kpSet.has(id));
        if (missing.length > 0) {
          errors.push(`Row ${rowNo}: knowledge_point_ids not found: ${missing.join(",")}`);
          continue;
        }
      }

      const correctKeys = String(row.correct_keys ?? "")
        .split(",")
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean);

      const optionEntries = OPTION_KEYS.map((key) => {
        const col = `option_${key.toLowerCase()}`;
        return { key, content: String(row[col] ?? "").trim() };
      }).filter((o) => o.content !== "");

      if (optionEntries.length === 0) {
        errors.push(`Row ${rowNo}: No options provided`);
        continue;
      }

      const validKeys = new Set<string>(optionEntries.map((o) => o.key as string));
      const invalidKeys = correctKeys.filter((k) => !validKeys.has(k));
      if (invalidKeys.length > 0) {
        errors.push(`Row ${rowNo}: correct_keys [${invalidKeys.join(",")}] not in options`);
        continue;
      }

      const difficulty = parseInt(String(row.difficulty ?? "").trim(), 10) || 1;
      const score = parseInt(String(row.score ?? "").trim(), 10) || 1;
      const sortOrder = parseInt(String(row.sort_order ?? "").trim(), 10) || 0;
      const analysis = String(row.analysis ?? "").trim() || null;

      pending.push({
        grade: { connect: { id: targetGradeId } },
        ...(subjectId ? { subject: { connect: { id: subjectId } } } : {}),
        ...(chapterId ? { chapter: { connect: { id: chapterId } } } : {}),
        type,
        content,
        analysis,
        difficulty,
        score,
        sortOrder,
        source,
        options: {
          create: optionEntries.map((o, idx) => ({
            optionKey: o.key,
            content: o.content,
            isCorrect: correctKeys.includes(o.key),
            sortNo: idx,
          })),
        },
        ...(kpIds.length
          ? {
              knowledgePoints: {
                create: kpIds.map((id) => ({ knowledgePointId: id })),
              },
            }
          : {}),
      });
    }

    // 分批事务写入：每批要么全部成功，要么全部回滚
    let imported = 0;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      try {
        await prisma.$transaction(batch.map((data) => prisma.question.create({ data })));
        imported += batch.length;
      } catch (err) {
        console.error("[admin/questions/import] batch write failed", err);
        errors.push(`批量写入第 ${i / BATCH_SIZE + 1} 批失败，已回滚`);
      }
    }

    return NextResponse.json({
      imported,
      total: rows.length,
      errors,
    });
  } catch (err) {
    return handleRouteError(err, "admin/questions/import");
  }
}
