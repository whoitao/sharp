"use client";

import { useLocale, type MessageKey } from "@/lib/i18n";
import {
  AppstoreOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { App, Card, Col, Result, Row, Spin } from "antd";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  todayActiveUsers: number;
  totalStudySessions: number;
  todayStudySessions: number;
  totalCategories: number;
  totalQuestions: number;
}

export default function DashboardPage() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.totalUsers === "number") {
          setStats(data);
        } else {
          setStats(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setStats(null);
        setLoading(false);
        message.error(t("dashboard.loadFailed"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "96px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return <Result status="error" title={t("dashboard.loadFailed")} />;
  }

  const cards: { titleKey: MessageKey; value: number; icon: React.ReactNode; color: string }[] = [
    { titleKey: "dashboard.totalUsers", value: stats.totalUsers, icon: <UserOutlined />, color: "#1677ff" },
    { titleKey: "dashboard.todayNewUsers", value: stats.todayNewUsers, icon: <UserAddOutlined />, color: "#52c41a" },
    { titleKey: "dashboard.todayActiveUsers", value: stats.todayActiveUsers, icon: <UserOutlined />, color: "#722ed1" },
    { titleKey: "dashboard.totalStudySessions", value: stats.totalStudySessions, icon: <BookOutlined />, color: "#fa8c16" },
    { titleKey: "dashboard.todayStudySessions", value: stats.todayStudySessions, icon: <BookOutlined />, color: "#13c2c2" },
    { titleKey: "dashboard.totalCategories", value: stats.totalCategories, icon: <AppstoreOutlined />, color: "#2f54eb" },
    { titleKey: "dashboard.totalQuestions", value: stats.totalQuestions, icon: <QuestionCircleOutlined />, color: "#eb2f96" },
  ];

  return (
    <div>
      <Row gutter={[20, 20]}>
        {cards.map((card) => (
          <Col key={card.titleKey} xs={24} sm={12} lg={8} xl={6}>
            <Card
              styles={{ body: { padding: 20 } }}
              style={{ borderRadius: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: "rgba(0,0,0,0.88)" }}>
                    {card.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(0,0,0,0.55)", marginTop: 4 }}>
                    {t(card.titleKey)}
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: card.color + "15",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: card.color,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
