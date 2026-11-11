"use client";

import { PAGE_SIZE_OPTIONS, usePageSize, useThemeMode, type ThemeMode } from "@/components/antd-providers";
import { invalidateIdentity, usePermissions } from "@/components/permissions";
import { PageActionsContext, PageTitleContext } from "@/components/page-actions";
import { useLocale, type Locale, type MessageKey } from "@/lib/i18n";
import { NAV_PERMISSIONS } from "@/lib/permissions";
import {
  BookOutlined,
  DashboardOutlined,
  GlobalOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  NotificationOutlined,
  OrderedListOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  theme as antdTheme,
  type MenuProps
} from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const { Sider, Content } = Layout;

const NAV_ITEMS: { key: string; icon: React.ReactNode; labelKey: MessageKey }[] = [
  { key: "/dashboard", icon: <DashboardOutlined />, labelKey: "nav.dashboard" },
  { key: "/users", icon: <TeamOutlined />, labelKey: "nav.userManagement" },
  { key: "/questions", icon: <QuestionCircleOutlined />, labelKey: "nav.questionManagement" },
  { key: "/textbooks", icon: <BookOutlined />, labelKey: "nav.textbookManagement" },
  { key: "/grades", icon: <UnorderedListOutlined />, labelKey: "nav.gradeManagement" },
  { key: "/articles", icon: <ReadOutlined />, labelKey: "nav.articles" },
  { key: "/notifications", icon: <NotificationOutlined />, labelKey: "nav.notifications" },
  { key: "/pets", icon: <HeartOutlined />, labelKey: "nav.petManagement" },
  { key: "/site-settings", icon: <SettingOutlined />, labelKey: "nav.siteSettings" },
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
  const { canAny, identity, unauthenticated, loading: permLoading } = usePermissions();
  const {
    token: { colorBgContainer, colorBorderSecondary, colorPrimary },
  } = antdTheme.useToken();

  const [username, setUsername] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pageActions, setPageActions] = useState<React.ReactNode>(null);
  const [pageTitle, setPageTitle] = useState<React.ReactNode>(null);

  // Context 值必须稳定，否则子页面每次因 Context 变化重渲染又会注入新的节点，形成无限 setState 循环
  const pageActionsContextValue = useMemo(() => ({ setActions: setPageActions }), []);
  const pageTitleContextValue = useMemo(() => ({ setTitle: setPageTitle }), []);

  // 路由切换时同步清空顶栏按钮，避免上一个页面的按钮残留。
  // useLayoutEffect 早于子页面的 useEffect 执行，确保新页面 setup 前先清掉旧的。
  useLayoutEffect(() => {
    setPageActions(null);
    setPageTitle(null);
  }, [pathname]);

  useEffect(() => {
    setUsername(localStorage.getItem("admin_username") || "");
  }, []);

  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  // 仅在明确未鉴权（无 token 或 401/403）时跳登录页，网络异常不踢人；
  // 加一次性护栏，避免「跳登录 → 页面重挂载 → 再次判定未鉴权 → 再跳」的正反馈
  const redirectingToLogin = useRef(false);
  useEffect(() => {
    if (permLoading) return;
    if (!unauthenticated) {
      redirectingToLogin.current = false;
      return;
    }
    if (redirectingToLogin.current) return;
    redirectingToLogin.current = true;
    router.replace("/login");
  }, [unauthenticated, permLoading, router]);

  // 路由级权限守卫：不在可访问页面里就跳到第一个有权限的页面
  useEffect(() => {
    if (permLoading || !identity) return;
    const navKey = Object.keys(NAV_PERMISSIONS).find((k) => pathname.startsWith(k));
    if (!navKey) return;
    if (canAny(NAV_PERMISSIONS[navKey])) return;
    const fallback =
      NAV_ITEMS.find((item) => canAny(NAV_PERMISSIONS[item.key]))?.key ?? "/dashboard";
    if (fallback !== pathname) router.replace(fallback);
  }, [pathname, permLoading, identity, canAny, router]);

  const handleNavClick = ({ key }: { key: string }) => {
    if (key === pathname) return;
    setPendingKey(key);
    router.push(key);
  };

  const activeKey = pendingKey ?? pathname;
  const isNavigating = pendingKey !== null && pendingKey !== pathname;

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    invalidateIdentity();
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

  const navItems: MenuProps["items"] = NAV_ITEMS.filter((item) =>
    canAny(NAV_PERMISSIONS[item.key])
  ).map((item) => ({
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

  // 未登录时先不渲染后台骨架，避免登录页跳转前闪一下空白后台
  if (permLoading || !identity) return null;

  return (
    <PageActionsContext.Provider value={pageActionsContextValue}>
    <PageTitleContext.Provider value={pageTitleContextValue}>
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
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
          style={{ borderInlineEnd: "none", padding: 8, paddingBottom: 72, flex: 1, overflow: "auto" }}
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
              <Avatar size={28} style={{ backgroundColor: colorPrimary, fontSize: 12 }}>
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

      <Layout style={{ height: "100vh", minWidth: 0 }}>
        {/* Global top bar: page title (sticky) */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 50,
            flexShrink: 0,
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
          {pageTitle ?? (
            <span style={{ fontSize: 18, fontWeight: 600, flex: "0 0 auto" }}>
              {t(NAV_ITEMS.find((item) => activeKey.startsWith(item.key))?.labelKey ?? "nav.dashboard")}
            </span>
          )}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}>
            {pageActions}
          </div>
          {/* 路由切换只在顶栏下方走一条细进度条，不再用整屏遮罩把内容盖住 */}
          {isNavigating && (
            <div className="route-progress">
              <span style={{ backgroundColor: colorPrimary }} />
            </div>
          )}
        </div>

        {/* 页面统一 16px 内边距，与 Dashboard 的容器对齐 */}
        <Content style={{ padding: 16, overflow: "auto", position: "relative", minHeight: 0 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
    </PageTitleContext.Provider>
    </PageActionsContext.Provider>
  );
}
