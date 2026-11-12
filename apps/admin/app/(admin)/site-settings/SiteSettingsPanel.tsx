"use client";

import { usePageActions } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import { HistoryOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Row,
  Space,
  Spin,
  Switch,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

interface SiteSettingsForm {
  siteNameZh: string;
  siteNameEn: string;
  sloganZh?: string;
  sloganEn?: string;
  siteUrl?: string;
  seoTitleZh?: string;
  seoTitleEn?: string;
  seoDescriptionZh?: string;
  seoDescriptionEn?: string;
  seoKeywordsZh?: string;
  seoKeywordsEn?: string;
  gaMeasurementId?: string;
  analyticsProductionOnly: boolean;
  icpNumber?: string;
}

interface RevisionItem {
  id: string;
  changedBy: string | null;
  createdAt: string;
}

export default function SiteSettingsPanel() {
  const { message, modal } = App.useApp();
  const { t, locale } = useLocale();
  const { can } = usePermissions();
  const canWrite = can("settings:write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [form] = Form.useForm<SiteSettingsForm>();

  const token = () => localStorage.getItem("admin_token");
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const formatTime = (value: string | null) => {
    if (!value) return "";
    return new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const applyData = (data: Record<string, unknown>) => {
    form.setFieldsValue({
      siteNameZh: (data.siteNameZh as string) ?? "Sharp",
      siteNameEn: (data.siteNameEn as string) ?? "Sharp",
      sloganZh: (data.sloganZh as string | null) ?? undefined,
      sloganEn: (data.sloganEn as string | null) ?? undefined,
      siteUrl: (data.siteUrl as string | null) ?? undefined,
      seoTitleZh: (data.seoTitleZh as string | null) ?? undefined,
      seoTitleEn: (data.seoTitleEn as string | null) ?? undefined,
      seoDescriptionZh: (data.seoDescriptionZh as string | null) ?? undefined,
      seoDescriptionEn: (data.seoDescriptionEn as string | null) ?? undefined,
      seoKeywordsZh: (data.seoKeywordsZh as string | null) ?? undefined,
      seoKeywordsEn: (data.seoKeywordsEn as string | null) ?? undefined,
      gaMeasurementId: (data.gaMeasurementId as string | null) ?? undefined,
      analyticsProductionOnly: data.analyticsProductionOnly !== false,
      icpNumber: (data.icpNumber as string | null) ?? undefined,
    });
    setUpdatedBy((data.updatedBy as string | null) ?? null);
    setUpdatedAt((data.updatedAt as string | null) ?? null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-settings", { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        message.error(data?.error || t("siteSettings.loadFailed"));
        return;
      }
      applyData(data);
    } catch {
      message.error(t("siteSettings.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (values: SiteSettingsForm) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        message.error(data?.error || t("siteSettings.saveFailed"));
        return;
      }
      applyData(data);
      message.success(
        data?.revalidated
          ? `${t("siteSettings.saved")} ${t("siteSettings.cacheHint")}`
          : t("siteSettings.saved"),
      );
    } catch {
      message.error(t("siteSettings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const fetchRevisions = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/site-settings/revisions", { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        message.error(data?.error || t("siteSettings.loadFailed"));
        return;
      }
      setRevisions(Array.isArray(data?.items) ? data.items : []);
    } catch {
      message.error(t("siteSettings.loadFailed"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setHistoryOpen(true);
    fetchRevisions();
  };

  const handleRestore = (revision: RevisionItem) => {
    modal.confirm({
      title: t("siteSettings.restoreTitle"),
      content: t("siteSettings.restoreConfirm", { time: formatTime(revision.createdAt) }),
      okText: t("siteSettings.restore"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        setRestoringId(revision.id);
        try {
          const res = await fetch(
            `/api/admin/site-settings/revisions/${revision.id}/restore`,
            { method: "POST", headers: authHeaders() },
          );
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            message.error(data?.error || t("siteSettings.restoreFailed"));
            return;
          }
          applyData(data);
          message.success(t("siteSettings.restored"));
          fetchRevisions();
        } catch {
          message.error(t("siteSettings.restoreFailed"));
        } finally {
          setRestoringId(null);
        }
      },
    });
  };

  const headerActions = useMemo(
    () => (
      <Space>
        <Button icon={<HistoryOutlined />} onClick={openHistory}>
          {t("siteSettings.history")}
        </Button>
        {canWrite ? (
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {t("common.saveChanges")}
          </Button>
        ) : null}
      </Space>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, saving, t],
  );
  usePageActions(headerActions);

  return (
    <Spin spinning={loading}>
      <div style={{ maxWidth: 960 }}>
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          {t("siteSettings.desc")}
        </Text>

        <Form form={form} layout="vertical" onFinish={handleSave} disabled={!canWrite}>
          <Card title={t("siteSettings.groupBasic")} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.siteNameZh")}
                  name="siteNameZh"
                  rules={[{ required: true, message: t("siteSettings.siteNameRequired") }]}
                >
                  <Input maxLength={60} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.siteNameEn")}
                  name="siteNameEn"
                  rules={[{ required: true, message: t("siteSettings.siteNameRequired") }]}
                >
                  <Input maxLength={60} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label={t("siteSettings.sloganZh")} name="sloganZh">
                  <Input maxLength={200} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label={t("siteSettings.sloganEn")} name="sloganEn">
                  <Input maxLength={200} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title={t("siteSettings.groupSeo")} style={{ marginBottom: 16 }}>
            <Form.Item
              label={t("siteSettings.siteUrl")}
              name="siteUrl"
              extra={t("siteSettings.siteUrlHint")}
              rules={[{ type: "url", message: t("siteSettings.siteUrlHint") }]}
            >
              <Input placeholder="https://sharp.whoitao.top" maxLength={300} />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label={t("siteSettings.seoTitleZh")} name="seoTitleZh">
                  <Input maxLength={200} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label={t("siteSettings.seoTitleEn")} name="seoTitleEn">
                  <Input maxLength={200} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.seoKeywordsZh")}
                  name="seoKeywordsZh"
                  extra={t("siteSettings.seoKeywordsHint")}
                >
                  <Input.TextArea rows={2} maxLength={500} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.seoKeywordsEn")}
                  name="seoKeywordsEn"
                  extra={t("siteSettings.seoKeywordsHint")}
                >
                  <Input.TextArea rows={2} maxLength={500} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label={t("siteSettings.seoDescriptionZh")} name="seoDescriptionZh">
                  <Input.TextArea rows={3} maxLength={500} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.seoDescriptionEn")}
                  name="seoDescriptionEn"
                  extra={t("siteSettings.seoDescHint")}
                >
                  <Input.TextArea rows={3} maxLength={500} showCount />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title={t("siteSettings.groupStats")}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.gaMeasurementId")}
                  name="gaMeasurementId"
                  extra={t("siteSettings.gaHint")}
                  rules={[
                    {
                      pattern: /^G-[A-Z0-9]{6,}$/,
                      message: t("siteSettings.gaInvalid"),
                    },
                  ]}
                >
                  <Input placeholder="G-XXXXXXXXXX" maxLength={40} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.analyticsProductionOnly")}
                  name="analyticsProductionOnly"
                  valuePropName="checked"
                  extra={t("siteSettings.analyticsProductionHint")}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t("siteSettings.icpNumber")}
                  name="icpNumber"
                  extra={t("siteSettings.icpHint")}
                >
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>

        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            {updatedAt
              ? t("siteSettings.lastUpdated", {
                  user: updatedBy || "-",
                  time: formatTime(updatedAt),
                })
              : t("siteSettings.neverUpdated")}
          </Text>
        </div>
      </div>

      <Drawer
        title={t("siteSettings.historyTitle")}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        size={420}
        extra={<Button onClick={() => setHistoryOpen(false)}>{t("siteSettings.close")}</Button>}
      >
        <Spin spinning={historyLoading}>
          {revisions.length === 0 ? (
            <Empty description={t("siteSettings.historyEmpty")} />
          ) : (
            <List
              dataSource={revisions}
              renderItem={(item) => (
                <List.Item
                  actions={
                    canWrite
                      ? [
                          <Button
                            key="restore"
                            type="link"
                            loading={restoringId === item.id}
                            onClick={() => handleRestore(item)}
                          >
                            {t("siteSettings.restore")}
                          </Button>,
                        ]
                      : []
                  }
                >
                  <List.Item.Meta
                    title={formatTime(item.createdAt)}
                    description={`${t("siteSettings.revisionBy")}: ${item.changedBy || "-"}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Drawer>
    </Spin>
  );
}
