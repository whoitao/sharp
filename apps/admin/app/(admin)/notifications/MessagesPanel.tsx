"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";
import { formatDateTime } from "@/lib/datetime";
import { useLocale } from "@/lib/i18n";
import { PlusOutlined, StopOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  DELIVERY_OPTIONS,
  LEVEL_COLORS,
  LEVEL_OPTIONS,
  STATUS_COLORS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  deliveryLabelKey,
  levelLabelKey,
  statusLabelKey,
  typeLabelKey,
  type MessageItem,
  type TemplateItem,
  type VariableDecl,
} from "./meta";

const { Text, Paragraph } = Typography;

interface PreviewResult {
  title: string;
  body: string;
  actionValue: string | null;
  missing: string[];
  unknown: string[];
}

interface PublishFormValues {
  templateCode: string;
  expireAt?: { toISOString: () => string };
}

interface MessageDetail extends MessageItem {
  templateName: string | null;
  actionType: string;
  actionValue: string | null;
  variables: Record<string, unknown> | null;
  createdBy: string | null;
  failureReason: string | null;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
  "Content-Type": "application/json",
});

export default function MessagesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { pageSize } = usePageSize();

  const [items, setItems] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [deliveryMode, setDeliveryMode] = useState<string | undefined>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [publishForm] = Form.useForm<PublishFormValues>();

  const fetchList = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword.trim()) query.set("keyword", keyword.trim());
      if (type) query.set("type", type);
      if (status) query.set("status", status);
      if (deliveryMode) query.set("deliveryMode", deliveryMode);

      const res = await fetch(`/api/admin/notifications?${query.toString()}`, {
        headers: authHeaders(),
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
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, type, status, deliveryMode]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const openPublish = async () => {
    setPublishOpen(true);
    setSelectedTemplate(null);
    setValues({});
    setPreview(null);
    publishForm.resetFields();
    try {
      const res = await fetch(
        "/api/admin/notification-templates?deliveryMode=broadcast&enabled=true&pageSize=100",
        { headers: authHeaders() },
      );
      const data = await res.json();
      setTemplates(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setTemplates([]);
    }
  };

  const handleSelectTemplate = (code: string) => {
    const template = templates.find((item) => item.code === code) ?? null;
    setSelectedTemplate(template);
    setValues({});
  };

  useEffect(() => {
    if (!publishOpen || !selectedTemplate) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/notification-templates/preview", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            titleTemplate: selectedTemplate.titleTemplate,
            bodyTemplate: selectedTemplate.bodyTemplate,
            actionType: selectedTemplate.actionType,
            actionValueTemplate: selectedTemplate.actionValueTemplate,
            declarations: selectedTemplate.variables,
            values,
          }),
        });
        const data = await res.json();
        setPreview(res.ok ? data : null);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [publishOpen, selectedTemplate, values]);

  const handlePublish = async () => {
    const formValues = await publishForm.validateFields();
    if (!formValues.templateCode) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/notifications/publish", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          templateCode: formValues.templateCode,
          variables: values,
          expireAt: formValues.expireAt ? formValues.expireAt.toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data?.details?.join("；") || data?.error || t("common.saveFailed"));
        return;
      }
      message.success(t("notifications.published"));
      setPublishOpen(false);
      setPage(1);
      fetchList();
    } finally {
      setPublishing(false);
    }
  };

  const handleRevoke = async (item: MessageItem) => {
    const res = await fetch("/api/admin/notifications/revoke", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ id: item.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      message.error(data?.error || t("common.saveFailed"));
      return;
    }
    message.success(t("notifications.revoked"));
    fetchList();
  };

  const typeOptions = TYPE_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  const levelOptions = LEVEL_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  const statusOptions = STATUS_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  const deliveryOptions = DELIVERY_OPTIONS.map((item) => ({
    value: item.value,
    label: t(item.labelKey),
  }));

  const columns: ColumnsType<MessageItem> = [
    {
      title: t("notifications.colTitle"),
      dataIndex: "title",
      width: 260,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <Text strong>{value}</Text>
            {record.isTest && <Tag color="purple">{t("notifications.testBadge")}</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.templateCode}
          </Text>
        </Space>
      ),
    },
    {
      title: t("notifications.colLevel"),
      dataIndex: "level",
      width: 90,
      render: (value: string) => (
        <Tag color={LEVEL_COLORS[value]}>{t(levelLabelKey(value) ?? "notifications.levelInfo")}</Tag>
      ),
    },
    {
      title: t("notifications.type"),
      dataIndex: "type",
      width: 90,
      render: (value: string) => t(typeLabelKey(value) ?? "notifications.typeSystem"),
    },
    {
      title: t("notifications.colMode"),
      dataIndex: "deliveryMode",
      width: 110,
      render: (value: string) => t(deliveryLabelKey(value) ?? "notifications.modeBroadcast"),
    },
    {
      title: t("notifications.colStatus"),
      dataIndex: "status",
      width: 90,
      render: (value: string) => (
        <Tag color={STATUS_COLORS[value]}>
          {t(statusLabelKey(value) ?? "notifications.statusDraft")}
        </Tag>
      ),
    },
    {
      title: t("notifications.colReads"),
      dataIndex: "readCount",
      width: 90,
    },
    {
      title: t("notifications.colPublishedAt"),
      dataIndex: "publishedAt",
      width: 160,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: t("notifications.colExpireAt"),
      dataIndex: "expireAt",
      width: 160,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 180,
      ...FIXED_ACTIONS_COLUMN,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>
            {t("notifications.detail")}
          </Button>
          {record.status === "published" && (
            <Popconfirm
              title={t("notifications.revokeConfirm")}
              onConfirm={() => handleRevoke(record)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                {t("notifications.revoke")}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const pageActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openPublish}>
        {t("notifications.publish")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(pageActions);

  const detailVariables = detail?.variables ? JSON.stringify(detail.variables, null, 2) : "-";

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder={t("notifications.searchPlaceholder")}
            style={{ width: 240 }}
            onSearch={(value) => {
              setPage(1);
              setKeyword(value);
            }}
          />
          <Select
            allowClear
            placeholder={t("notifications.allTypes")}
            style={{ width: 130 }}
            options={typeOptions}
            value={type}
            onChange={(value) => {
              setPage(1);
              setType(value);
            }}
          />
          <Select
            allowClear
            placeholder={t("notifications.allStatuses")}
            style={{ width: 130 }}
            options={statusOptions}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
          <Select
            allowClear
            placeholder={t("notifications.allModes")}
            style={{ width: 140 }}
            options={deliveryOptions}
            value={deliveryMode}
            onChange={(value) => {
              setPage(1);
              setDeliveryMode(value);
            }}
          />
        </Space>
      </Card>

      <Table<MessageItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: TABLE_SCROLL_X }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: setPage,
          showTotal: (n) => t("common.total").replace("{n}", String(n)),
        }}
      />

      <Modal
        title={t("notifications.detailTitle")}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
      >
        {detailLoading ? (
          <Text type="secondary">…</Text>
        ) : null}
        {detail && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions
              column={2}
              size="small"
              bordered
              items={[
                { key: "id", label: "ID", children: detail.id },
                {
                  key: "level",
                  label: t("notifications.level"),
                  children: t(levelLabelKey(detail.level) ?? "notifications.levelInfo"),
                },
                {
                  key: "type",
                  label: t("notifications.type"),
                  children: t(typeLabelKey(detail.type) ?? "notifications.typeSystem"),
                },
                {
                  key: "mode",
                  label: t("notifications.deliveryMode"),
                  children: t(deliveryLabelKey(detail.deliveryMode) ?? "notifications.modeBroadcast"),
                },
                {
                  key: "status",
                  label: t("notifications.allStatuses"),
                  children: t(statusLabelKey(detail.status) ?? "notifications.statusDraft"),
                },
                {
                  key: "reads",
                  label: t("notifications.colReads"),
                  children: detail.readCount,
                },
                {
                  key: "published",
                  label: t("notifications.colPublishedAt"),
                  children: formatDateTime(detail.publishedAt),
                },
                {
                  key: "expire",
                  label: t("notifications.colExpireAt"),
                  children: formatDateTime(detail.expireAt),
                },
                {
                  key: "template",
                  label: t("notifications.colTemplate"),
                  children: `${detail.templateName ?? "-"}（${detail.templateCode}）`,
                },
                {
                  key: "action",
                  label: t("notifications.actionValue"),
                  children: detail.actionValue ?? "-",
                },
              ]}
            />
            <div>
              <Text strong>{detail.title}</Text>
              <Paragraph style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{detail.body}</Paragraph>
            </div>
            <div>
              <Text strong>{t("notifications.variablesSnapshot")}</Text>
              <pre
                style={{
                  marginTop: 6,
                  padding: 12,
                  background: "rgba(0,0,0,0.04)",
                  borderRadius: 8,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                {detailVariables}
              </pre>
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        title={t("notifications.publishTitle")}
        open={publishOpen}
        onCancel={() => setPublishOpen(false)}
        onOk={handlePublish}
        confirmLoading={publishing}
        okText={t("notifications.publishConfirm")}
        cancelText={t("common.cancel")}
        width={720}
      >
        <Form form={publishForm} layout="vertical">
          <Form.Item
            name="templateCode"
            label={t("notifications.selectTemplate")}
            rules={[{ required: true, message: t("notifications.selectTemplate") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t("notifications.selectTemplatePlaceholder")}
              options={templates.map((item) => ({
                value: item.code,
                label: `${item.name}（${item.code}）`,
              }))}
              onChange={handleSelectTemplate}
            />
          </Form.Item>
          <Form.Item name="expireAt" label={t("notifications.expireAt")} extra={t("notifications.expireAtHint")}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          {selectedTemplate && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={t("notifications.visibleScope")}
            />
          )}

          {selectedTemplate?.variables.map((variable: VariableDecl) => (
            <Form.Item
              key={variable.key}
              label={`${variable.label || variable.key}${variable.required ? " *" : ""}`}
              required={variable.required}
            >
              <Input
                value={values[variable.key] ?? ""}
                placeholder={variable.example || variable.label}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [variable.key]: event.target.value }))
                }
              />
            </Form.Item>
          ))}

          {selectedTemplate && (
            <Card size="small" title={t("notifications.publishPreview")}>
              {preview ? (
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Text strong>{preview.title || "-"}</Text>
                  <Text>{preview.body || "-"}</Text>
                  {preview.actionValue && <Text type="secondary">{preview.actionValue}</Text>}
                  {preview.missing.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message={t("notifications.missingVars").replace("{vars}", preview.missing.join("、"))}
                    />
                  )}
                  {preview.unknown.length > 0 && (
                    <Alert
                      type="error"
                      showIcon
                      message={t("notifications.unknownVars").replace("{vars}", preview.unknown.join("、"))}
                    />
                  )}
                </Space>
              ) : (
                <Text type="secondary">{t("notifications.previewPlaceholder")}</Text>
              )}
            </Card>
          )}
        </Form>
      </Modal>
    </div>
  );
}
