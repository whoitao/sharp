"use client";

import { usePageSize } from "@/components/antd-providers";
import { useLocale } from "@/lib/i18n";
import { Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

interface FeedItem {
  id: string;
  username: string;
  userNickname: string | null;
  petNickname: string;
  speciesName: string;
  foodType: string;
  quantity: number;
  satietyGain: number;
  expGain: number;
  levelBefore: number;
  levelAfter: number;
  stageBefore: string;
  stageAfter: string;
  createdAt: string;
}

interface FoodOption {
  foodType: string;
  name: string;
}

export default function PetFeedsPanel() {
  const { t } = useLocale();
  const { pageSize } = usePageSize();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [foodType, setFoodType] = useState<string | undefined>();

  const token = () => localStorage.getItem("admin_token");

  const fetchFoods = async () => {
    try {
      const res = await fetch("/api/admin/pet-foods", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setFoods(
        Array.isArray(data)
          ? data.map((f: { foodType: string; name: string }) => ({
              foodType: f.foodType,
              name: f.name,
            }))
          : [],
      );
    } catch {
      setFoods([]);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (keyword) query.set("keyword", keyword);
      if (foodType) query.set("foodType", foodType);
      const res = await fetch(`/api/admin/pet-feeds?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
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
    fetchFoods();
  }, []);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, foodType]);

  const foodLabel = useMemo(() => {
    const map = new Map(foods.map((f) => [f.foodType, f.name]));
    return (value: string) => map.get(value) ?? value;
  }, [foods]);

  const columns: ColumnsType<FeedItem> = [
    {
      title: t("pets.colFeedTime"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t("pets.colFeedUser"),
      key: "user",
      width: 170,
      render: (_, record) =>
        record.userNickname
          ? `${record.userNickname} (${record.username})`
          : record.username,
    },
    {
      title: t("pets.colFeedPet"),
      key: "pet",
      width: 160,
      render: (_, record) => `${record.petNickname} · ${record.speciesName}`,
    },
    {
      title: t("pets.colFoodType"),
      dataIndex: "foodType",
      key: "foodType",
      width: 130,
      render: (value: string) => <Tag>{foodLabel(value)}</Tag>,
    },
    {
      title: t("pets.colQuantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
    },
    {
      title: t("pets.colSatietyGain"),
      dataIndex: "satietyGain",
      key: "satietyGain",
      width: 100,
      render: (value: number) => `+${value}`,
    },
    {
      title: t("pets.colExpGain"),
      dataIndex: "expGain",
      key: "expGain",
      width: 90,
      render: (value: number) => `+${value}`,
    },
    {
      title: t("pets.colLevelChange"),
      key: "levelChange",
      width: 110,
      render: (_, record) =>
        record.levelBefore === record.levelAfter
          ? `Lv.${record.levelAfter}`
          : `Lv.${record.levelBefore} → Lv.${record.levelAfter}`,
    },
    {
      title: t("pets.colStageChange"),
      key: "stageChange",
      width: 150,
      render: (_, record) =>
        record.stageBefore === record.stageAfter
          ? record.stageAfter
          : `${record.stageBefore} → ${record.stageAfter}`,
    },
  ];

  const foodOptions = foods.map((f) => ({ value: f.foodType, label: f.name }));

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          style={{ width: 240 }}
          placeholder={t("pets.feedSearchPlaceholder")}
          onSearch={(value) => {
            setKeyword(value.trim());
            setPage(1);
          }}
        />
        <Select
          allowClear
          style={{ width: 200 }}
          placeholder={t("pets.allFoodTypes")}
          value={foodType}
          onChange={(value) => {
            setFoodType(value);
            setPage(1);
          }}
          options={foodOptions}
        />
      </Space>

      <Table<FeedItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("pets.totalFeeds", { n }),
          onChange: setPage,
        }}
        locale={{ emptyText: t("pets.feedEmpty") }}
      />
    </div>
  );
}
