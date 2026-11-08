"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { formatDateTime } from "@/lib/datetime";
import { useLocale } from "@/lib/i18n";
import type { WikiPageDetailDto } from "@sharp/shared";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  theme,
} from "antd";
import { useEffect, useState } from "react";

interface WikiFormValues {
  title: string;
  slug: string;
  summary?: string;
  visibility: "public" | "private";
  content?: string;
}

interface WikiEditorProps {
  detail: WikiPageDetailDto | null;
  loading: boolean;
  canWrite: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (detail: WikiPageDetailDto) => void;
  onAddChild: () => void;
  onRename: () => void;
  onMove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 右侧编辑面板：元信息 + 富文本正文 + 树节点操作 */
export default function WikiEditor({
  detail,
  loading,
  canWrite,
  canMoveUp,
  canMoveDown,
  onDirtyChange,
  onSaved,
  onAddChild,
  onRename,
  onMove,
  onMoveUp,
  onMoveDown,
  onDelete,
}: WikiEditorProps) {
  const { t } = useLocale();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm<WikiFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!detail) return;
    form.setFieldsValue({
      title: detail.title,
      slug: detail.slug,
      summary: detail.summary ?? "",
      visibility: detail.visibility,
      content: detail.content ?? "",
    });
    onDirtyChange(false);
    // 只在切换节点时回填，避免保存后刷新把未提交的编辑覆盖掉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, form]);

  const patchPage = async (
    id: string,
    payload: Record<string, unknown>,
  ): Promise<WikiPageDetailDto> => {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`/api/admin/wiki/pages/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || t("wiki.saveFailed"));
    return data as WikiPageDetailDto;
  };

  const handleSave = async (nextStatus?: "draft" | "published") => {
    if (!detail) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const updated = await patchPage(detail.id, {
        title: values.title,
        slug: values.slug,
        summary: values.summary ?? "",
        visibility: values.visibility,
        content: values.content ?? "",
        ...(nextStatus ? { status: nextStatus } : {}),
      });
      onSaved(updated);
      onDirtyChange(false);
      if (nextStatus === "published") message.success(t("wiki.published"));
      else if (nextStatus === "draft") message.success(t("wiki.unpublished"));
      else message.success(t("wiki.updated"));
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("wiki.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card size="small" styles={{ body: { padding: "60px 0", textAlign: "center" } }}>
        <Spin />
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card size="small" styles={{ body: { padding: "60px 16px" } }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("wiki.selectNode")} />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space size={8} wrap>
          <span>{detail.title}</span>
          <Tag
            color={detail.status === "published" ? "green" : "default"}
            variant="filled"
            style={{ marginInlineEnd: 0 }}
          >
            {detail.status === "published"
              ? t("wiki.statusPublished")
              : t("wiki.statusDraft")}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            /{detail.path}
          </Typography.Text>
        </Space>
      }
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(detail.updatedAt)}
        </Typography.Text>
      }
      styles={{ body: { padding: 16 } }}
    >
      <Space wrap size={8} style={{ marginBottom: 16 }}>
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={!canWrite}
          onClick={onAddChild}
        >
          {t("wiki.addChild")}
        </Button>
        <Button
          size="small"
          icon={<EditOutlined />}
          disabled={!canWrite}
          onClick={onRename}
        >
          {t("wiki.rename")}
        </Button>
        <Button
          size="small"
          icon={<ArrowUpOutlined />}
          disabled={!canWrite || !canMoveUp}
          onClick={onMoveUp}
        >
          {t("wiki.moveUp")}
        </Button>
        <Button
          size="small"
          icon={<ArrowDownOutlined />}
          disabled={!canWrite || !canMoveDown}
          onClick={onMoveDown}
        >
          {t("wiki.moveDown")}
        </Button>
        <Button
          size="small"
          icon={<SwapOutlined />}
          disabled={!canWrite}
          onClick={onMove}
        >
          {t("wiki.moveParent")}
        </Button>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={!canWrite}
          onClick={onDelete}
        >
          {t("wiki.remove")}
        </Button>
      </Space>

      <Form
        form={form}
        layout="vertical"
        disabled={!canWrite}
        className="wiki-form"
        onValuesChange={() => onDirtyChange(true)}
      >
        {/* 标题 / Slug / 可见性：宽屏一行三等分，md 起两列，窄屏单列 */}
        <Row gutter={16}>
          <Col xs={24} md={12} xl={8}>
            <Form.Item
              name="title"
              label={t("wiki.titleLabel")}
              rules={[{ required: true, message: t("wiki.titleRequired") }]}
            >
              <Input maxLength={200} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12} xl={8}>
            <Form.Item
              name="slug"
              label={t("wiki.slugLabel")}
              tooltip={t("wiki.slugHint")}
              rules={[
                { required: true, message: t("wiki.slugRequired") },
                { pattern: SLUG_PATTERN, message: t("wiki.slugInvalid") },
              ]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12} xl={8}>
            <Form.Item name="visibility" label={t("wiki.visibility")}>
              <Select
                style={{ width: "100%" }}
                options={[
                  { label: t("wiki.visibilityPublic"), value: "public" },
                  { label: t("wiki.visibilityPrivate"), value: "private" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="summary" label={t("wiki.summaryLabel")}>
          <Input.TextArea rows={2} maxLength={500} showCount />
        </Form.Item>

        <Form.Item name="content" label={t("wiki.contentLabel")}>
          <RichTextEditor
            minHeight={420}
            maxHeight={620}
            disabled={!canWrite}
            imageUploadEndpoint="/api/admin/uploads/wiki-image"
          />
        </Form.Item>

        {canWrite && (
          <Space>
            <Button onClick={() => handleSave()} loading={saving}>
              {t("wiki.save")}
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={() =>
                handleSave(detail.status === "published" ? "draft" : "published")
              }
            >
              {detail.status === "published" ? t("wiki.unpublish") : t("wiki.publish")}
            </Button>
            <Typography.Text type="secondary" style={{ color: token.colorTextTertiary }}>
              {t("wiki.visibility")}:{" "}
              {detail.visibility === "public"
                ? t("wiki.visibilityPublic")
                : t("wiki.visibilityPrivate")}
            </Typography.Text>
          </Space>
        )}
      </Form>
    </Card>
  );
}
