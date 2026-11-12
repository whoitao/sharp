/**
 * 题目 Excel 导入/模板的共享定义。
 * 模板下载与导入解析共用同一份列清单，避免两侧字段口径漂移。
 */
export const IMPORT_SHEET_NAME = "导入数据";
export const GUIDE_SHEET_NAME = "字段说明";
export const DICT_SHEET_NAME = "字典参考";

/** 单次导入上限（行） */
export const IMPORT_MAX_ROWS = 1000;
/** 文件大小上限 */
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
/** 写库分批大小 */
export const IMPORT_BATCH_SIZE = 50;

export interface ImportColumn {
  key: string;
  header: string;
  required: string;
  type: string;
  description: string;
  example: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    key: "grade",
    header: "年级",
    required: "必填（填了章节可留空）",
    type: "文本",
    description: "年级名称，必须与系统一致；见「字典参考」中的年级列表",
    example: "三年级",
  },
  {
    key: "subject",
    header: "科目",
    required: "选填",
    type: "文本",
    description: "科目名称，必须与系统一致；填了章节时由章节所属教材反推",
    example: "数学",
  },
  {
    key: "publisher",
    header: "教材版本",
    required: "选填",
    type: "文本",
    description: "出版社名称，如 人教版；填写章节时用于唯一定位教材",
    example: "人教版",
  },
  {
    key: "semester",
    header: "学期",
    required: "选填",
    type: "文本",
    description: "上册 / 下册 / 全一册（也接受 1 / 2 / 0）；同一出版社有多册时必填",
    example: "上册",
  },
  {
    key: "chapter",
    header: "章节",
    required: "选填",
    type: "文本",
    description: "章节完整路径，用「 > 」连接，如「第一章 认识图形 > 第一节 长方形」；不支持填 id",
    example: "第一章 认识图形 > 第一节 长方形",
  },
  {
    key: "type",
    header: "题型",
    required: "必填",
    type: "枚举",
    description: "单选 / 多选 / 填空（也接受 1 / 2 / 4）；不支持判断题",
    example: "单选",
  },
  {
    key: "content",
    header: "题干",
    required: "必填",
    type: "富文本",
    description:
      "支持 p / strong / em / u / sub / sup / br / ul / ol / table 等基础标签；不支持图片，出现 img 或图片痕迹会报错",
    example: "下列哪个数是偶数？",
  },
  {
    key: "optionA",
    header: "选项A",
    required: "至少填 1 个选项",
    type: "富文本",
    description: "选项内容；不填表示没有该选项；不支持图片",
    example: "2",
  },
  {
    key: "optionB",
    header: "选项B",
    required: "至少填 1 个选项",
    type: "富文本",
    description: "选项内容；不填表示没有该选项；不支持图片",
    example: "3",
  },
  {
    key: "optionC",
    header: "选项C",
    required: "至少填 1 个选项",
    type: "富文本",
    description: "选项内容；不填表示没有该选项；不支持图片",
    example: "5",
  },
  {
    key: "optionD",
    header: "选项D",
    required: "至少填 1 个选项",
    type: "富文本",
    description: "选项内容；不填表示没有该选项；不支持图片",
    example: "7",
  },
  {
    key: "optionE",
    header: "选项E",
    required: "至少填 1 个选项",
    type: "富文本",
    description: "选项内容；不填表示没有该选项；不支持图片",
    example: "",
  },
  {
    key: "optionF",
    header: "选项F",
    required: "至少填 1 个选项",
    type: "富文本",
    description: "选项内容；不填表示没有该选项；不支持图片",
    example: "",
  },
  {
    key: "correctKeys",
    header: "正确答案",
    required: "必填",
    type: "枚举",
    description:
      "单选填 1 个选项字母（如 A）；多选可填多个（如 A,C）；填空至少填 1 个；多个用英文逗号分隔",
    example: "A",
  },
  {
    key: "analysis",
    header: "解析",
    required: "选填",
    type: "富文本",
    description: "题目解析；不支持图片",
    example: "2 能被 2 整除，所以 2 是偶数。",
  },
  {
    key: "difficulty",
    header: "难度",
    required: "选填",
    type: "整数",
    description: "1-5 的整数，留空按 1 处理",
    example: "1",
  },
  {
    key: "score",
    header: "分值",
    required: "选填",
    type: "整数",
    description: "大于等于 1 的整数，留空按 1 处理",
    example: "1",
  },
  {
    key: "sortOrder",
    header: "排序",
    required: "选填",
    type: "整数",
    description: "题目排序值，留空按 0 处理",
    example: "0",
  },
  {
    key: "tags",
    header: "标签",
    required: "选填",
    type: "文本",
    description: "标签名称，多个用 | 分隔；标签必须已存在（见「字典参考」）",
    example: "课后练习",
  },
  {
    key: "knowledgePoints",
    header: "知识点",
    required: "选填",
    type: "文本",
    description:
      "知识点完整路径，用「 > 」连接；多个用 | 分隔；填写时必须同时填科目（见「字典参考」）",
    example: "数与代数 > 数的认识 > 偶数的认识",
  },
];

/** 选项列 A-F，与题干选项顺序一致 */
export const IMPORT_OPTION_COLUMNS = ["选项A", "选项B", "选项C", "选项D", "选项E", "选项F"];
export const IMPORT_OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

/** 题干/选项/解析中禁止出现的图片痕迹 */
const IMAGE_HINT_RE = /<img\b|data:image\/|!\[[^\]]*\]\(|\[图片\]/i;

export function hasImageHint(value: string | null | undefined): boolean {
  return typeof value === "string" && IMAGE_HINT_RE.test(value);
}

/** 富文本转纯文本，用于题干预览/去重指纹 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** 题目重复指纹：题干纯文本 + 年级 + 科目 + 章节 + 题型 */
export function questionFingerprint(input: {
  content: string;
  gradeId: bigint | null;
  subjectId: bigint | null;
  chapterId: bigint | null;
  type: number;
}): string {
  return [
    htmlToPlainText(input.content).toLowerCase(),
    input.gradeId?.toString() ?? "",
    input.subjectId?.toString() ?? "",
    input.chapterId?.toString() ?? "",
    String(input.type),
  ].join("\u0001");
}
