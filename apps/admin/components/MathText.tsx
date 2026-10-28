"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { stripHtml } from "./RichTextEditor";

interface MathTextProps {
  /** 富文本 HTML；`$...$` / `$$...$$` 会被当作公式渲染 */
  html?: string | null;
}

type Segment = { type: "text" | "math"; value: string };

/** 把公式片段从纯文本里切出来，其余文本保持原样 */
function splitMath(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }
    // m[1] 是 $$...$$ 的内容，m[2] 是 $...$ 的内容
    segments.push({ type: "math", value: match[1] ?? match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

/**
 * 列表/气泡里的富文本预览：
 * - 后台编辑器插入的公式节点会先被 stripHtml 转成 `$latex$`，这里统一渲染
 * - 历史导入的题目本身就是 `$...$` 文本，也走同一条路径
 * 一律用 inline 模式，避免块级公式把表格行撑高
 */
export default function MathText({ html }: MathTextProps) {
  const segments = useMemo(() => splitMath(stripHtml(html)), [html]);

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "math" ? (
          <span
            key={index}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(segment.value, { throwOnError: false }),
            }}
          />
        ) : (
          <span key={index}>{segment.value}</span>
        )
      )}
    </>
  );
}
