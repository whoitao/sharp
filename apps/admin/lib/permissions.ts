// 后台权限模型：13 个模块 × read/write，共 26 项。
// 数据库只存「角色 → 权限」的分配，权限清单一律以本文件为准，避免两边漂移。

export type PermissionAction = "read" | "write";

export type PermissionResource =
  | "dashboard"
  | "users"
  | "admins"
  | "roles"
  | "questions"
  | "knowledge-points"
  | "tags"
  | "textbooks"
  | "grades"
  | "articles"
  | "pets"
  | "study-records";

export type Permission = `${PermissionResource}:${PermissionAction}`;

/** 超级管理员通配符 */
export const WILDCARD = "*";

export interface PermissionGroup {
  key: PermissionResource;
  label: string;
  /** 该模块是否支持写操作，否的话只有 read */
  writable: boolean;
}

/** UI 权限矩阵按这个顺序分组展示 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: "dashboard", label: "控制面板", writable: false },
  { key: "questions", label: "问题管理", writable: true },
  { key: "knowledge-points", label: "知识点管理", writable: true },
  { key: "tags", label: "标签管理", writable: true },
  { key: "textbooks", label: "教材管理", writable: true },
  { key: "grades", label: "年级管理", writable: true },
  { key: "articles", label: "文档管理", writable: true },
  { key: "pets", label: "宠物管理", writable: true },
  { key: "study-records", label: "学习记录", writable: false },
  { key: "users", label: "学员管理", writable: true },
  { key: "admins", label: "管理员管理", writable: true },
  { key: "roles", label: "角色权限", writable: true },
];

/** 全部权限键（不含通配符） */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.writable ? [`${g.key}:read`, `${g.key}:write`] : [`${g.key}:read`]
) as Permission[];

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** 按 HTTP 方法推导动作：读方法 → read，其余 → write */
export function actionForMethod(method: string): PermissionAction {
  return READ_METHODS.has(method.toUpperCase()) ? "read" : "write";
}

/** 判断权限集合是否包含指定权限；支持通配符 "*" */
export function can(permissions: string[], needed: string): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes(WILDCARD)) return true;
  return permissions.includes(needed);
}

export function canAny(permissions: string[], needed: string[]): boolean {
  return needed.some((p) => can(permissions, p));
}

export function permissionKey(resource: PermissionResource, action: PermissionAction): Permission {
  return `${resource}:${action}`;
}

/** 内置角色预设 */
export interface RolePreset {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  sortOrder: number;
  permissions: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    code: "super",
    name: "超级管理员",
    description: "拥有全部权限，可管理管理员与角色，不可删除",
    isSystem: true,
    sortOrder: 0,
    permissions: [WILDCARD],
  },
  {
    code: "teacher",
    name: "教师",
    description: "维护题目、知识点、标签，可阅读教材与学习数据，不能查看管理员与学员列表",
    isSystem: true,
    sortOrder: 1,
    permissions: [
      "dashboard:read",
      "questions:read",
      "questions:write",
      "knowledge-points:read",
      "knowledge-points:write",
      "tags:read",
      "tags:write",
      "textbooks:read",
      "grades:read",
      "study-records:read",
    ],
  },
  {
    code: "editor",
    name: "内容编辑",
    description: "维护文章与教材内容，问题只读",
    isSystem: true,
    sortOrder: 2,
    permissions: [
      "dashboard:read",
      "articles:read",
      "articles:write",
      "textbooks:read",
      "textbooks:write",
      "questions:read",
      "knowledge-points:read",
      "tags:read",
      "pets:read",
    ],
  },
  {
    code: "viewer",
    name: "只读访客",
    description: "除管理员与角色权限外，全部只读",
    isSystem: true,
    sortOrder: 3,
    permissions: [
      "dashboard:read",
      "questions:read",
      "knowledge-points:read",
      "tags:read",
      "textbooks:read",
      "grades:read",
      "articles:read",
      "pets:read",
      "study-records:read",
      "users:read",
    ],
  },
];

/** 前端导航项所需权限（任一满足即可） */
export const NAV_PERMISSIONS: Record<string, Permission[]> = {
  "/dashboard": ["dashboard:read"],
  "/users": ["users:read", "admins:read", "roles:read"],
  "/questions": ["questions:read"],
  "/textbooks": ["textbooks:read"],
  "/grades": ["grades:read"],
  "/articles": ["articles:read"],
  "/pets": ["pets:read"],
};
