"use client";

import {
  BoldOutlined,
  FunctionOutlined,
  ItalicOutlined,
  MoreOutlined,
  PictureOutlined,
  TableOutlined,
  UnderlineOutlined
} from "@ant-design/icons";
import Image from "@tiptap/extension-image";
import Mathematics from "@tiptap/extension-mathematics";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
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

async function uploadImageFile(file: File): Promise<string> {
  const blob = await compressImage(file);
  const form = new FormData();
  form.append("file", blob, file.name || "question-image");
  const token = localStorage.getItem("admin_token");
  const res = await fetch(IMAGE_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "图片上传失败");
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
}) => {
  const { token } = antdTheme.useToken();
  const { message } = App.useApp();
  const [mathOpen, setMathOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const [uploading, setUploading] = useState(false);
  const lastValueRef = useRef(value || "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** 上传中的图片数量：多图同时上传时，全部完成才解除 loading */
  const uploadingCountRef = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  // useEditor 的 editorProps 只在创建时捕获一次，异步插入逻辑走 ref 保证拿到最新实例
  const insertImageRef = useRef<(file: File, pos?: number) => void>(() => {});

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({
        // 关掉列宽拖拽，避免在弹窗里出现拖拽手柄与隐藏的列宽属性
        table: { resizable: false },
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

  editorRef.current = editor;
  insertImageRef.current = (file, pos) => {
    if (!editorRef.current) return;
    if (!isAcceptedImage(file)) {
      message.error("只支持 JPG / PNG / WebP 图片");
      return;
    }
    uploadingCountRef.current += 1;
    setUploading(true);
    uploadImageFile(file)
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
        message.error(err instanceof Error ? err.message : "图片上传失败");
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
    { key: "rowBefore", label: "上方插入行" },
    { key: "rowAfter", label: "下方插入行" },
    { key: "colBefore", label: "左侧插入列" },
    { key: "colAfter", label: "右侧插入列" },
    { type: "divider" },
    { key: "mergeCells", label: "合并单元格", disabled: !editor?.can().mergeCells() },
    { key: "splitCell", label: "拆分单元格", disabled: !editor?.can().splitCell() },
    { type: "divider" },
    { key: "toggleHeaderRow", label: "切换表头行" },
    { key: "deleteRow", label: "删除当前行" },
    { key: "deleteColumn", label: "删除当前列" },
    { key: "deleteTable", label: "删除表格", danger: true },
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
          alignItems: "center",
          gap: 2,
          padding: compact ? "2px 4px" : "4px 6px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillQuaternary,
        }}
      >
        {toolbarButton(
          <BoldOutlined />,
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          "加粗"
        )}
        {toolbarButton(
          <ItalicOutlined />,
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          "斜体"
        )}
        {toolbarButton(
          <UnderlineOutlined />,
          editor.isActive("underline"),
          () => editor.chain().focus().toggleUnderline().run(),
          "下划线"
        )}
        <span
          style={{
            width: 1,
            height: 16,
            margin: "0 4px",
            background: token.colorSplit,
            display: "inline-block",
          }}
        />
        {toolbarButton(
          <FunctionOutlined />,
          false,
          () => {
            setLatex("");
            setMathOpen(true);
          },
          "插入数学公式"
        )}
        {toolbarButton(
          <PictureOutlined />,
          false,
          () => fileInputRef.current?.click(),
          "插入图片",
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
        {toolbarButton(<TableOutlined />, false, insertTable, "插入表格 3×3")}
        {editor.isActive("table") && (
          <Dropdown
            menu={{ items: tableMenuItems, onClick: handleTableAction }}
            trigger={["click"]}
          >
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              disabled={disabled}
              title="表格操作"
            />
          </Dropdown>
        )}
      </div>
      <div
        style={{
          padding: compact ? "4px 8px" : "8px 10px",
          maxHeight,
          overflowY: maxHeight ? "auto" : undefined,
        }}
      >
        <EditorContent editor={editor} />
      </div>
      <Modal
        title="插入数学公式"
        open={mathOpen}
        onCancel={() => setMathOpen(false)}
        onOk={insertMath}
        okText="插入"
        cancelText="取消"
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          <Input.TextArea
            rows={3}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="输入 LaTeX，例如 \frac{a}{b}、x^2+y^2、\sqrt{3}"
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
              <span style={{ color: token.colorTextTertiary }}>预览</span>
            )}
          </div>
          <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            也可直接在正文中输入 $公式$ 快速插入
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default RichTextEditor;
