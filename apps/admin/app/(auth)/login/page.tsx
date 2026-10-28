"use client";

import { useLocale } from "@/lib/i18n";
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
            label={t("login.username")}
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
            label={t("login.password")}
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
