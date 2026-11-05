"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import SubjectSelect from "@/components/SubjectSelect";
import { usePageSize } from "@/components/antd-providers";
import { usePermissions } from "@/components/permissions";
import { usePageActions } from "@/components/page-actions";
import { useLocale, type MessageKey } from "@/lib/i18n";
import IonIcon from "@/components/IonIcon";
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Table,
  Tag,
  theme,
  type TableProps,
} from "antd";
import { useEffect, useMemo, useState } from "react";

type Textbook = {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  publisherId: string;
  publisherName: string;
  stageId: string;
  stageName: string;
  gradeId: string;
  gradeName: string;
  semester: number;
  semesterLabel: string;
  coverUrl: string | null;
  isbn: string | null;
  description: string | null;
  sortOrder: number;
  chapterCount: number;
  questionCount: number;
};

type StageOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; icon: string | null };
type GradeOption = { id: string; name: string; stageId: string };
type PublisherOption = { id: string; name: string };

// semester 是数据库存储值，仅 label 按语言渲染
const SEMESTER_OPTIONS: { value: number; labelKey: MessageKey }[] = [
  { value: 1, labelKey: "textbooks.semesterFirst" },
  { value: 2, labelKey: "textbooks.semesterSecond" },
  { value: 0, labelKey: "textbooks.semesterFull" },
];

