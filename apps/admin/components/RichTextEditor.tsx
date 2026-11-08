"use client";

import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  FunctionOutlined,
  ItalicOutlined,
  LinkOutlined,
  MoreOutlined,
  OrderedListOutlined,
  PictureOutlined,
  SplitCellsOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import { useLocale } from "@/lib/i18n";
import Image from "@tiptap/extension-image";
import Mathematics from "@tiptap/extension-mathematics";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import {
  EditorContent,
  Mark,
  mergeAttributes,
  useEditor,
  type Editor
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  theme as antdTheme,
  App,
  Button,
  Dropdown,
  Input,
  Modal,
  Space,
  Tooltip,
  type MenuProps
} from "antd";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useMemo, useRef, useState } from "react";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  minHeight?: number;
  /** 内容区最大高度（px），超出后内容区垂直滚动，工具栏保持固定 */
  maxHeight?: number;
  /** 选项类的小尺寸输入：工具栏更紧凑、无多余留白 */
  compact?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** 图片上传接口，默认题目图片；Wiki 等模块可传自己的端点 */
  imageUploadEndpoint?: string;
}

/** 把富文本 HTML 转成纯文本，供表格/弹层等场景展示 */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    // SSR 场景只做粗略去标签（列表数据在客户端才加载，实际很少走到这里）
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  }
  const box = document.createElement("div");
  box.innerHTML = html;
  // 数学节点内部是 KaTeX 渲染出的嵌套 span，整体替换成 LaTeX 源码，避免残留乱码
  box
    .querySelectorAll('[data-type="inline-math"], [data-type="block-math"]')
    .forEach((el) => {
      const latex = el.getAttribute("data-latex") || "";
      el.replaceWith(document.createTextNode(`$${latex}$`));
    });
  return (box.textContent || "").replace(/\u00a0/g, " ").trim();
}

/**
 * 历史/导入数据里的公式是 `$latex$` 纯文本，而编辑器的数学节点只认 `data-latex` 属性。
 * 回填前把文本里的 `$...$` / `$$...$$` 包成数学节点，否则编辑器里只会显示 LaTeX 源码。
 */
export function mountDollarMath(html?: string | null): string {
  if (!html || typeof document === "undefined" || !html.includes("$")) return html || "";
  const box = document.createElement("div");
  box.innerHTML = html;
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest('[data-type="inline-math"], [data-type="block-math"]')) continue;
    if (/\$[^$\n]+\$/.test(node.nodeValue || "")) targets.push(node);
  }
  for (const node of targets) {
    const text = node.nodeValue || "";
    const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
    const frag = document.createDocumentFragment();
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      const span = document.createElement("span");
      span.setAttribute("data-type", "inline-math");
      span.setAttribute("data-latex", (match[1] ?? match[2]).trim());
      frag.appendChild(span);
      last = match.index + match[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
  return box.innerHTML;
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** 长边上限：压缩后题干图片在手机上足够清晰，又不至于拖慢接口 */
const MAX_IMAGE_EDGE = 1600;
const IMAGE_UPLOAD_ENDPOINT = "/api/admin/uploads/question-image";

/**
 * 带宽度与浮动属性的图片节点：两者都以 inline style 存进 HTML，
 * Web 的 .article-content img 与移动端 WebView 都靠 max-width:100% 兜底，不会撑破。
 * 浮动用于「图片在左/右、文字环绕」，两侧间距由两端 CSS 按浮动方向补，HTML 只留 float。
 */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const styleWidth = element.style.width;
          if (styleWidth) return styleWidth;
          const attr = element.getAttribute("width");
          if (!attr) return null;
          // 历史数据可能是 width="480"，补上单位
          return /^\d+(\.\d+)?$/.test(attr) ? `${attr}px` : attr;
        },
        // 先输出到临时属性，再由下面的 renderHTML 合并进同一个 style
        renderHTML: (attributes) =>
          typeof attributes.width === "string" && attributes.width
            ? { width: attributes.width }
            : {},
      },
      float: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.float;
          return value === "left" || value === "right" ? value : null;
        },
        renderHTML: (attributes) =>
          attributes.float === "left" || attributes.float === "right"
            ? { float: attributes.float }
            : {},
      },
    };
  },
  // width 与 float 都要写进同一个 style，交给这里统一拼，避免后一个属性覆盖前一个
  renderHTML({ HTMLAttributes }) {
    const { width, float, style: _style, ...rest } = HTMLAttributes;
    const styles: string[] = [];
    if (typeof width === "string" && width) styles.push(`width: ${width}`);
    if (float === "left" || float === "right") styles.push(`float: ${float}`);
    return ["img", styles.length > 0 ? { ...rest, style: styles.join("; ") } : rest];
  },
});

