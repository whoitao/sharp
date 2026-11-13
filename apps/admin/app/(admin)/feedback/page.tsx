"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageTitle } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
import { formatDateTime } from "@/lib/datetime";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

const { Paragraph } = Typography;

interface FeedbackUser {
  id: string;
  username: string;
  nickname: string | null;
}

interface FeedbackItem {
  id: string;
  contentText: string;
  category: string;
  status: string;
  source: string;
  contact: string | null;
  replyCount: number;
  lastReplyAt: string | null;
  createdAt: string;
  user: FeedbackUser;
}

interface FeedbackReply {
  id: string;
  authorType: string;
  adminId: string | null;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

interface FeedbackDetail extends FeedbackItem {
  content: string;
  images: string[];
  pageContext: string | null;
  clientVersion: string | null;
  user: FeedbackUser & { createdAt?: string };
  replies: FeedbackReply[];
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
  "Content-Type": "application/json",
});

const STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  replied: "blue",
  closed: "default",
};

const STATUS_KEYS: Record<string, MessageKey> = {
  pending: "feedback.statusPending",
  replied: "feedback.statusReplied",
  closed: "feedback.statusClosed",
};

const CATEGORY_KEYS: Record<string, MessageKey> = {
  bug: "feedback.categoryBug",
  suggestion: "feedback.categorySuggestion",
  content: "feedback.categoryContent",
  account: "feedback.categoryAccount",
  other: "feedback.categoryOther",
};

