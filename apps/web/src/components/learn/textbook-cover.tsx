"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { TextbookDto } from "@/lib/learn/api";

/**
 * 教材封面：竖版 3:4。
 * 有上传封面时整图 object-cover（封面本身是 3:4，几乎不裁切）；
 * 无封面、加载中、加载失败时统一显示浅绿占位（primary-light / primary-strong）。
 * 宽度由调用方通过容器控制，组件只负责比例与内部排版。
 */
export function TextbookCover({
  textbook,
  size = "md",
  className,
}: {
  textbook: TextbookDto;
  size?: "sm" | "md";
  className?: string;
}) {
  const isSmall = size === "sm";
  const [failed, setFailed] = useState(false);

  // 教材切换后重新给新封面一次加载机会
  useEffect(() => setFailed(false), [textbook.coverUrl]);

  const showImage = !!textbook.coverUrl && !failed;

  return (
    <div
      className={cn(
        "relative aspect-[3/4] flex-none overflow-hidden rounded-sm bg-primary-light text-primary-strong shadow-sm ring-1 ring-border/70",
        isSmall ? "w-[52px]" : "w-full",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col justify-between",
          isSmall ? "p-1.5" : "p-2.5",
        )}
      >
        <span
          className={cn(
            "font-bold leading-none tracking-tight",
            isSmall ? "text-lg" : "text-2xl",
          )}
        >
          {textbook.subjectName.slice(0, 1)}
        </span>
        <span
          className={cn(
            "truncate font-bold tracking-wider opacity-90",
            isSmall ? "text-[0.375rem]" : "text-[0.5625rem]",
          )}
        >
          {textbook.gradeName} · {textbook.semesterLabel}
        </span>
      </div>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={textbook.coverUrl!}
          alt={`${textbook.name}封面`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
