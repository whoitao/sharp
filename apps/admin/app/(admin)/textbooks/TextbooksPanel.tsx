"use client";

import SubjectSelect from "@/components/SubjectSelect";
import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import IonIcon from "@/components/IonIcon";
import { CloudDownloadOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
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

const SEMESTER_OPTIONS = [
  { value: 1, label: "上册" },
  { value: 2, label: "下册" },
  { value: 0, label: "全一册" },
];

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function TextbooksPanel() {
  const { pageSize } = usePageSize();
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
      if (!r.ok) throw new Error(json?.error ?? "上传失败");
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
      message.warning("请先选择学段、年级、学期、科目和版本");
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
      if (!r.ok) throw new Error(json?.error ?? "抓取失败");
      setPendingCoverPath(json.path);
      setCoverPreview(json.url);
      setCoverFetchOffset((n) => n + 1);
      message.success("已抓取封面，不满意可再点击一次换一张");
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
      if (!r.ok) throw new Error(json?.error ?? "保存失败");
      setModalOpen(false);
      message.success(editing ? "更新成功" : "创建成功");
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
      title: `确认删除「${row.name}」？`,
      content: blocked
        ? `该教材下有 ${row.chapterCount} 个章节、${row.questionCount} 道题目，需先移除后再删除`
        : "删除后无法撤销",
      okButtonProps: { danger: true, disabled: blocked },
      onOk: async () => {
        const r = await fetch(`/api/admin/textbooks?id=${row.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? "删除失败");
        }
        message.success("已删除");
        loadData();
      },
    });
  };

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        新建教材
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
      title: "封面",
      dataIndex: "coverUrl",
      width: 70,
      render: (url: string | null) =>
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="封面" style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 4 }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 64,
              borderRadius: 4,
              background: "#f0f0f0",
              color: "#bbb",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            无
          </div>
        ),
    },
    {
      title: "教材",
      dataIndex: "name",
      width: 260,
      render: (value: string, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value}</div>
          {row.isbn && <div style={{ color: "#999", fontSize: 12 }}>ISBN {row.isbn}</div>}
        </div>
      ),
    },
    {
      title: "学段",
      dataIndex: "stageName",
      width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: "科目", dataIndex: "subjectName", width: 80 },
    { title: "年级", dataIndex: "gradeName", width: 80 },
    { title: "学期", dataIndex: "semesterLabel", width: 80 },
    { title: "版本", dataIndex: "publisherName", width: 110 },
    { title: "章节数", dataIndex: "chapterCount", width: 80, align: "center" },
    { title: "题数", dataIndex: "questionCount", width: 70, align: "center" },
    { title: "排序", dataIndex: "sortOrder", width: 60, align: "center" },
    {
      title: "操作",
      width: 110,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          placeholder="全部学段"
          allowClear
          style={{ width: 160 }}
          value={filterStageId}
          options={stages.map((s) => ({ value: s.id, label: s.name }))}
          onChange={setFilterStageId}
        />
        <SubjectSelect
          placeholder="全部科目"
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
        scroll={{ x: 1080 }}
        pagination={{ pageSize, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editing ? "编辑教材" : "新建教材"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        forceRender={formReady}
        width={720}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={24}>
            <Col span={15}>
              <Form.Item name="name" label="教材名称" extra="留空则按「科目 · 版本 · 年级学期」自动生成">
                <Input placeholder="如：数学 · 人教版 · 七年级上册" maxLength={64} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="stageId" label="学段" rules={[{ required: true, message: "请选择学段" }]}>
                    <Select
                      placeholder="学段"
                      options={stages.map((s) => ({ value: s.id, label: s.name }))}
                      onChange={() => form.setFieldValue("gradeId", undefined)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="gradeId" label="年级" rules={[{ required: true, message: "请选择年级" }]}>
                    <Select placeholder="年级" options={gradeOptions} showSearch optionFilterProp="label" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="semester" label="学期" rules={[{ required: true, message: "请选择学期" }]}>
                    <Select placeholder="学期" options={SEMESTER_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="subjectId" label="科目" rules={[{ required: true, message: "请选择科目" }]}>
                    <SubjectSelect
                      subjects={subjects}
                      placeholder="科目"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="publisherId" label="版本" rules={[{ required: true, message: "请选择版本" }]}>
                    <Select
                      placeholder="版本"
                      options={publishers.map((p) => ({ value: p.id, label: p.name }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="isbn" label="ISBN">
                <Input placeholder="可选" maxLength={32} />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input.TextArea rows={2} placeholder="可选" maxLength={200} />
              </Form.Item>
              <Form.Item name="sortOrder" label="排序">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={9}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>封面（竖版 3:4）</div>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "3 / 4",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#bbb",
                }}
              >
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="封面预览" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "暂无封面"
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
                  上传
                </Button>
                <Button icon={<CloudDownloadOutlined />} loading={fetchingCover} onClick={handleFetchCover}>
                  抓取
                </Button>
                {(coverPreview || pendingCoverPath !== undefined) && (
                  <Button
                    danger
                    onClick={() => {
                      setPendingCoverPath(null);
                      setCoverPreview(null);
                    }}
                  >
                    移除
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
