import { Prisma, type NotificationTemplate } from "@prisma/client";
import { formatDateOnly } from "./datetime";
import { applySatietyDecay, getPetConfig, getPrimaryPet, stateOf } from "./pet";
import { prisma } from "./prisma";

/** 消息类型 / 级别 / 发送方式 / 跳转类型：与 PRD 字段约定保持一致 */
export const NOTIFICATION_TYPES = ["system", "pet", "study", "account"] as const;
export const NOTIFICATION_LEVELS = ["info", "warning", "important"] as const;
export const DELIVERY_MODES = ["broadcast", "event"] as const;
export const ACTION_TYPES = ["none", "page", "url"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];

export interface NotificationVariableDecl {
  key: string;
  label?: string;
  type?: "string" | "number" | "time";
  scope: "global" | "user";
  required?: boolean;
  example?: string;
  fallback?: string;
}

export interface TemplateDraft {
  code?: string;
  name: string;
  type: string;
  level: string;
  deliveryMode: string;
  titleTemplate: string;
  bodyTemplate: string;
  actionType: string;
  actionValueTemplate?: string | null;
  dedupeKeyTemplate?: string | null;
  variables?: NotificationVariableDecl[];
  enabled?: boolean;
}

export type VariableValues = Record<string, unknown>;

const PLACEHOLDER_RE = /\{\$([A-Za-z0-9_]+)\}/g;
const CODE_RE = /^[a-z0-9_]+$/;
const VARIABLE_KEY_RE = /^[A-Za-z0-9_]+$/;
const MAX_VARIABLE_VALUE = 50;
const RETENTION_DAYS = 90;

/** 模板/渲染校验失败：统一映射为 422，返回可直接展示给运营的原因 */
export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

/** 从任意 JSON 中解析变量声明，过滤掉结构不合法的项 */
export function parseVariableDeclarations(value: unknown): NotificationVariableDecl[] {
  if (!Array.isArray(value)) return [];
  const result: NotificationVariableDecl[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const key = typeof item.key === "string" ? item.key.trim() : "";
    if (!key || !VARIABLE_KEY_RE.test(key)) continue;
    const scope = item.scope === "user" ? "user" : "global";
    const type = item.type === "number" || item.type === "time" ? item.type : "string";
    result.push({
      key,
      label: typeof item.label === "string" ? item.label : undefined,
      type,
      scope,
      required: item.required === true,
      example: item.example === undefined || item.example === null ? undefined : String(item.example),
      fallback: item.fallback === undefined || item.fallback === null ? undefined : String(item.fallback),
    });
  }
  return result;
}

/** 提取文本中出现的全部 {$变量名}（去重、保持出现顺序） */
export function extractPlaceholders(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_RE)) seen.add(match[1]);
  return [...seen];
}

function normalizeText(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([，。！？；：、）】」])/g, "$1")
    .replace(/([（【「])\s+/g, "$1")
    .trim();
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : String(value);
  return text.length > MAX_VARIABLE_VALUE ? text.slice(0, MAX_VARIABLE_VALUE) : text;
}

export interface RenderResult {
  title: string;
  body: string;
  actionValue: string | null;
  dedupeKey: string | null;
  missing: string[];
  unknown: string[];
}

/**
 * 按模板声明渲染文本。
 * 未声明变量、必填缺失都会记录在结果里（strict 模式下直接抛错），绝不把 {$x} 泄露给用户。
 */
export function renderText(
  text: string,
  declarations: NotificationVariableDecl[],
  values: VariableValues,
): { text: string; missing: string[]; unknown: string[] } {
  const declMap = new Map(declarations.map((item) => [item.key, item]));
  const missing: string[] = [];
  const unknown: string[] = [];

  const rendered = text.replace(PLACEHOLDER_RE, (_raw, name: string) => {
    const decl = declMap.get(name);
    if (!decl) {
      unknown.push(name);
      return "";
    }
    const raw = values[name];
    const hasValue = raw !== null && raw !== undefined && String(raw).trim() !== "";
    if (!hasValue) {
      if (decl.required) {
        missing.push(name);
        return "";
      }
      return stringifyValue(decl.fallback);
    }
    return stringifyValue(raw);
  });

  return { text: normalizeText(rendered), missing, unknown };
}

