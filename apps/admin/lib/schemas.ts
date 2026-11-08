import { z } from "zod";
import { WIKI_SLUG_PATTERN } from "./wiki";

/** 空字符串 / null 视为未传，避免 z.coerce 把 "" 变成 0 或报错。 */
const OPTIONAL_BIGINT = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.bigint().optional(),
);

/** 更新场景：显式 null / 空字符串表示「清空该字段」，与「未传」区分开。 */
const NULLABLE_BIGINT = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([z.null(), z.coerce.bigint()]).optional(),
);

const optionalText = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().max(200).optional(),
);

const pageSchema = z.coerce
  .number()
  .int()
  .catch(1)
  .transform((n) => (n >= 1 ? Math.floor(n) : 1));

const pageSizeSchema = (defaultSize: number) =>
  z.coerce
    .number()
    .int()
    .catch(defaultSize)
    .transform((n) => (n >= 1 ? Math.min(100, Math.floor(n)) : defaultSize));

const QUERY_SOURCES = ["exam", "textbook", "mock", "custom"] as const;

/* ===== 列表 query ===== */

export const usersQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema(10),
  search: optionalText,
});

export const adminsQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema(10),
  search: optionalText,
});

export const statsQuerySchema = z.object({
  days: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().catch(14).default(14),
  ).transform((n) => Math.min(90, Math.max(1, n))),
  gradeId: OPTIONAL_BIGINT,
  subjectId: OPTIONAL_BIGINT,
});

export const questionsQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema(10),
  subjectId: OPTIONAL_BIGINT,
  gradeId: OPTIONAL_BIGINT,
  knowledgePointId: OPTIONAL_BIGINT,
  chapterId: OPTIONAL_BIGINT,
  tagId: OPTIONAL_BIGINT,
  source: z.enum(QUERY_SOURCES).optional().catch(undefined),
  search: optionalText,
});

export const favoritesQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema(10),
  userSearch: optionalText,
  questionSearch: optionalText,
  gradeId: OPTIONAL_BIGINT,
  subjectId: OPTIONAL_BIGINT,
  startDate: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.date().optional().catch(undefined),
  ),
  endDate: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.date().optional().catch(undefined),
  ),
});

export const textbooksQuerySchema = z.object({
  stageId: OPTIONAL_BIGINT,
  subjectId: OPTIONAL_BIGINT,
  gradeId: OPTIONAL_BIGINT,
  publisherId: OPTIONAL_BIGINT,
});

export const chaptersQuerySchema = z.object({
  textbookId: OPTIONAL_BIGINT,
  stageId: OPTIONAL_BIGINT,
  subjectId: OPTIONAL_BIGINT,
  gradeId: OPTIONAL_BIGINT,
  publisherId: OPTIONAL_BIGINT,
});

/* ===== 请求体 ===== */

export const adminCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,32}$/),
  password: z.string().min(6),
  roleId: z.string().min(1),
});

const questionOptionSchema = z.object({
  optionKey: z.string().trim().min(1).max(1),
  content: z.string().min(1),
  isCorrect: z.boolean().optional(),
});

export const questionCreateSchema = z.object({
  gradeId: OPTIONAL_BIGINT,
  subjectId: OPTIONAL_BIGINT,
  chapterId: OPTIONAL_BIGINT,
  type: z.coerce.number().int().min(1).max(4),
  content: z.string().min(1),
  analysis: z.string().nullish(),
  difficulty: z.coerce.number().int().min(1).default(1),
  score: z.coerce.number().int().min(0).default(1),
  sortOrder: z.coerce.number().int().default(0),
  source: z.enum(QUERY_SOURCES).default("custom"),
  options: z.array(questionOptionSchema).min(1),
  knowledgePointIds: z.array(z.coerce.bigint()).optional(),
  tagIds: z.array(z.coerce.bigint()).optional(),
});

export const questionUpdateSchema = z.object({
  gradeId: NULLABLE_BIGINT,
  subjectId: NULLABLE_BIGINT,
  chapterId: NULLABLE_BIGINT,
  type: z.coerce.number().int().min(1).max(4).optional(),
  content: z.string().min(1).optional(),
  analysis: z.string().nullish(),
  difficulty: z.coerce.number().int().min(1).optional(),
  score: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int().optional(),
  source: z.enum(QUERY_SOURCES).optional(),
  options: z.array(questionOptionSchema).optional(),
  knowledgePointIds: z.array(z.coerce.bigint()).optional(),
  tagIds: z.array(z.coerce.bigint()).optional(),
});

export const textbookCreateSchema = z.object({
  name: z.string().nullish(),
  subjectId: z.coerce.bigint(),
  gradeId: z.coerce.bigint(),
  publisherId: z.coerce.bigint(),
  semester: z.coerce.number().int().min(0).max(2),
  coverUrl: z.string().nullish(),
  description: z.string().nullish(),
  sortOrder: z.coerce.number().int().nullish(),
});

export const textbookUpdateSchema = z.object({
  name: z.string().nullish(),
  subjectId: OPTIONAL_BIGINT,
  publisherId: OPTIONAL_BIGINT,
  gradeId: OPTIONAL_BIGINT,
  semester: z.coerce.number().int().min(0).max(2).optional(),
  coverUrl: z.string().nullish(),
  description: z.string().nullish(),
  sortOrder: z.coerce.number().int().nullish(),
});

export const chapterCreateSchema = z.object({
  textbookId: z.coerce.bigint(),
  parentId: OPTIONAL_BIGINT,
  name: z.string().trim().min(1),
  sortOrder: z.coerce.number().int().nullish(),
});

export const chapterUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  sortOrder: z.coerce.number().int().nullish(),
});

/* ===== Wiki ===== */

const wikiSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value) => value.toLowerCase())
  .refine((value) => WIKI_SLUG_PATTERN.test(value), "slug 只能包含小写字母、数字和连字符");

export const wikiPageCreateSchema = z.object({
  parentId: OPTIONAL_BIGINT,
  title: z.string().trim().min(1).max(200),
  slug: wikiSlugSchema,
  summary: z.string().trim().max(500).nullish(),
  content: z.string().nullish(),
  status: z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  sortOrder: z.coerce.number().int().nullish(),
});

export const wikiPageUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: wikiSlugSchema.optional(),
  summary: z.string().trim().max(500).nullish(),
  content: z.string().nullish(),
  status: z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

/** 移动 / 排序：parentId 为 null 表示移到根，beforeId 为 null 表示放到末尾 */
export const wikiMoveSchema = z.object({
  parentId: NULLABLE_BIGINT,
  beforeId: NULLABLE_BIGINT,
});
