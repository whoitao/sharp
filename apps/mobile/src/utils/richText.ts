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

/** LaTeX 命令对应的 Unicode 符号 */
const LATEX_SYMBOLS: Record<string, string> = {
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  mp: '∓',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  pi: 'π',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  infty: '∞',
  angle: '∠',
  triangle: '△',
  circ: '°',
  degree: '°',
  parallel: '∥',
  perp: '⊥',
  ldots: '…',
  cdots: '…',
  dots: '…',
  quad: ' ',
  qquad: ' ',
};

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
  '+': '⁺',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ',
};

function toSuperscript(value: string): string {
  const chars = [...value];
  if (chars.length > 0 && chars.every((char) => SUPERSCRIPTS[char])) {
    return chars.map((char) => SUPERSCRIPTS[char]).join('');
  }
  return `^(${value})`;
}

/**
 * 把 LaTeX 转成适合「单行摘要」的纯文本。
 * 列表预览无法挂 WebView 渲染公式，这里只做可读化处理（如 \frac{22}{7} → 22/7）。
 */
export function latexToPlainText(input: string): string {
  let text = input;
  text = text.replace(/\\(?:left|right|big|Big|bigg|Bigg)/g, '');
  // \text{中文} / \mathrm{} 等只保留内容
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1');
  // \frac{22}{7} → 22/7（支持简单参数，嵌套参数走下方的兜底）
  text = text.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2');
  text = text.replace(/\\(?:d|t)?frac/g, '');
  text = text.replace(/\\sqrt\s*\[([^\]]*)\]/g, '√[$1]');
  text = text.replace(/\\sqrt/g, '√');
  text = text.replace(/\\([a-zA-Z]+)/g, (_match, name: string) => LATEX_SYMBOLS[name] ?? name);
  // ^{2} → ²，其余保留 ^(...)
  text = text.replace(/\^\{([^{}]*)\}/g, (_match, exp: string) => toSuperscript(exp));
  text = text.replace(/\^([A-Za-z0-9])/g, (_match, exp: string) => toSuperscript(exp));
  text = text.replace(/\\[,;:]/g, ' ');
  return text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

/** 是否需要 WebView 渲染 */
export function needsRichView(html?: string | null): boolean {
  if (!html) return false;
  if (html.includes('data-type="inline-math"') || html.includes('data-type="block-math"')) {
    return true;
  }
  return STRUCTURED_TAG_RE.test(html) || DOLLAR_MATH_RE.test(html);
}

/** 富文本转纯文本（保留段落间距），用于正文等不限行数的展示场景 */
export function htmlToTextWithBreaks(html?: string | null): string {
  if (!html) return '';
  const text = html
    .replace(MATH_NODE_RE, (_match, _tag: string, latex: string) => ` ${decodeEntities(latex)} `)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n\n')
    .replace(TAG_RE, '');
  const plain = decodeEntities(text).replace(
    /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g,
    (_match, block: string, inline: string) => block ?? inline
  );
  return plain
    .split('\n')
    .map((line) => latexToPlainText(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** 富文本转纯文本，用于列表标题、单行摘要等必须截断的场景 */
export function htmlToText(html?: string | null): string {
  if (!html) return '';
  const text = html
    .replace(MATH_NODE_RE, (_match, _tag: string, latex: string) => ` ${decodeEntities(latex)} `)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(TAG_RE, '');
  // 摘要里去掉公式定界符并做可读化处理，避免 `$...$` 或 LaTeX 命令占满一行
  const plain = decodeEntities(text).replace(
    /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g,
    (_match, block: string, inline: string) => block ?? inline
  );
  return latexToPlainText(plain).replace(/\s+/g, ' ').trim();
}
