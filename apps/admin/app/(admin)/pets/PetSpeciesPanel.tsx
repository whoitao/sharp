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

interface SpeciesItem {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  icon: string | null;
  tagline: string | null;
  sortOrder: number;
  enabled: boolean;
  petCount: number;
  stages: { id: string }[];
}

interface SpeciesFormValues {
  code: string;
  name: string;
  theme?: string;
  icon?: string;
  tagline?: string;
  sortOrder: number;
  enabled: boolean;
}

export default function PetSpeciesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();

  const [items, setItems] = useState<SpeciesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<SpeciesItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<SpeciesFormValues>();
  const [editForm] = Form.useForm<SpeciesFormValues>();

  const token = () => localStorage.getItem("admin_token");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pet-species", {
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

  const handleCreate = async (values: SpeciesFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pet-species", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.speciesCreateFailed"));
        return;
      }
      message.success(t("pets.speciesCreated"));
      setCreateOpen(false);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: SpeciesFormValues) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pet-species/${selected.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.speciesUpdateFailed"));
        return;
      }
      message.success(t("pets.speciesUpdated"));
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
      const res = await fetch(`/api/admin/pet-species/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.speciesDeleteFailed"));
        return;
      }
      message.success(t("pets.speciesDeleted"));
      setDeleteOpen(false);
      setSelected(null);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<SpeciesItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
    },
    {
      title: t("pets.icon"),
      dataIndex: "icon",
      key: "icon",
      width: 70,
      render: (icon: string | null) => (icon ? <span style={{ fontSize: 20 }}>{icon}</span> : "-"),
    },
    {
      title: t("pets.speciesName"),
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          {record.theme && (
            <div style={{ fontSize: 12, opacity: 0.65 }}>{record.theme}</div>
          )}
        </div>
      ),
    },
    {
      title: t("pets.speciesCode"),
      dataIndex: "code",
      key: "code",
      width: 110,
      render: (code: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{code}</span>
      ),
    },
    {
      title: t("pets.colStageCount"),
      key: "stageCount",
      width: 100,
      render: (_, record) => t("pets.stageCount", { n: record.stages.length }),
    },
    {
      title: t("pets.colPetCount"),
      key: "petCount",
      width: 100,
      render: (_, record) => t("pets.petCount", { n: record.petCount }),
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

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        {t("pets.addSpecies")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(headerActions);

  const formFields = (
    <>
      <Form.Item
        label={t("pets.speciesCode")}
        name="code"
        rules={[{ required: true, message: t("pets.speciesCodeRequired") }]}
      >
        <Input maxLength={30} placeholder="cat / dog / rabbit" />
      </Form.Item>
      <Form.Item
        label={t("pets.speciesName")}
        name="name"
        rules={[{ required: true, message: t("pets.speciesNameRequired") }]}
      >
        <Input maxLength={30} />
      </Form.Item>
      <Form.Item label={t("pets.speciesTheme")} name="theme">
        <Input maxLength={30} placeholder={t("pets.speciesThemePlaceholder")} />
      </Form.Item>
      <Form.Item label={t("pets.icon")} name="icon">
        <Input maxLength={8} placeholder="🐱" />
      </Form.Item>
      <Form.Item label={t("pets.speciesTagline")} name="tagline">
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item label={t("pets.sortOrder")} name="sortOrder" initialValue={0}>
        <InputNumber style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label={t("pets.enabled")} name="enabled" valuePropName="checked" initialValue>
        <Switch />
      </Form.Item>
    </>
  );

  return (
    <div>
      <Table<SpeciesItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        scroll={{ x: TABLE_SCROLL_X }}
        dataSource={items}
        pagination={false}
        locale={{ emptyText: t("pets.empty") }}
      />

      <Modal
        title={t("pets.speciesCreateTitle")}
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
        title={t("pets.speciesEditTitle")}
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
              code: selected.code,
              name: selected.name,
              theme: selected.theme ?? undefined,
              icon: selected.icon ?? undefined,
              tagline: selected.tagline ?? undefined,
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
        title={t("pets.speciesDeleteTitle")}
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
        <p>{t("pets.speciesDeleteConfirm", { name: selected?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}
