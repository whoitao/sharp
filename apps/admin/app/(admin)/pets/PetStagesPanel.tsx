"use client";

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
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

interface StageItem {
  id: string;
  speciesId: string;
  speciesName: string;
  speciesCode: string;
  stageKey: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  imageUrl: string | null;
  idleLottieUrl: string | null;
  feedLottieUrl: string | null;
  evolveLottieUrl: string | null;
  sortOrder: number;
}

interface SpeciesOption {
  id: string;
  name: string;
}

interface StageFormValues {
  speciesId: string;
  stageKey: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  imageUrl?: string;
  idleLottieUrl?: string;
  feedLottieUrl?: string;
  evolveLottieUrl?: string;
  sortOrder: number;
}

export default function PetStagesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();

  const [items, setItems] = useState<StageItem[]>([]);
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [speciesFilter, setSpeciesFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<StageItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<StageFormValues>();
  const [editForm] = Form.useForm<StageFormValues>();

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
      const query = new URLSearchParams();
      if (speciesFilter) query.set("speciesId", speciesFilter);
      const res = await fetch(`/api/admin/pet-stages?${query.toString()}`, {
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
    fetchSpecies();
  }, []);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesFilter]);

  const handleCreate = async (values: StageFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pet-stages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.stageCreateFailed"));
        return;
      }
      message.success(t("pets.stageCreated"));
      setCreateOpen(false);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: StageFormValues) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pet-stages/${selected.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.stageUpdateFailed"));
        return;
      }
      message.success(t("pets.stageUpdated"));
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
      const res = await fetch(`/api/admin/pet-stages/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.stageDeleteFailed"));
        return;
      }
      message.success(t("pets.stageDeleted"));
      setDeleteOpen(false);
      setSelected(null);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<StageItem> = [
    {
      title: t("pets.species"),
      key: "species",
      width: 140,
      render: (_, record) => `${record.speciesName} (${record.speciesCode})`,
    },
    {
      title: t("pets.stageKey"),
      dataIndex: "stageKey",
      key: "stageKey",
      width: 110,
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>
      ),
    },
    {
      title: t("pets.stageName"),
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: t("pets.levelRange"),
      key: "levelRange",
      width: 100,
      render: (_, record) => `${record.minLevel} - ${record.maxLevel}`,
    },
    {
      title: t("pets.imageUrl"),
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 96,
      render: (value: string | null) =>
        value ? (
          <Image
            src={value}
            alt=""
            width={56}
            height={56}
            style={{ objectFit: "contain", borderRadius: 6, background: "#f5f5f5" }}
          />
        ) : (
          "-"
        ),
    },
    {
      title: t("pets.lottie"),
      key: "lottie",
      width: 160,
      render: (_, record) => {
        const count = [record.idleLottieUrl, record.feedLottieUrl, record.evolveLottieUrl].filter(Boolean).length;
        return <Tag>{`${count} / 3`}</Tag>;
      },
    },
    {
      title: t("pets.sortOrder"),
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 80,
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 100,
      align: "right",
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelected(record);
              setEditOpen(true);
            }}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
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

  const formFields = (
    <>
      <Form.Item
        label={t("pets.species")}
        name="speciesId"
        rules={[{ required: true, message: t("pets.speciesRequired") }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={speciesOptions}
          placeholder={t("pets.speciesPlaceholder")}
        />
      </Form.Item>
      <Form.Item
        label={t("pets.stageKey")}
        name="stageKey"
        rules={[{ required: true, message: t("pets.stageKeyRequired") }]}
      >
        <Input maxLength={30} placeholder="juvenile / growing / mature" />
      </Form.Item>
      <Form.Item
        label={t("pets.stageName")}
        name="name"
        rules={[{ required: true, message: t("pets.stageNameRequired") }]}
      >
        <Input maxLength={30} />
      </Form.Item>
      <Space size={16} style={{ display: "flex" }}>
        <Form.Item
          label={t("pets.minLevel")}
          name="minLevel"
          initialValue={1}
          rules={[{ required: true, message: "" }]}
          style={{ flex: 1 }}
        >
          <InputNumber min={1} max={99} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label={t("pets.maxLevel")}
          name="maxLevel"
          initialValue={9}
          rules={[{ required: true, message: "" }]}
          style={{ flex: 1 }}
        >
          <InputNumber min={1} max={99} style={{ width: "100%" }} />
        </Form.Item>
      </Space>
      <Form.Item label={t("pets.imageUrl")} name="imageUrl">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item label={t("pets.idleLottieUrl")} name="idleLottieUrl">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item label={t("pets.feedLottieUrl")} name="feedLottieUrl">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item label={t("pets.evolveLottieUrl")} name="evolveLottieUrl">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item label={t("pets.sortOrder")} name="sortOrder" initialValue={0}>
        <InputNumber style={{ width: "100%" }} />
      </Form.Item>
    </>
  );

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        {t("pets.addStage")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(headerActions);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Select
          allowClear
          style={{ width: 220 }}
          placeholder={t("pets.allSpecies")}
          value={speciesFilter}
          onChange={setSpeciesFilter}
          options={speciesOptions}
        />
      </div>

      <Table<StageItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        locale={{ emptyText: t("pets.empty") }}
      />

      <Modal
        title={t("pets.stageCreateTitle")}
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
        title={t("pets.stageEditTitle")}
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
              speciesId: selected.speciesId,
              stageKey: selected.stageKey,
              name: selected.name,
              minLevel: selected.minLevel,
              maxLevel: selected.maxLevel,
              imageUrl: selected.imageUrl ?? undefined,
              idleLottieUrl: selected.idleLottieUrl ?? undefined,
              feedLottieUrl: selected.feedLottieUrl ?? undefined,
              evolveLottieUrl: selected.evolveLottieUrl ?? undefined,
              sortOrder: selected.sortOrder,
            });
          }
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          {formFields}
        </Form>
      </Modal>

      <Modal
        title={t("pets.stageDeleteTitle")}
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
        <p>{t("pets.stageDeleteConfirm", { name: selected?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}
