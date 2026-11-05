"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

interface FoodItem {
  id: string;
  foodType: string;
  name: string;
  icon: string | null;
  satietyGain: number;
  expGain: number;
  dailyCap: number;
  bankDailyCap: number | null;
  obtainRule: string | null;
  sortOrder: number;
  enabled: boolean;
}

interface FoodFormValues {
  foodType: string;
  name: string;
  icon?: string;
  satietyGain: number;
  expGain: number;
  dailyCap: number;
  bankDailyCap?: number | null;
  obtainRule?: string;
  sortOrder: number;
  enabled: boolean;
}

export default function PetFoodsPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();

  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<FoodFormValues>();
  const [editForm] = Form.useForm<FoodFormValues>();

  const token = () => localStorage.getItem("admin_token");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pet-foods", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (values: FoodFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pet-foods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.foodCreateFailed"));
        return;
      }
      message.success(t("pets.foodCreated"));
      setCreateOpen(false);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: FoodFormValues) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pet-foods/${selected.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.foodUpdateFailed"));
        return;
      }
      message.success(t("pets.foodUpdated"));
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
      const res = await fetch(`/api/admin/pet-foods/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.foodDeleteFailed"));
        return;
      }
      message.success(t("pets.foodDeleted"));
      setDeleteOpen(false);
      setSelected(null);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<FoodItem> = [
    {
      title: t("pets.icon"),
      dataIndex: "icon",
      key: "icon",
      width: 70,
      render: (icon: string | null) => (icon ? <span style={{ fontSize: 20 }}>{icon}</span> : "-"),
    },
    {
      title: t("pets.foodName"),
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: t("pets.foodType"),
      dataIndex: "foodType",
      key: "foodType",
      width: 110,
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>
      ),
    },
    {
      title: t("pets.satietyGain"),
      dataIndex: "satietyGain",
      key: "satietyGain",
      width: 100,
    },
    {
      title: t("pets.expGain"),
      dataIndex: "expGain",
      key: "expGain",
      width: 90,
    },
    {
      title: t("pets.dailyCap"),
      dataIndex: "dailyCap",
      key: "dailyCap",
      width: 90,
    },
    {
      title: t("pets.bankDailyCap"),
      dataIndex: "bankDailyCap",
      key: "bankDailyCap",
      width: 100,
      render: (value: number | null) => (value === null ? "-" : value),
    },
    {
      title: t("pets.obtainRule"),
      dataIndex: "obtainRule",
      key: "obtainRule",
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: t("pets.sortOrder"),
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 80,
    },
    {
      title: t("pets.colEnabled"),
      dataIndex: "enabled",
      key: "enabled",
      width: 90,
      render: (enabled: boolean) => (
        <Tag color={enabled ? "green" : "default"}>
          {enabled ? t("pets.enabled") : t("pets.disabled")}
        </Tag>
      ),
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

  const formFields = (
    <>
      <Form.Item
        label={t("pets.foodType")}
        name="foodType"
        rules={[{ required: true, message: t("pets.foodTypeRequired") }]}
      >
        <Input maxLength={30} placeholder="normal / premium / rare" />
      </Form.Item>
      <Form.Item
        label={t("pets.foodName")}
        name="name"
        rules={[{ required: true, message: t("pets.foodNameRequired") }]}
      >
        <Input maxLength={30} />
      </Form.Item>
      <Form.Item label={t("pets.icon")} name="icon">
        <Input maxLength={8} placeholder="🍎" />
      </Form.Item>
      <Space size={16} style={{ display: "flex" }}>
        <Form.Item
          label={t("pets.satietyGain")}
          name="satietyGain"
          initialValue={10}
          style={{ flex: 1 }}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label={t("pets.expGain")}
          name="expGain"
          initialValue={0}
          style={{ flex: 1 }}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Space>
      <Space size={16} style={{ display: "flex" }}>
        <Form.Item
          label={t("pets.dailyCap")}
          name="dailyCap"
          initialValue={30}
          style={{ flex: 1 }}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label={t("pets.bankDailyCap")}
          name="bankDailyCap"
          tooltip={t("pets.bankDailyCapHint")}
          style={{ flex: 1 }}
        >
          <InputNumber min={0} style={{ width: "100%" }} placeholder={t("pets.unlimited")} />
        </Form.Item>
      </Space>
      <Form.Item label={t("pets.obtainRule")} name="obtainRule">
        <Input.TextArea rows={2} maxLength={200} />
      </Form.Item>
      <Form.Item label={t("pets.sortOrder")} name="sortOrder" initialValue={0}>
        <InputNumber style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label={t("pets.enabled")} name="enabled" valuePropName="checked" initialValue>
        <Switch />
      </Form.Item>
    </>
  );

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        {t("pets.addFood")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(headerActions);

  return (
    <div>
      <Table<FoodItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: TABLE_SCROLL_X }}
        locale={{ emptyText: t("pets.empty") }}
      />

      <Modal
        title={t("pets.foodCreateTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("common.create")}
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} preserve={false}>
          {formFields}
        </Form>
      </Modal>

      <Modal
        title={t("pets.foodEditTitle")}
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
              foodType: selected.foodType,
              name: selected.name,
              icon: selected.icon ?? undefined,
              satietyGain: selected.satietyGain,
              expGain: selected.expGain,
              dailyCap: selected.dailyCap,
              bankDailyCap: selected.bankDailyCap,
              obtainRule: selected.obtainRule ?? undefined,
              sortOrder: selected.sortOrder,
              enabled: selected.enabled,
            });
          }
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          {formFields}
        </Form>
      </Modal>

      <Modal
        title={t("pets.foodDeleteTitle")}
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
        <p>{t("pets.foodDeleteConfirm", { name: selected?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}
