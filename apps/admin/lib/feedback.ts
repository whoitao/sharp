import { Prisma } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { createEventNotification } from "./notification";
import { prisma } from "./prisma";
import { sanitizeRichHtml } from "./rich-text";
import { feedbackImageUrlPrefix } from "./storage";

/** 反馈分类 / 状态：与前端单选、状态标签一一对应 */
export const FEEDBACK_CATEGORIES = ["bug", "suggestion", "content", "account", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_STATUSES = ["pending", "replied", "closed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_MIN_TEXT = 5;
export const FEEDBACK_MAX_TEXT = 2000;
/** 富文本 HTML 原文上限：正文纯文本 2000 字，带排版标签后留出余量 */
export const FEEDBACK_MAX_HTML = 20000;
export const FEEDBACK_MAX_IMAGES = 6;
export const FEEDBACK_REPLY_MAX = 2000;
export const FEEDBACK_CONTACT_MAX = 120;
export const FEEDBACK_PAGE_CONTEXT_MAX = 300;
export const FEEDBACK_CLIENT_VERSION_MAX = 50;

/** 防滥用阈值 */
export const FEEDBACK_DAILY_LIMIT = 20;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** 反馈业务错误：携带 HTTP 状态码与稳定错误码，路由层直接映射 */
export class FeedbackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "FeedbackError";
  }
}

const IMG_TAG_RE = /<img\b[^>]*\bsrc\s*=\s*"([^"]*)"[^>]*>/gi;

/** 富文本转纯文本：块级标签补换行，再去标签、还原常见实体 */
function htmlToText(html: string): string {
  const spaced = html
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr|figure|figcaption)>/gi, "$&\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} });
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 重复内容检测的归一化：去掉空白、标点与符号，忽略大小写 */
function normalizeContent(text: string): string {
  return text.replace(/[\s\p{P}\p{S}]+/gu, "").toLowerCase();
}

export interface SanitizedFeedback {
  html: string;
  text: string;
  images: string[];
}

/**
 * 服务端清洗用户提交的富文本：
 * 1. 复用后台已有的 sanitize-html 白名单（禁脚本/事件/伪协议）
 * 2. 正文图片只允许本人 feedback/{userId}/ 目录下的地址，外链与 data: 一律拒绝
 * 3. 基于纯文本做长度校验，图片数量单独限制
 */
export function sanitizeFeedbackHtml(rawHtml: unknown, userId: string): SanitizedFeedback {
  if (typeof rawHtml !== "string" || rawHtml.trim() === "") {
    throw new FeedbackError("请填写反馈内容", "CONTENT_REQUIRED");
  }
  if (rawHtml.length > FEEDBACK_MAX_HTML) {
    throw new FeedbackError("反馈内容过长", "CONTENT_TOO_LONG");
  }

  const html = sanitizeRichHtml(rawHtml);
  const prefix = feedbackImageUrlPrefix(userId);
  const images: string[] = [];
  for (const match of html.matchAll(IMG_TAG_RE)) {
    const src = match[1];
    if (!src || !src.startsWith(prefix)) {
      throw new FeedbackError("正文中的图片不是有效上传地址", "IMAGE_NOT_ALLOWED");
    }
    images.push(src);
  }
  if (images.length > FEEDBACK_MAX_IMAGES) {
    throw new FeedbackError(`正文最多插入 ${FEEDBACK_MAX_IMAGES} 张图片`, "TOO_MANY_IMAGES");
  }

  const text = htmlToText(html);
  if (text.length < FEEDBACK_MIN_TEXT) {
    throw new FeedbackError(`反馈内容至少 ${FEEDBACK_MIN_TEXT} 个字`, "CONTENT_TOO_SHORT");
  }
  if (text.length > FEEDBACK_MAX_TEXT) {
    throw new FeedbackError(`反馈内容不能超过 ${FEEDBACK_MAX_TEXT} 个字`, "CONTENT_TOO_LONG");
  }

  return { html, text, images };
}

/** 提交反馈：清洗正文 → 防刷（每日上限/重复内容）→ 落库 */
export async function createFeedback(input: {
  userId: string;
  contentHtml: unknown;
  category?: string | null;
  source: "web" | "app";
  pageContext?: string | null;
  clientVersion?: string | null;
  contact?: string | null;
}) {
  const { html, text, images } = sanitizeFeedbackHtml(input.contentHtml, input.userId);

  const now = Date.now();
  const dailySince = new Date(now - 24 * 3600 * 1000);
  const dailyCount = await prisma.feedback.count({
    where: { userId: input.userId, createdAt: { gte: dailySince } },
  });
  if (dailyCount >= FEEDBACK_DAILY_LIMIT) {
    throw new FeedbackError("今日反馈次数已达上限，请明天再试", "DAILY_LIMIT", 429);
  }

  const recent = await prisma.feedback.findMany({
    where: {
      userId: input.userId,
      createdAt: { gte: new Date(now - DUPLICATE_WINDOW_MS) },
    },
    select: { contentText: true },
    take: FEEDBACK_DAILY_LIMIT,
  });
  const normalized = normalizeContent(text);
  if (recent.some((item) => normalizeContent(item.contentText) === normalized)) {
    throw new FeedbackError("相同内容已提交，请勿重复反馈", "DUPLICATE", 409);
  }

  const category = FEEDBACK_CATEGORIES.includes(input.category as FeedbackCategory)
    ? (input.category as FeedbackCategory)
    : "other";

  return prisma.feedback.create({
    data: {
      userId: input.userId,
      content: html,
      contentText: text,
      images,
      category,
      source: input.source,
      pageContext: input.pageContext?.slice(0, FEEDBACK_PAGE_CONTEXT_MAX) || null,
      clientVersion: input.clientVersion?.slice(0, FEEDBACK_CLIENT_VERSION_MAX) || null,
      contact: input.contact?.slice(0, FEEDBACK_CONTACT_MAX) || null,
    },
  });
}

