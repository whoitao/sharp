"use client";

import { UserAvatar } from "@/components/account/user-avatar";
import { Button } from "@/components/ui/button";
import { notifySessionChanged } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import {
  fetchSessionProfile,
  updateProfile,
  uploadAvatar,
  type Gender,
  type SessionProfile,
} from "@/lib/profile/api";
import { cn } from "@/lib/utils";
import { Camera, Check, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-foreground-tertiary hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-border-light disabled:text-foreground-tertiary disabled:opacity-100";

/** 字段统一宽度，宽屏下不把输入框拉满整块卡片 */
const fieldClass = "sm:max-w-[24rem]";

const labelClass = "block text-sm font-semibold";
const hintClass = "mt-1.5 text-xs leading-5 text-foreground-tertiary";
const optionBase =
  "inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const optionActive = "border-primary bg-primary-light text-primary-strong";
const optionIdle =
  "border-border bg-surface text-foreground-secondary hover:border-primary/40";

/** 与移动端一致：上传前缩到 512px 以内的 JPEG，避免原图过大 */
async function compressAvatar(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86),
  );
  if (!blob) return file;
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

type Tone = "ok" | "error";

export function ProfileForm({
  profile,
  onProfileChange,
}: {
  profile: SessionProfile;
  onProfileChange: (profile: SessionProfile) => void;
}) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: Tone; text: string } | null>(null);

  const originalNickname = profile.nickname ?? "";
  const originalPhone = profile.phone ?? "";
  const nicknameChanged = nickname.trim() !== originalNickname;
  const phoneChanged = phone.trim() !== originalPhone;
  const genderChanged = gender !== profile.gender;
  const dirty = nicknameChanged || phoneChanged || genderChanged;

  const displayName = profile.nickname || profile.username;

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFeedback({ tone: "error", text: t("account.avatarTypeInvalid") });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ tone: "error", text: t("account.avatarTooLarge") });
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      const payload = await compressAvatar(file).catch(() => file);
      await uploadAvatar(payload);
      const next = await fetchSessionProfile();
      if (next) onProfileChange(next);
      notifySessionChanged();
      setFeedback({ tone: "ok", text: t("account.saved") });
    } catch {
      setFeedback({ tone: "error", text: t("account.avatarUploadFailed") });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setFeedback(null);

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setFeedback({ tone: "error", text: t("account.nicknameRequired") });
      return;
    }
    if (trimmedNickname.length > 24) {
      setFeedback({ tone: "error", text: t("account.nicknameTooLong") });
      return;
    }

    const trimmedPhone = phone.trim();
    if (phoneChanged) {
      if (!trimmedPhone) {
        setFeedback({ tone: "error", text: t("account.phoneUnbindUnsupported") });
        return;
      }
      if (!/^1\d{10}$/.test(trimmedPhone)) {
        setFeedback({ tone: "error", text: t("account.phoneInvalid") });
        return;
      }
    }

    const payload: { nickname?: string; gender?: Gender; phone?: string } = {};
    if (nicknameChanged) payload.nickname = trimmedNickname;
    if (genderChanged && gender) payload.gender = gender;
    if (phoneChanged) payload.phone = trimmedPhone;

    if (Object.keys(payload).length === 0) {
      setFeedback({ tone: "ok", text: t("account.noChanges") });
      return;
    }

    setSaving(true);
    try {
      await updateProfile(payload);
      const next = await fetchSessionProfile();
      if (next) {
        setNickname(next.nickname ?? "");
        setGender(next.gender);
        setPhone(next.phone ?? "");
        onProfileChange(next);
      }
      notifySessionChanged();
      setFeedback({ tone: "ok", text: t("account.saved") });
    } catch {
      setFeedback({ tone: "error", text: t("account.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* 头像与昵称 */}
      <section className="rounded-lg border border-border bg-surface card-shadow">
        <div className="border-b border-border-light px-5 py-4 md:px-6">
          <h2 className="text-sm font-bold">{t("account.sectionProfile")}</h2>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6">
          <div className="flex items-start gap-4">
            <UserAvatar name={displayName} avatarUrl={profile.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-foreground-tertiary">
                @{profile.username}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                )}
                {uploading ? t("account.uploading") : t("account.changeAvatar")}
              </Button>
              <p className={cn(hintClass, "max-w-[20rem]")}>{t("account.avatarHint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-nickname" className={labelClass}>
              {t("account.nickname")}
            </label>
            <input
              id="profile-nickname"
              value={nickname}
              maxLength={24}
              placeholder={t("account.nicknamePlaceholder")}
              onChange={(event) => setNickname(event.target.value)}
              className={cn(inputClass, fieldClass, "mt-2")}
            />
          </div>
        </div>
      </section>

      {/* 账号信息 */}
      <section className="rounded-lg border border-border bg-surface card-shadow">
        <div className="border-b border-border-light px-5 py-4 md:px-6">
          <h2 className="text-sm font-bold">{t("account.sectionAccount")}</h2>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6">
          <div>
            <label htmlFor="profile-phone" className={labelClass}>
              {t("account.phone")}
            </label>
            <input
              id="profile-phone"
              value={phone}
              inputMode="numeric"
              placeholder={t("account.phonePlaceholder")}
              onChange={(event) =>
                setPhone(event.target.value.replace(/[^\d]/g, "").slice(0, 11))
              }
              className={cn(inputClass, fieldClass, "mt-2")}
            />
          </div>

          <div>
            <span className={labelClass}>{t("account.gender")}</span>
            <div
              role="radiogroup"
              aria-label={t("account.gender")}
              className="mt-2 flex flex-wrap gap-2"
            >
              {(["male", "female"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={gender === value}
                  onClick={() => setGender(value)}
                  className={cn(
                    optionBase,
                    gender === value ? optionActive : optionIdle,
                  )}
                >
                  {gender === value && <Check className="h-3.5 w-3.5" />}
                  {value === "male"
                    ? t("account.genderMale")
                    : t("account.genderFemale")}
                </button>
              ))}
            </div>
            {!gender && <p className={hintClass}>{t("account.genderUnset")}</p>}
          </div>
        </div>
      </section>

      {/* 保存区：底部右对齐，左侧显示未保存状态与操作反馈 */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="mr-auto min-h-5 text-xs">
          {feedback ? (
            <span
              className={cn(
                "font-semibold",
                feedback.tone === "ok" ? "text-primary-strong" : "text-destructive",
              )}
            >
              {feedback.text}
            </span>
          ) : dirty ? (
            <span className="text-foreground-tertiary">{t("account.unsaved")}</span>
          ) : null}
        </div>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saving ? t("account.saving") : t("account.save")}
        </Button>
      </div>
    </div>
  );
}
