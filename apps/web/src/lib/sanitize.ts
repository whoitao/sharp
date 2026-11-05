import sanitize from "sanitize-html";

/**
 * 文章正文清理：使用白名单（而非正则黑名单），
 * 移除脚本/事件/伪协议/内嵌页面等可执行内容，同时保留排版所需标签。
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
  },
};

export function sanitizeHtml(html?: string | null): string {
  if (!html) return "";
  return sanitize(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    allowedStyles: ALLOWED_STYLES,
  });
}
