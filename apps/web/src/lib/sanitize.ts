/**
 * 文章正文清理：内容由后台管理员通过富文本编辑器录入，
 * 这里按标签黑名单移除脚本/内嵌页面等危险节点，并清理 on* 事件与 javascript: 链接。
 * 不引入额外依赖，避免为单一场景增加包体。
 */
const DANGEROUS_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "textarea",
];

export function sanitizeHtml(html?: string | null): string {
  if (!html) return "";
  let out = html;

  for (const tag of DANGEROUS_TAGS) {
    // 成对标签整体移除
    out = out.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");
    // 自闭合与孤立开标签
    out = out.replace(new RegExp(`<${tag}[^>]*/>`, "gi"), "");
    out = out.replace(new RegExp(`<${tag}[^>]*>`, "gi"), "");
  }

  // on* 事件属性（双引号 / 单引号 / 无引号三种写法）
  out = out.replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, "");

  // javascript: 伪协议
  out = out.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, "");

  return out;
}
