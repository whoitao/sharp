"use client";

import { useThemeMode } from "@/components/antd-providers";
import { useLocale, type MessageKey } from "@/lib/i18n";
import {
    AppstoreOutlined,
    BookOutlined,
    QuestionCircleOutlined,
    UserAddOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { App, Card, Col, Result, Row, Spin, theme as antdTheme } from "antd";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  todayActiveUsers: number;
  totalStudySessions: number;
  todayStudySessions: number;
  totalGrades: number;
  totalQuestions: number;
}

export default function DashboardPage() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { token } = antdTheme.useToken();
  const { resolved } = useThemeMode();
  const isDark = resolved === "dark";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem("admin_token");
    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${authToken}` },
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

  const cards: {
    titleKey: MessageKey;
    value: number;
    icon: React.ReactNode;
    light: string;
    dark: string;
  }[] = [
    { titleKey: "dashboard.totalUsers", value: stats.totalUsers, icon: <UserOutlined />, light: "#1677ff", dark: "#4096ff" },
    { titleKey: "dashboard.todayNewUsers", value: stats.todayNewUsers, icon: <UserAddOutlined />, light: "#52c41a", dark: "#73d13d" },
    { titleKey: "dashboard.todayActiveUsers", value: stats.todayActiveUsers, icon: <UserOutlined />, light: "#722ed1", dark: "#9254de" },
    { titleKey: "dashboard.totalStudySessions", value: stats.totalStudySessions, icon: <BookOutlined />, light: "#fa8c16", dark: "#ffa940" },
    { titleKey: "dashboard.todayStudySessions", value: stats.todayStudySessions, icon: <BookOutlined />, light: "#13c2c2", dark: "#36cfc9" },
    { titleKey: "dashboard.totalGrades", value: stats.totalGrades, icon: <AppstoreOutlined />, light: "#2f54eb", dark: "#597ef7" },
    { titleKey: "dashboard.totalQuestions", value: stats.totalQuestions, icon: <QuestionCircleOutlined />, light: "#eb2f96", dark: "#f759ab" },
  ];

  return (
    <div>
      <Row gutter={[20, 20]}>
        {cards.map((card) => {
          // 深色卡片上整档提亮，否则原色 icon 发闷（#2f54eb 对 #141414 只有 1.9:1）
          const accent = isDark ? card.dark : card.light;
          return (
            <Col key={card.titleKey} xs={24} sm={12} lg={8} xl={6}>
              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: token.colorText }}>
                      {card.value.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 4 }}>
                      {t(card.titleKey)}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      // 8% 的色底在深色卡片上几乎不可见，深色下抬到 16%
                      background: accent + (isDark ? "29" : "15"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      color: accent,
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
