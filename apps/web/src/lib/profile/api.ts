import type { Density, ThemeMode } from "@/lib/theme";

export type Gender = "male" | "female";

/** GET /api/auth/session 返回的学员资料（avatarUrl 由 Web BFF 补全） */
export interface SessionProfile {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  avatarUrl: string | null;
  gender: Gender | null;
  phone: string | null;
}

/** GET/PUT /api/app/settings 的字段，口径与移动端一致 */
export interface AppSettings {
  unitSize: number;
  theme: ThemeMode;
  language: "zh" | "en";
  density: Density;
  /** 全局学习范围：年级 / 科目，选中教材时会由服务端同步覆盖 */
  gradeId: string | null;
  subjectId: string | null;
}

export class ProfileApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ProfileApiError";
    this.status = status;
  }
}

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `HTTP ${res.status}`;
}

export async function fetchSessionProfile(): Promise<SessionProfile | null> {
  const res = await fetch("/api/auth/session", {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new ProfileApiError(res.status, await errorMessage(res));
  const data = (await res.json()) as { user?: SessionProfile };
  return data.user ?? null;
}

/** 只传需要修改的字段；接口要求 phone 必须是 11 位，gender 只能是 male/female */
export async function updateProfile(payload: {
  nickname?: string;
  gender?: Gender;
  phone?: string;
}): Promise<void> {
  const res = await fetch("/api/app/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ProfileApiError(res.status, await errorMessage(res));
}

/** multipart 字段名固定为 file；浏览器自动带 boundary，不要手动设置 content-type */
export async function uploadAvatar(file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/app/profile/avatar", {
    method: "POST",
    headers: { accept: "application/json" },
    body: form,
  });
  if (!res.ok) throw new ProfileApiError(res.status, await errorMessage(res));
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch("/api/app/settings", {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new ProfileApiError(res.status, await errorMessage(res));
  const data = (await res.json()) as Partial<AppSettings>;
  return {
    unitSize: data.unitSize ?? 20,
    theme: data.theme ?? "system",
    language: data.language ?? "zh",
    density: data.density ?? "comfortable",
    gradeId: data.gradeId ?? null,
    subjectId: data.subjectId ?? null,
  };
}

export async function updateSettings(
  payload: Partial<AppSettings>,
): Promise<AppSettings> {
  const res = await fetch("/api/app/settings", {
    method: "PUT",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ProfileApiError(res.status, await errorMessage(res));
  const data = (await res.json()) as Partial<AppSettings>;
  return {
    unitSize: data.unitSize ?? payload.unitSize ?? 20,
    theme: data.theme ?? payload.theme ?? "system",
    language: data.language ?? payload.language ?? "zh",
    density: data.density ?? payload.density ?? "comfortable",
    gradeId: data.gradeId ?? payload.gradeId ?? null,
    subjectId: data.subjectId ?? payload.subjectId ?? null,
  };
}