export default function FeedbackPage() {
  const { t } = useLocale();
  const { message } = App.useApp();
  const { pageSize } = usePageSize();
  const { can } = usePermissions();
  const canWrite = can("feedback:write");
  usePageTitle(t("feedback.title"));

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [status, setStatus] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status) query.set("status", status);
        if (source) query.set("source", source);
        if (keyword.trim()) query.set("keyword", keyword.trim());
        const res = await fetch(`/api/admin/feedback?${query.toString()}`, {
          headers: authHeaders(),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total ?? 0));
      } catch {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        message.error(t("feedback.loadFailed"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, source, keyword, reloadKey]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setReplyText("");
    setInternal(false);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      setDetail(data);
    } catch {
      setDetail(null);
      message.error(t("feedback.loadFailed"));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const res = await fetch(`/api/admin/feedback/${detail.id}`, { headers: authHeaders() });
    if (res.ok) setDetail(await res.json());
    setReloadKey((key) => key + 1);
  };

  const sendReply = async () => {
    if (!detail || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/feedback/${detail.id}/replies`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: replyText, isInternal: internal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      message.success(t("feedback.replySent"));
      setReplyText("");
      setInternal(false);
      await refreshDetail();
    } catch (err) {
      message.error(err instanceof Error && err.message !== "error" ? err.message : t("feedback.replyFailed"));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (next: "closed" | "replied") => {
    if (!detail) return;
    try {
      const res = await fetch(`/api/admin/feedback/${detail.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      message.success(t("feedback.statusUpdated"));
      await refreshDetail();
    } catch (err) {
      message.error(err instanceof Error && err.message !== "error" ? err.message : t("feedback.loadFailed"));
    }
  };

  const columns: ColumnsType<FeedbackItem> = useMemo(
    () => [
      {
        title: t("feedback.colUser"),
        dataIndex: ["user", "username"],
        width: 180,
        render: (_: unknown, row) => (
          <div>
            <div>{row.user.nickname || row.user.username}</div>
            <div style={{ color: "#999", fontSize: 12 }}>{row.user.username}</div>
          </div>
        ),
      },
      {
        title: t("feedback.colCategory"),
        dataIndex: "category",
        width: 100,
        render: (value: string) => t(CATEGORY_KEYS[value] ?? "feedback.categoryOther"),
      },
      {
        title: t("feedback.colSummary"),
        dataIndex: "contentText",
        render: (value: string) => <Paragraph ellipsis={{ rows: 2 }}>{value}</Paragraph>,
      },
      {
        title: t("feedback.colStatus"),
        dataIndex: "status",
        width: 90,
        render: (value: string) => (
          <Tag color={STATUS_COLORS[value]}>{t(STATUS_KEYS[value] ?? "feedback.statusPending")}</Tag>
        ),
      },
      {
        title: t("feedback.colSource"),
        dataIndex: "source",
        width: 80,
        render: (value: string) => (value === "app" ? t("feedback.sourceApp") : t("feedback.sourceWeb")),
      },
      { title: t("feedback.colReplyCount"), dataIndex: "replyCount", width: 80 },
      {
        title: t("feedback.colCreatedAt"),
        dataIndex: "createdAt",
        width: 150,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: t("feedback.colLastReplyAt"),
        dataIndex: "lastReplyAt",
        width: 150,
        render: (value: string | null) => (value ? formatDateTime(value) : "-"),
      },
    ],
    [t],
  );

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          placeholder={t("feedback.searchPlaceholder")}
          style={{ width: 280 }}
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          onSearch={(value) => {
            setPage(1);
            setKeyword(value);
          }}
        />
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder={t("feedback.allStatuses")}
          value={status}
          onChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          options={[
            { value: "pending", label: t("feedback.statusPending") },
            { value: "replied", label: t("feedback.statusReplied") },
            { value: "closed", label: t("feedback.statusClosed") },
          ]}
        />
        <Select
          allowClear
          style={{ width: 120 }}
          placeholder={t("feedback.allSources")}
          value={source}
          onChange={(value) => {
            setPage(1);
            setSource(value);
          }}
          options={[
            { value: "web", label: t("feedback.sourceWeb") },
            { value: "app", label: t("feedback.sourceApp") },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((key) => key + 1)}>
          {t("common.refresh")}
        </Button>
      </Space>

      <Table<FeedbackItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        locale={{ emptyText: <Empty description={t("feedback.empty")} /> }}
        onRow={(row) => ({ onClick: () => void openDetail(row.id), style: { cursor: "pointer" } })}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: setPage,
        }}
        scroll={{ x: 1100 }}
      />

      <Drawer
        width={760}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("feedback.detailTitle")}
        loading={detailLoading}
      >
        {!detail ? (
          <Empty description={t("feedback.empty")} />
        ) : (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Descriptions
              size="small"
              column={2}
              bordered
              title={t("feedback.userInfo")}
              items={[
                { key: "user", label: t("feedback.colUser"), children: detail.user.nickname || detail.user.username },
                { key: "username", label: "ID", children: detail.user.username },
                {
                  key: "category",
                  label: t("feedback.colCategory"),
                  children: t(CATEGORY_KEYS[detail.category] ?? "feedback.categoryOther"),
                },
                {
                  key: "status",
                  label: t("feedback.colStatus"),
                  children: (
                    <Tag color={STATUS_COLORS[detail.status]}>
                      {t(STATUS_KEYS[detail.status] ?? "feedback.statusPending")}
                    </Tag>
                  ),
                },
                {
                  key: "source",
                  label: t("feedback.colSource"),
                  children: detail.source === "app" ? t("feedback.sourceApp") : t("feedback.sourceWeb"),
                },
                {
                  key: "createdAt",
                  label: t("feedback.colCreatedAt"),
                  children: formatDateTime(detail.createdAt),
                },
                {
                  key: "pageContext",
                  label: t("feedback.pageContext"),
                  children: detail.pageContext || "-",
                  span: 2,
                },
                {
                  key: "clientVersion",
                  label: t("feedback.clientVersion"),
                  children: detail.clientVersion || "-",
                },
                { key: "contact", label: t("feedback.contact"), children: detail.contact || "-" },
              ]}
            />

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("feedback.colSummary")}</div>
              <div
                className="sharp-rich-text"
                style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}
                // 已由服务端白名单清洗，展示前再清洗一次
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(detail.content) }}
              />
            </div>

            {detail.images.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("feedback.images")}</div>
                <Image.PreviewGroup>
                  <Space wrap>
                    {detail.images.map((src) => (
                      <Image key={src} src={src} width={120} height={90} style={{ objectFit: "cover" }} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("feedback.timeline")}</div>
              <Timeline
                items={detail.replies.map((reply) => ({
                  color: reply.isInternal ? "gray" : reply.authorType === "admin" ? "blue" : "green",
                  children: (
                    <div>
                      <Space size={8} wrap>
                        <b>{reply.authorType === "admin" ? "Admin" : detail.user.nickname || detail.user.username}</b>
                        {reply.isInternal && <Tag>{t("feedback.internalBadge")}</Tag>}
                        <span style={{ color: "#999", fontSize: 12 }}>{formatDateTime(reply.createdAt)}</span>
                      </Space>
                      <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{reply.content}</div>
                    </div>
                  ),
                }))}
              />
            </div>

            {canWrite && (
              <div>
                <Input.TextArea
                  rows={4}
                  maxLength={2000}
                  showCount
                  value={replyText}
                  placeholder={t("feedback.replyPlaceholder")}
                  onChange={(event) => setReplyText(event.target.value)}
                />
                <Space style={{ marginTop: 12 }} wrap>
                  <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => void sendReply()}>
                    {internal ? t("feedback.sendInternal") : t("feedback.sendReply")}
                  </Button>
                  <Button onClick={() => setInternal((value) => !value)} type={internal ? "primary" : "default"} ghost={internal}>
                    {t("feedback.sendInternal")}
                  </Button>
                  {detail.status === "closed" ? (
                    <Button onClick={() => void changeStatus("replied")}>{t("feedback.reopenFeedback")}</Button>
                  ) : (
                    <Button danger onClick={() => void changeStatus("closed")}>
                      {t("feedback.closeFeedback")}
                    </Button>
                  )}
                  {internal && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t("feedback.internalHint")}
                    </Typography.Text>
                  )}
                </Space>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
