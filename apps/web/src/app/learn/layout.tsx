"use client";

import { RequireAuth } from "@/components/auth/require-auth";

/** 学习区（含答题页）需要登录后才能访问 */
export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
