"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  UploadOutlined
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
  Popover,
  Row,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  Upload
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useRef, useState } from "react";

interface QuestionOption {
  optionKey: string;
  content: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  categoryId: string;
  subjectId: string | null;
  subjectName: string | null;
  type: number;
  content: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  createdAt: string;
  options: QuestionOption[];
  knowledgePoints: { id: string; name: string; parentId: string | null }[];
}

interface CategoryOption {
  id: string;
  name: string;
  children: CategoryOption[];
}

interface SubjectOption {
  id: string;
  name: string;
}

interface KPNode {
  id: string;
  name: string;
  parentId: string | null;
  children: KPNode[];
}

interface QuestionFormValues {
  categoryId?: string;
  subjectId?: string;
  knowledgePointIds?: string[];
  type: string;
  content: string;
  analysis?: string;
  difficulty: number;
  score: number;
  sortOrder: number;
  options: QuestionOption[];
}

const DEFAULT_OPTIONS: QuestionOption[] = ["A", "B", "C", "D"].map((key) => ({
  optionKey: key,
  content: "",
  isCorrect: false,
}));

export default function QuestionsPage() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [kpTree, setKpTree] = useState<KPNode[]>([]);
  const [filterKpTree, setFilterKpTree] = useState<KPNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>();
  const [selectedKPId, setSelectedKPId] = useState<string>();
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { pageSize } = usePageSize();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [questionForm] = Form.useForm<QuestionFormValues>();
  const [importForm] = Form.useForm<{ file: any }>();
  const [formSubjectId, setFormSubjectId] = useState<string>();

  const typeLabel = (type: number) => {
    switch (type) {
      case 1:
        return t("questions.typeSingle");
      case 2:
        return t("questions.typeMultiple");
      case 3:
        return t("questions.typeTrueFalse");
      case 4:
        return t("questions.typeFillBlank");
      default:
        return t("questions.typeUnknown", { n: type });
    }
  };

  const fetchCategories = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  };

  const fetchSubjects = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    }
  };

  const fetchKnowledgePoints = async (subjectId?: string) => {
    const token = localStorage.getItem("admin_token");
    try {
      const url = subjectId
        ? `/api/admin/knowledge-points?subjectId=${subjectId}`
        : "/api/admin/knowledge-points";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setKpTree(Array.isArray(data) ? data : []);
    } catch {
      setKpTree([]);
    }
  };

  const fetchFilterKnowledgePoints = async (subjectId?: string) => {
    const token = localStorage.getItem("admin_token");
    try {
      const url = subjectId
        ? `/api/admin/knowledge-points?subjectId=${subjectId}`
        : "/api/admin/knowledge-points";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFilterKpTree(Array.isArray(data) ? data : []);
    } catch {
      setFilterKpTree([]);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (selectedCategoryId) params.append("categoryId", selectedCategoryId);
    if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
    if (selectedKPId) params.append("knowledgePointId", selectedKPId);
    if (searchText.trim()) params.append("search", searchText.trim());
    try {
      const res = await fetch(
        `/api/admin/questions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setQuestions(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSubjects();
    fetchKnowledgePoints();
    fetchFilterKnowledgePoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 知识点按选中的科目联动过滤，切换科目时清空已选知识点
  // 首次挂载时表单尚未渲染（弹窗无 forceRender），跳过 setFieldsValue 避免 useForm 未连接告警
  const isSubjectEffectFirstRun = useRef(true);
  // 编辑弹窗填充数据时会程序性设置科目，此时不应清空随后写入的知识点
  const skipSubjectClearRef = useRef(false);
  useEffect(() => {
    fetchKnowledgePoints(formSubjectId);
    if (isSubjectEffectFirstRun.current) {
      isSubjectEffectFirstRun.current = false;
      return;
    }
    if (skipSubjectClearRef.current) {
      skipSubjectClearRef.current = false;
      return;
    }
    questionForm.setFieldsValue({ knowledgePointIds: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSubjectId]);

  // 顶部筛选：科目切换时联动知识点下拉，并清空已选知识点
  useEffect(() => {
    fetchFilterKnowledgePoints(selectedSubjectId);
    setSelectedKPId(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  // 内容模糊搜索：防抖 300ms，避免每敲一个字符都发请求
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, selectedSubjectId, selectedKPId, searchText, page, pageSize]);

  const resetForm = () => {
    setFormSubjectId(undefined);
    questionForm.setFieldsValue({
      categoryId: selectedCategoryId,
      subjectId: undefined,
      knowledgePointIds: [],
      type: "1",
      content: "",
      analysis: "",
      difficulty: 1,
      score: 1,
      sortOrder: 0,
      options: DEFAULT_OPTIONS.map((o) => ({ ...o })),
    });
  };

  const buildPayload = (values: QuestionFormValues) => ({
    categoryId: Number(values.categoryId || selectedCategoryId),
    subjectId: values.subjectId || undefined,
    knowledgePointIds: values.knowledgePointIds || [],
    type: Number(values.type),
    content: values.content,
    analysis: values.analysis || undefined,
    difficulty: Number(values.difficulty),
    score: Number(values.score),
    sortOrder: Number(values.sortOrder),
    options: (values.options || [])
      .filter((o) => o.content.trim() !== "")
      .map((o) => ({
        optionKey: o.optionKey,
        content: o.content,
        isCorrect: o.isCorrect,
      })),
  });

  const handleCreate = async (values: QuestionFormValues) => {
    const categoryId = values.categoryId || selectedCategoryId;
    if (!categoryId) {
      message.warning(t("questions.selectCategoryWarning"));
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload(values)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("questions.createFailed"));
        return;
      }
      message.success(t("questions.created"));
      setCreateOpen(false);
      fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  // 弹窗打开后再填充表单（afterOpenChange 回调），确保 Form 已挂载
  const populateEditForm = (q: QuestionItem) => {
    // 程序性设置科目：跳过科目联动 effect 中「清空知识点」的逻辑，否则刚填充的知识点会被清空。
    // 仅在科目实际变化时设置跳过标记，保证标记一定会被 effect 消费，不影响后续手动切换科目
    const nextSubjectId = q.subjectId || undefined;
    if (nextSubjectId !== formSubjectId) {
      skipSubjectClearRef.current = true;
      setFormSubjectId(nextSubjectId);
    }
    questionForm.setFieldsValue({
      categoryId: q.categoryId,
      subjectId: q.subjectId || undefined,
      knowledgePointIds: q.knowledgePoints?.map((kp) => kp.id) || [],
      type: String(q.type),
      content: q.content,
      analysis: q.analysis || "",
      difficulty: q.difficulty,
      score: q.score,
      sortOrder: q.sortOrder,
      options:
        q.options.length > 0
          ? q.options.map((o) => ({ ...o }))
          : DEFAULT_OPTIONS.map((o) => ({ ...o })),
    });
  };

  const openEdit = (q: QuestionItem) => {
    setSelectedQuestion(q);
    setEditOpen(true);
  };

  const handleUpdate = async (values: QuestionFormValues) => {
    if (!selectedQuestion) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/questions/${selectedQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload(values)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("questions.updateFailed"));
        return;
      }
      message.success(t("questions.updated"));
      setEditOpen(false);
      setSelectedQuestion(null);
      fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/questions/${selectedQuestion.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("questions.deleted"));
      setDeleteOpen(false);
      setSelectedQuestion(null);
      fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (values: { file: any }) => {
    if (!selectedCategoryId) {
      message.error(t("questions.categoryRequired"));
      return;
    }
    const fileObj: File | undefined =
      values.file?.file?.originFileObj ??
      values.file?.[0]?.originFileObj ??
      values.file?.originFileObj;
    if (!fileObj) {
      message.error(t("questions.fileRequired"));
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const fd = new FormData();
      fd.append("categoryId", String(selectedCategoryId));
      fd.append("file", fileObj);
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("questions.importFailed"));
        return;
      }
      const result = await res.json();
      if (result.errors?.length > 0) {
        message.warning(
          `${t("questions.imported")} ${result.imported}/${result.total} (${result.errors.length} errors)`
        );
        console.warn("Import errors:", result.errors);
      } else {
        message.success(`${t("questions.imported")} ${result.imported}/${result.total}`);
      }
      setImportOpen(false);
      importForm.resetFields();
      fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/questions/template", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        message.error(t("questions.downloadTemplateFailed"));
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "questions_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error(t("questions.downloadTemplateFailed"));
    }
  };

  const flattenCategories = (
    cats: CategoryOption[],
    prefix = ""
  ): { value: string; label: string }[] => {
    const result: { value: string; label: string }[] = [];
    cats.forEach((cat) => {
      result.push({ value: cat.id, label: prefix + cat.name });
      if (cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, prefix + cat.name + " / "));
      }
    });
    return result;
  };

  const categoryOptions = flattenCategories(categories);

  const columns: ColumnsType<QuestionItem> = [
    {
      title: t("questions.colId"),
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>
      ),
    },
    {
      title: t("questions.colType"),
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (type: number) => <Tag>{typeLabel(type)}</Tag>,
    },
    // 内容列不设宽度，自动占满剩余空间（其余列均显式收窄）
    {
      title: t("questions.colContent"),
      dataIndex: "content",
      key: "content",
      ellipsis: true,
    },
    {
      title: t("questions.knowledgePointsLabel"),
      key: "knowledgePoints",
      width: 120,
      render: (_, record) =>
        record.knowledgePoints?.length ? (
          <Space size={2} wrap>
            {record.knowledgePoints.map((kp) => (
              <Tag key={kp.id} color="geekblue" style={{ fontSize: 11 }}>
                {kp.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: "rgba(0,0,0,0.25)" }}>-</span>
        ),
    },
    {
      title: t("questions.subject"),
      key: "subject",
      width: 90,
      render: (_, record) =>
        record.subjectName ? (
          <span>{record.subjectName}</span>
        ) : (
          <span style={{ color: "rgba(0,0,0,0.25)" }}>-</span>
        ),
    },
    { title: t("questions.colDifficulty"), dataIndex: "difficulty", key: "difficulty", width: 70 },
    { title: t("questions.colScore"), dataIndex: "score", key: "score", width: 70 },
    {
      title: t("questions.colOptions"),
      key: "options",
      width: 100,
      // 鼠标滑过展示选项明细（含正确选项标记）
      render: (_, record) => (
        <Popover
          placement="left"
          content={
            <Space orientation="vertical" size={4} style={{ maxWidth: 360 }}>
              {record.options.map((o) => (
                <div key={o.optionKey}>
                  <Tag color={o.isCorrect ? "green" : undefined} style={{ marginRight: 6 }}>
                    {o.optionKey}
                  </Tag>
                  <span>{o.content}</span>
                </div>
              ))}
            </Space>
          }
        >
          <span style={{ cursor: "default", whiteSpace: "nowrap", color: "#1677ff" }}>
            {t("questions.opts", { n: record.options.length })}
          </span>
        </Popover>
      ),
    },
    {
      title: t("questions.colActions"),
      key: "actions",
      width: 80,
      align: "right",
      render: (_, record) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setSelectedQuestion(record);
              setDeleteOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const renderQuestionForm = (isEdit: boolean) => (
    // question-form-compact：globals.css 中把该表单内 Form.Item 底部间距收紧为 8px
    <Form
      className="question-form-compact"
      form={questionForm}
      layout="vertical"
      // 初始值放在 Form 上，避免新建/编辑两个弹窗同时挂载时对同名字段重复声明 initialValue
      initialValues={{ type: "1", difficulty: 1, score: 1, sortOrder: 0 }}
      onFinish={isEdit ? handleUpdate : handleCreate}
    >
      {/* 布局：分类|类型 / 科目|知识点 / 分值|难度 / 题目内容 / 选项 / 解析 / 排序 */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={t("questions.category")}
            name="categoryId"
            rules={[{ required: true, message: t("questions.categoryRequired") }]}
          >
            <Select
              showSearch
              options={categoryOptions}
              placeholder={t("questions.chooseCategory")}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t("questions.type")} name="type">
            <Select
              options={[
                { value: "1", label: t("questions.typeSingle") },
                { value: "2", label: t("questions.typeMultiple") },
                { value: "3", label: t("questions.typeTrueFalse") },
                { value: "4", label: t("questions.typeFillBlank") },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={t("questions.subject")}
            name="subjectId"
          >
            <Select
              showSearch
              allowClear
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t("questions.subjectPlaceholder")}
              onChange={(v) => setFormSubjectId(v)}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={t("questions.knowledgePointsLabel")}
            name="knowledgePointIds"
          >
            <TreeSelect
              treeData={kpTree.map(function convert(node: KPNode): any {
                return {
                  value: node.id,
                  title: node.name,
                  key: node.id,
                  disabled: !formSubjectId,
                  children: node.children?.map(convert) || [],
                };
              })}
              treeCheckable
              multiple
              // antd v6：搜索配置收敛到 showSearch 对象，按标题过滤
              showSearch={{ treeNodeFilterProp: "title" }}
              placeholder={
                formSubjectId
                  ? t("questions.knowledgePointsPlaceholder")
                  : t("questions.selectSubjectFirst")
              }
              disabled={!formSubjectId}
              treeDefaultExpandAll
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t("questions.score")} name="score">
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t("questions.difficultyLabel")} name="difficulty">
            <InputNumber min={1} max={5} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={t("questions.content")}
        name="content"
        rules={[{ required: true, message: t("questions.contentRequired") }]}
      >
        <Input.TextArea rows={2} maxLength={500} showCount />
      </Form.Item>

      <Form.List name="options">
        {(fields, { add, remove }) => (
          <Form.Item label={t("questions.options")}>
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ width: "100%" }}>
                  <Form.Item name={[field.name, "optionKey"]} noStyle>
                    <Input style={{ width: 56 }} maxLength={1} />
                  </Form.Item>
                  <Form.Item name={[field.name, "content"]} noStyle>
                    <Input placeholder={t("questions.optionContent")} style={{ width: 380 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "isCorrect"]} valuePropName="checked" noStyle>
                    <Checkbox>{t("questions.correct")}</Checkbox>
                  </Form.Item>
                  <Button type="text" danger size="small" onClick={() => remove(field.name)}>
                    {t("questions.remove")}
                  </Button>
                </Space>
              ))}
              <Button
                type="dashed"
                block
                onClick={() => {
                  const count = questionForm.getFieldValue("options")?.length ?? 0;
                  add({
                    optionKey: String.fromCharCode(65 + count),
                    content: "",
                    isCorrect: false,
                  });
                }}
              >
                {t("questions.addOption")}
              </Button>
            </Space>
          </Form.Item>
        )}
      </Form.List>

      <Form.Item label={t("questions.analysisOptional")} name="analysis">
        <Input.TextArea rows={2} maxLength={1000} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t("questions.sortOrder")} name="sortOrder">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const headerActions = useMemo(
    () => (
      <Space>
        <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
          {t("questions.downloadTemplate")}
        </Button>
        <Button
          icon={<UploadOutlined />}
          onClick={() => setImportOpen(true)}
        >
          {t("questions.import")}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {t("questions.addQuestion")}
        </Button>
      </Space>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 10 }} styles={{ body: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 } }}>
        <Space>
          <span>{t("questions.selectCategory")}</span>
          <Select
            showSearch
            allowClear
            style={{ width: 160 }}
            placeholder={t("questions.chooseCategory")}
            value={selectedCategoryId}
            onChange={(value) => {
              setSelectedCategoryId(value);
              setPage(1);
            }}
            options={categoryOptions}
          />
        </Space>
        <Space>
          <span>{t("questions.subject")}</span>
          <Select
            showSearch
            allowClear
            style={{ width: 160 }}
            placeholder={t("questions.subjectPlaceholder")}
            value={selectedSubjectId}
            onChange={(value) => {
              setSelectedSubjectId(value);
              setPage(1);
            }}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Space>
        <Space>
          <span>{t("questions.knowledgePointsLabel")}</span>
          <TreeSelect
            showSearch
            allowClear
            style={{ width: 200 }}
            disabled={!selectedSubjectId}
            placeholder={
              selectedSubjectId
                ? t("questions.knowledgePointsPlaceholder")
                : t("questions.selectSubjectFirst")
            }
            value={selectedKPId}
            onChange={(value) => {
              setSelectedKPId(value);
              setPage(1);
            }}
            treeData={filterKpTree.map(function convert(node: KPNode): any {
              return {
                value: node.id,
                title: node.name,
                key: node.id,
                children: node.children?.map(convert) || [],
              };
            })}
            treeDefaultExpandAll
          />
        </Space>
        <Space>
          <span>{t("questions.colContent")}</span>
          <Input
            allowClear
            style={{ width: 200 }}
            placeholder={t("questions.searchContentPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Space>
      </Card>

      <Table<QuestionItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={questions}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        locale={{
          emptyText: t("questions.emptySelected"),
        }}
      />

      {/* Create Modal */}
      {/* 不使用 forceRender：SSR 阶段预渲染弹窗 DOM 会导致 antd css-var 类名与客户端不一致，
          触发 hydration mismatch；首次打开后再填充表单，避免未挂载时调用 form 方法的告警 */}
      <Modal
        title={t("questions.createTitle")}
        open={createOpen}
        width={720}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("questions.createQuestion")}
        onOk={() => questionForm.submit()}
        destroyOnHidden={false}
        afterOpenChange={(open) => {
          if (open) resetForm();
        }}
      >
        {renderQuestionForm(false)}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={t("questions.editTitle")}
        open={editOpen}
        width={720}
        onCancel={() => {
          setEditOpen(false);
          setSelectedQuestion(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => questionForm.submit()}
        destroyOnHidden={false}
        afterOpenChange={(open) => {
          if (open && selectedQuestion) populateEditForm(selectedQuestion);
        }}
      >
        {renderQuestionForm(true)}
      </Modal>

      {/* Delete Modal */}
      <Modal
        title={t("questions.deleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedQuestion(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>{t("questions.deleteConfirm")}</p>
      </Modal>

      {/* Excel Import Modal */}
      <Modal
        title={t("questions.importTitle")}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        confirmLoading={saving}
        okText={t("questions.import")}
        onOk={() => importForm.submit()}
        destroyOnHidden={false}
        afterOpenChange={(open) => {
          if (open) importForm.resetFields();
        }}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImport}>
          <p style={{ color: "rgba(0,0,0,0.45)" }}>
            {t("questions.importFormat")}
          </p>
          <Form.Item
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: t("questions.fileRequired") }]}
          >
            <Upload.Dragger
              name="file"
              accept=".xlsx,.xls"
              maxCount={1}
              beforeUpload={() => false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">{t("questions.uploadHint")}</p>
              <p className="ant-upload-hint">{t("questions.uploadHintTypes")}</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
