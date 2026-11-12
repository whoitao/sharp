/**
 * Web 展示层的北京时间工具：与 apps/admin/lib/datetime.ts 同一套日界。
 * 学习记录按天分组、热力条日键都必须用北京日历日，
 * 用浏览器本地时区会在海外设备上整体错一天。
 */
const BEIJING_TIME_ZONE = "Asia/Shanghai";

interface DateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function partsOf(value: string | number | Date | null | undefined): DateParts | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
  };
}

/** YYYY-MM-DD（北京时间）；空值或非法时间返回 null */
export function beijingDateStr(value: string | number | Date | null | undefined): string | null {
  const parts = partsOf(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

/** HH:mm（北京时间），按天分组内一行的时刻 */
export function beijingClock(value: string | number | Date | null | undefined): string {
  const parts = partsOf(value);
  return parts ? `${parts.hour}:${parts.minute}` : "";
}

/** YYYY-MM-DD 偏移 days 天（日界固定，按 UTC 整天步进即可） */
export function shiftDateStr(dateStr: string, days: number): string {
  const shifted = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(shifted.getTime())) return dateStr;
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** YYYY-MM-DD → 纪元日序号，用于算两个北京日之间差几天 */
export function dayNumber(dateStr: string): number {
  const time = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Number.isNaN(time) ? 0 : Math.round(time / 86_400_000);
}