/** 渲染整条模板；未知变量或必填缺失时抛错（供发布/事件生成使用） */
export function renderNotification(
  template: Pick<
    NotificationTemplate,
    | "titleTemplate"
    | "bodyTemplate"
    | "actionType"
    | "actionValueTemplate"
    | "dedupeKeyTemplate"
    | "variables"
  >,
  values: VariableValues,
): RenderResult {
  const declarations = parseVariableDeclarations(template.variables);
  const title = renderText(template.titleTemplate, declarations, values);
  const body = renderText(template.bodyTemplate, declarations, values);
  const missing = [...new Set([...title.missing, ...body.missing])];
  const unknown = [...new Set([...title.unknown, ...body.unknown])];

  let actionValue: string | null = null;
  if (template.actionType === "page" || template.actionType === "url") {
    if (!template.actionValueTemplate) {
      throw new NotificationError("模板缺少跳转地址");
    }
    const rendered = renderText(template.actionValueTemplate, declarations, values);
    missing.push(...rendered.missing);
    unknown.push(...rendered.unknown);
    actionValue = rendered.text;
  }

  let dedupeKey: string | null = null;
  if (template.dedupeKeyTemplate) {
    const rendered = renderText(template.dedupeKeyTemplate, declarations, values);
    missing.push(...rendered.missing);
    unknown.push(...rendered.unknown);
    dedupeKey = rendered.text;
  }

  const uniqueMissing = [...new Set(missing)];
  const uniqueUnknown = [...new Set(unknown)];
  if (uniqueUnknown.length > 0) {
    throw new NotificationError(`模板使用了未声明的变量：${uniqueUnknown.join("、")}`, uniqueUnknown);
  }
  if (uniqueMissing.length > 0) {
    throw new NotificationError(`缺少必填变量：${uniqueMissing.join("、")}`, uniqueMissing);
  }
  assertActionValue(template.actionType, actionValue);

  return {
    title: title.text,
    body: body.text,
    actionValue,
    dedupeKey,
    missing: uniqueMissing,
    unknown: uniqueUnknown,
  };
}

/** 跳转安全：站内路径必须以 / 开头，外部链接只允许 http(s) */
function assertActionValue(actionType: string, actionValue: string | null) {
  if (actionType === "none" || !actionValue) return;
  if (actionType === "page" && !actionValue.startsWith("/")) {
    throw new NotificationError("站内跳转地址必须以 / 开头");
  }
  if (actionType === "url" && !/^https?:\/\//i.test(actionValue)) {
    throw new NotificationError("外部跳转地址只允许 http 或 https");
  }
}