/**
 * 字号 mark：以 em 存进 span 的 inline style（如 font-size: 1.25em），
 * 相对正文基准字号缩放，避免写死 px 后与 Web 端根字号密度三档（18/20/22）打架。
 * 1em 等同默认字号，直接移除该 mark，不往 HTML 里写多余样式。
 */
const FontSize = Mark.create({
  name: "fontSize",
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) =>
          attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[style*='font-size']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * 图文两栏：把 Tiptap 的标准表格扩展补上两个属性——
 * - table.layout = "two-col"：渲染成带 class 的布局表格，靠 CSS 去掉边框/表头样式；
 * - cell.width：把百分比列宽写进 td 的 inline style（不写死 px，随正文宽度缩放）。
 * 表格本身仍用 Table 节点，输入、插图、列表、合并单元格等能力全部沿用。
 */
const TWO_COL_CLASS = "sharp-two-col";

const widthAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.style.width || null,
  renderHTML: (attributes: Record<string, unknown>) =>
    attributes.width ? { style: `width: ${attributes.width}` } : {},
};

/** 普通表格继续沿用 Tiptap 原生序列化逻辑 */
const baseTableRenderHTML = Table.config.renderHTML!;

const TwoColumnTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.classList.contains(TWO_COL_CLASS) ? "two-col" : null,
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.layout === "two-col" ? { class: TWO_COL_CLASS } : {},
      },
    };
  },
  // 两栏布局表不输出 Tiptap 默认的 px 最小宽度与 colgroup，只保留百分比列宽
  renderHTML(props) {
    if (props.node.attrs.layout === "two-col") {
      const { class: _class, style: _style, ...rest } = props.HTMLAttributes;
      return [
        "table",
        mergeAttributes(this.options.HTMLAttributes as Record<string, unknown>, rest, {
          class: TWO_COL_CLASS,
          style: "width: 100%",
        }),
        ["tbody", 0],
      ];
    }
    return baseTableRenderHTML.call(this, props);
  },
});

const TwoColumnCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), width: widthAttribute };
  },
});

const TwoColumnHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), width: widthAttribute };
  },
});

