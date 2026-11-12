import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_OPTION_COLUMNS,
  IMPORT_OPTION_KEYS,
  IMPORT_SHEET_NAME,
  hasImageHint,
  htmlToPlainText,
  questionFingerprint,
} from "@/lib/question-import";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

interface RowError {
  row: number;
  column: string;
  message: string;
}

interface ResolvedQuestion {
  row: number;
  type: number;
  content: string;
  analysis: string | null;
  gradeId: bigint;
  subjectId: bigint | null;
  chapterId: bigint | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  options: { optionKey: string; content: string; isCorrect: boolean }[];
  knowledgePointIds: bigint[];
  tagIds: bigint[];
  fingerprint: string;
}

interface Dictionary {
  grades: {
    id: bigint;
    name: string;
    stageId: bigint;
  }[];
  subjects: { id: bigint; name: string }[];
  publishers: { id: bigint; name: string }[];
  textbooks: {
    id: bigint;
    name: string;
    publisherId: bigint;
    subjectId: bigint;
    gradeId: bigint;
    semester: number;
  }[];
  chapters: { id: bigint; textbookId: bigint; parentId: bigint | null; name: string }[];
  knowledgePoints: {
    id: bigint;
    parentId: bigint | null;
    name: string;
    subjectId: bigint | null;
    stageId: bigint;
  }[];
  tags: { id: bigint; name: string }[];
}

const CORE_HEADERS = ["题型", "题干", "选项A", "正确答案"];
const encoder = new TextEncoder();

const norm = (value: unknown): string => (value === null || value === undefined ? "" : String(value).trim());

function parseSemester(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (["上册", "上", "1"].includes(text)) return 1;
  if (["下册", "下", "2"].includes(text)) return 2;
  if (["全一册", "全", "0"].includes(text)) return 0;
  return null;
}

function parseType(value: string): { type?: number; message?: string } {
  const text = value.trim().replace(/题$/, "");
  if (["单选", "单项选择", "1"].includes(text)) return { type: 1 };
  if (["多选", "多项选择", "2"].includes(text)) return { type: 2 };
  if (["填空", "4"].includes(text)) return { type: 4 };
  if (["判断", "3"].includes(text)) {
    return { message: "不支持判断题（3），仅支持单选（1）、多选（2）、填空（4）" };
  }
  return { message: `无法识别的题型「${value}」，仅支持单选（1）、多选（2）、填空（4）` };
}

function parseInteger(
  value: string,
  options: { defaultValue: number; min: number; max?: number },
): { value?: number; message?: string } {
  if (!value.trim()) return { value: options.defaultValue };
  const num = Number(value);
  if (!Number.isInteger(num)) return { message: "必须是整数" };
  if (num < options.min) return { message: `不能小于 ${options.min}` };
  if (options.max !== undefined && num > options.max) return { message: `不能大于 ${options.max}` };
  return { value: num };
}

