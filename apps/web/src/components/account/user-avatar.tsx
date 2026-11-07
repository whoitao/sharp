"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const SIZE_CLASS = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

/** 统一的头像展示：有图用图，无图用昵称首字（与导航栏一致） */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const initial = (name.trim() || "?").slice(0, 1).toUpperCase();
  const [failed, setFailed] = useState(false);

  // 换头像后地址会变，重新给新图一次加载机会
  useEffect(() => setFailed(false), [avatarUrl]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light font-semibold text-primary-strong",
        SIZE_CLASS[size],
        className,
      )}
    >
      {/* 首字常驻底层：图片加载中或加载失败时不会露出空白 */}
      <span aria-hidden={!!avatarUrl}>
        {initial}
      </span>
      {avatarUrl && !failed && (
        // 头像来自 Supabase 公共存储，域名随环境变化，用原生 img 避免 next/image 远程域名配置
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