function isAcceptedImage(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

/** 上传前压缩：长边限制到 1600 并转 webp；失败时退回原图，由服务端做最终校验 */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    // 尺寸和体积都小，没必要重新编码
    if (scale === 1 && file.size <= 300 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

async function uploadImageFile(
  file: File,
  endpoint: string = IMAGE_UPLOAD_ENDPOINT,
): Promise<string> {
  const blob = await compressImage(file);
  const form = new FormData();
  form.append("file", blob, file.name || "question-image");
  const token = localStorage.getItem("admin_token");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    // 具体错误由调用方按当前语言兜底
    throw new Error(data?.error || "");
  }
  return data.url as string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  minHeight = 80,
  maxHeight,
  compact = false,
  disabled = false,
  style,
  imageUploadEndpoint = IMAGE_UPLOAD_ENDPOINT,
}) => {
  const { t } = useLocale();
  const { token } = antdTheme.useToken();
  const { message } = App.useApp();
  const [mathOpen, setMathOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const lastValueRef = useRef(value || "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** 上传中的图片数量：多图同时上传时，全部完成才解除 loading */
  const uploadingCountRef = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  // useEditor 的 editorProps 只在创建时捕获一次，异步插入逻辑走 ref 保证拿到最新实例
  const insertImageRef = useRef<(file: File, pos?: number) => void>(() => {});
  /** 占位文案随语言切换，插件每次重算装饰时读取最新值 */
  const placeholderRef = useRef("");

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
      ResizableImage.configure({ allowBase64: false }),
      // 关掉列宽拖拽，避免在弹窗里出现拖拽手柄与隐藏的列宽属性
      TwoColumnTable.configure({ resizable: false }),
      TableRow,
      TwoColumnHeader,
      TwoColumnCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSize,
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: mountDollarMath(value),
    editable: !disabled,
    // Next.js SSR 下必须关闭首次立即渲染，否则会 hydration 不一致
    immediatelyRender: false,
    // 工具栏高亮、表格操作菜单都依赖光标位置，需要跟随每次事务重渲染
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "sharp-rich-text",
        style: `min-height:${minHeight}px`,
      },
      // 截图粘贴：剪贴板里带图片文件时接管，走统一上传
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isAcceptedImage);
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImageRef.current(file));
        return true;
      },
      // 拖拽图片进编辑器同样接管，先占住落点再上传
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter(isAcceptedImage);
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        files.forEach((file) => insertImageRef.current(file, pos));
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.isEmpty ? "" : instance.getHTML();
      lastValueRef.current = html;
      onChange?.(html);
    },
  });

  // 占位文案走 i18n：语言切换后刷新一次装饰，让空文档上的提示同步更新
  useEffect(() => {
    if (!editor) return;
    placeholderRef.current = t("editor.placeholder");
    editor.view.dispatch(editor.state.tr);
  }, [editor, t]);

  editorRef.current = editor;
  insertImageRef.current = (file, pos) => {
    if (!editorRef.current) return;
    if (!isAcceptedImage(file)) {
      message.error(t("editor.imageTypeError"));
      return;
    }
    uploadingCountRef.current += 1;
    setUploading(true);
    uploadImageFile(file, imageUploadEndpoint)
      .then((url) => {
        const instance = editorRef.current;
        if (!instance) return;
        // 拖拽落点超出当前文档长度时退回光标位置，避免 insertContentAt 抛错
        const safePos =
          typeof pos === "number" && pos <= instance.state.doc.content.size ? pos : null;
        const chain = instance.chain().focus();
        if (safePos === null) {
          chain.setImage({ src: url }).run();
        } else {
          chain.insertContentAt(safePos, { type: "image", attrs: { src: url } }).run();
        }
      })
      .catch((err) => {
        message.error(
          err instanceof Error && err.message ? err.message : t("editor.uploadFailed")
        );
      })
      .finally(() => {
        uploadingCountRef.current -= 1;
        if (uploadingCountRef.current === 0) setUploading(false);
      });
  };

  // 外部值变化（打开编辑弹窗回填、重置表单）时同步进编辑器
  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (next === lastValueRef.current) return;
    lastValueRef.current = next;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (next !== current) {
      editor.commands.setContent(mountDollarMath(next), { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const previewHtml = useMemo(() => {
    if (!latex.trim()) return "";
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return "";
    }
  }, [latex]);

  const insertMath = () => {
    const trimmed = latex.trim();
    if (!trimmed) {
      setMathOpen(false);
      setLatex("");
      return;
    }
    editor?.chain().focus().insertInlineMath({ latex: trimmed }).run();
    setMathOpen(false);
    setLatex("");
  };

  const insertTable = () => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  // 光标在表格内才展示「表格操作」，避免工具栏常驻一排低频按钮
  const tableMenuItems: MenuProps["items"] = [
    { key: "rowBefore", label: t("editor.rowBefore") },
    { key: "rowAfter", label: t("editor.rowAfter") },
    { key: "colBefore", label: t("editor.colBefore") },
    { key: "colAfter", label: t("editor.colAfter") },
    { type: "divider" },
    { key: "mergeCells", label: t("editor.mergeCells"), disabled: !editor?.can().mergeCells() },
    { key: "splitCell", label: t("editor.splitCell"), disabled: !editor?.can().splitCell() },
    { type: "divider" },
    { key: "toggleHeaderRow", label: t("editor.toggleHeaderRow") },
    { key: "deleteRow", label: t("editor.deleteRow") },
    { key: "deleteColumn", label: t("editor.deleteColumn") },
    { key: "deleteTable", label: t("editor.deleteTable"), danger: true },
  ];

  const handleTableAction: MenuProps["onClick"] = ({ key }) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (key) {
      case "rowBefore":
        chain.addRowBefore().run();
        break;
      case "rowAfter":
        chain.addRowAfter().run();
        break;
      case "colBefore":
        chain.addColumnBefore().run();
        break;
      case "colAfter":
        chain.addColumnAfter().run();
        break;
      case "mergeCells":
        chain.mergeCells().run();
        break;
      case "splitCell":
        chain.splitCell().run();
        break;
      case "toggleHeaderRow":
        chain.toggleHeaderRow().run();
        break;
      case "deleteRow":
        chain.deleteRow().run();
        break;
      case "deleteColumn":
        chain.deleteColumn().run();
        break;
      case "deleteTable":
        chain.deleteTable().run();
        break;
    }
  };

  if (!editor) {
    // 编辑器实例在客户端挂载后创建，占位保持布局稳定
    return (
      <div
        style={{
          minHeight: minHeight + (compact ? 34 : 40),
          border: `1px solid ${token.colorBorder}`,
          borderRadius: token.borderRadiusLG,
          background: token.colorBgContainer,
        }}
      />
    );
  }

  const toolbarButton = (
    label: React.ReactNode,
    active: boolean,
    onClick: () => void,
    title: string,
    loading = false
  ) => (
    <Tooltip title={title} key={title}>
      <Button
        size="small"
        type={active ? "primary" : "text"}
        icon={label}
        onClick={onClick}
        disabled={disabled}
        loading={loading}
      />
    </Tooltip>
  );

  const divider = (
    <span
      style={{
        width: 1,
        height: 16,
        margin: "0 4px",
        background: token.colorSplit,
        display: "inline-block",
        flex: "none",
      }}
    />
  );

  /** 标题：段落 / H1–H3 */
  const headingLevel = ([1, 2, 3] as const).find((level) =>
    editor.isActive("heading", { level })
  );
  const headingLabel = headingLevel ? `H${headingLevel}` : t("editor.paragraph");
  const headingItems: MenuProps["items"] = [
    { key: "0", label: t("editor.paragraph") },
    { key: "1", label: t("editor.heading1") },
    { key: "2", label: t("editor.heading2") },
    { key: "3", label: t("editor.heading3") },
  ];

  const handleHeading = (key: string) => {
    const level = Number(key);
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 }).run();
  };

  /** 字号：em 档位，1em 即默认字号，直接移除 mark 不写多余样式 */
  const fontSizeOptions = [
    { value: "0.75em", label: t("editor.fontSizeXs") },
    { value: "0.875em", label: t("editor.fontSizeSm") },
    { value: "1em", label: t("editor.fontSizeBase") },
    { value: "1.25em", label: t("editor.fontSizeLg") },
    { value: "1.5em", label: t("editor.fontSizeXl") },
    { value: "2em", label: t("editor.fontSizeXxl") },
  ];
  const fontSizeItems: MenuProps["items"] = fontSizeOptions.map(({ value, label }) => ({
    // 与标题菜单同处「更多」时用前缀区分
    key: `size:${value}`,
    label,
  }));
  const currentFontSize =
    (editor.getAttributes("fontSize").fontSize as string | null | undefined) || "1em";
  const currentFontSizeLabel =
    fontSizeOptions.find((option) => option.value === currentFontSize)?.label ??
    t("editor.fontSizeBase");
  const setFontSize = (value: string) => {
    if (value === "1em") {
      editor.chain().focus().unsetMark("fontSize").run();
      return;
    }
    editor.chain().focus().setMark("fontSize", { fontSize: value }).run();
  };

  /** 图文两栏：插入 1 行 2 列的布局表格，方向决定图片所在格，比例写进 td 的百分比宽度 */
  const twoColumnItems: MenuProps["items"] = [
    { key: "two-col:left:40", label: `${t("editor.twoColumnImageLeft")} · 40/60` },
    { key: "two-col:left:50", label: `${t("editor.twoColumnImageLeft")} · 50/50` },
    { key: "two-col:left:60", label: `${t("editor.twoColumnImageLeft")} · 60/40` },
    { key: "two-col:right:40", label: `${t("editor.twoColumnImageRight")} · 40/60` },
    { key: "two-col:right:50", label: `${t("editor.twoColumnImageRight")} · 50/50` },
    { key: "two-col:right:60", label: `${t("editor.twoColumnImageRight")} · 60/40` },
  ];

  const insertTwoColumn = (key: string) => {
    const [, side, width] = key.split(":");
    const imageSide = side === "right" ? "right" : "left";
    const imageWidth = width === "60" ? 60 : width === "50" ? 50 : 40;
    const textWidth = 100 - imageWidth;
    const imageCell = `<td style="width: ${imageWidth}%"><p></p></td>`;
    const textCell = `<td style="width: ${textWidth}%"><p></p></td>`;
    const cells = imageSide === "left" ? imageCell + textCell : textCell + imageCell;
    editor
      .chain()
      .focus()
      .insertContent(
        `<table class="${TWO_COL_CLASS}" style="width: 100%"><tbody><tr>${cells}</tr></tbody></table>`
      )
      .run();

    // 插入后光标停在最后一格；右图左文时文字在左格，回退一格让用户直接输入文字
    if (imageSide === "right") {
      editor.chain().focus().goToPreviousCell().run();
    }
    editor.commands.scrollIntoView();
  };

  /** 对齐：text-align 写成 inline style，left 直接省略属性保持 HTML 干净 */
  type AlignValue = "left" | "center" | "right";
  const alignIcons: Record<AlignValue, React.ReactNode> = {
    left: <AlignLeftOutlined />,
    center: <AlignCenterOutlined />,
    right: <AlignRightOutlined />,
  };
  const currentAlign: AlignValue =
    (["left", "center", "right"] as const).find((value) => editor.isActive({ textAlign: value })) ??
    "left";
  const alignItems: MenuProps["items"] = [
    { key: "left", label: t("editor.alignLeft"), icon: alignIcons.left },
    { key: "center", label: t("editor.alignCenter"), icon: alignIcons.center },
    { key: "right", label: t("editor.alignRight"), icon: alignIcons.right },
  ];

  const setAlign = (value: AlignValue) => {
    if (value === "left") {
      editor.chain().focus().unsetTextAlign().run();
      return;
    }
    editor.chain().focus().setTextAlign(value).run();
  };

  /** 链接：选中文字加链接；未选中则把地址作为文字插入 */
  const openLinkModal = () => {
    const href = editor.getAttributes("link").href;
    setLinkUrl(typeof href === "string" ? href : "");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      removeLink();
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
      message.error(t("editor.linkInvalid"));
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  /** 图片尺寸：写入 img 的 inline width，Web/移动端均按 max-width:100% 兜底 */
  const imageWidths: Array<{ value: string | null; label: string }> = [
    { value: "25%", label: "25%" },
    { value: "50%", label: "50%" },
    { value: "75%", label: "75%" },
    { value: "100%", label: "100%" },
    { value: null, label: t("editor.imageOriginal") },
  ];
  const imageWidth = (editor.getAttributes("image").width as string | null | undefined) ?? null;
  const setImageWidth = (width: string | null) => {
    editor.chain().focus().updateAttributes("image", { width }).run();
  };

  /** 图片浮动：与宽度一起写入 img 的 inline style，正文文字自动环绕 */
  const imageFloat =
    (editor.getAttributes("image").float as "left" | "right" | null | undefined) ?? null;
  const imageFloats: Array<{ value: "left" | "right" | null; label: string }> = [
    { value: null, label: t("editor.floatNone") },
    { value: "left", label: t("editor.floatLeft") },
    { value: "right", label: t("editor.floatRight") },
  ];
  const setImageFloat = (float: "left" | "right" | null) => {
    editor.chain().focus().updateAttributes("image", { float }).run();
  };

  // 选中图片后，在图片下方浮出尺寸与浮动选项
  const imageMenuPos = (() => {
    if (!editor.isActive("image") || typeof window === "undefined") return null;
    const { from, to } = editor.state.selection;
    if (from === to) return null;
    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      return {
        left: Math.min(Math.max(8, start.left), Math.max(8, window.innerWidth - 330)),
        top: end.bottom + 6,
      };
    } catch {
      return null;
    }
  })();

  /** 紧凑模式把低频操作收进「更多」，避免窄栏位里工具栏堆成好几行 */
  const moreItems: MenuProps["items"] = [
    { key: "group-heading", type: "group", label: t("editor.headingLevel"), children: headingItems },
    { key: "group-size", type: "group", label: t("editor.fontSize"), children: fontSizeItems },
    { key: "group-two-col", type: "group", label: t("editor.twoColumn"), children: twoColumnItems },
    { type: "divider" },
    { key: "bulletList", label: t("editor.bulletList"), icon: <UnorderedListOutlined /> },
    { key: "orderedList", label: t("editor.orderedList"), icon: <OrderedListOutlined /> },
    {
      key: "blockquote",
      label: t("editor.blockquote"),
      icon: <span style={{ fontSize: 13, lineHeight: 1 }}>❝</span>,
    },
    { type: "divider" },
    { key: "group-align", type: "group", label: t("editor.align"), children: alignItems },
    { type: "divider" },
    { key: "link", label: t("editor.link"), icon: <LinkOutlined /> },
    { key: "math", label: t("editor.insertMath"), icon: <FunctionOutlined /> },
    { key: "image", label: t("editor.insertImage"), icon: <PictureOutlined /> },
    { key: "table", label: t("editor.insertTable"), icon: <TableOutlined /> },
    ...(editor.isActive("table")
      ? [{ key: "group-table", type: "group" as const, label: t("editor.tableActions"), children: tableMenuItems }]
      : []),
  ];

  const handleMoreAction: MenuProps["onClick"] = (info) => {
    const { key } = info;
    if (key.startsWith("size:")) {
      setFontSize(key.slice("size:".length));
      return;
    }
    if (key.startsWith("two-col:")) {
      insertTwoColumn(key);
      return;
    }
    switch (key) {
      case "0":
      case "1":
      case "2":
      case "3":
        handleHeading(key);
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "left":
      case "center":
      case "right":
        setAlign(key);
        break;
      case "link":
        openLinkModal();
        break;
      case "math":
        setLatex("");
        setMathOpen(true);
        break;
      case "image":
        fileInputRef.current?.click();
        break;
      case "table":
        insertTable();
        break;
      default:
        handleTableAction(info);
        break;
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          rowGap: 2,
          minWidth: 0,
          padding: compact ? "2px 4px" : "4px 6px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillQuaternary,
        }}
      >
        {!compact && (
          <Dropdown
            menu={{ items: headingItems, onClick: ({ key }) => handleHeading(key) }}
            trigger={["click"]}
            disabled={disabled}
          >
            <Button
              size="small"
              type="text"
              style={{ minWidth: 64, paddingInline: 4, fontWeight: 600 }}
            >
              {headingLabel}
            </Button>
          </Dropdown>
        )}
        {!compact && (
          <Dropdown
            menu={{
              items: fontSizeItems,
              onClick: ({ key }) => setFontSize(key.slice("size:".length)),
            }}
            trigger={["click"]}
            disabled={disabled}
          >
            <Tooltip title={t("editor.fontSize")}>
              <Button size="small" type="text" style={{ minWidth: 52, paddingInline: 4 }}>
                {currentFontSizeLabel}
              </Button>
            </Tooltip>
          </Dropdown>
        )}
        {toolbarButton(
          <BoldOutlined />,
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          t("editor.bold")
        )}
        {toolbarButton(
          <ItalicOutlined />,
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          t("editor.italic")
        )}
        {toolbarButton(
          <UnderlineOutlined />,
          editor.isActive("underline"),
          () => editor.chain().focus().toggleUnderline().run(),
          t("editor.underline")
        )}
        {!compact &&
          toolbarButton(
            <StrikethroughOutlined />,
            editor.isActive("strike"),
            () => editor.chain().focus().toggleStrike().run(),
            t("editor.strike")
          )}
        {!compact && divider}
        {!compact &&
          toolbarButton(
            <UnorderedListOutlined />,
            editor.isActive("bulletList"),
            () => editor.chain().focus().toggleBulletList().run(),
            t("editor.bulletList")
          )}
        {!compact &&
          toolbarButton(
            <OrderedListOutlined />,
            editor.isActive("orderedList"),
            () => editor.chain().focus().toggleOrderedList().run(),
            t("editor.orderedList")
          )}
        {!compact &&
          toolbarButton(
            <span style={{ fontSize: 13, lineHeight: 1 }}>❝</span>,
            editor.isActive("blockquote"),
            () => editor.chain().focus().toggleBlockquote().run(),
            t("editor.blockquote")
          )}
        {!compact && divider}
        {!compact && (
          <Dropdown
            menu={{
              items: alignItems,
              onClick: ({ key }) => setAlign(key as AlignValue),
            }}
            trigger={["click"]}
            disabled={disabled}
          >
            <Tooltip title={t("editor.align")}>
              <Button size="small" type="text" icon={alignIcons[currentAlign]} />
            </Tooltip>
          </Dropdown>
        )}
        {!compact && divider}
        {toolbarButton(
          <LinkOutlined />,
          editor.isActive("link"),
          openLinkModal,
          t("editor.link")
        )}
        {toolbarButton(
          <FunctionOutlined />,
          false,
          () => {
            setLatex("");
            setMathOpen(true);
          },
          t("editor.insertMath")
        )}
        {toolbarButton(
          <PictureOutlined />,
          false,
          () => fileInputRef.current?.click(),
          t("editor.insertImage"),
          uploading
        )}
        {/* 原生 file input 隐藏，由工具栏按钮触发；选完清空 value 才能重复选同一张图 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImageRef.current(file);
            e.target.value = "";
          }}
        />
        {!compact && (
          <Dropdown
            menu={{ items: twoColumnItems, onClick: ({ key }) => insertTwoColumn(key) }}
            trigger={["click"]}
            disabled={disabled}
          >
            <Tooltip title={t("editor.twoColumn")}>
              <Button size="small" type="text" icon={<SplitCellsOutlined />} />
            </Tooltip>
          </Dropdown>
        )}
        {!compact &&
          toolbarButton(<TableOutlined />, false, insertTable, t("editor.insertTable"))}
        {!compact && editor.isActive("table") && (
          <Dropdown
            menu={{ items: tableMenuItems, onClick: handleTableAction }}
            trigger={["click"]}
          >
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              disabled={disabled}
              title={t("editor.tableActions")}
            />
          </Dropdown>
        )}
        {compact && (
          <Dropdown
            menu={{ items: moreItems, onClick: handleMoreAction }}
            trigger={["click"]}
            disabled={disabled}
          >
            <Tooltip title={t("editor.more")}>
              <Button size="small" type="text" icon={<MoreOutlined />} />
            </Tooltip>
          </Dropdown>
        )}
      </div>
      {imageMenuPos && (
        <div
          onMouseDown={(event) => event.preventDefault()}
          style={{
            position: "fixed",
            left: imageMenuPos.left,
            top: imageMenuPos.top,
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "2px 4px",
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgElevated,
            boxShadow: token.boxShadowSecondary,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 12, color: token.colorTextSecondary, marginInlineEnd: 2 }}>
              {t("editor.imageSize")}
            </span>
            {imageWidths.map(({ value, label }) => (
              <Button
                key={label}
                size="small"
                type={imageWidth === value ? "primary" : "text"}
                onClick={() => setImageWidth(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 12, color: token.colorTextSecondary, marginInlineEnd: 2 }}>
              {t("editor.imageFloat")}
            </span>
            {imageFloats.map(({ value, label }) => (
              <Button
                key={label}
                size="small"
                type={imageFloat === value ? "primary" : "text"}
                onClick={() => setImageFloat(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          padding: compact ? "4px 8px" : "8px 10px",
          maxHeight,
          overflowY: maxHeight ? "auto" : undefined,
          overflowX: "auto",
        }}
      >
        <EditorContent editor={editor} />
      </div>
      <Modal
        title={t("editor.mathTitle")}
        open={mathOpen}
        onCancel={() => setMathOpen(false)}
        onOk={insertMath}
        okText={t("editor.insert")}
        cancelText={t("common.cancel")}
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          <Input.TextArea
            rows={3}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder={t("editor.latexPlaceholder")}
            autoFocus
          />
          <div
            style={{
              minHeight: 56,
              padding: 12,
              border: `1px dashed ${token.colorBorder}`,
              borderRadius: token.borderRadius,
              background: token.colorFillQuaternary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflowX: "auto",
            }}
          >
            {previewHtml ? (
              <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <span style={{ color: token.colorTextTertiary }}>{t("editor.preview")}</span>
            )}
          </div>
          <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>{t("editor.mathHint")}</div>
        </Space>
      </Modal>
      <Modal
        title={t("editor.link")}
        open={linkOpen}
        onCancel={() => setLinkOpen(false)}
        onOk={applyLink}
        okText={t("editor.insert")}
        cancelText={t("common.cancel")}
        destroyOnHidden
        footer={[
          editor.isActive("link") ? (
            <Button key="remove" danger type="text" onClick={removeLink}>
              {t("editor.linkRemove")}
            </Button>
          ) : null,
          <Button key="cancel" onClick={() => setLinkOpen(false)}>
            {t("common.cancel")}
          </Button>,
          <Button key="ok" type="primary" onClick={applyLink}>
            {t("editor.insert")}
          </Button>,
        ]}
      >
        <Input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder={t("editor.linkUrlPlaceholder")}
          onPressEnter={applyLink}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default RichTextEditor;