/** 模板保存校验：返回规整后的变量声明，校验失败抛 NotificationError */
export function validateTemplateDraft(input: TemplateDraft): {
  variables: NotificationVariableDecl[];
  warnings: string[];
} {
  const errors: string[] = [];
  if (input.code !== undefined) {
    if (!CODE_RE.test(input.code)) errors.push("模板编码只允许小写字母、数字与下划线");
    if (input.code.length > 60) errors.push("模板编码不能超过 60 个字符");
  }
  if (!input.name.trim()) errors.push("模板名称不能为空");
  if (input.name.length > 80) errors.push("模板名称不能超过 80 个字符");
  if (!NOTIFICATION_TYPES.includes(input.type as NotificationType)) errors.push("消息类型非法");
  if (!NOTIFICATION_LEVELS.includes(input.level as NotificationLevel)) errors.push("消息级别非法");
  if (!DELIVERY_MODES.includes(input.deliveryMode as DeliveryMode)) errors.push("发送方式非法");
  if (!ACTION_TYPES.includes(input.actionType as ActionType)) errors.push("跳转类型非法");
  if (!input.titleTemplate.trim()) errors.push("标题模板不能为空");
  if (input.titleTemplate.length > 40) errors.push("标题模板不能超过 40 个字符");
  if (!input.bodyTemplate.trim()) errors.push("正文模板不能为空");
  if (input.bodyTemplate.length > 500) errors.push("正文模板不能超过 500 个字符");

  const variables = (input.variables ?? []).filter(
    (item) => item.key && VARIABLE_KEY_RE.test(item.key),
  );
  const declMap = new Map(variables.map((item) => [item.key, item]));

  const used = new Set([
    ...extractPlaceholders(input.titleTemplate),
    ...extractPlaceholders(input.bodyTemplate),
    ...extractPlaceholders(input.actionValueTemplate),
    ...extractPlaceholders(input.dedupeKeyTemplate),
  ]);

  for (const key of used) {
    if (!declMap.has(key)) errors.push(`变量 {$${key}} 未在变量声明中定义`);
  }

  if (input.deliveryMode === "broadcast") {
    for (const key of used) {
      if (declMap.get(key)?.scope === "user") {
        errors.push(`全站广播模板不能使用用户变量 {$${key}}`);
      }
    }
    if (input.dedupeKeyTemplate) errors.push("全站广播模板不需要配置去重键");
  } else {
    if (!input.dedupeKeyTemplate?.trim()) errors.push("事件触发模板必须配置去重键");
    if (input.dedupeKeyTemplate) {
      for (const key of extractPlaceholders(input.dedupeKeyTemplate)) {
        if (!declMap.has(key)) errors.push(`去重键使用了未声明的变量 {$${key}}`);
      }
    }
  }

  if (input.actionType !== "none" && !input.actionValueTemplate?.trim()) {
    errors.push("配置跳转时必须填写跳转地址");
  }
  const rawAction = input.actionValueTemplate?.trim() ?? "";
  if (input.actionType === "page" && rawAction && !rawAction.startsWith("/")) {
    errors.push("站内跳转地址必须以 / 开头");
  }
  if (input.actionType === "url" && rawAction && !/^https?:\/\//i.test(rawAction)) {
    errors.push("外部跳转地址只允许 http 或 https");
  }

  if (errors.length > 0) throw new NotificationError(errors[0], errors);

  const warnings: string[] = [];
  for (const item of variables) {
    if (!used.has(item.key)) warnings.push(`变量 {$${item.key}} 已声明但未使用`);
  }

  return { variables, warnings };
}

