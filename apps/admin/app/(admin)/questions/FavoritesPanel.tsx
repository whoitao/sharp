"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import GroupedGradeSelect, {
  type GradeOption,
} from "@/components/GroupedGradeSelect";
import SubjectSelect from "@/components/SubjectSelect";
import { usePageSize } from "@/components/antd-providers";
import { useLocale } from "@/lib/i18n";
import { DeleteOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  DatePicker,
  Input,
  Space,
  Table,
  theme,
  type TableProps,
} from "antd";
import { useEffect, useState } from "react";

interface FavoriteItem {
  userId: string;
  username: string;
  nickname: string | null;
  questionId: string;
  contentPreview: string;
  gradeName: string | null;
  subjectName: string | null;
  textbookName: string | null;
  chapterName: string | null;
  note: string | null;
  createdAt: string;
}

const FILTER_WIDTH = 180;
const DATE_RANGE_WIDTH = 260;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}` };
}

export default function FavoritesPanel() {
  const { t, locale } = useLocale();
  const { pageSize } = usePageSize();
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();

  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [grades, setGrades] = useState<GradeOption[]>([]);

  const [userInput, setUserInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [gradeId, setGradeId] = useState<string>();
  const [subjectId, setSubjectId] = useState<string>();
  // RangePicker 的值是 dayjs 对象，这里不直接依赖 dayjs 类型
  const [dateRange, setDateRange] = useState<any>(null);

  const fetchGrades = async () => {
    try {
      const res = await fetch("/api/admin/grades", { headers: authHeaders() });
      const data = await res.json();
      setGrades(Array.isArray(data) ? data : []);
    } catch {
      setGrades([]);
    }
  };

  const fetchFavorites = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (userSearch) params.set("userSearch", userSearch);
    if (questionSearch) params.set("questionSearch", questionSearch);
    if (gradeId) params.set("gradeId", gradeId);
    if (subjectId) params.set("subjectId", subjectId);
    if (dateRange?.[0] && dateRange?.[1]) {
      params.set("startDate", dateRange[0].startOf("day").toISOString());
      params.set("endDate", dateRange[1].endOf("day").toISOString());
    }
    try {
      const res = await fetch(`/api/admin/favorites?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setItems([]);
      setTotal(0);
      message.error(t("favorites.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, userSearch, questionSearch, gradeId, subjectId, dateRange]);

  const handleUnfavorite = (record: FavoriteItem) => {
    const displayName = record.nickname || record.username;
    modal.confirm({
      title: t("favorites.unfavoriteTitle"),
      content: t("favorites.unfavoriteConfirm", {
        user: displayName,
        id: record.questionId,
      }),
      okText: t("favorites.unfavorite"),
      cancelText: t("common.cancel"),
      okButtonProps: { danger: true },
      onOk: async () => {
        const params = new URLSearchParams({
          userId: record.userId,
          questionId: record.questionId,
        });
        const res = await fetch(`/api/admin/favorites?${params.toString()}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) {
          message.error(t("favorites.unfavoriteFailed"));
          return;
        }
        message.success(t("favorites.unfavorited"));
        // 当前页最后一条被删除时回退一页，避免停留在空页
        if (items.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchFavorites();
        }
      },
    });
  };

  const emptyText = <span style={{ color: token.colorTextTertiary }}>-</span>;

  const columns: TableProps<FavoriteItem>["columns"] = [
    {
      title: t("favorites.colUser"),
      key: "user",
      width: 160,
      render: (_, record) => (
        <div>
          <div>{record.nickname || record.username}</div>
          {record.nickname && (
            <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>
              @{record.username}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("favorites.colQuestion"),
      key: "question",
      width: 340,
      render: (_, record) => (
        <div>
          <div style={{ color: token.colorTextTertiary, fontSize: 12, fontFamily: "monospace" }}>
            #{record.questionId}
          </div>
          <div
            title={record.contentPreview}
            style={{
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {record.contentPreview || emptyText}
          </div>
        </div>
      ),
    },
    {
      title: t("favorites.colGrade"),
      key: "grade",
      width: 90,
      render: (_, record) => record.gradeName ?? emptyText,
    },
    {
      title: t("favorites.colSubject"),
      key: "subject",
      width: 90,
      render: (_, record) => record.subjectName ?? emptyText,
    },
    {
      title: t("favorites.colTextbook"),
      key: "textbook",
      width: 220,
      render: (_, record) => {
        if (!record.textbookName && !record.chapterName) return emptyText;
        return (
          <div>
            {record.textbookName && <div>{record.textbookName}</div>}
            {record.chapterName && (
              <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                {record.chapterName}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t("favorites.colCreatedAt"),
      key: "createdAt",
      width: 170,
      render: (_, record) =>
        new Date(record.createdAt).toLocaleString(
          locale === "zh" ? "zh-CN" : "en-US",
          { hour12: false },
        ),
    },
    {
      title: t("favorites.colActions"),
      key: "actions",
      width: 90,
      align: "right",
      ...FIXED_ACTIONS_COLUMN,
      render: (_, record) => (
        <Space size={4}>
          <Button
            variant="text"
            color="danger"
            size="small"
            icon={<DeleteOutlined />}
            title={t("favorites.unfavorite")}
            aria-label={t("favorites.unfavorite")}
            onClick={() => handleUnfavorite(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        styles={{
          body: {
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          },
        }}
      >
        <Input.Search
          allowClear
          style={{ width: FILTER_WIDTH }}
          placeholder={t("favorites.userSearchPlaceholder")}
          value={userInput}
          onChange={(e) => {
            const value = e.target.value;
            setUserInput(value);
            if (!value.trim() && userSearch) {
              setUserSearch("");
              setPage(1);
            }
          }}
          onSearch={(value) => {
            setUserSearch(value.trim());
            setPage(1);
          }}
        />
        <Input.Search
          allowClear
          style={{ width: FILTER_WIDTH }}
          placeholder={t("favorites.questionSearchPlaceholder")}
          value={questionInput}
          onChange={(e) => {
            const value = e.target.value;
            setQuestionInput(value);
            if (!value.trim() && questionSearch) {
              setQuestionSearch("");
              setPage(1);
            }
          }}
          onSearch={(value) => {
            setQuestionSearch(value.trim());
            setPage(1);
          }}
        />
        <GroupedGradeSelect
          showSearch
          allowClear
          style={{ width: FILTER_WIDTH }}
          iconColor={token.colorTextTertiary}
          placeholder={t("favorites.colGrade")}
          value={gradeId}
          onChange={(value) => {
            setGradeId(value as string | undefined);
            setPage(1);
          }}
          grades={grades}
        />
        <SubjectSelect
          allowClear
          style={{ width: FILTER_WIDTH }}
          placeholder={t("favorites.colSubject")}
          value={subjectId}
          onChange={(value) => {
            setSubjectId(value ?? undefined);
            setPage(1);
          }}
        />
        <DatePicker.RangePicker
          allowClear
          style={{ width: DATE_RANGE_WIDTH }}
          placeholder={[
            t("favorites.dateStartPlaceholder"),
            t("favorites.dateEndPlaceholder"),
          ]}
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates);
            setPage(1);
          }}
        />
      </Card>

      <Table<FavoriteItem>
        rowKey={(record) => `${record.userId}-${record.questionId}`}
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: TABLE_SCROLL_X }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
          onChange: (p) => setPage(p),
        }}
        locale={{ emptyText: t("favorites.empty") }}
      />
    </div>
  );
}
