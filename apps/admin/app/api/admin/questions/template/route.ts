import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  DICT_SHEET_NAME,
  GUIDE_SHEET_NAME,
  IMPORT_COLUMNS,
  IMPORT_SHEET_NAME,
} from "@/lib/question-import";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

function semesterLabel(value: number): string {
  if (value === 0) return "全一册";
  return value === 2 ? "下册" : "上册";
}

/** 从 parentId 关系还原完整路径（用「 > 」连接） */
function buildPathMap(
  nodes: { id: string; parentId: string | null; name: string }[],
): Map<string, string> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cache = new Map<string, string>();
  const resolve = (id: string): string => {
    const cached = cache.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    if (!node) return "";
    const parentPath = node.parentId ? resolve(node.parentId) : "";
    const path = parentPath ? `${parentPath} > ${node.name}` : node.name;
    cache.set(id, path);
    return path;
  };
  for (const node of nodes) resolve(node.id);
  return cache;
}

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  const [grades, subjects, publishers, textbooks, chapters, knowledgePoints, tags] =
    await Promise.all([
      prisma.grade.findMany({
        orderBy: [{ stage: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, name: true, stage: { select: { name: true } } },
      }),
      prisma.subject.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { name: true },
      }),
      prisma.publisher.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
      prisma.textbook.findMany({
        orderBy: [{ grade: { sortOrder: "asc" } }, { subject: { sortOrder: "asc" } }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          semester: true,
          publisherId: true,
          subjectId: true,
          gradeId: true,
          publisher: { select: { name: true } },
          grade: { select: { name: true, stageId: true } },
          subject: { select: { name: true } },
        },
      }),
      prisma.chapter.findMany({
        orderBy: [{ textbookId: "asc" }, { parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, textbookId: true, parentId: true, name: true },
      }),
      prisma.knowledgePoint.findMany({
        orderBy: [{ stageId: "asc" }, { subjectId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          parentId: true,
          name: true,
          stageId: true,
          subjectId: true,
          stage: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
      prisma.questionTag.findMany({
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
        select: { name: true, type: true },
      }),
    ]);

  const chapterPaths = buildPathMap(
    chapters.map((item) => ({
      id: item.id.toString(),
      parentId: item.parentId?.toString() ?? null,
      name: item.name,
    })),
  );
  const kpPaths = buildPathMap(
    knowledgePoints.map((item) => ({
      id: item.id.toString(),
      parentId: item.parentId?.toString() ?? null,
      name: item.name,
    })),
  );

  const textbookById = new Map(textbooks.map((item) => [item.id.toString(), item]));

  // ─── Sheet 1：导入数据（表头 + 示例行） ────────────────────────────────
  const headers = IMPORT_COLUMNS.map((column) => column.header);

  const sampleGrade = grades[0];
  const sampleTextbook =
    textbooks.find((item) => item.grade.name === sampleGrade?.name) ?? textbooks[0];
  const sampleChapter = chapters.find(
    (item) => sampleTextbook && item.textbookId === BigInt(sampleTextbook.id),
  );
  const sampleTag = tags[0];
  const sampleKp = knowledgePoints.find(
    (item) =>
      sampleTextbook !== undefined &&
      item.subjectId === sampleTextbook.subjectId &&
      item.stageId === sampleTextbook.grade.stageId,
  );

  const chapterPath = sampleChapter ? chapterPaths.get(sampleChapter.id.toString()) ?? "" : "";
  const kpPath = sampleKp ? kpPaths.get(sampleKp.id.toString()) ?? "" : "";
  const common = {
    年级: sampleTextbook?.grade.name ?? sampleGrade?.name ?? "",
    科目: sampleTextbook?.subject.name ?? "",
    教材版本: sampleTextbook?.publisher.name ?? "",
    学期: sampleTextbook ? semesterLabel(sampleTextbook.semester) : "",
    章节: chapterPath,
    解析: "示例解析，可留空。",
    难度: "1",
    分值: "1",
    排序: "0",
    标签: sampleTag?.name ?? "",
    知识点: kpPath,
  };

  const sampleRows = [
    {
      ...common,
      题型: "单选",
      题干: "示例：下列哪个数是偶数？",
      选项A: "2",
      选项B: "3",
      选项C: "5",
      选项D: "7",
      选项E: "",
      选项F: "",
      正确答案: "A",
    },
    {
      ...common,
      题型: "多选",
      题干: "示例：下列哪些是偶数？",
      选项A: "2",
      选项B: "3",
      选项C: "4",
      选项D: "5",
      选项E: "",
      选项F: "",
      正确答案: "A,C",
    },
    {
      ...common,
      题型: "填空",
      题干: "示例：2 + 2 = ____",
      选项A: "4",
      选项B: "5",
      选项C: "",
      选项D: "",
      选项E: "",
      选项F: "",
      正确答案: "A",
    },
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...sampleRows.map((row) => headers.map((header) => (row as Record<string, string>)[header] ?? "")),
  ]);
  dataSheet["!cols"] = headers.map((header) => ({
    wch: header === "题干" ? 42 : header === "解析" ? 32 : header === "章节" ? 34 : 16,
  }));

  // ─── Sheet 2：字段说明 ────────────────────────────────────────────────
  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["字段", "是否必填", "类型", "说明", "示例"],
    ...IMPORT_COLUMNS.map((column) => [
      column.header,
      column.required,
      column.type,
      column.description,
      column.example,
    ]),
    ["", "", "", "", ""],
    ["导入规则", "", "", "", ""],
    ["重复题", "", "", "按「题干纯文本 + 年级 + 科目 + 章节 + 题型」判重；与库内或本文件前面的行重复时整行阻断，不写入", ""],
    ["单次上限", "", "", "单次最多 1000 行；文件不超过 5MB", ""],
    ["图片", "", "", "不支持图片：题干、选项、解析中出现 img、data:image 或图片痕迹会报错，不会静默入库", ""],
    ["支持题型", "", "", "仅支持单选（1）、多选（2）、填空（4）；判断题（3）及其它题型会报错", ""],
    ["关联字段", "", "", "年级、科目、教材版本、章节、知识点、标签均按名称/路径匹配，不要填 id；匹配不上会报错", ""],
    ["章节写法", "", "", "用「 > 」连接完整路径，例如：第一章 认识图形 > 第一节 长方形", ""],
    ["知识点写法", "", "", "用「 > 」连接完整路径，多个用 | 分隔，例如：数与代数 > 数的认识 > 偶数", ""],
    ["标签写法", "", "", "多个标签用 | 分隔，标签必须已在系统中存在", ""],
    ["富文本", "", "", "题干/选项/解析支持基础 HTML 标签（p、strong、em、u、sub、sup、br、ul、ol、table 等）", ""],
  ]);
  guideSheet["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 78 }, { wch: 32 }];

  // ─── Sheet 3：字典参考 ────────────────────────────────────────────────
  const dictRows: (string | number)[][] = [];
  const pushSection = (title: string, header: string[], rows: (string | number)[][]) => {
    if (dictRows.length > 0) dictRows.push([]);
    dictRows.push([title]);
    dictRows.push(header);
    for (const row of rows) dictRows.push(row);
  };

  pushSection(
    "年级（填「年级」列）",
    ["年级", "学段"],
    grades.map((item) => [item.name, item.stage.name]),
  );
  pushSection(
    "科目（填「科目」列）",
    ["科目"],
    subjects.map((item) => [item.name]),
  );
  pushSection(
    "教材（填「教材版本」「学期」列，配合年级/科目唯一定位）",
    ["教材版本", "年级", "科目", "学期", "教材名称"],
    textbooks.map((item) => [
      item.publisher.name,
      item.grade.name,
      item.subject.name,
      semesterLabel(item.semester),
      item.name,
    ]),
  );
  pushSection(
    "章节（填「章节」列，使用完整路径）",
    ["教材版本", "年级", "科目", "学期", "章节路径"],
    chapters
      .map((item) => {
        const textbook = textbookById.get(item.textbookId.toString());
        if (!textbook) return null;
        return [
          textbook.publisher.name,
          textbook.grade.name,
          textbook.subject.name,
          semesterLabel(textbook.semester),
          chapterPaths.get(item.id.toString()) ?? "",
        ];
      })
      .filter((row): row is string[] => row !== null),
  );
  pushSection(
    "知识点（填「知识点」列，使用完整路径；需同时填科目）",
    ["学段", "科目", "知识点路径"],
    knowledgePoints.map((item) => [
      item.stage.name,
      item.subject?.name ?? "",
      kpPaths.get(item.id.toString()) ?? "",
    ]),
  );
  pushSection(
    "标签（填「标签」列）",
    ["标签名称", "标签类型"],
    tags.map((item) => [item.name, item.type]),
  );

  const dictSheet = XLSX.utils.aoa_to_sheet(dictRows);
  dictSheet["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 52 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, IMPORT_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, guideSheet, GUIDE_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, dictSheet, DICT_SHEET_NAME);

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = "题目导入模板.xlsx";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="question-import-template.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
