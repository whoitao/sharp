// 操作列统一固定在表格最右侧：内容横向溢出时始终可见，宽屏贴右且不产生额外留白
export const FIXED_ACTIONS_COLUMN = { fixed: "right" as const };

// 表格横向滚动配置：按内容实际宽度铺开，仅当内容超出容器时才出现横向滚动条
export const TABLE_SCROLL_X = "max-content" as const;