/** 用户端列表项：只给摘要与红点所需字段 */
function toUserListItem(
  item: {
    id: string;
    contentText: string;
    category: string;
    status: string;
    replyCount: number;
    lastReplyAt: Date | null;
    userReadAt: Date | null;
    createdAt: Date;
  },
) {
  const hasUnreadReply =
    !!item.lastReplyAt && (!item.userReadAt || item.lastReplyAt > item.userReadAt);
  return {
    id: item.id,
    summary: item.contentText.slice(0, 200),
    category: item.category,
    status: item.status,
    replyCount: item.replyCount,
    lastReplyAt: item.lastReplyAt,
    hasUnreadReply,
    createdAt: item.createdAt,
  };
}

/** 用户端反馈列表：倒序 + 分页 */
export async function listUserFeedbacks(
  userId: string,
  params: { page: number; pageSize: number; skip: number; status?: string },
) {
  const where = {
    userId,
    ...(params.status && FEEDBACK_STATUSES.includes(params.status as FeedbackStatus)
      ? { status: params.status }
      : {}),
  };
  const [total, items] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.pageSize,
      select: {
        id: true,
        contentText: true,
        category: true,
        status: true,
        replyCount: true,
        lastReplyAt: true,
        userReadAt: true,
        createdAt: true,
      },
    }),
  ]);
  return { total, items: items.map(toUserListItem) };
}

/** 用户端详情：包含对外回复（过滤内部备注），打开即标记已读 */
export async function getUserFeedback(userId: string, id: string) {
  const feedback = await prisma.feedback.findFirst({
    where: { id, userId },
    include: {
      replies: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, authorType: true, content: true, createdAt: true },
      },
    },
  });
  if (!feedback) return null;

  const hasUnreadReply =
    !!feedback.lastReplyAt && (!feedback.userReadAt || feedback.lastReplyAt > feedback.userReadAt);
  if (hasUnreadReply) {
    await prisma.feedback.update({ where: { id: feedback.id }, data: { userReadAt: new Date() } });
  }

  return {
    id: feedback.id,
    content: feedback.content,
    category: feedback.category,
    status: feedback.status,
    source: feedback.source,
    pageContext: feedback.pageContext,
    contact: feedback.contact,
    replyCount: feedback.replyCount,
    createdAt: feedback.createdAt,
    lastReplyAt: feedback.lastReplyAt,
    replies: feedback.replies,
  };
}

/** 用户追问：已关闭的反馈不允许继续回复 */
export async function addUserReply(userId: string, id: string, rawContent: unknown) {
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!content) throw new FeedbackError("请填写追问内容", "CONTENT_REQUIRED");
  if (content.length > FEEDBACK_REPLY_MAX) {
    throw new FeedbackError(`追问内容不能超过 ${FEEDBACK_REPLY_MAX} 个字`, "CONTENT_TOO_LONG");
  }

  const feedback = await prisma.feedback.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });
  if (!feedback) throw new FeedbackError("反馈不存在", "NOT_FOUND", 404);
  if (feedback.status === "closed") {
    throw new FeedbackError("该反馈已关闭，如有新问题请重新提交", "FEEDBACK_CLOSED", 409);
  }

  const reply = await prisma.feedbackReply.create({
    data: { feedbackId: id, authorType: "user", content },
    select: { id: true, authorType: true, content: true, createdAt: true },
  });
  await prisma.feedback.update({ where: { id }, data: { status: "pending" } });
  return reply;
}

export interface AdminFeedbackWhere {
  status?: string;
  source?: string;
  keyword?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

function buildAdminWhere(params: AdminFeedbackWhere): Prisma.FeedbackWhereInput {
  const where: Prisma.FeedbackWhereInput = {};
  if (params.status && FEEDBACK_STATUSES.includes(params.status as FeedbackStatus)) {
    where.status = params.status;
  }
  if (params.source === "web" || params.source === "app") where.source = params.source;
  if (params.userId) where.userId = params.userId;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    };
  }
  if (params.keyword) {
    const keyword = params.keyword;
    where.OR = [
      { contentText: { contains: keyword, mode: "insensitive" } },
      { contact: { contains: keyword, mode: "insensitive" } },
      { user: { username: { contains: keyword, mode: "insensitive" } } },
      { user: { nickname: { contains: keyword, mode: "insensitive" } } },
    ];
  }
  return where;
}

