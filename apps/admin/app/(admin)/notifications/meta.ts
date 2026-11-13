import { formatDateOnly } from "@/lib/datetime";
import type { MessageKey } from "@/lib/i18n";

export interface VariableDecl {
  key: string;
  label?: string;
  type?: string;
  scope: "global" | "user";
  required: boolean;
  example?: string;
  fallback?: string;
  autoFill?: string;
}

export interface TemplateItem {
  id: string;
  code: string;
  name: string;
  type: string;
  level: string;
  deliveryMode: string;
  titleTemplate: string;
  bodyTemplate: string;
  actionType: string;
  actionValueTemplate: string | null;
  dedupeKeyTemplate: string | null;
  variables: VariableDecl[];
  enabled: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  templateCode: string;
  type: string;
  level: string;
  title: string;
  body: string;
  deliveryMode: string;
  userId: string | null;
  status: string;
  isTest: boolean;
  publishedAt: string | null;
  expireAt: string | null;
  revokedAt: string | null;
  readCount: number;
  createdAt: string;
}

export const TYPE_OPTIONS = [
  { value: "system", labelKey: "notifications.typeSystem" as MessageKey },
  { value: "pet", labelKey: "notifications.typePet" as MessageKey },
  { value: "study", labelKey: "notifications.typeStudy" as MessageKey },
  { value: "account", labelKey: "notifications.typeAccount" as MessageKey },
];

export const LEVEL_OPTIONS = [
  { value: "info", labelKey: "notifications.levelInfo" as MessageKey },
  { value: "warning", labelKey: "notifications.levelWarning" as MessageKey },
  { value: "important", labelKey: "notifications.levelImportant" as MessageKey },
];

export const DELIVERY_OPTIONS = [
  { value: "broadcast", labelKey: "notifications.modeBroadcast" as MessageKey },
  { value: "event", labelKey: "notifications.modeEvent" as MessageKey },
];

export const ACTION_OPTIONS = [
  { value: "none", labelKey: "notifications.actionNone" as MessageKey },
  { value: "page", labelKey: "notifications.actionPage" as MessageKey },
  { value: "url", labelKey: "notifications.actionUrl" as MessageKey },
];

/** 后端内置的自动填充取值源；事件模板的用户变量依赖它取真实数据 */
export const AUTO_FILL_OPTIONS = [
  { value: "today", label: "today（当天日期）" },
  { value: "now", label: "now（当前时间）" },
  { value: "user.id", label: "user.id（用户 ID）" },
  { value: "user.nickname", label: "user.nickname（用户昵称）" },
  { value: "user.username", label: "user.username（用户名）" },
  { value: "primaryPet.nickname", label: "primaryPet.nickname（宠物名）" },
  { value: "primaryPet.id", label: "primaryPet.id（宠物 ID）" },
  { value: "primaryPet.satiety", label: "primaryPet.satiety（饱食度）" },
];

/** 不依赖用户上下文的取值源：全站广播发布时没有 userId，只能用这两种 */
const CONTEXT_AUTO_FILL_VALUES = new Set(["today", "now"]);

/**
 * 按发送方式收敛 autoFill 可选项。
 * 广播是在后台发布时显式填值，没有 userId，user.* / primaryPet.* 解析必然为空，
 * 属于无效配置，因此只保留 today / now；事件模板才需要全部取值源。
 */
export function autoFillOptionsFor(deliveryMode: string) {
  return deliveryMode === "event"
    ? AUTO_FILL_OPTIONS
    : AUTO_FILL_OPTIONS.filter((option) => CONTEXT_AUTO_FILL_VALUES.has(option.value));
}

export const STATUS_OPTIONS = [
  { value: "published", labelKey: "notifications.statusPublished" as MessageKey },
  { value: "draft", labelKey: "notifications.statusDraft" as MessageKey },
  { value: "revoked", labelKey: "notifications.statusRevoked" as MessageKey },
];

const TYPE_LABELS: Record<string, MessageKey> = {
  system: "notifications.typeSystem",
  pet: "notifications.typePet",
  study: "notifications.typeStudy",
  account: "notifications.typeAccount",
};

const LEVEL_LABELS: Record<string, MessageKey> = {
  info: "notifications.levelInfo",
  warning: "notifications.levelWarning",
  important: "notifications.levelImportant",
};

const DELIVERY_LABELS: Record<string, MessageKey> = {
  broadcast: "notifications.modeBroadcast",
  event: "notifications.modeEvent",
};

const ACTION_LABELS: Record<string, MessageKey> = {
  none: "notifications.actionNone",
  page: "notifications.actionPage",
  url: "notifications.actionUrl",
};

const STATUS_LABELS: Record<string, MessageKey> = {
  published: "notifications.statusPublished",
  draft: "notifications.statusDraft",
  revoked: "notifications.statusRevoked",
};

export const labelKey = (map: Record<string, MessageKey>, value: string): MessageKey | undefined =>
  map[value];

export function typeLabelKey(value: string) {
  return TYPE_LABELS[value];
}

export function levelLabelKey(value: string) {
  return LEVEL_LABELS[value];
}

export function deliveryLabelKey(value: string) {
  return DELIVERY_LABELS[value];
}

export function actionLabelKey(value: string) {
  return ACTION_LABELS[value];
}

export function statusLabelKey(value: string) {
  return STATUS_LABELS[value];
}

export const LEVEL_COLORS: Record<string, string> = {
  info: "default",
  warning: "orange",
  important: "red",
};

export const STATUS_COLORS: Record<string, string> = {
  published: "green",
  draft: "default",
  revoked: "red",
};

/** 用变量声明里的示例值/缺省值拼出预览数据；当天日期/时间按当前时刻动态生成，避免跨天后预览停在旧值 */
export function exampleValues(declarations: VariableDecl[]): Record<string, string> {
  const now = new Date();
  const values: Record<string, string> = {};
  for (const item of declarations) {
    if (item.autoFill === "today") {
      values[item.key] = formatDateOnly(now);
    } else if (item.autoFill === "now") {
      values[item.key] = now.toISOString();
    } else {
      values[item.key] = item.example || item.fallback || "";
    }
  }
  return values;
}
