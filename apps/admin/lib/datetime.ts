/**
 * 展示层时间格式化：数据库统一存 UTC，界面固定按北京时间（Asia/Shanghai）输出。
 * 不修改服务器进程时区，避免影响按小时结算的饱腹度衰减与历史数据。
 */
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

interface DateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function partsOf(value: string | Date | null | undefined): DateParts | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

/** YYYY-MM-DD HH:mm（北京时间）；空值或非法时间返回 "-" */
export function formatDateTime(value: string | Date | null | undefined): string {
  const parts = partsOf(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` : "-";
}

/** YYYY-MM-DD（北京时间） */
export function formatDateOnly(value: string | Date | null | undefined): string {
  const parts = partsOf(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "-";
}

/** MM-DD HH:mm（北京时间），用于同一天内的紧凑展示 */
export function formatMonthDayTime(value: string | Date | null | undefined): string {
  const parts = partsOf(value);
  return parts ? `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` : "";
}

/**
 * 北京日历日的日键：返回该日 UTC 零点的 Date，供 @db.Date 列写入。
 * 不能用 new Date() + setHours(0,0,0,0)：那取的是进程时区的零点，
 * 在 UTC 服务器上会把北京时间 00:00–08:00 的学习记到前一天。
 */
export function beijingDayKey(value: string | Date = new Date()): Date {
  const parts = partsOf(value);
  if (!parts) return new Date(NaN);
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

/** YYYY-MM-DD（北京时间），与 beijingDayKey 同一套日界；空值返回 null */
export function beijingDateStr(value: string | Date | null | undefined): string | null {
  const parts = partsOf(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

/** 某北京日的 [当日零点, 次日零点) UTC 区间，供 finishedAt 范围过滤 */
export function beijingDayRange(dateStr: string): { start: Date; end: Date } | null {
  const day = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return null;
  return { start: day, end: new Date(day.getTime() + 86_400_000) };
}

/** YYYY-MM-DD 偏移 n 天（日界已由 beijingDayKey 定死，这里按 UTC 整天步进） */
export function shiftDateStr(dateStr: string, days: number): string {
  const shifted = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(shifted.getTime())) return dateStr;
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** dateStr 所在北京周的周一（周为一周起点） */
export function beijingWeekStartStr(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return dateStr;
  return shiftDateStr(dateStr, -((day.getUTCDay() + 6) % 7));
}