const SEMESTER_LABEL_KEYS: Record<number, MessageKey> = {
  1: "textbooks.semesterFirst",
  2: "textbooks.semesterSecond",
  0: "textbooks.semesterFull",
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function TextbooksPanel() {
  const { t } = useLocale();
  const { pageSize } = usePageSize();
  const { token } = theme.useToken();
  const { can } = usePermissions();
  const canWrite = can("textbooks:write");
  const { message, modal } = App.useApp();
  const [data, setData] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [publishers, setPublishers] = useState<PublisherOption[]>([]);
  const [filterStageId, setFilterStageId] = useState<string>();
  const [filterSubjectId, setFilterSubjectId] = useState<string>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Textbook | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingCover, setFetchingCover] = useState(false);
  // 抓取封面时跳过前 N 张候选，连续点击可换一张
  const [coverFetchOffset, setCoverFetchOffset] = useState(0);
  // undefined=不变，null=移除，string=新上传的存储路径
  const [pendingCoverPath, setPendingCoverPath] = useState<string | null | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  // 等客户端渲染完成后再让弹窗常驻，避免 forceRender 在 SSR 阶段渲染出服务端不存在的 DOM 导致 hydration 报错
  const [formReady, setFormReady] = useState(false);
  const [form] = Form.useForm();
  const formStageId = Form.useWatch("stageId", form);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStageId) params.set("stageId", filterStageId);
      if (filterSubjectId) params.set("subjectId", filterSubjectId);
      const r = await fetch(`/api/admin/textbooks?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const json = await r.json();
      setData(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  };

  const loadDictionaries = async () => {
    const [stageRes, subjectRes, gradeRes, publisherRes] = await Promise.all([
      fetch("/api/admin/stages", { headers: authHeaders() }),
      fetch("/api/admin/subjects", { headers: authHeaders() }),
      fetch("/api/admin/grades", { headers: authHeaders() }),
      fetch("/api/admin/publishers", { headers: authHeaders() }),
    ]);
    // 任一请求失败/被中断时直接跳过，避免对空响应调用 json()
    if (!stageRes.ok || !subjectRes.ok || !gradeRes.ok || !publisherRes.ok) return;
    const [stageJson, subjectJson, gradeJson, publisherJson] = await Promise.all([
      stageRes.json(),
      subjectRes.json(),
      gradeRes.json(),
      publisherRes.json(),
    ]);
    setStages(Array.isArray(stageJson) ? stageJson : []);
    setSubjects(Array.isArray(subjectJson) ? subjectJson : []);
    setGrades(Array.isArray(gradeJson) ? gradeJson : []);
    setPublishers(Array.isArray(publisherJson) ? publisherJson : []);
  };

  useEffect(() => {
    setFormReady(true);
  }, []);

  useEffect(() => {
    // 请求可能因页面切换/热更新被中断而返回空响应，忽略即可
    loadDictionaries().catch(() => {});
  }, []);

  useEffect(() => {
    loadData().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStageId, filterSubjectId]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ semester: 1, sortOrder: 0 });
    setPendingCoverPath(undefined);
    setCoverPreview(null);
    setCoverFetchOffset(0);
    setModalOpen(true);
  };

  const openEdit = (row: Textbook) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      name: row.name,
      stageId: row.stageId,
      subjectId: row.subjectId,
      gradeId: row.gradeId,
      publisherId: row.publisherId,
      semester: row.semester,
      isbn: row.isbn,
      description: row.description,
      sortOrder: row.sortOrder,
    });
    setPendingCoverPath(undefined);
    setCoverPreview(row.coverUrl);
    setCoverFetchOffset(0);
    setModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/uploads/textbook-cover", {
        method: "POST",
        body: fd,
        headers: authHeaders(),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error ?? t("textbooks.uploadFailed"));
      setPendingCoverPath(json.path);
      setCoverPreview(json.url);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFetchCover = async () => {
    const v = form.getFieldsValue();
    if (!editing && (!v.stageId || !v.gradeId || !v.publisherId || !v.subjectId || v.semester === undefined)) {
      message.warning(t("textbooks.selectCoverFirst"));
      return;
    }

    setFetchingCover(true);
    try {
      const body: Record<string, unknown> = { offset: coverFetchOffset };
      if (editing) {
        body.textbookId = editing.id;
      } else {
        body.subjectName = subjects.find((s) => s.id === v.subjectId)?.name;
        body.publisherName = publishers.find((p) => p.id === v.publisherId)?.name;
        body.gradeName = grades.find((g) => g.id === v.gradeId)?.name;
        body.semester = v.semester;
      }
      const r = await fetch("/api/admin/textbooks/fetch-cover", {
        method: "POST",
        body: JSON.stringify(body),
        headers: authHeaders({ "Content-Type": "application/json" }),
      });
      const json = await r.json().catch(() => null);
      if (!r.ok) throw new Error(json?.error ?? t("textbooks.fetchFailed"));
      setPendingCoverPath(json.path);
      setCoverPreview(json.url);
      setCoverFetchOffset((n) => n + 1);
      message.success(t("textbooks.coverFetched"));
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setFetchingCover(false);
    }
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: v.name?.trim() || undefined,
        stageId: v.stageId,
        subjectId: v.subjectId,
        gradeId: v.gradeId,
        publisherId: v.publisherId,
        semester: v.semester,
        isbn: v.isbn,
        description: v.description,
        sortOrder: v.sortOrder ?? 0,
      };
      if (pendingCoverPath !== undefined) body.coverUrl = pendingCoverPath ?? "";

      const r = editing
        ? await fetch(`/api/admin/textbooks?id=${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
            headers: authHeaders({ "Content-Type": "application/json" }),
          })
        : await fetch("/api/admin/textbooks", {
            method: "POST",
            body: JSON.stringify(body),
            headers: authHeaders({ "Content-Type": "application/json" }),
          });
      const json = await r.json().catch(() => null);
      if (!r.ok) throw new Error(json?.error ?? t("common.saveFailed"));
      setModalOpen(false);
      message.success(editing ? t("common.updated") : t("common.created"));
      loadData();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: Textbook) => {
    const blocked = row.chapterCount > 0 || row.questionCount > 0;
    modal.confirm({
      title: t("textbooks.deleteTitle", { name: row.name }),
      content: blocked
        ? t("textbooks.deleteBlocked", {
            chapters: row.chapterCount,
            questions: row.questionCount,
          })
        : t("textbooks.deleteNoUndo"),
      okButtonProps: { danger: true, disabled: blocked },
      onOk: async () => {
        const r = await fetch(`/api/admin/textbooks?id=${row.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? t("common.deleteFailed"));
        }
        message.success(t("common.deleted"));
        loadData();
      },
    });
  };

  const headerActions = useMemo(
    () =>
      canWrite ? (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("textbooks.addTextbook")}
        </Button>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, t]
  );
  usePageActions(headerActions);

  const gradeOptions = useMemo(
    () =>
      grades
        .filter((g) => !formStageId || g.stageId === formStageId)
        .map((g) => ({ value: g.id, label: g.name })),
    [grades, formStageId],
  );

  const columns: TableProps<Textbook>["columns"] = [
    {
      title: t("textbooks.colCover"),
      dataIndex: "coverUrl",
      width: 70,
      render: (url: string | null) =>
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={t("textbooks.coverAlt")}
            style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 64,
              borderRadius: 4,
              background: token.colorFillQuaternary,
              color: token.colorTextQuaternary,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t("textbooks.noCover")}
          </div>
        ),
    },
    {
      title: t("textbooks.colTextbook"),
      dataIndex: "name",
      width: 260,
      render: (value: string, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          {row.isbn && <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>ISBN {row.isbn}</div>}
        </div>
      ),
    },
    {
      title: t("textbooks.colStage"),
      dataIndex: "stageName",
      width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: t("textbooks.colSubject"), dataIndex: "subjectName", width: 80 },
    { title: t("textbooks.colGrade"), dataIndex: "gradeName", width: 80 },
    {
      title: t("textbooks.colSemester"),
      dataIndex: "semester",
      width: 80,
      render: (v: number, row) =>
        SEMESTER_LABEL_KEYS[v] ? t(SEMESTER_LABEL_KEYS[v]) : row.semesterLabel,
    },
    { title: t("textbooks.colPublisher"), dataIndex: "publisherName", width: 110 },
    { title: t("textbooks.colChapterCount"), dataIndex: "chapterCount", width: 80, align: "center" },
    { title: t("textbooks.colQuestionCount"), dataIndex: "questionCount", width: 70, align: "center" },
    { title: t("textbooks.colSortOrder"), dataIndex: "sortOrder", width: 60, align: "center" },
    {
      title: t("textbooks.colActions"),
      width: 90,
      align: "right",
      ...FIXED_ACTIONS_COLUMN,
      render: (_, row) => (
        <Space size={4}>
          <Button
            variant="text"
            color="primary"
            size="small"
            icon={<EditOutlined />}
            title={t("common.edit")}
            aria-label={t("common.edit")}
            onClick={() => openEdit(row)}
          />
          <Button
            variant="text"
            color="danger"
            size="small"
            icon={<DeleteOutlined />}
            title={t("common.delete")}
            aria-label={t("common.delete")}
            onClick={() => handleDelete(row)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          placeholder={t("textbooks.filterAllStages")}
          allowClear
          style={{ width: 160 }}
          value={filterStageId}
          options={stages.map((s) => ({ value: s.id, label: s.name }))}
          onChange={setFilterStageId}
        />
        <SubjectSelect
          placeholder={t("textbooks.filterAllSubjects")}
          allowClear
          style={{ width: 160 }}
          value={filterSubjectId}
          subjects={subjects}
          onChange={(v) => setFilterSubjectId(v ?? undefined)}
        />
      </div>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        scroll={{ x: TABLE_SCROLL_X }}
        pagination={{ pageSize, showSizeChanger: false, showTotal: (n) => t("common.total", { n }) }}
      />

      <Modal
        title={editing ? t("textbooks.editTitle") : t("textbooks.createTitle")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
        forceRender={formReady}
        width={720}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={24}>
            <Col span={15}>
              <Form.Item
                name="name"
                label={t("textbooks.name")}
                extra={t("textbooks.nameHint")}
              >
                <Input placeholder={t("textbooks.namePlaceholder")} maxLength={64} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    name="stageId"
                    label={t("textbooks.stage")}
                    rules={[{ required: true, message: t("textbooks.stageRequired") }]}
                  >
                    <Select
                      placeholder={t("textbooks.stagePlaceholder")}
                      options={stages.map((s) => ({ value: s.id, label: s.name }))}
                      onChange={() => form.setFieldValue("gradeId", undefined)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="gradeId"
                    label={t("textbooks.grade")}
                    rules={[{ required: true, message: t("textbooks.gradeRequired") }]}
                  >
                    <Select
                      placeholder={t("textbooks.gradePlaceholder")}
                      options={gradeOptions}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="semester"
                    label={t("textbooks.semester")}
                    rules={[{ required: true, message: t("textbooks.semesterRequired") }]}
                  >
                    <Select
                      placeholder={t("textbooks.semesterPlaceholder")}
                      options={SEMESTER_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="subjectId"
                    label={t("textbooks.subject")}
                    rules={[{ required: true, message: t("textbooks.subjectRequired") }]}
                  >
                    <SubjectSelect subjects={subjects} placeholder={t("textbooks.subjectPlaceholder")} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="publisherId"
                    label={t("textbooks.publisher")}
                    rules={[{ required: true, message: t("textbooks.publisherRequired") }]}
                  >
                    <Select
                      placeholder={t("textbooks.publisherPlaceholder")}
                      options={publishers.map((p) => ({ value: p.id, label: p.name }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="isbn" label={t("textbooks.isbn")}>
                <Input placeholder={t("common.optional")} maxLength={32} />
              </Form.Item>
              <Form.Item name="description" label={t("textbooks.description")}>
                <Input.TextArea rows={2} placeholder={t("common.optional")} maxLength={200} />
              </Form.Item>
              <Form.Item name="sortOrder" label={t("textbooks.sortOrder")}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={9}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{t("textbooks.coverSection")}</div>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "3 / 4",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: token.colorFillQuaternary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: token.colorTextQuaternary,
                }}
              >
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt={t("textbooks.coverPreviewAlt")}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  t("textbooks.noCoverYet")
                )}
              </div>
              <Space style={{ marginTop: 12 }}>
                <Button
                  icon={<UploadOutlined />}
                  loading={uploading}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/png,image/jpeg,image/webp";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) handleUpload(file);
                    };
                    input.click();
                  }}
                >
                  {t("textbooks.upload")}
                </Button>
                <Button icon={<CloudDownloadOutlined />} loading={fetchingCover} onClick={handleFetchCover}>
                  {t("textbooks.fetch")}
                </Button>
                {(coverPreview || pendingCoverPath !== undefined) && (
                  <Button
                    danger
                    onClick={() => {
                      setPendingCoverPath(null);
                      setCoverPreview(null);
                    }}
                  >
                    {t("textbooks.remove")}
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
