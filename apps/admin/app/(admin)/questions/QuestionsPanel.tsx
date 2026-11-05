"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import SubjectSelect from "@/components/SubjectSelect";
import { usePageSize } from "@/components/antd-providers";
import IonIcon from "@/components/IonIcon";
import { usePageActions } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import GroupedGradeSelect, {
  groupGradesByStage,
} from "@/components/GroupedGradeSelect";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined
} from "@ant-design/icons";
import {
  theme as antdTheme,
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
import MathText from "../../../components/MathText";
import RichTextEditor from "../../../components/RichTextEditor";

interface QuestionOption {
  optionKey: string;
  content: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  gradeId: string | null;
  gradeName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  chapterId: string | null;
  chapterName: string | null;
  type: number;
  content: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  createdAt: string;
  options: QuestionOption[];
  knowledgePoints: { id: string; name: string; parentId: string | null }[];
  tags: { id: string; name: string; type: string }[];
}

interface SubjectOption {
  id: string;
  name: string;
  icon?: string | null;
}

interface KPNode {
  id: string;
  name: string;
  parentId: string | null;
  children: KPNode[];
}

interface GradeOption {
  id: string;
  name: string;
  stage: string;
}

interface TagOption {
  id: string;
  name: string;
  type: string;
}

interface ChapterNode {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  children?: ChapterNode[];
}

interface QuestionFormValues {
  gradeId?: string;
  subjectId?: string;
  chapterId?: string;
  tagIds?: string[];
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

// 筛选区统一宽度：宽屏单行排列，窄屏自动换行
const FILTER_WIDTH = 180;

export default function QuestionsPanel() {
  const { can } = usePermissions();
  const { message } = App.useApp();
  const { token } = antdTheme.useToken();
  const { t } = useLocale();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [chapterTree, setChapterTree] = useState<ChapterNode[]>([]);
  const [kpTree, setKpTree] = useState<KPNode[]>([]);
  const [filterKpTree, setFilterKpTree] = useState<KPNode[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>();
  const [selectedGradeId, setSelectedGradeId] = useState<string>();
  const [selectedTagId, setSelectedTagId] = useState<string>();
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
  const [formGradeId, setFormGradeId] = useState<string>();
  const [importGradeId, setImportGradeId] = useState<string>();

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

  const fetchGrades = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/grades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGrades(Array.isArray(data) ? data : []);
    } catch {
      setGrades([]);
    }
  };

  const fetchTags = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/tags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTags(Array.isArray(data) ? data : []);
    } catch {
      setTags([]);
    }
  };

  // 判断章节是否存在于当前树中（用于检测跨年级/跨版本的历史数据）
  const containsChapter = (nodes: ChapterNode[], id?: string): boolean => {
    if (!id) return true;
    return nodes.some(
      (n) => n.id === id || containsChapter(n.children || [], id),
    );
  };

  // 题目表单的章节树：需要科目，年级用于收窄范围（树里会带出不同版本）
  // 编辑时若题目章节不在当前年级的树里（跨国版本/考题挂低年级章节），回退到该科目全量章节，避免下拉框显示原始 ID
  const fetchFormChapters = async (gradeId?: string, subjectId?: string, ensureChapterId?: string) => {
    if (!subjectId) {
      setChapterTree([]);
      return;
    }
    const token = localStorage.getItem("admin_token");
    const loadTree = async (url: string): Promise<ChapterNode[]> => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    let tree = await loadTree(
      gradeId
        ? `/api/admin/chapters?gradeId=${gradeId}&subjectId=${subjectId}`
        : `/api/admin/chapters?subjectId=${subjectId}`,
    );
    if (gradeId && !containsChapter(tree, ensureChapterId)) {
      tree = await loadTree(`/api/admin/chapters?subjectId=${subjectId}`);
    }
    setChapterTree(tree);
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
    if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
    if (selectedGradeId) params.append("gradeId", selectedGradeId);
    if (selectedTagId) params.append("tagId", selectedTagId);
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
    fetchSubjects();
    fetchGrades();
    fetchTags();
    fetchKnowledgePoints();
    fetchFilterKnowledgePoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 知识点按选中的科目联动过滤，切换科目时清空已选知识点。
  // 用「科目值是否真的变化」判断，而不是「是否首次执行」：StrictMode 下 effect 会连续跑两次，
  // 首次标记会被第一次吃掉，第二次就会在弹窗里的 Form 尚未挂载时调用 setFieldsValue 触发 useForm 告警。
  const lastFormSubjectRef = useRef<string | undefined>(undefined);
  // 编辑弹窗填充数据时会程序性设置科目，此时不应清空随后写入的知识点
  const skipSubjectClearRef = useRef(false);
  useEffect(() => {
    fetchKnowledgePoints(formSubjectId);
    if (lastFormSubjectRef.current === formSubjectId) return;
    lastFormSubjectRef.current = formSubjectId;
    if (skipSubjectClearRef.current) {
      skipSubjectClearRef.current = false;
      return;
    }
    questionForm.setFieldsValue({ knowledgePointIds: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSubjectId]);

  // 表单里的教材章节树随「年级 + 科目」联动；切换时清空已选章节，避免跨版本错挂
  const lastFormChapterKeyRef = useRef<string>("");
  // 编辑时需保证章节能在下拉中解析出名称（含跨年级挂载的考试题）
  const editChapterIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    fetchFormChapters(formGradeId, formSubjectId, editChapterIdRef.current);
    const key = `${formGradeId ?? ""}|${formSubjectId ?? ""}`;
    if (lastFormChapterKeyRef.current === key) return;
    lastFormChapterKeyRef.current = key;
    // 首次挂载 / 程序性填充时不清空，避免把编辑数据里的章节冲掉
    if (key === "|") return;
    questionForm.setFieldsValue({ chapterId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formGradeId, formSubjectId]);

  // 顶部筛选：科目切换时联动知识点下拉，并清空已选知识点
  useEffect(() => {
    fetchFilterKnowledgePoints(selectedSubjectId);
    setSelectedKPId(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  // 内容模糊搜索改为按钮 / 回车触发；输入清空后恢复全量列表
  const applyContentSearch = () => {
    const value = searchInput.trim();
    if (!value) return;
    if (value === searchText) {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchQuestions();
      }
      return;
    }
    setSearchText(value);
    setPage(1);
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, selectedGradeId, selectedTagId, selectedKPId, searchText, page, pageSize]);

  const resetForm = () => {
    setFormSubjectId(undefined);
    setFormGradeId(undefined);
    lastFormChapterKeyRef.current = "|";
    editChapterIdRef.current = undefined;
    questionForm.setFieldsValue({
      gradeId: selectedGradeId,
      subjectId: undefined,
      chapterId: undefined,
      tagIds: [],
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
    gradeId: values.gradeId || undefined,
    subjectId: values.subjectId || undefined,
    chapterId: values.chapterId || undefined,
    tagIds: values.tagIds || [],
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
    if (!values.gradeId && !values.chapterId) {
      message.warning(t("questions.gradeRequired"));
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
    // 程序性设置科目/年级：同步章节联动的 key，避免 effect 把刚填充的章节清空
    const nextSubjectId = q.subjectId || undefined;
    const nextGradeId = q.gradeId || undefined;
    lastFormChapterKeyRef.current = `${nextGradeId ?? ""}|${nextSubjectId ?? ""}`;
    editChapterIdRef.current = q.chapterId || undefined;
    if (nextSubjectId !== formSubjectId) {
      skipSubjectClearRef.current = true;
      setFormSubjectId(nextSubjectId);
    }
    if (nextGradeId !== formGradeId) setFormGradeId(nextGradeId);
    questionForm.setFieldsValue({
      gradeId: nextGradeId,
      subjectId: q.subjectId || undefined,
      chapterId: q.chapterId || undefined,
      tagIds: q.tags?.map((tag) => tag.id) || [],
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
    // 年级/科目未变化时上面的 effect 不会重跑，这里显式保证当前章节能解析出名称
    void fetchFormChapters(nextGradeId, nextSubjectId, q.chapterId || undefined);
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
    if (!importGradeId) {
      message.error(t("questions.gradeRequired"));
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
      fd.append("gradeId", String(importGradeId));
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

  const kpNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: KPNode[]) => {
      for (const n of nodes) {
        map.set(n.id, n.name);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(kpTree);
    return map;
  }, [kpTree]);

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
      title: t("questions.subject"),
      key: "subject",
      width: 90,
      render: (_, record) =>
        record.subjectName ? (
          <span>{record.subjectName}</span>
        ) : (
          <span style={{ color: token.colorTextTertiary }}>-</span>
        ),
    },
    {
      title: t("questions.colGrade"),
      key: "grade",
      width: 80,
      render: (_, record) =>
        record.gradeName ? (
          <span>{record.gradeName}</span>
        ) : (
          <span style={{ color: token.colorTextTertiary }}>-</span>
        ),
    },
    {
      title: t("questions.colTags"),
      key: "tags",
      width: 140,
      render: (_, record) =>
        record.tags?.length ? (
          <Space size={2} wrap>
            {record.tags.map((tag) => (
              <Tag
                key={tag.id}
                color={tag.type === "exam" ? "red" : tag.type === "difficulty" ? "orange" : "blue"}
                style={{ fontSize: 11 }}
              >
                {tag.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: token.colorTextTertiary }}>-</span>
        ),
    },
    {
      title: t("questions.knowledgePointsLabel"),
      key: "knowledgePoints",
      width: 120,
      render: (_, record) =>
        record.knowledgePoints?.length ? (
          <Space size={2} wrap>
            {record.knowledgePoints.map((kp) => (
              <Tag key={kp.id} color="green" style={{ fontSize: 11 }}>
                {kp.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: token.colorTextTertiary }}>-</span>
        ),
    },
    {
      title: t("questions.colType"),
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (type: number) => <Tag>{typeLabel(type)}</Tag>,
    },
    // 内容列限制 300px，超出部分省略号截断
    {
      title: t("questions.colContent"),
      dataIndex: "content",
      key: "content",
      width: 300,
      render: (value: string) => (
        <div
          style={{
            maxWidth: 300,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <MathText html={value} />
        </div>
      ),
    },
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
                  <span>
                    <MathText html={o.content} />
                  </span>
                </div>
              ))}
            </Space>
          }
        >
          <span style={{ cursor: "default", whiteSpace: "nowrap", color: token.colorLink }}>
            {t("questions.opts", { n: record.options.length })}
          </span>
        </Popover>
      ),
    },
    { title: t("questions.colDifficulty"), dataIndex: "difficulty", key: "difficulty", width: 92 },
    { title: t("questions.colScore"), dataIndex: "score", key: "score", width: 70 },
    {
      title: t("questions.colActions"),
      key: "actions",
      width: 80,
      align: "right",
      ...FIXED_ACTIONS_COLUMN,
      render: (_, record) => (
        <Space size={4}>
          <Button
            variant="text"
            color="primary"
            size="small"
            icon={<EditOutlined />}
            title={t("common.edit")}
            aria-label={t("common.edit")}
            onClick={() => openEdit(record)}
          />
          <Button
            variant="text"
            color="danger"
            size="small"
            icon={<DeleteOutlined />}
            title={t("common.delete")}
            aria-label={t("common.delete")}
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
      {/* 左右布局各占 50%：左侧基础属性 / 右侧题目内容、选项、解析 */}
      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          {/* 第一行：科目 + 类型 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t("questions.subject")} name="subjectId">
                <SubjectSelect
                  subjects={subjects}
                  placeholder={t("questions.subjectPlaceholder")}
                  onChange={(v) => setFormSubjectId(v)}
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

          {/* 第二行：年级 + 教材章节 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t("questions.grade")}
                name="gradeId"
                rules={[{ required: true, message: t("questions.gradeRequired") }]}
              >
                {/* 年级按学段分组，选一次即可：分类由年级推导，不再单独选择 */}
                <Select
                  showSearch={{ optionFilterProp: "label" }}
                  placeholder={t("questions.gradePlaceholder")}
                  options={groupGradesByStage(grades)}
                  onChange={(v) => setFormGradeId(v)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t("questions.chapter")} name="chapterId">
                <TreeSelect
                  allowClear
                  treeData={chapterTree.map(function convert(node: ChapterNode): any {
                    return {
                      value: node.id,
                      title: `${node.name}${node.level === 1 ? t("questions.chapterSuffix") : ""}`,
                      key: node.id,
                      children: node.children?.map(convert) || [],
                    };
                  })}
                  showSearch={{ treeNodeFilterProp: "title" }}
                  placeholder={
                    formGradeId && formSubjectId
                      ? t("questions.chapterPlaceholder")
                      : t("questions.selectGradeFirst")
                  }
                  disabled={!formGradeId || !formSubjectId}
                  treeDefaultExpandAll
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t("questions.tags")} name="tagIds">
            <Select
              mode="multiple"
              allowClear
              placeholder={t("questions.tagsPlaceholder")}
              options={["exam", "source", "difficulty"].map((type) => ({
                label:
                  type === "exam"
                    ? t("tags.typeExam")
                    : type === "source"
                      ? t("tags.typeSource")
                      : t("tags.typeDifficulty"),
                options: tags
                  .filter((tag) => tag.type === type)
                  .map((tag) => ({ value: tag.id, label: tag.name })),
              }))}
            />
          </Form.Item>

          <Form.Item
            label={t("questions.knowledgePointsLabel")}
            name="knowledgePointIds"
            getValueFromEvent={(value: any) =>
              Array.isArray(value) ? value.map((v) => (typeof v === "object" ? v.value : v)) : []
            }
            getValueProps={(value: string[] | undefined) => ({
              value: Array.isArray(value)
                ? value.map((id) => ({ value: id, label: kpNameMap.get(id) ?? id }))
                : [],
            })}
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
              treeCheckStrictly
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

          <Form.Item label={t("questions.sortOrder")} name="sortOrder">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label={t("questions.content")}
            name="content"
            rules={[{ required: true, message: t("questions.contentRequired") }]}
          >
            <RichTextEditor minHeight={72} maxHeight={300} />
          </Form.Item>

          <Form.List name="options">
            {(fields, { add, remove }) => (
              <Form.Item label={t("questions.options")}>
                <Space orientation="vertical" style={{ width: "100%" }} size={8}>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}
                    >
                      <Form.Item name={[field.name, "optionKey"]} noStyle>
                        <Input style={{ width: 48, flexShrink: 0 }} maxLength={1} />
                      </Form.Item>
                      <Form.Item name={[field.name, "content"]} noStyle>
                        {/* 宽度自适应：随左右 50% 布局收缩，不再固定 380px 造成溢出 */}
                        <RichTextEditor compact minHeight={28} style={{ flex: 1, minWidth: 0 }} />
                      </Form.Item>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                          paddingTop: 6,
                        }}
                      >
                        <Form.Item name={[field.name, "isCorrect"]} valuePropName="checked" noStyle>
                          <Checkbox>{t("questions.correct")}</Checkbox>
                        </Form.Item>
                        <Button type="text" danger size="small" onClick={() => remove(field.name)}>
                          {t("questions.remove")}
                        </Button>
                      </div>
                    </div>
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
            <RichTextEditor minHeight={56} />
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
        {can("questions:write") && (
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportOpen(true)}
          >
            {t("questions.import")}
          </Button>
        )}
        {can("questions:write") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            {t("questions.addQuestion")}
          </Button>
        )}
      </Space>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, can]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 } }}>
        <GroupedGradeSelect
          showSearch
          allowClear
          style={{ width: FILTER_WIDTH }}
          iconColor={token.colorTextTertiary}
          placeholder={t("stats.allGrades")}
          value={selectedGradeId}
          onChange={(value) => {
            setSelectedGradeId(value as string | undefined);
            setPage(1);
          }}
          grades={grades}
        />
        <SubjectSelect
          allowClear
          style={{ width: FILTER_WIDTH }}
          placeholder={t("questions.subjectPlaceholder")}
          value={selectedSubjectId}
          subjects={subjects}
          onChange={(value) => {
            setSelectedSubjectId(value ?? undefined);
            setPage(1);
          }}
        />
        <TreeSelect
          showSearch
          allowClear
          style={{ width: FILTER_WIDTH }}
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
        <Select
          allowClear
          style={{ width: FILTER_WIDTH }}
          placeholder={t("questions.colTags")}
          value={selectedTagId}
          onChange={(value) => {
            setSelectedTagId(value);
            setPage(1);
          }}
          options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
        />
        <Input
          allowClear
          style={{ width: FILTER_WIDTH }}
          placeholder={t("questions.searchContentPlaceholder")}
          value={searchInput}
          onChange={(e) => {
            const value = e.target.value;
            setSearchInput(value);
            // 清空输入时同步清掉已生效的搜索条件，避免无法退出搜索态
            if (!value.trim() && searchText) {
              setSearchText("");
              setPage(1);
            }
          }}
          onPressEnter={applyContentSearch}
          suffix={
            <Button
              type="text"
              size="small"
              icon={<SearchOutlined />}
              title={t("common.search")}
              aria-label={t("common.search")}
              disabled={!searchInput.trim()}
              onClick={applyContentSearch}
              style={{ marginRight: -6 }}
            />
          }
        />
      </Card>

      <Table<QuestionItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={questions}
        scroll={{ x: TABLE_SCROLL_X }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
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
        width={1080}
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
        width={1080}
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
          if (open) {
            importForm.resetFields();
            // 默认使用当前筛选的年级，导入时整批题的年级归属
            setImportGradeId(selectedGradeId);
          }
        }}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImport}>
          <Form.Item label={t("questions.grade")} required>
            <Select
              showSearch={{ optionFilterProp: "label" }}
              placeholder={t("questions.gradePlaceholder")}
              value={importGradeId}
              onChange={(v) => setImportGradeId(v)}
              options={groupGradesByStage(grades)}
            />
          </Form.Item>
          <p style={{ color: token.colorTextTertiary }}>
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
