/** Wiki 节点状态：草稿 / 已发布 */
export type WikiPageStatus = 'draft' | 'published';

/** Wiki 可见性：公开 / 仅后台可见 */
export type WikiVisibility = 'public' | 'private';

/** 后台树节点（不含正文） */
export interface WikiTreeNodeDto {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  sortOrder: number;
  status: WikiPageStatus;
  visibility: WikiVisibility;
  /** 直属子节点数，由树接口在内存中计算 */
  childCount: number;
  children: WikiTreeNodeDto[];
}

/** 后台单节点详情（含正文） */
export interface WikiPageDetailDto {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  sortOrder: number;
  summary: string | null;
  content: string | null;
  status: WikiPageStatus;
  visibility: WikiVisibility;
  publishedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Web 公开树节点：只含已发布且公开的节点 */
export interface WikiPublicTreeNodeDto {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  sortOrder: number;
  children: WikiPublicTreeNodeDto[];
}

/** Web 公开详情：只含已发布且公开的内容 */
export interface WikiPublicPageDetailDto {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  summary: string | null;
  content: string | null;
  publishedAt: string | null;
  updatedAt: string;
}