/** 用户可见消息的 where 条件：已发布 + 生效期内 + 广播或本人 */
export function visibleNotificationWhere(userId: string, now = new Date()): Prisma.NotificationWhereInput {
  return {
    status: "published",
    publishedAt: { lte: now },
    AND: [
      { OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
      { OR: [{ deliveryMode: "broadcast" }, { userId }] },
    ],
  };
}

async function loadTemplate(code: string, deliveryMode: DeliveryMode) {
  const template = await prisma.notificationTemplate.findUnique({ where: { code } });
  if (!template) throw new NotificationError("模板不存在");
  if (!template.enabled) throw new NotificationError("模板已停用");
  if (template.deliveryMode !== deliveryMode) {
    throw new NotificationError(
      deliveryMode === "broadcast" ? "该模板不是全站广播模板" : "该模板不是事件触发模板",
    );
  }
  return template;
}

/** 发布全站广播：只允许全局变量，写入渲染快照后立即生效 */
export async function publishBroadcast(input: {
  templateCode: string;
  variables: VariableValues;
  expireAt?: Date | null;
  createdBy?: string | null;
}) {
  const template = await loadTemplate(input.templateCode, "broadcast");
  const declarations = parseVariableDeclarations(template.variables);
  const used = new Set([
    ...extractPlaceholders(template.titleTemplate),
    ...extractPlaceholders(template.bodyTemplate),
    ...extractPlaceholders(template.actionValueTemplate),
  ]);
  const userScoped = declarations.filter((item) => used.has(item.key) && item.scope === "user");
  if (userScoped.length > 0) {
    throw new NotificationError(
      `全站广播不能使用用户变量：${userScoped.map((v) => v.key).join("、")}`,
    );
  }

  const rendered = renderNotification(template, input.variables);
  return prisma.notification.create({
    data: {
      templateId: template.id,
      templateCode: template.code,
      type: template.type,
      level: template.level,
      title: rendered.title,
      body: rendered.body,
      actionType: template.actionType,
      actionValue: rendered.actionValue,
      deliveryMode: "broadcast",
      variables: input.variables as Prisma.InputJsonValue,
      status: "published",
      publishedAt: new Date(),
      expireAt: input.expireAt ?? null,
      createdBy: input.createdBy ?? null,
    },
  });
}

/** 生成事件消息：按 dedupeKey 幂等，重复触发直接返回已有记录 */
export async function createEventNotification(input: {
  templateCode: string;
  userId: string;
  variables: VariableValues;
  createdBy?: string | null;
}) {
  const template = await loadTemplate(input.templateCode, "event");
  const rendered = renderNotification(template, input.variables);
  if (!rendered.dedupeKey) throw new NotificationError("事件模板缺少去重键");

  const existing = await prisma.notification.findUnique({ where: { dedupeKey: rendered.dedupeKey } });
  if (existing) return existing;

  try {
    return await prisma.notification.create({
      data: {
        templateId: template.id,
        templateCode: template.code,
        type: template.type,
        level: template.level,
        title: rendered.title,
        body: rendered.body,
        actionType: template.actionType,
        actionValue: rendered.actionValue,
        deliveryMode: "event",
        userId: input.userId,
        variables: input.variables as Prisma.InputJsonValue,
        status: "published",
        publishedAt: new Date(),
        dedupeKey: rendered.dedupeKey,
        createdBy: input.createdBy ?? null,
      },
    });
  } catch (err) {
    // 并发触发时依赖唯一索引兜底，直接返回已生成的记录
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const record = await prisma.notification.findUnique({ where: { dedupeKey: rendered.dedupeKey } });
      if (record) return record;
    }
    throw err;
  }
}

/** 北京时间小时（不依赖服务器进程时区） */
function beijingHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
}

/**
 * 宠物饥饿提醒：仅在 08:00–22:00、宠物处于 hungry 状态时生成，同一宠物每天最多一条。
 * 任何异常都不应向调用方抛出，避免影响宠物页与消息中心主流程。
 */
export async function generatePetHungryNotification(userId: string) {
  try {
    const now = new Date();
    const hour = beijingHour(now);
    if (hour < 8 || hour >= 22) return null;

    const template = await prisma.notificationTemplate.findUnique({ where: { code: "pet_hungry" } });
    if (!template || !template.enabled || template.deliveryMode !== "event") return null;

    const link = await getPrimaryPet(userId);
    if (!link) return null;

    const config = await getPetConfig();
    const pet = await applySatietyDecay(link.pet, config, now);
    if (stateOf(pet.satiety, pet.lastFedAt, now) !== "hungry") return null;

    return await createEventNotification({
      templateCode: "pet_hungry",
      userId,
      variables: {
        pet_name: pet.nickname || link.pet.species.name,
        pet_id: pet.id,
        pet_satiety: pet.satiety,
        date: formatDateOnly(now),
      },
    });
  } catch (err) {
    console.error("[notification] 生成宠物饥饿消息失败", err);
    return null;
  }
}

let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 3600_000;

/** 清理 90 天前的已撤回/已过期消息；每进程每小时最多执行一次 */
export async function cleanupExpiredNotifications(force = false) {
  const now = Date.now();
  if (!force && now - lastCleanupAt < CLEANUP_INTERVAL_MS) return 0;
  lastCleanupAt = now;

  const cutoff = new Date(now - RETENTION_DAYS * 24 * 3600 * 1000);
  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