const ADMIN_LIST_SELECT = {
  id: true,
  contentText: true,
  category: true,
  status: true,
  source: true,
  contact: true,
  replyCount: true,
  lastReplyAt: true,
  createdAt: true,
  user: { select: { id: true, username: true, nickname: true } },
} as const;

/** 后台列表：默认待处理优先，其余按提交时间倒序 */
export async function listFeedbacks(
  params: AdminFeedbackWhere & { page: number; pageSize: number; skip: number },
) {
  const where = buildAdminWhere(params);
  const total = await prisma.feedback.count({ where });

  // 未指定状态时把 pending 排在前面，跨分页仍保持全局顺序
  if (!params.status) {
    const pendingWhere = { ...where, status: "pending" };
    const pendingCount = await prisma.feedback.count({ where: pendingWhere });
    const pendingTake = Math.max(0, Math.min(params.pageSize, pendingCount - params.skip));
    const restSkip = Math.max(0, params.skip - pendingCount);
    const restTake = params.pageSize - pendingTake;

    const [pendingItems, restItems] = await Promise.all([
      pendingTake > 0
        ? prisma.feedback.findMany({
            where: pendingWhere,
            orderBy: { createdAt: "desc" },
            skip: params.skip,
            take: pendingTake,
            select: ADMIN_LIST_SELECT,
          })
        : Promise.resolve([]),
      restTake > 0
        ? prisma.feedback.findMany({
            where: { ...where, status: { not: "pending" } },
            orderBy: { createdAt: "desc" },
            skip: restSkip,
            take: restTake,
            select: ADMIN_LIST_SELECT,
          })
        : Promise.resolve([]),
    ]);
    return { total, items: [...pendingItems, ...restItems] };
  }

  const items = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: params.skip,
    take: params.pageSize,
    select: ADMIN_LIST_SELECT,
  });
  return { total, items };
}

/** 后台详情：包含用户信息与全部时间线（内部备注也返回） */
export async function getFeedbackDetail(id: string) {
  return prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, nickname: true, createdAt: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          authorType: true,
          adminId: true,
          content: true,
          isInternal: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * 管理员回复：内部备注不通知；对外回复更新计数、最后回复时间与状态，
 * 并按 feedback_reply:{feedbackId}:{replyId} 发一条站内信（每条回复都通知，天然幂等）。
 */
export async function addAdminReply(input: {
  feedbackId: string;
  adminId: string;
  rawContent: unknown;
  isInternal?: boolean;
}) {
  const content = typeof input.rawContent === "string" ? input.rawContent.trim() : "";
  if (!content) throw new FeedbackError("请填写回复内容", "CONTENT_REQUIRED");
  if (content.length > FEEDBACK_REPLY_MAX) {
    throw new FeedbackError(`回复内容不能超过 ${FEEDBACK_REPLY_MAX} 个字`, "CONTENT_TOO_LONG");
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id: input.feedbackId },
    select: { id: true, userId: true, status: true, contentText: true },
  });
  if (!feedback) throw new FeedbackError("反馈不存在", "NOT_FOUND", 404);

  const reply = await prisma.feedbackReply.create({
    data: {
      feedbackId: feedback.id,
      authorType: "admin",
      adminId: input.adminId,
      content,
      isInternal: input.isInternal === true,
    },
    select: { id: true, authorType: true, content: true, isInternal: true, createdAt: true },
  });

  if (input.isInternal) return reply;

  await prisma.feedback.update({
    where: { id: feedback.id },
    data: {
      replyCount: { increment: 1 },
      lastReplyAt: new Date(),
      // 已关闭的反馈保持关闭，由管理员显式重新打开
      ...(feedback.status === "closed" ? {} : { status: "replied" }),
    },
  });

  try {
    await createEventNotification({
      templateCode: "feedback_reply",
      userId: feedback.userId,
      createdBy: input.adminId,
      variables: {
        feedbackId: feedback.id,
        feedbackTitle: feedback.contentText.slice(0, 20),
        replyPreview: content.slice(0, 50),
        replyId: reply.id,
      },
    });
  } catch (err) {
    // 通知失败不影响回复本身，但要留下可排查日志
    console.error("[feedback] 生成回复通知失败", err);
  }

  return reply;
}

/** 状态流转：pending / replied / closed */
export async function updateFeedbackStatus(id: string, next: unknown) {
  if (!FEEDBACK_STATUSES.includes(next as FeedbackStatus)) {
    throw new FeedbackError("状态非法", "INVALID_STATUS");
  }
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, replyCount: true },
  });
  if (!feedback) throw new FeedbackError("反馈不存在", "NOT_FOUND", 404);

  // 重新打开时按是否有回复回到 replied/pending
  const status =
    next === "closed" ? "closed" : next === "replied" ? "replied" : feedback.replyCount > 0 ? "replied" : "pending";
  return prisma.feedback.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
}
