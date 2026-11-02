"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import RichTextEditor from "@/components/RichTextEditor";
import { useLocale } from "@/lib/i18n";
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SyncOutlined,
} from "@ant-design/icons";
import {
    App,
    Button,
    Card,
    Checkbox,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

interface ArticleItem {
  id: string;
  title: string;
  summary: string | null;
  categoryId: string;
  categoryName: string;
  channels: string[];
  status: string;
  publishedAt: string | null;
  viewCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface ArticleFormValues {
  title: string;
  summary?: string;
  categoryId: string;
  channels: string[];
  content: string;
  sortOrder: number;
  status: "draft" | "published";
}

const CHANNELS = ["web", "mobile"] as const;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

export default function ArticlesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { pageSize } = usePageSize();

  const [items, setItems] = useState<ArticleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [channel, setChannel] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();

  // 弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ArticleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<ArticleFormValues>();
  const [editForm] = Form.useForm<ArticleFormValues>();

  const fetchCategories = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/article-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword.trim()) query.set("keyword", keyword.trim());
      if (status) query.set("status", status);
      if (channel) query.set("channel", channel);
      if (categoryId) query.set("categoryId", categoryId);

      const res = await fetch(`/api/admin/articles?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, status, channel, categoryId]);

  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.id }));
  const channelOptions = CHANNELS.map((value) => ({
    label: value === "web" ? t("articles.channelWeb") : t("articles.channelMobile"),
    value,
  }));

  const reloadFromFirstPage = () => {
    if (page === 1) fetchArticles();
    else setPage(1);
  };

  const buildPayload = (values: ArticleFormValues) => ({
    title: values.title,
    summary: values.summary ?? "",
    categoryId: values.categoryId,
    channels: values.channels,
    content: values.content,
    sortOrder: values.sortOrder ?? 0,
    status: values.status,
  });

  const handleCreate = async (values: ArticleFormValues) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload(values)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("articles.createFailed"));
        return;
      }
      message.success(t("articles.created"));
      setCreateOpen(false);
      reloadFromFirstPage();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (record: ArticleItem) => {
    setSelected(record);
    setEditOpen(true);
  };

  const handleUpdate = async (values: ArticleFormValues) => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/articles?id=${selected.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload(values)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("articles.updateFailed"));
        return;
      }
      message.success(t("articles.updated"));
      setEditOpen(false);
      setSelected(null);
      fetchArticles();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (record: ArticleItem) => {
    const next = record.status === "published" ? "draft" : "published";
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`/api/admin/articles?id=${record.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      message.error(data?.error || t("articles.updateFailed"));
      return;
    }
    message.success(next === "published" ? t("articles.published") : t("articles.unpublished"));
    fetchArticles();
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/articles?id=${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("articles.deleted"));
      setDeleteOpen(false);
      setSelected(null);
      fetchArticles();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<ArticleItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>
      ),
    },
    {
      title: t("articles.colTitle"),
      key: "title",
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          {record.summary ? (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.summary}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: t("articles.colCategory"),
      dataIndex: "categoryName",
      key: "categoryName",
      width: 120,
    },
    {
      title: t("articles.colChannels"),
      key: "channels",
      width: 140,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.channels.map((c) => (
            <Tag key={c} color={c === "web" ? "blue" : "green"}>
              {c === "web" ? t("articles.channelWeb") : t("articles.channelMobile")}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t("articles.colStatus"),
      key: "status",
      width: 100,
      render: (_, record) => (
        <Tag color={record.status === "published" ? "success" : "default"}>
          {record.status === "published" ? t("articles.statusPublished") : t("articles.statusDraft")}
        </Tag>
      ),
    },
    {
      title: t("articles.colPublishedAt"),
      dataIndex: "publishedAt",
      key: "publishedAt",
      width: 170,
      render: (value: string | null) => formatDate(value),
    },
    {
      title: t("articles.colViewCount"),
      dataIndex: "viewCount",
      key: "viewCount",
      width: 90,
    },
    {
      title: t("articles.colSortOrder"),
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 80,
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 130,
      align: "right",
      render: (_, record) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button
            type="text"
            size="small"
            icon={<SyncOutlined />}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === "published" ? t("articles.offline") : t("articles.publish")}
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setSelected(record);
              setDeleteOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        {t("articles.addArticle")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
  usePageActions(headerActions);

  // 新建/编辑共用同一套左右布局表单
  const renderFormFields = () => (
    <Row gutter={24}>
      <Col xs={24} md={12}>
        <Form.Item
          label={t("articles.titleLabel")}
          name="title"
          rules={[{ required: true, message: t("articles.titleRequired") }]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label={t("articles.summaryOptional")} name="summary">
          <Input.TextArea rows={3} maxLength={300} showCount />
        </Form.Item>
        <Form.Item
          label={t("articles.category")}
          name="categoryId"
          rules={[{ required: true, message: t("articles.categoryRequired") }]}
        >
          <Select
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={categoryOptions}
            placeholder={t("articles.categoryPlaceholder")}
          />
        </Form.Item>
        <Form.Item
          label={t("articles.channels")}
          name="channels"
          rules={[{ required: true, message: t("articles.channelsRequired") }]}
        >
          <Checkbox.Group options={channelOptions} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={t("articles.sortOrder")} name="sortOrder" initialValue={0}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={t("articles.status")} name="status" initialValue="draft">
              <Select
                options={[
                  { label: t("articles.statusDraft"), value: "draft" },
                  { label: t("articles.statusPublished"), value: "published" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label={t("articles.content")}
          name="content"
          rules={[{ required: true, message: t("articles.contentRequired") }]}
        >
          <RichTextEditor minHeight={420} maxHeight={560} />
        </Form.Item>
      </Col>
    </Row>
  );

  return (
    <div>
      <Card
        size="small"
        style={{ marginBottom: 10 }}
        styles={{ body: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 } }}
      >
        <Input.Search
          allowClear
          placeholder={t("articles.searchPlaceholder")}
          style={{ width: 240 }}
          onSearch={(value) => {
            setKeyword(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder={t("articles.allCategories")}
          options={categoryOptions}
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder={t("articles.allStatus")}
          options={[
            { label: t("articles.statusDraft"), value: "draft" },
            { label: t("articles.statusPublished"), value: "published" },
          ]}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder={t("articles.allChannels")}
          options={channelOptions}
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setPage(1);
          }}
        />
      </Card>

      <Table<ArticleItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
          onChange: (p) => setPage(p),
        }}
        locale={{ emptyText: t("articles.empty") }}
      />

      {/* 新建：表单随弹窗挂载，preserve={false} 避免残留上次输入 */}
      <Modal
        title={t("articles.createTitle")}
        open={createOpen}
        width={1080}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("common.create")}
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} preserve={false}>
          {renderFormFields()}
        </Form>
      </Modal>

      <Modal
        title={t("articles.editTitle")}
        open={editOpen}
        width={1080}
        onCancel={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => editForm.submit()}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (!open || !selected) return;
          const token = localStorage.getItem("admin_token");
          const current = selected;
          // 列表不含正文，打开编辑时按 id 取回完整内容再回填
          fetch(`/api/admin/articles?id=${current.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (!data) return;
              editForm.setFieldsValue({
                title: data.title,
                summary: data.summary ?? undefined,
                categoryId: data.categoryId,
                channels: data.channels,
                content: data.content,
                sortOrder: data.sortOrder,
                status: data.status as "draft" | "published",
              });
            })
            .catch(() => null);
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          {renderFormFields()}
        </Form>
      </Modal>

      <Modal
        title={t("articles.deleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelected(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>{t("articles.deleteConfirm", { title: selected?.title ?? "" })}</p>
      </Modal>
    </div>
  );
}
