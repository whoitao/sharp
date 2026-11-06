"use client";

import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";

const DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "$", right: "$", display: false },
  { left: "\\[", right: "\\]", display: true },
  { left: "\\(", right: "\\)", display: false },
];

/**
 * 题目富文本：先走既有白名单清洗，再按移动端顺序渲染公式。
 * 1. 正文里的 $...$ / $$...$$ / \[...\] / \(...\) （历史导入题目）
 * 2. 编辑器序列化出的 [data-type="inline-math"|"block-math"] 节点
 */
export function RichText({
  html,
  className,
  style,
}: {
  html?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clean = useMemo(() => sanitizeHtml(html), [html]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    try {
      renderMathInElement(el, {
        delimiters: DELIMITERS,
        throwOnError: false,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
        ignoredClasses: ["katex", "katex-display"],
      });
    } catch {
      // 单条公式异常不影响其余内容展示
    }

    const mathNodes = el.querySelectorAll<HTMLElement>(
      '[data-type="inline-math"], [data-type="block-math"]',
    );
    mathNodes.forEach((node) => {
      const latex = node.getAttribute("data-latex") ?? "";
      if (!latex) return;
      try {
        node.innerHTML = katex.renderToString(latex, {
          displayMode: node.getAttribute("data-type") === "block-math",
          throwOnError: false,
        });
      } catch {
        node.textContent = latex;
      }
    });
  }, [clean]);

  return (
    <div
      ref={ref}
      className={cn("article-content", className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
