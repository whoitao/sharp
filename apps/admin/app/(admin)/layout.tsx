"use client";

import { useThemeMode, type ThemeMode } from "@/components/antd-providers";
import { useLocale, type Locale, type MessageKey } from "@/lib/i18n";
import {
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Dropdown,
  Layout,
  Menu,
  Space,
  theme as antdTheme,
  type MenuProps,
} from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Sider, Content } = Layout;

const NAV_ITEMS: { key: string; icon: React.ReactNode; labelKey: MessageKey }[] = [
  { key: "/dashboard", icon: <DashboardOutlined />, labelKey: "nav.dashboard" },
  { key: "/users", icon: <UserOutlined />, labelKey: "nav.users" },
  { key: "/categories", icon: <AppstoreOutlined />, labelKey: "nav.categories" },
  { key: "/questions", icon: <QuestionCircleOutlined />, labelKey: "nav.questions" },
  { key: "/study-records", icon: <BookOutlined />, labelKey: "nav.studyRecords" },
];

const THEME_OPTIONS: { value: ThemeMode; labelKey: MessageKey; icon: React.ReactNode }[] = [
  { value: "light", labelKey: "settings.light", icon: <SunOutlined /> },
  { value: "dark", labelKey: "settings.dark", icon: <MoonOutlined /> },
  { value: "system", labelKey: "settings.system", icon: <SettingOutlined /> },
];

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { modal } = App.useApp();
  const { mode, setMode } = useThemeMode();
  const { locale, setLocale, t } = useLocale();
  const {
    token: { colorBgContainer, colorBorderSecondary },
  } = antdTheme.useToken();

  const [username, setUsername] = useState("");

  useEffect(() => {
    setUsername(localStorage.getItem("admin_username") || "");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    window.location.href = "/login";
  };

  const showAbout = () => {
    modal.info({
      title: t("settings.aboutTitle"),
      content: (
        <Space orientation="vertical" size={4} style={{ marginTop: 8 }}>
          <span>{t("settings.version")}</span>
          <span>{t("settings.aboutDesc")}</span>
          <span>{t("settings.aboutTech")}</span>
        </Space>
      ),
    });
  };

  const navItems: MenuProps["items"] = NAV_ITEMS.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: t(item.labelKey),
  }));

  const userMenuItems: MenuProps["items"] = [
    {
      key: "settings-group",
      type: "group",
      label: t("settings.settings"),
      children: THEME_OPTIONS.map((opt) => ({
        key: `theme-${opt.value}`,
        icon: opt.icon,
        label: t(opt.labelKey),
        onClick: () => setMode(opt.value),
      })),
    },
    {
      key: "language-group",
      type: "group",
      label: t("settings.language"),
      children: LOCALE_OPTIONS.map((opt) => ({
        key: `locale-${opt.value}`,
        icon: <GlobalOutlined />,
        label: opt.label,
        onClick: () => setLocale(opt.value),
      })),
    },
    { type: "divider" },
    { key: "about", icon: <InfoCircleOutlined />, label: t("settings.about"), onClick: showAbout },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("settings.logout"),
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={256}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: colorBgContainer,
          borderRight: `1px solid ${colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 50,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 24px",
            borderBottom: `1px solid ${colorBorderSecondary}`,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700 }}>Sharp Admin</span>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={navItems}
          onClick={({ key }: { key: string }) => router.push(key)}
          style={{ borderInlineEnd: "none", padding: 8, paddingBottom: 72 }}
        />

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, borderTop: `1px solid ${colorBorderSecondary}`, background: colorBgContainer }}>
          <Dropdown
            menu={{ items: userMenuItems, selectedKeys: [`theme-${mode}`, `locale-${locale}`] }}
            trigger={["click"]}
            placement="topLeft"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <Avatar size={28} style={{ backgroundColor: "#1677ff", fontSize: 12 }}>
                {username ? username[0].toUpperCase() : "A"}
              </Avatar>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {username || "Admin"}
              </span>
              <SettingOutlined style={{ fontSize: 13, opacity: 0.55 }} />
            </div>
          </Dropdown>
        </div>
      </Sider>

      <Content style={{ padding: 16, overflow: "auto" }}>{children}</Content>
    </Layout>
  );
}
