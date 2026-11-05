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
