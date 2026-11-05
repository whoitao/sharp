"use client";

import { useLocale } from "@/lib/i18n";
import { primeIdentity } from "@/components/permissions";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, theme as antdTheme } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { token } = antdTheme.useToken();
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
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Sharp Admin</h1>
          <p style={{ color: token.colorTextSecondary, marginTop: 8 }}>
            {t("login.subtitle")}
          </p>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form<LoginFormValues> layout="vertical" onFinish={handleLogin} requiredMark={false}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: t("login.usernameRequired") }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder={t("login.usernamePlaceholder")}
              autoCapitalize="none"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t("login.passwordRequired") }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder={t("login.passwordPlaceholder")}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
