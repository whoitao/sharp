import sanitizeHtml from "sanitize-html";

/**
 * 富文本白名单：只保留编辑器/历史内容需要的结构化标签。
 * - 不含 svg / script / style / iframe / form 等可执行或可注入标签
 * - 链接只允许 http(s)/mailto/tel，图片额外允许 data:（KaTeX 与上传图）
 * - 数学节点依赖 data-type / data-latex，保留供移动端与编辑器渲染
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "kbd",
  "mark",
  "small",
  "hr",
  "div",
  "span",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "colgroup",
  "col",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height"],
  span: ["data-type", "data-latex"],
  div: ["data-type", "data-latex"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
  table: ["border", "cellpadding", "cellspacing"],
  col: ["span", "width"],
  colgroup: ["span"],
  "*": ["class", "style"],
};

/** 只允许只影响排版的 CSS，禁止 position/url() 等可用于覆盖或外链的属性 */
const ALLOWED_STYLES = {
  "*": {
    "text-align": [/^(left|right|center|justify)$/],
    color: [/^[#a-z0-9(),.%\s-]+$/i],
    "background-color": [/^[#a-z0-9(),.%\s-]+$/i],
    "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
    "font-weight": [/^(normal|bold|[1-9]00)$/],
    "font-style": [/^(normal|italic|oblique)$/],
    "text-decoration": [/^(none|underline|line-through)$/],
    "line-height": [/^\d+(\.\d+)?(px|em|rem|%)?$/],
    width: [/^\d+(\.\d+)?(px|em|rem|%)$/],
    "max-width": [/^\d+(\.\d+)?(px|em|rem|%)$/],
    height: [/^\d+(\.\d+)?(px|em|rem|%)$/],
    "vertical-align": [/^(top|middle|bottom|baseline)$/],
    "border-radius": [/^\d+(\.\d+)?(px|em|rem|%)$/],
    // 图文左右布局：图片左侧/右侧浮动，文字环绕
    float: [/^(left|right|none)$/],
  },
};

/** 后台写入富文本前统一清洗（文章正文、题干、解析、选项等） */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    allowedStyles: ALLOWED_STYLES,
  });
}
