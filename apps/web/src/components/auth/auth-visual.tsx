"use client";

import { useLocale } from "@/lib/i18n";

/** 登录页右侧的品牌插画区：宽屏显示，窄屏收起，优先保证表单可读 */
export function AuthVisual() {
  const { t } = useLocale();

  const metrics = [
    { value: "12", label: t("auth.metricTextbooks") },
    { value: "26", label: t("auth.metricDays") },
    { value: "10", label: t("auth.metricUnit") },
  ];

  return (
    <aside className="relative hidden overflow-hidden rounded-lg border border-border bg-primary-light p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
          {t("auth.visualEyebrow")}
        </span>
        <h2 className="mt-3 text-2xl font-bold leading-snug">
          {t("auth.visualTitle")}
        </h2>
        <p className="mt-3 max-w-[26rem] text-sm leading-6 text-foreground-secondary">
          {t("auth.visualBody")}
        </p>
      </div>

      <div className="relative my-6 flex justify-center">
        <PetMascot />
      </div>

      <div className="relative grid grid-cols-3 gap-3 border-t border-primary/20 pt-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="text-xl font-bold tabular-nums text-primary-strong">
              {metric.value}
            </div>
            <div className="mt-0.5 text-xs text-foreground-secondary">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PetMascot() {
  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      className="h-[212px] w-[212px]"
    >
      <defs>
        <linearGradient id="authPetBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A7F3D0" />
          <stop offset="1" stopColor="#5EEAD4" />
        </linearGradient>
        <linearGradient id="authPetEar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="authPetBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#ECFDF5" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="288" rx="88" ry="15" fill="#0B7F58" opacity="0.14" />
      <path
        d="M234 210c36-4 54-28 46-56-6-22-30-24-36-8"
        fill="none"
        stroke="#34D399"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <ellipse cx="126" cy="274" rx="31" ry="17" fill="#A7F3D0" />
      <ellipse cx="194" cy="274" rx="31" ry="17" fill="#A7F3D0" />
      <path d="M106 74c-18-30-10-50 10-45 15 3 23 17 25 34z" fill="url(#authPetEar)" />
      <path d="M214 74c18-30 10-50-10-45-15 3-23 17-25 34z" fill="url(#authPetEar)" />
      <path d="M113 66c-10-17-5-28 8-25 9 2 13 10 14 20z" fill="#D1FAE5" />
      <path d="M207 66c10-17 5-28-8-25-9 2-13 10-14 20z" fill="#D1FAE5" />
      <ellipse cx="160" cy="198" rx="86" ry="82" fill="url(#authPetBody)" />
      <ellipse cx="160" cy="214" rx="52" ry="54" fill="url(#authPetBelly)" opacity="0.92" />
      <ellipse cx="86" cy="196" rx="16" ry="25" fill="#6EE7B7" transform="rotate(-16 86 196)" />
      <ellipse cx="234" cy="196" rx="16" ry="25" fill="#6EE7B7" transform="rotate(16 234 196)" />
      <circle cx="160" cy="118" r="70" fill="url(#authPetBody)" />
      <path d="M148 50c2-15 19-20 28-10 8 9 4 20-7 25" fill="#10B981" />
      <path d="M170 46c0-9 8-13 12-7 3 5 0 11-5 14" fill="#34D399" />
      <ellipse cx="136" cy="116" rx="8.5" ry="10" fill="#10231A" />
      <ellipse cx="184" cy="116" rx="8.5" ry="10" fill="#10231A" />
      <circle cx="139" cy="112" r="3" fill="#FFFFFF" />
      <circle cx="187" cy="112" r="3" fill="#FFFFFF" />
      <ellipse cx="116" cy="140" rx="11" ry="6.5" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="204" cy="140" rx="11" ry="6.5" fill="#FCA5A5" opacity="0.5" />
      <path d="M160 128v6" stroke="#0B7F58" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M150 140c3.5 7 16.5 7 20 0"
        fill="none"
        stroke="#0B7F58"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M258 92l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"
        fill="#FBBF24"
        opacity="0.85"
      />
      <path
        d="M62 100l2.6 7 7 2.6-7 2.6-2.6 7-2.6-7-7-2.6 7-2.6z"
        fill="#34D399"
        opacity="0.7"
      />
    </svg>
  );
}
