"use client";

import { useLocale } from "@/lib/i18n";
import { uploadFeedbackImage } from "@/lib/feedback/api";
import { cn } from "@/lib/utils";
import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, ImagePlus, Italic, List, ListOrdered, Loader2, Redo2, Strikethrough, Undo2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * 反馈富文本编辑器：只保留与反馈场景相关的工具栏（加粗/斜体/删除线/列表/插图），
 * 正文字节最终由服务端 sanitize-html 白名单清洗，图片只允许走反馈上传接口。
 */
export function FeedbackEditor({
  onChange,
  minHeight = 180,
}: {
  onChange: (html: string) => void;
  minHeight?: number;
}) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ inline: false, allowBase64: false })],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class: "feedback-editor-content focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
  });

  const imageCount = () => {
    if (!editor) return 0;
    return (editor.getHTML().match(/<img\b/gi) ?? []).length;
  };

  const pickImage = () => {
    if (!editor) return;
    if (imageCount() >= MAX_IMAGES) return;
    fileRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert(t("feedback.imageTypeInvalid"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert(t("feedback.imageTooLarge"));
      return;
    }
    if (imageCount() >= MAX_IMAGES) {
      alert(t("feedback.imageTooMany"));
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFeedbackImage(file);
      editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
    } catch {
      alert(t("feedback.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const tools = [
    {
      key: "bold",
      icon: Bold,
      active: editor?.isActive("bold") ?? false,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      icon: Italic,
      active: editor?.isActive("italic") ?? false,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      key: "strike",
      icon: Strikethrough,
      active: editor?.isActive("strike") ?? false,
      run: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      key: "bullet",
      icon: List,
      active: editor?.isActive("bulletList") ?? false,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: "ordered",
      icon: ListOrdered,
      active: editor?.isActive("orderedList") ?? false,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-1 border-b border-border-light px-2 py-1.5">
        {tools.map(({ key, icon: Icon, active, run }) => (
          <button
            key={key}
            type="button"
            onClick={run}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded text-foreground-secondary transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-primary-light text-primary-strong",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-foreground-secondary transition-colors hover:bg-accent hover:text-foreground"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-foreground-secondary transition-colors hover:bg-accent hover:text-foreground"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={pickImage}
          disabled={uploading}
          className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs text-foreground-secondary transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? t("feedback.uploadingImage") : t("feedback.insertImage")}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(",")} hidden onChange={onFileChange} />
      </div>
      <EditorContent editor={editor} className="px-3 py-2 text-sm" />
      <style jsx global>{`
        .feedback-editor-content p {
          margin: 0.25rem 0;
        }
        .feedback-editor-content ul {
          list-style: disc;
          padding-left: 1.25rem;
        }
        .feedback-editor-content ol {
          list-style: decimal;
          padding-left: 1.25rem;
        }
        .feedback-editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 0.5rem 0;
        }
        .feedback-editor-content a {
          color: var(--primary, #2563eb);
          text-decoration: underline;
        }
        .feedback-editor-content:empty::before,
        .feedback-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9aa0a6;
        }
      `}</style>
    </div>
  );
}
