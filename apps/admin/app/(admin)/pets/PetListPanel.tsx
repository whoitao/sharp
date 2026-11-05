"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import { usePageSize } from "@/components/antd-providers";
import { useLocale } from "@/lib/i18n";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface PetItem {
  id: string;
  nickname: string;
  speciesId: string;
  speciesName: string;
  schoolStageName: string | null;
  level: number;
  experience: number;
  satiety: number;
  satietyMax: number;
  adoptedAt: string;
  lastFedAt: string | null;
  ownerUsername: string | null;
  ownerNickname: string | null;
}

interface SpeciesOption {
  id: string;
  name: string;
}

interface PetFormValues {
  nickname: string;
  level: number;
  experience: number;
  satiety: number;
  schoolStageName?: string;
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

export default function PetListPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { pageSize } = usePageSize();

  const [items, setItems] = useState<PetItem[]>([]);
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<PetItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm<PetFormValues>();

  const token = () => localStorage.getItem("admin_token");

  const fetchSpecies = async () => {
    try {
      const res = await fetch("/api/admin/pet-species", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setSpecies(Array.isArray(data) ? data.map((s: SpeciesOption) => ({ id: s.id, name: s.name })) : []);
    } catch {
      setSpecies([]);
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
      if (speciesFilter) query.set("speciesId", speciesFilter);
      const res = await fetch(`/api/admin/pets?${query.toString()}`, {
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
    fetchSpecies();
  }, []);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, speciesFilter]);

  const handleUpdate = async (values: PetFormValues) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pets/${selected.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.petUpdateFailed"));
        return;
      }
      message.success(t("pets.petUpdated"));
      setEditOpen(false);
      setSelected(null);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pets/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.petDeleteFailed"));
        return;
      }
      message.success(t("pets.petDeleted"));
      setDeleteOpen(false);
      setSelected(null);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<PetItem> = [
    {
      title: t("pets.petNickname"),
      dataIndex: "nickname",
      key: "nickname",
      width: 140,
    },
    {
      title: t("pets.species"),
      dataIndex: "speciesName",
      key: "speciesName",
      width: 110,
    },
    {
      title: t("pets.colOwner"),
      key: "owner",
      width: 180,
      render: (_, record) =>
        record.ownerUsername
          ? `${record.ownerNickname || record.ownerUsername} (${record.ownerUsername})`
          : "-",
    },
    {
      title: t("pets.colLevel"),
      dataIndex: "level",
      key: "level",
      width: 80,
    },
    {
      title: t("pets.colExperience"),
      dataIndex: "experience",
      key: "experience",
      width: 100,
    },
    {
      title: t("pets.colSatiety"),
      dataIndex: "satiety",
      key: "satiety",
      width: 140,
      render: (value: number, record: PetItem) => (
        <Progress percent={Math.min(100, Math.round((value / record.satietyMax) * 100))} size="small" />
      ),
    },
    {
      title: t("pets.colAdoptedAt"),
      dataIndex: "adoptedAt",
      key: "adoptedAt",
      width: 170,
      render: formatDate,
    },
    {
      title: t("pets.colLastFedAt"),
      dataIndex: "lastFedAt",
      key: "lastFedAt",
      width: 170,
      render: formatDate,
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 90,
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
            onClick={() => {
              setSelected(record);
              setEditOpen(true);
            }}
          />
          <Button
            variant="text"
            color="danger"
            size="small"
            icon={<DeleteOutlined />}
            title={t("common.delete")}
            aria-label={t("common.delete")}
            onClick={() => {
              setSelected(record);
              setDeleteOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const speciesOptions = species.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          style={{ width: 240 }}
          placeholder={t("pets.petSearchPlaceholder")}
          onSearch={(value) => {
            setKeyword(value.trim());
            setPage(1);
          }}
        />
        <Select
          allowClear
          style={{ width: 200 }}
          placeholder={t("pets.allSpecies")}
          value={speciesFilter}
          onChange={(value) => {
            setSpeciesFilter(value);
            setPage(1);
          }}
          options={speciesOptions}
        />
      </Space>

      <Table<PetItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        scroll={{ x: TABLE_SCROLL_X }}
        dataSource={items}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("pets.totalPets", { n }),
          onChange: setPage,
        }}
        locale={{ emptyText: t("pets.empty") }}
      />

      <Modal
        title={t("pets.petEditTitle")}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => editForm.submit()}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open && selected) {
            editForm.setFieldsValue({
              nickname: selected.nickname,
              level: selected.level,
              experience: selected.experience,
              satiety: selected.satiety,
              schoolStageName: selected.schoolStageName ?? undefined,
            });
          }
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} preserve={false}>
          <Form.Item
            label={t("pets.petNickname")}
            name="nickname"
            rules={[{ required: true, message: t("pets.petNicknameRequired") }]}
          >
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item label={t("pets.petLevel")} name="level">
            <InputNumber min={1} max={99} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("pets.petExperience")} name="experience">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("pets.petSatiety")} name="satiety">
            <InputNumber min={0} max={200} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("pets.schoolStage")} name="schoolStageName">
            <Input maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("pets.petDeleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelected(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>{t("pets.petDeleteConfirm", { name: selected?.nickname ?? "" })}</p>
      </Modal>
    </div>
  );
}
