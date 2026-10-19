"use client";

import { usePageSize } from "@/components/antd-providers";
import { useLocale } from "@/lib/i18n";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface QuestionOption {
  optionKey: string;
  content: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  categoryId: string;
  type: number;
  content: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  createdAt: string;
  options: QuestionOption[];
}

interface CategoryOption {
  id: string;
  name: string;
  children: CategoryOption[];
}

interface QuestionFormValues {
  categoryId?: string;
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
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
  const [importForm] = Form.useForm<{ csv: string }>();

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

  const fetchQuestions = async () => {
    if (!selectedCategoryId) {
      setQuestions([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(
        `/api/admin/questions?categoryId=${selectedCategoryId}&page=${page}&pageSize=${pageSize}`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, page, pageSize]);

  const resetForm = () => {
    questionForm.setFieldsValue({
      categoryId: selectedCategoryId,
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

  const openEdit = (q: QuestionItem) => {
    setSelectedQuestion(q);
    questionForm.setFieldsValue({
      categoryId: q.categoryId,
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

  const handleImport = async (values: { csv: string }) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: Number(selectedCategoryId),
          csv: values.csv,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("questions.importFailed"));
        return;
      }
      const result = await res.json();
      if (result.errors?.length > 0) {
        message.warning(`${t("questions.imported")} (${result.errors.length} errors)`);
      } else {
        message.success(t("questions.imported"));
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
      a.download = "questions_template.csv";
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
      width: 90,
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>
      ),
    },
    {
      title: t("questions.colType"),
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (type: number) => <Tag>{typeLabel(type)}</Tag>,
    },
    {
      title: t("questions.colContent"),
      dataIndex: "content",
      key: "content",
      ellipsis: true,
    },
    { title: t("questions.colDifficulty"), dataIndex: "difficulty", key: "difficulty", width: 100 },
    { title: t("questions.colScore"), dataIndex: "score", key: "score", width: 80 },
    {
      title: t("questions.colOptions"),
      key: "options",
      width: 90,
      render: (_, record) => t("questions.opts", { n: record.options.length }),
    },
    {
      title: t("questions.colActions"),
      key: "actions",
      width: 100,
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
    <Form
      form={questionForm}
      layout="vertical"
      onFinish={isEdit ? handleUpdate : handleCreate}
    >
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

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t("questions.type")} name="type" initialValue="1">
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
        <Col span={12}>
          <Form.Item label={t("questions.difficultyLabel")} name="difficulty" initialValue={1}>
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

      <Form.Item label={t("questions.analysisOptional")} name="analysis">
        <Input.TextArea rows={2} maxLength={1000} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t("questions.score")} name="score" initialValue={1}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t("questions.sortOrder")} name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

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
    </Form>
  );

  return (
    <div style={{ marginTop: -8 }}>
      <Card size="small" style={{ marginBottom: 10 }} styles={{ body: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 } }}>
        <Space>
          <span>{t("questions.selectCategory")}</span>
          <Select
            showSearch
            allowClear
            style={{ width: 360 }}
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
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            {t("questions.downloadTemplate")}
          </Button>
          <Button
            icon={<UploadOutlined />}
            disabled={!selectedCategoryId}
            onClick={() => {
              importForm.resetFields();
              setImportOpen(true);
            }}
          >
            {t("questions.csvImport")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            {t("questions.addQuestion")}
          </Button>
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
          emptyText: selectedCategoryId
            ? t("questions.emptySelected")
            : t("questions.emptyUnselected"),
        }}
      />

      {/* Create Modal */}
      <Modal
        title={t("questions.createTitle")}
        open={createOpen}
        width={720}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("questions.createQuestion")}
        onOk={() => questionForm.submit()}
        destroyOnHidden
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
        destroyOnHidden
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

      {/* CSV Import Modal */}
      <Modal
        title={t("questions.importTitle")}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        confirmLoading={saving}
        okText={t("questions.import")}
        onOk={() => importForm.submit()}
        destroyOnHidden
      >
        <Form form={importForm} layout="vertical" onFinish={handleImport}>
          <p style={{ color: "rgba(0,0,0,0.45)" }}>
            {t("questions.importFormat")}
          </p>
          <Form.Item
            name="csv"
            rules={[{ required: true, message: t("questions.csvRequired") }]}
          >
            <Input.TextArea
              rows={10}
              style={{ fontFamily: "monospace" }}
              placeholder={"1,1,What is the capital of France?,Paris,London,Berlin,Madrid,A,Paris is the capital of France.,1,1,0"}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
