"use client";

import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { App, Button, Col, Divider, Form, InputNumber, Row, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

interface ConfigValues {
  expPerCorrect: number;
  streakBonusMax: number;
  dailyExpCap: number;
  dailyLoginExp: number;
  expPerLevel: number;
  maxLevel: number;
  growingLevel: number;
  matureLevel: number;
  satietyMax: number;
  satietyDecay: number;
  premiumStreak: number;
  rareMinQuestions: number;
  minSecondsPerQuestion: number;
  maxQuestionsPerAttempt: number;
}

export default function PetConfigPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ConfigValues>();

  const token = () => localStorage.getItem("admin_token");

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pet-config", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      form.setFieldsValue(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (values: ConfigValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pet-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("pets.configSaveFailed"));
        return;
      }
      message.success(t("pets.configSaved"));
      fetchConfig();
    } finally {
      setSaving(false);
    }
  };

  const headerActions = useMemo(
    () => (
      <Button type="primary" loading={saving} onClick={() => form.submit()}>
        {t("common.saveChanges")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saving, t],
  );
  usePageActions(headerActions);

  const numberField = (name: keyof ConfigValues, label: string) => (
    <Col xs={24} md={8} key={name}>
      <Form.Item label={label} name={name} style={{ marginBottom: 16 }}>
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
    </Col>
  );

  return (
    <Spin spinning={loading}>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {t("pets.configDesc")}
      </Text>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Divider titlePlacement="start" plain>
          {t("pets.groupExp")}
        </Divider>
        <Row gutter={16}>
          {numberField("expPerCorrect", t("pets.expPerCorrect"))}
          {numberField("streakBonusMax", t("pets.streakBonusMax"))}
          {numberField("dailyExpCap", t("pets.dailyExpCap"))}
          {numberField("dailyLoginExp", t("pets.dailyLoginExp"))}
          {numberField("expPerLevel", t("pets.expPerLevel"))}
          {numberField("maxLevel", t("pets.configMaxLevel"))}
          {numberField("growingLevel", t("pets.growingLevel"))}
          {numberField("matureLevel", t("pets.matureLevel"))}
        </Row>

        <Divider titlePlacement="start" plain>
          {t("pets.groupSatiety")}
        </Divider>
        <Row gutter={16}>
          {numberField("satietyMax", t("pets.satietyMax"))}
          {numberField("satietyDecay", t("pets.satietyDecay"))}
        </Row>

        <Divider titlePlacement="start" plain>
          {t("pets.groupRules")}
        </Divider>
        <Row gutter={16}>
          {numberField("premiumStreak", t("pets.premiumStreak"))}
          {numberField("rareMinQuestions", t("pets.rareMinQuestions"))}
          {numberField("minSecondsPerQuestion", t("pets.minSecondsPerQuestion"))}
          {numberField("maxQuestionsPerAttempt", t("pets.maxQuestionsPerAttempt"))}
        </Row>
      </Form>
    </Spin>
  );
}
