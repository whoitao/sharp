"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";
import { formatDateTime } from "@/lib/datetime";
import { useLocale } from "@/lib/i18n";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  ACTION_OPTIONS,
  DELIVERY_OPTIONS,
  LEVEL_COLORS,
  LEVEL_OPTIONS,
  TYPE_OPTIONS,
  actionLabelKey,
  deliveryLabelKey,
  exampleValues,
  levelLabelKey,
  type TemplateItem,
  type VariableDecl,
  typeLabelKey,
} from "./meta";

const { Text } = Typography;

interface TemplateFormValues {
  code: string;
  name: string;
  type: string;
  level: string;
  deliveryMode: string;
  titleTemplate: string;
  bodyTemplate: string;
  actionType: string;
  actionValueTemplate?: string;
  dedupeKeyTemplate?: string;
  enabled: boolean;
  variables: VariableDecl[];
}

interface PreviewResult {
  title: string;
  body: string;
  actionValue: string | null;
  missing: string[];
  unknown: string[];
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
  "Content-Type": "application/json",
});

export default function TemplatesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { pageSize } = usePageSize();

  const [items, setItems] = useState<TemplateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<string | undefined>();
  const [deliveryMode, setDeliveryMode] = useState<string | undefined>();
  const [enabled, setEnabled] = useState<string | undefined>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<TemplateFormValues>();

  const [testTarget, setTestTarget] = useState<TemplateItem | null>(null);
  const [testUserId, setTestUserId] = useState("");
  const [testing, setTesting] = useState(false);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword.trim()) query.set("keyword", keyword.trim());
      if (type) query.set("type", type);
      if (deliveryMode) query.set("deliveryMode", deliveryMode);
      if (enabled) query.set("enabled", enabled);

      const res = await fetch(`/api/admin/notification-templates?${query.toString()}`, {
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
  }, [page, pageSize, keyword, type, deliveryMode, enabled]);

  const typeOptions = TYPE_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  const levelOptions = LEVEL_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  const deliveryOptions = DELIVERY_OPTIONS.map((item) => ({
    value: item.value,
    label: t(item.labelKey),
  }));
  const actionOptions = ACTION_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) }));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      code: "",
      name: "",
      type: "system",
      level: "info",
      deliveryMode: "broadcast",
      titleTemplate: "",
      bodyTemplate: "",
      actionType: "none",
      actionValueTemplate: undefined,
      dedupeKeyTemplate: undefined,
      enabled: true,
      variables: [],
    } as TemplateFormValues);
    setPreview(null);
    setModalOpen(true);
  };

  const openEdit = (item: TemplateItem) => {
    setEditing(item);
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      type: item.type,
      level: item.level,
      deliveryMode: item.deliveryMode,
      titleTemplate: item.titleTemplate,
      bodyTemplate: item.bodyTemplate,
      actionType: item.actionType,
      actionValueTemplate: item.actionValueTemplate ?? undefined,
      dedupeKeyTemplate: item.dedupeKeyTemplate ?? undefined,
      enabled: item.enabled,
      variables: item.variables,
    });
    setPreview(null);
    setModalOpen(true);
  };

  const watched = Form.useWatch([], form) as TemplateFormValues | undefined;

  useEffect(() => {
    if (!modalOpen || !watched?.titleTemplate || !watched?.bodyTemplate) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/admin/notification-templates/preview", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            titleTemplate: watched.titleTemplate,
            bodyTemplate: watched.bodyTemplate,
            actionType: watched.actionType,
            actionValueTemplate: watched.actionValueTemplate,
            declarations: watched.variables ?? [],
            values: exampleValues(watched.variables ?? []),
          }),
        });
        const data = await res.json();
        setPreview(res.ok ? data : null);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [modalOpen, watched]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = { ...values, variables: values.variables ?? [] };
      const url = editing
        ? `/api/admin/notification-templates?id=${editing.id}`
        : "/api/admin/notification-templates";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data?.details?.join("；") || data?.error || t("common.saveFailed"));
        return;
      }
      message.success(editing ? t("notifications.templateSaved") : t("common.created"));
      setModalOpen(false);
      setPage(1);
      fetchList();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: TemplateItem) => {
    const res = await fetch(`/api/admin/notification-templates?id=${item.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      message.error(data?.error || t("common.deleteFailed"));
      return;
    }
    message.success(t("common.deleted"));
    fetchList();
  };

  const handleTestSend = async () => {
    if (!testTarget) return;
    if (!testUserId.trim()) {
      message.error(t("notifications.testUserPlaceholder"));
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/admin/notification-templates/test-send", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          templateCode: testTarget.code,
          userId: testUserId.trim(),
          variables: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data?.details?.join("；") || data?.error || t("common.saveFailed"));
        return;
      }
      message.success(t("notifications.testSent"));
      setTestTarget(null);
      setTestUserId("");
    } finally {
      setTesting(false);
    }
  };

  const columns: ColumnsType<TemplateItem> = [
    {
      title: t("notifications.name"),
      dataIndex: "name",
      width: 200,
      render: (value: string, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.code}
          </Text>
        </Space>
      ),
    },
    {
      title: t("notifications.type"),
      dataIndex: "type",
      width: 90,
      render: (value: string) => t(typeLabelKey(value) ?? "notifications.typeSystem"),
    },
    {
      title: t("notifications.level"),
      dataIndex: "level",
      width: 90,
      render: (value: string) => (
        <Tag color={LEVEL_COLORS[value]}>{t(levelLabelKey(value) ?? "notifications.levelInfo")}</Tag>
      ),
    },
    {
      title: t("notifications.deliveryMode"),
      dataIndex: "deliveryMode",
      width: 110,
      render: (value: string) => t(deliveryLabelKey(value) ?? "notifications.modeBroadcast"),
    },
    {
      title: t("notifications.enabled"),
      dataIndex: "enabled",
      width: 80,
      render: (value: boolean) => (
        <Tag color={value ? "green" : "default"}>
          {value ? t("notifications.enabled") : t("notifications.disabled")}
        </Tag>
      ),
    },
    {
      title: t("notifications.colReads"),
      dataIndex: "usageCount",
      width: 100,
      render: (value: number) => value,
    },
    {
      title: t("notifications.colUpdatedAt"),
      dataIndex: "updatedAt",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 170,
      ...FIXED_ACTIONS_COLUMN,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            {t("common.edit")}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            onClick={() => {
              setTestTarget(record);
              setTestUserId("");
            }}
          >
            {t("notifications.testSend")}
          </Button>
          <Popconfirm
            title={t("notifications.deleteTemplateConfirm").replace("{name}", record.name)}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t("common.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pageActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        {t("notifications.addTemplate")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(pageActions);

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
            placeholder={t("notifications.allModes")}
            style={{ width: 140 }}
            options={deliveryOptions}
            value={deliveryMode}
            onChange={(value) => {
              setPage(1);
              setDeliveryMode(value);
            }}
          />
          <Select
            allowClear
            placeholder={t("notifications.allEnabled")}
            style={{ width: 120 }}
            options={[
              { value: "true", label: t("notifications.enabled") },
              { value: "false", label: t("notifications.disabled") },
            ]}
            value={enabled}
            onChange={(value) => {
              setPage(1);
              setEnabled(value);
            }}
          />
        </Space>
      </Card>

      <Table<TemplateItem>
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
        title={editing ? t("notifications.editTemplate") : t("notifications.addTemplate")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t("notifications.saveTemplate")}
        cancelText={t("common.cancel")}
        width={960}
        styles={{ body: { maxHeight: "68vh", overflowY: "auto", paddingRight: 8 } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="code"
                label={t("notifications.code")}
                rules={[{ required: true, message: t("notifications.codeRequired") }]}
                extra={t("notifications.codeHint")}
              >
                <Input disabled={Boolean(editing)} placeholder="pet_hungry" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="name"
                label={t("notifications.name")}
                rules={[{ required: true, message: t("notifications.name") }]}
              >
                <Input maxLength={80} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enabled" label={t("notifications.enabled")} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="type" label={t("notifications.type")}>
                <Select options={typeOptions} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="level" label={t("notifications.level")}>
                <Select options={levelOptions} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="deliveryMode" label={t("notifications.deliveryMode")}>
                <Select options={deliveryOptions} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="actionType" label={t("notifications.actionType")}>
                <Select options={actionOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="actionValueTemplate" label={t("notifications.actionValue")}>
                <Input placeholder="/account/pet 或 https://..." maxLength={500} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dedupeKeyTemplate"
                label={t("notifications.dedupeKey")}
                extra={watched?.deliveryMode === "event" ? "pet_hungry:{$pet_id}:{$date}" : undefined}
              >
                <Input maxLength={200} disabled={watched?.deliveryMode === "broadcast"} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="titleTemplate"
                label={t("notifications.titleTemplate")}
                rules={[{ required: true, message: t("notifications.titleTemplate") }]}
              >
                <Input maxLength={40} showCount placeholder="宠物 {$pet_name} 饿了" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="bodyTemplate"
                label={t("notifications.bodyTemplate")}
                rules={[{ required: true, message: t("notifications.bodyTemplate") }]}
              >
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="使用 {$变量名} 插入变量" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t("notifications.variables")}>
            <Form.List name="variables">
              {(fields, { add, remove }) => (
                <Space orientation="vertical" style={{ width: "100%" }} size={8}>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}
                    >
                      <Form.Item
                        name={[field.name, "key"]}
                        style={{ margin: 0, width: 120 }}
                        rules={[{ required: true, message: t("notifications.variableKey") }]}
                      >
                        <Input placeholder={t("notifications.variableKey")} />
                      </Form.Item>
                      <Form.Item name={[field.name, "label"]} style={{ margin: 0, width: 120 }}>
                        <Input placeholder={t("notifications.variableLabel")} />
                      </Form.Item>
                      <Form.Item name={[field.name, "type"]} style={{ margin: 0, width: 96 }}>
                        <Select
                          options={[
                            { value: "string", label: "string" },
                            { value: "number", label: "number" },
                            { value: "time", label: "time" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name={[field.name, "scope"]} style={{ margin: 0, width: 96 }}>
                        <Select
                          options={[
                            { value: "global", label: t("notifications.scopeGlobal") },
                            { value: "user", label: t("notifications.scopeUser") },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "required"]}
                        valuePropName="checked"
                        style={{ margin: 0, width: 64 }}
                      >
                        <Checkbox>{t("notifications.variableRequired")}</Checkbox>
                      </Form.Item>
                      <Form.Item name={[field.name, "example"]} style={{ margin: 0, width: 130 }}>
                        <Input placeholder={t("notifications.variableExample")} />
                      </Form.Item>
                      <Form.Item name={[field.name, "fallback"]} style={{ margin: 0, width: 130 }}>
                        <Input placeholder={t("notifications.variableFallback")} />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ type: "string", scope: "global", required: false })}
                  >
                    {t("notifications.addVariable")}
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Card size="small" title={t("notifications.preview")} loading={previewLoading}>
            {preview ? (
              <Space orientation="vertical" size={6} style={{ width: "100%" }}>
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
        </Form>
      </Modal>

      <Modal
        title={t("notifications.testSendTitle")}
        open={Boolean(testTarget)}
        onCancel={() => setTestTarget(null)}
        onOk={handleTestSend}
        confirmLoading={testing}
        okText={t("notifications.testSend")}
        cancelText={t("common.cancel")}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text type="secondary">{testTarget?.name}</Text>
          <Input
            value={testUserId}
            onChange={(event) => setTestUserId(event.target.value)}
            placeholder={t("notifications.testUserPlaceholder")}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("notifications.testUserHint")}
          </Text>
        </Space>
      </Modal>
    </div>
  );
}