function parseCorrectKeys(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,，、|/\s]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function splitPath(value: string): string[] {
  return value
    .split(/>|→|\//)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitMulti(value: string): string[] {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 在多棵同级节点里按路径逐段匹配；返回唯一命中的节点，或给出歧义/不存在原因 */
function resolvePath<T extends { id: bigint; parentId: bigint | null; name: string }>(
  candidates: T[],
  segments: string[],
): { node?: T; message?: string } {
  if (segments.length === 0) return {};
  let currentParent: bigint | null = null;
  let current: T | undefined;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const matches = candidates.filter(
      (item) => item.parentId === currentParent && item.name === segment,
    );
    if (matches.length === 0) {
      return { message: `第 ${i + 1} 段「${segment}」不存在` };
    }
    if (matches.length > 1) {
      return { message: `第 ${i + 1} 段「${segment}」存在多个同名节点，无法唯一匹配` };
    }
    current = matches[0];
    currentParent = current.id;
  }
  return { node: current };
}

function buildDictionary(): Promise<Dictionary> {
  return Promise.all([
    prisma.grade.findMany({ select: { id: true, name: true, stageId: true } }),
    prisma.subject.findMany({ select: { id: true, name: true } }),
    prisma.publisher.findMany({ select: { id: true, name: true } }),
    prisma.textbook.findMany({
      select: { id: true, name: true, publisherId: true, subjectId: true, gradeId: true, semester: true },
    }),
    prisma.chapter.findMany({
      select: { id: true, textbookId: true, parentId: true, name: true },
    }),
    prisma.knowledgePoint.findMany({
      select: { id: true, parentId: true, name: true, subjectId: true, stageId: true },
    }),
    prisma.questionTag.findMany({ select: { id: true, name: true } }),
  ]).then(([grades, subjects, publishers, textbooks, chapters, knowledgePoints, tags]) => ({
    grades,
    subjects,
    publishers,
    textbooks,
    chapters,
    knowledgePoints,
    tags,
  }));
}

function questionCreateData(item: ResolvedQuestion) {
  return {
    type: item.type,
    content: item.content,
    analysis: item.analysis,
    gradeId: item.gradeId,
    subjectId: item.subjectId,
    chapterId: item.chapterId,
    difficulty: item.difficulty,
    score: item.score,
    sortOrder: item.sortOrder,
    source: "custom",
    options: {
      create: item.options.map((option, index) => ({
        optionKey: option.optionKey,
        content: option.content,
        isCorrect: option.isCorrect,
        sortNo: index,
      })),
    },
    knowledgePoints: {
      create: item.knowledgePointIds.map((id) => ({ knowledgePointId: id })),
    },
    tags: {
      create: item.tagIds.map((id) => ({ tagId: id })),
    },
  };
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择要导入的 Excel 文件" }, { status: 400 });
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `文件不能超过 ${Math.floor(IMPORT_MAX_FILE_BYTES / 1024 / 1024)}MB` },
      { status: 400 },
    );
  }

  const fallbackGradeIdRaw = norm(formData.get("gradeId"));
  if (fallbackGradeIdRaw && !/^\d+$/.test(fallbackGradeIdRaw)) {
    return NextResponse.json({ error: "年级参数非法" }, { status: 400 });
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "无法解析 Excel 文件，请确认文件格式为 .xlsx" }, { status: 400 });
  }

  const sheetName = workbook.SheetNames.includes(IMPORT_SHEET_NAME)
    ? IMPORT_SHEET_NAME
    : workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "Excel 中没有工作表" }, { status: 400 });
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  const headerRow = (matrix[0] ?? []).map((cell) => norm(cell));
  const headerIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (header && !headerIndex.has(header)) headerIndex.set(header, index);
  });

  const missingHeaders = CORE_HEADERS.filter((header) => !headerIndex.has(header));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      { error: `缺少必需列：${missingHeaders.join("、")}` },
      { status: 400 },
    );
  }

  const rawRows: { row: number; cells: string[] }[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = (matrix[i] ?? []).map((cell) => norm(cell));
    if (cells.every((cell) => cell === "")) continue;
    rawRows.push({ row: i + 1, cells });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "文件中没有可导入的数据行" }, { status: 400 });
  }
  if (rawRows.length > IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `单次最多导入 ${IMPORT_MAX_ROWS} 行，当前文件有 ${rawRows.length} 行` },
      { status: 400 },
    );
  }

  let dictionary: Dictionary;
  try {
    dictionary = await buildDictionary();
  } catch (err) {
    console.error("question import dictionary error", err);
    return NextResponse.json({ error: "读取基础字典失败，请稍后重试" }, { status: 500 });
  }

  const gradeByName = new Map(dictionary.grades.map((item) => [item.name, item]));
  const gradeById = new Map(dictionary.grades.map((item) => [item.id.toString(), item]));
  const subjectByName = new Map(dictionary.subjects.map((item) => [item.name, item]));
  const publisherByName = new Map(dictionary.publishers.map((item) => [item.name, item]));
  const tagByName = new Map(dictionary.tags.map((item) => [item.name, item]));
  const chaptersByTextbook = new Map<string, Dictionary["chapters"]>();
  for (const chapter of dictionary.chapters) {
    const key = chapter.textbookId.toString();
    const list = chaptersByTextbook.get(key);
    if (list) list.push(chapter);
    else chaptersByTextbook.set(key, [chapter]);
  }
  const kpsByStageSubject = new Map<string, Dictionary["knowledgePoints"]>();
  for (const item of dictionary.knowledgePoints) {
    if (item.subjectId === null) continue;
    const key = `${item.stageId.toString()}|${item.subjectId.toString()}`;
    const list = kpsByStageSubject.get(key);
    if (list) list.push(item);
    else kpsByStageSubject.set(key, [item]);
  }

  const fallbackGrade = fallbackGradeIdRaw ? gradeById.get(fallbackGradeIdRaw) : undefined;
  if (fallbackGradeIdRaw && !fallbackGrade) {
    return NextResponse.json({ error: "选择的年级不存在" }, { status: 400 });
  }

  const total = rawRows.length;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        const errors: RowError[] = [];
        const resolvedRows: ResolvedQuestion[] = [];

        const cellOf = (cells: string[], header: string): string => {
          const index = headerIndex.get(header);
          if (index === undefined) return "";
          return cells[index] ?? "";
        };

        for (let i = 0; i < rawRows.length; i += 1) {
          const { row, cells } = rawRows[i];
          const rowErrors: RowError[] = [];
          const pushError = (column: string, message: string) =>
            rowErrors.push({ row, column, message });

          // 年级：优先单元格，其次导入弹窗选择的年级
          const gradeCell = cellOf(cells, "年级");
          const grade = gradeCell
            ? gradeByName.get(gradeCell)
            : fallbackGrade;
          if (!grade) {
            pushError("年级", gradeCell ? `年级「${gradeCell}」不存在` : "年级必填（或在导入弹窗选择年级）");
          }

          // 科目
          const subjectCell = cellOf(cells, "科目");
          const subject = subjectCell ? subjectByName.get(subjectCell) : undefined;
          if (subjectCell && !subject) pushError("科目", `科目「${subjectCell}」不存在`);

          // 教材版本 + 学期 + 章节
          const publisherCell = cellOf(cells, "教材版本");
          const publisher = publisherCell ? publisherByName.get(publisherCell) : undefined;
          if (publisherCell && !publisher) pushError("教材版本", `教材版本「${publisherCell}」不存在`);

          const semesterCell = cellOf(cells, "学期");
          const semester = parseSemester(semesterCell);
          if (semesterCell && semester === null) {
            pushError("学期", `无法识别学期「${semesterCell}」，请填 上册 / 下册 / 全一册`);
          }

          const chapterCell = cellOf(cells, "章节");
          let chapterId: bigint | null = null;
          if (chapterCell) {
            if (!grade) {
              pushError("章节", "填写章节时必须能确定年级");
            } else if (!subject) {
              pushError("章节", "填写章节时必须填写科目");
            } else {
              const candidates = dictionary.textbooks.filter(
                (textbook) =>
                  textbook.gradeId === grade.id &&
                  textbook.subjectId === subject.id &&
                  (!publisher || textbook.publisherId === publisher.id) &&
                  (semester === null || textbook.semester === semester),
              );
              if (candidates.length === 0) {
                pushError("章节", "当前年级/科目/教材版本/学期下没有教材");
              } else {
                const segments = splitPath(chapterCell);
                const hits: { id: bigint }[] = [];
                let firstMessage: string | undefined;
                for (const textbook of candidates) {
                  const result = resolvePath(
                    chaptersByTextbook.get(textbook.id.toString()) ?? [],
                    segments,
                  );
                  if (result.node) hits.push(result.node);
                  else if (!firstMessage) firstMessage = result.message;
                }
                if (hits.length === 0) {
                  pushError("章节", `章节路径不存在：${firstMessage ?? chapterCell}`);
                } else if (hits.length > 1) {
                  pushError("章节", "章节在多本教材中存在，请补充教材版本/学期");
                } else {
                  chapterId = hits[0].id;
                }
              }
            }
          }

          // 题型
          const typeCell = cellOf(cells, "题型");
          const parsedType = parseType(typeCell);
          if (parsedType.message) pushError("题型", parsedType.message);

          // 题干 / 选项 / 解析：富文本清洗 + 图片拦截
          const sanitizeField = (column: string, value: string): string => {
            if (!value) return "";
            if (hasImageHint(value)) {
              pushError(column, "不支持图片：请删除图片后重新导入");
              return "";
            }
            return sanitizeRichHtml(value);
          };

          const contentRaw = cellOf(cells, "题干");
          const contentHtml = sanitizeField("题干", contentRaw);
          // 图片已单独报错时不再叠加「题干为空」，避免同一行重复提示
          if (!hasImageHint(contentRaw) && !htmlToPlainText(contentHtml)) {
            pushError("题干", "题干不能为空");
          }

          const options: { optionKey: string; content: string; isCorrect: boolean }[] = [];
          IMPORT_OPTION_COLUMNS.forEach((header, index) => {
            const raw = cellOf(cells, header);
            if (!raw) return;
            const html = sanitizeField(header, raw);
            if (!htmlToPlainText(html)) return;
            options.push({ optionKey: IMPORT_OPTION_KEYS[index], content: html, isCorrect: false });
          });
          if (options.length === 0) {
            pushError("选项A", "至少填写 1 个选项");
          }

          const correctRaw = cellOf(cells, "正确答案");
          const correctKeys = parseCorrectKeys(correctRaw);
          if (correctKeys.length === 0) {
            pushError("正确答案", "正确答案不能为空");
          } else {
            const optionKeys = new Set(options.map((option) => option.optionKey));
            for (const key of correctKeys) {
              if (!optionKeys.has(key)) {
                pushError("正确答案", `答案「${key}」不在已填选项中`);
              }
            }
            if (parsedType.type === 1 && correctKeys.length !== 1) {
              pushError("正确答案", "单选题必须且只能有 1 个正确选项");
            }
            if ((parsedType.type === 2 || parsedType.type === 4) && correctKeys.length < 1) {
              pushError("正确答案", "至少填写 1 个正确选项");
            }
          }

          const analysisHtml = sanitizeField("解析", cellOf(cells, "解析"));

          const difficulty = parseInteger(cellOf(cells, "难度"), { defaultValue: 1, min: 1, max: 5 });
          if (difficulty.message) pushError("难度", difficulty.message);
          const score = parseInteger(cellOf(cells, "分值"), { defaultValue: 1, min: 1 });
          if (score.message) pushError("分值", score.message);
          const sortOrder = parseInteger(cellOf(cells, "排序"), { defaultValue: 0, min: 0 });
          if (sortOrder.message) pushError("排序", sortOrder.message);

          // 标签
          const tagIds: bigint[] = [];
          const tagCell = cellOf(cells, "标签");
          for (const name of splitMulti(tagCell)) {
            const tag = tagByName.get(name);
            if (!tag) pushError("标签", `标签「${name}」不存在，请先在标签管理中创建`);
            else if (!tagIds.includes(tag.id)) tagIds.push(tag.id);
          }

          // 知识点
          const knowledgePointIds: bigint[] = [];
          const kpCell = cellOf(cells, "知识点");
          if (kpCell) {
            if (!subject) {
              pushError("知识点", "填写知识点时必须填写科目");
            } else if (!grade) {
              pushError("知识点", "填写知识点时必须能确定年级");
            } else {
              const candidates =
                kpsByStageSubject.get(
                  `${grade.stageId.toString()}|${subject.id.toString()}`,
                ) ?? [];
              for (const path of splitMulti(kpCell)) {
                const result = resolvePath(candidates, splitPath(path));
                if (!result.node) {
                  pushError("知识点", `知识点路径不存在：${path}（${result.message ?? "未找到"}）`);
                } else if (!knowledgePointIds.includes(result.node.id)) {
                  knowledgePointIds.push(result.node.id);
                }
              }
            }
          }

          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else {
            const isCorrect = new Set(correctKeys);
            for (const option of options) option.isCorrect = isCorrect.has(option.optionKey);
            resolvedRows.push({
              row,
              type: parsedType.type!,
              content: contentHtml,
              analysis: htmlToPlainText(analysisHtml) ? analysisHtml : null,
              gradeId: grade!.id,
              subjectId: subject?.id ?? null,
              chapterId,
              difficulty: difficulty.value!,
              score: score.value!,
              sortOrder: sortOrder.value!,
              options,
              knowledgePointIds,
              tagIds,
              fingerprint: questionFingerprint({
                content: contentHtml,
                gradeId: grade!.id,
                subjectId: subject?.id ?? null,
                chapterId,
                type: parsedType.type!,
              }),
            });
          }

          if ((i + 1) % 20 === 0 || i + 1 === total) {
            emit({ type: "progress", processed: i + 1, total: total * 2 });
          }
        }

        // 重复导入阻断：本文件内 + 库内
        const seenInFile = new Map<string, number>();
        const afterInFile: ResolvedQuestion[] = [];
        for (const item of resolvedRows) {
          const firstRow = seenInFile.get(item.fingerprint);
          if (firstRow !== undefined) {
            errors.push({
              row: item.row,
              column: "整行",
              message: `与本文件第 ${firstRow} 行重复（题干+年级+科目+章节+题型相同）`,
            });
            continue;
          }
          seenInFile.set(item.fingerprint, item.row);
          afterInFile.push(item);
        }

        const groupKeys = new Set(
          afterInFile.map(
            (item) =>
              `${item.gradeId.toString()}|${item.subjectId?.toString() ?? ""}|${item.chapterId?.toString() ?? ""}|${item.type}`,
          ),
        );
        const existingFingerprints = new Map<string, bigint>();
        for (const key of groupKeys) {
          const [gradeId, subjectId, chapterId, type] = key.split("|");
          const questions = await prisma.question.findMany({
            where: {
              gradeId: BigInt(gradeId),
              subjectId: subjectId ? BigInt(subjectId) : null,
              chapterId: chapterId ? BigInt(chapterId) : null,
              type: Number(type),
            },
            select: { id: true, content: true },
          });
          for (const question of questions) {
            existingFingerprints.set(
              questionFingerprint({
                content: question.content,
                gradeId: BigInt(gradeId),
                subjectId: subjectId ? BigInt(subjectId) : null,
                chapterId: chapterId ? BigInt(chapterId) : null,
                type: Number(type),
              }),
              question.id,
            );
          }
        }

        const toWrite: ResolvedQuestion[] = [];
        for (const item of afterInFile) {
          const existingId = existingFingerprints.get(item.fingerprint);
          if (existingId !== undefined) {
            errors.push({
              row: item.row,
              column: "整行",
              message: `与库内第 ${existingId.toString()} 题重复（题干+年级+科目+章节+题型相同）`,
            });
            continue;
          }
          toWrite.push(item);
        }

        // 写库：分批事务；某批失败时逐行重试，保证单行失败不影响其余行
        const skipped = total - toWrite.length;
        let imported = 0;
        let processed = total + skipped;
        for (let i = 0; i < toWrite.length; i += IMPORT_BATCH_SIZE) {
          const batch = toWrite.slice(i, i + IMPORT_BATCH_SIZE);
          try {
            await prisma.$transaction(
              batch.map((item) => prisma.question.create({ data: questionCreateData(item) })),
            );
            imported += batch.length;
          } catch {
            for (const item of batch) {
              try {
                await prisma.question.create({ data: questionCreateData(item) });
                imported += 1;
              } catch (err) {
                errors.push({
                  row: item.row,
                  column: "整行",
                  message: `写入失败：${err instanceof Error ? err.message : "未知错误"}`,
                });
              }
            }
          }
          processed = total + skipped + Math.min(i + batch.length, toWrite.length);
          emit({ type: "progress", processed, total: total * 2 });
        }
        if (processed < total * 2) {
          emit({ type: "progress", processed: total * 2, total: total * 2 });
        }

        errors.sort((a, b) => a.row - b.row);
        emit({
          type: "result",
          total,
          imported,
          failedRows: new Set(errors.map((item) => item.row)).size,
          errors,
        });
      } catch (err) {
        console.error("question import error", err);
        emit({
          type: "error",
          message: "导入失败，请稍后重试",
        });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // 客户端已断开
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
