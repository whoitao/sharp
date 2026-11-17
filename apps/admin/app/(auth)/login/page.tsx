"use client";

import { useLocale } from "@/lib/i18n";
import { primeIdentity } from "@/components/permissions";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, ConfigProvider, Form, Input, theme as antdTheme } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LoginFormValues {
  username: string;
  password: string;
}

const LOGIN_BACKGROUND_URL = "/namcha-barwa-login.jpg";
const MOUNTAIN_FOCAL_X_PERCENT = 52;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    // 提交中直接忽略重复触发，避免连续回车/双击产生重复 POST
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("login.loginFailed"));
        return;
      }

      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_username", data.admin.username);
      // 登录即写入身份缓存，进去后不必等 /me 就能渲染，避免 Safari 下被判未登录弹回
      primeIdentity({
        id: data.admin.id,
        username: data.admin.username,
        role: data.admin.role,
        roleName: data.admin.roleName ?? data.admin.role,
        roleId: data.admin.roleId ?? null,
        permissions: data.admin.permissions ?? [],
      });
      router.push("/dashboard");
    } catch {
      setError(t("login.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="admin-login-page"
      style={{
        colorScheme: "dark",
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        backgroundColor: "#0B1724",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "max(100vw, 177.7778svh)",
          aspectRatio: "2560 / 1440",
          transform: `translate(-${MOUNTAIN_FOCAL_X_PERCENT}%, -50%)`,
          backgroundImage: `url("${LOGIN_BACKGROUND_URL}")`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(4, 14, 24, 0.32) 0%, rgba(4, 14, 24, 0.48) 55%, rgba(4, 14, 24, 0.72) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 400,
          padding: "24px 24px 0",
          transform: "translateY(-1vh)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
              borderRadius: 15,
              background: "linear-gradient(145deg, rgba(52, 211, 153, 0.98), rgba(16, 185, 129, 0.78))",
              boxShadow: "0 10px 28px rgba(16, 185, 129, 0.24)",
              color: "#FFFFFF",
              fontSize: 23,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <h1 style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
            Sharp Admin
          </h1>
        </div>

        <ConfigProvider
          theme={{
            algorithm: antdTheme.darkAlgorithm,
            token: {
              colorPrimary: "#34D399",
              colorPrimaryHover: "#6EE7B7",
              colorPrimaryActive: "#10B981",
              colorTextLightSolid: "#FFFFFF",
              colorText: "#F8FAFC",
              colorTextPlaceholder: "rgba(248, 250, 252, 0.58)",
              colorIcon: "rgba(248, 250, 252, 0.62)",
              colorBgContainer: "rgba(255, 255, 255, 0.08)",
              colorBorder: "rgba(255, 255, 255, 0.22)",
              borderRadius: 12,
              controlHeight: 30,
              fontSize: 13,
            },
            components: {
              Input: {
                activeBg: "rgba(255, 255, 255, 0.14)",
                hoverBg: "rgba(255, 255, 255, 0.12)",
                activeBorderColor: "rgba(167, 243, 208, 0.85)",
                hoverBorderColor: "rgba(255, 255, 255, 0.48)",
                activeShadow: "0 0 0 3px rgba(52, 211, 153, 0.16)",
              },
              Button: {
                primaryShadow: "none",
              },
            },
          }}
        >
          {error && (
            <Alert
              type="error"
              showIcon
              title={error}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form<LoginFormValues> layout="vertical" onFinish={handleLogin} requiredMark={false} style={{ width: "75%", margin: "0 auto" }}>
            <Form.Item
              name="username"
              rules={[{ required: true, message: t("login.usernameRequired") }]}
              style={{ marginBottom: 12 }}
            >
              <Input
                size="middle"
                prefix={<UserOutlined />}
                placeholder={t("login.usernamePlaceholder")}
                autoCapitalize="none"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: t("login.passwordRequired") }]}
              style={{ marginBottom: 14 }}
            >
              <Input.Password
                size="middle"
                prefix={<LockOutlined />}
                placeholder={t("login.passwordPlaceholder")}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="middle"
                block
                loading={loading}
                style={{ height: 32, fontSize: 13, fontWeight: 700, boxShadow: "0 10px 26px rgba(16, 185, 129, 0.2)" }}
              >
                {loading ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </Form.Item>
          </Form>
        </ConfigProvider>
      </div>
    </div>
  );
}
