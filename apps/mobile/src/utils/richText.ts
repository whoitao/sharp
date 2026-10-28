/**
 * 富文本工具：后台编辑器存的是 HTML，移动端按内容复杂度选择渲染方式。
 * - 纯段落文字走原生 Text，避免每道题都挂 WebView
 * - 含图片 / 公式 / 表格等结构才交给 WebView
 */

/** 需要原生渲染无法表达的结构：图片、公式、表格、加粗等 */
const STRUCTURED_TAG_RE = /<(img|table|strong|em|u|s|sub|sup|ol|ul|li|h[1-6]|blockquote)[\s>/]/i;

/** 数学节点：<span data-type="inline-math" data-latex="x^2"></span> */
const MATH_NODE_RE = /<(span|div)[^>]*data-type="(?:inline|block)-math"[^>]*data-latex="([^"]*)"[^>]*>\s*<\/\1>/g;
const TAG_RE = /<[^>]+>/g;

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** 历史导入的题目直接用 `$...$` / `$$...$$` 包住 LaTeX */
const DOLLAR_MATH_RE = /\$\$[^$]+\$\$|\$[^$\n]+\$/;

/** 是否需要 WebView 渲染 */
export function needsRichView(html?: string | null): boolean {
  if (!html) return false;
  if (html.includes('data-type="inline-math"') || html.includes('data-type="block-math"')) {
    return true;
  }
  return STRUCTURED_TAG_RE.test(html) || DOLLAR_MATH_RE.test(html);
}

/** 富文本转纯文本，用于列表标题、单行摘要等必须截断的场景 */
export function htmlToText(html?: string | null): string {
  if (!html) return '';
  const text = html
    .replace(MATH_NODE_RE, (_match, _tag: string, latex: string) => ` ${decodeEntities(latex)} `)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(TAG_RE, '');
  // 摘要里去掉公式定界符，只留 LaTeX 原文，避免 `$...$` 占满一行
  return decodeEntities(text)
    .replace(/\$\$([^$]+)\$\$|\$([^$\n]+)\$/g, (_match, block: string, inline: string) => block ?? inline)
    .replace(/\s+/g, ' ')
    .trim();
}
