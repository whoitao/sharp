"use client";

import { PAGE_SIZE_OPTIONS, usePageSize, useThemeMode, type ThemeMode } from "@/components/antd-providers";
import { PageActionsContext } from "@/components/page-actions";
import { useLocale, type Locale, type MessageKey } from "@/lib/i18n";
import {
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  OrderedListOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SunOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Spin,
  theme as antdTheme,
  type MenuProps
} from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

const { Sider, Content } = Layout;

const NAV_ITEMS: { key: string; icon: React.ReactNode; labelKey: MessageKey }[] = [
  { key: "/dashboard", icon: <DashboardOutlined />, labelKey: "nav.dashboard" },
  { key: "/users", icon: <UserOutlined />, labelKey: "nav.users" },
  { key: "/admins", icon: <TeamOutlined />, labelKey: "nav.admins" },
  { key: "/categories", icon: <AppstoreOutlined />, labelKey: "nav.categories" },
  { key: "/subjects", icon: <BookOutlined />, labelKey: "nav.subjects" },
  { key: "/knowledge-points", icon: <TagsOutlined />, labelKey: "nav.knowledgePoints" },
  { key: "/questions", icon: <QuestionCircleOutlined />, labelKey: "nav.questions" },
  { key: "/study-records", icon: <OrderedListOutlined />, labelKey: "nav.studyRecords" },
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
  const { pageSize, setPageSize } = usePageSize();
  const { locale, setLocale, t } = useLocale();
  const {
    token: { colorBgContainer, colorBorderSecondary, colorBgLayout },
  } = antdTheme.useToken();

  const [username, setUsername] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pageActions, setPageActions] = useState<React.ReactNode>(null);

  // 路由切换时同步清空顶栏按钮，避免上一个页面的按钮残留。
  // useLayoutEffect 早于子页面的 useEffect 执行，确保新页面 setup 前先清掉旧的。
  useLayoutEffect(() => {
    setPageActions(null);
  }, [pathname]);

  useEffect(() => {
    setUsername(localStorage.getItem("admin_username") || "");
  }, []);

  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  const handleNavClick = ({ key }: { key: string }) => {
    if (key === pathname) return;
    setPendingKey(key);
    router.push(key);
  };

  const activeKey = pendingKey ?? pathname;

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
      key: "appearance",
      type: "submenu",
      icon: <SettingOutlined />,
      label: t("settings.appearance"),
      children: [
        {
          key: "language-sub",
          type: "submenu",
          icon: <GlobalOutlined />,
          label: t("settings.language"),
          children: LOCALE_OPTIONS.map((opt) => ({
            key: `locale-${opt.value}`,
            label: opt.label,
            onClick: () => setLocale(opt.value),
          })),
        },
        {
          key: "theme-sub",
          type: "submenu",
          icon: <SunOutlined />,
          label: t("settings.theme"),
          children: THEME_OPTIONS.map((opt) => ({
            key: `theme-${opt.value}`,
            icon: opt.icon,
            label: t(opt.labelKey),
            onClick: () => setMode(opt.value),
          })),
        },
        {
          key: "pagesize-sub",
          type: "submenu",
          icon: <OrderedListOutlined />,
          label: t("settings.pageSize"),
          children: PAGE_SIZE_OPTIONS.map((size) => ({
            key: `size-${size}`,
            label: String(size),
            onClick: () => setPageSize(size),
          })),
        },
      ],
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
    <PageActionsContext.Provider value={{ setActions: setPageActions }}>
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={256}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: colorBgContainer,
          borderRight: `1px solid ${colorBorderSecondary}`,
        }}
        breakpoint="lg"
        trigger={null}
      >
        <div
          style={{
            height: 50,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            marginLeft: 12,
            borderBottom: `1px solid ${colorBorderSecondary}`,
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          {!collapsed && <span style={{ fontSize: 18, fontWeight: 700 }}>Sharp Admin</span>}
          {collapsed && <span style={{ fontSize: 16, fontWeight: 700 }}>S</span>}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 32, height: 32 }}
          />
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={navItems}
          onClick={handleNavClick}
          style={{ borderInlineEnd: "none", padding: 8, paddingBottom: 72 }}
        />

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, borderTop: `1px solid ${colorBorderSecondary}`, background: colorBgContainer }}>
          <Dropdown
            menu={{ items: userMenuItems, selectedKeys: [`theme-${mode}`, `locale-${locale}`, `size-${pageSize}`] }}
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

      <Layout>
        {/* Global top bar: page title (sticky) */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 50,
            background: colorBgContainer,
            borderBottom: `1px solid ${colorBorderSecondary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 24,
            paddingRight: 24,
            gap: 16,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 600, flex: "0 0 auto" }}>
            {t(NAV_ITEMS.find((item) => activeKey.startsWith(item.key))?.labelKey ?? "nav.dashboard")}
          </span>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}>
            {pageActions}
          </div>
        </div>

        <Content style={{ padding: 8, overflow: "auto", position: "relative" }}>
          {pendingKey && pendingKey !== pathname && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                background: colorBgLayout,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spin size="large" />
            </div>
          )}
          {children}
        </Content>
      </Layout>
    </Layout>
    </PageActionsContext.Provider>
  );
}
