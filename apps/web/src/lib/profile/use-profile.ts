"use client";

import { fetchSessionProfile, type SessionProfile } from "@/lib/profile/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Status = "loading" | "error" | "ready";

/**
 * 读取当前学员资料；未登录统一跳登录页并带上回跳地址。
 * 只依赖 /api/auth/session（httpOnly Cookie），不接触 App token。
 */
export function useSessionProfile(nextPath: string) {
  const router = useRouter();
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchSessionProfile()
      .then((data) => {
        if (!alive) return;
        if (!data) {
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        setProfile(data);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [nextPath, reloadKey, router]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { profile, setProfile, status, reload };
}
