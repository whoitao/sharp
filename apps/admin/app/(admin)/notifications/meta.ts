import type { MessageKey } from "@/lib/i18n";

export interface VariableDecl {
  key: string;
  label?: string;
  type?: string;
  scope: "global" | "user";
  required: boolean;
  example?: string;
  fallback?: string;
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

/** 用变量声明里的示例值/缺省值拼出预览数据 */
export function exampleValues(declarations: VariableDecl[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const item of declarations) {
    values[item.key] = item.example || item.fallback || "";
  }
  return values;
}
