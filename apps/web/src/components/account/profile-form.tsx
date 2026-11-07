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
import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputClass =
  "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

/** 三组表单统一宽度，避免昵称、性别、手机号各占一种宽度 */
const fieldClass = "sm:max-w-[20rem]";

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
    <section className="rounded-lg border border-border bg-surface p-5 card-shadow md:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={displayName} avatarUrl={profile.avatarUrl} size="lg" />
        <div className="min-w-0">
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
          <p className="mt-2 max-w-sm text-xs leading-5 text-foreground-tertiary">
            {t("account.avatarHint")}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="profile-nickname" className="block text-sm font-bold">
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

        <div>
          <span className="block text-sm font-bold">{t("account.gender")}</span>
          <div className={cn("mt-2 grid grid-cols-2 gap-2", fieldClass)}>
            {(["male", "female"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGender(value)}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-semibold transition-colors",
                  gender === value
                    ? "border-primary bg-primary-light text-primary-strong"
                    : "border-border bg-surface text-foreground-secondary hover:border-primary/40",
                )}
              >
                {value === "male" ? t("account.genderMale") : t("account.genderFemale")}
              </button>
            ))}
          </div>
          {!gender && (
            <p className="mt-1.5 text-xs text-foreground-tertiary">
              {t("account.genderUnset")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="profile-phone" className="block text-sm font-bold">
            {t("account.phone")}
          </label>
          <input
            id="profile-phone"
            value={phone}
            inputMode="numeric"
            placeholder={t("account.phonePlaceholder")}
            onChange={(event) => setPhone(event.target.value.replace(/[^\d]/g, "").slice(0, 11))}
            className={cn(inputClass, fieldClass, "mt-2")}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-light pt-5">
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saving ? t("account.saving") : t("account.save")}
        </Button>
        {feedback && (
          <span
            className={cn(
              "text-xs font-semibold",
              feedback.tone === "ok" ? "text-primary-strong" : "text-destructive",
            )}
          >
            {feedback.text}
          </span>
        )}
      </div>
    </section>
  );
}
