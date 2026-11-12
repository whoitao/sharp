import { beijingDateStr, shiftDateStr } from "@/lib/datetime";
import type { StudyRecordDto } from "@/lib/learn/api";

/** useLocale 返回的 t：Web 词典用 {name} 占位，不存函数 */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * 概览的四列几何：用时那一列更宽（1小时45分 是唯一会超长的值），
 * 分段胶囊、骨架、指标三处必须共用同一套列宽，否则胶囊会和它对上的数字逐列错位。
 */
export const METRIC_GRID =
  "grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.35fr)] gap-2";

/** 正确率上色：≥85 掌握良好 / 60~84 需要巩固 / <60 尚未掌握 / 未作答灰色 */
export function accuracyTone(accuracy: number, started: boolean): string {
  if (!started) return "text-foreground-tertiary";
  if (accuracy >= 85) return "text-primary-strong";
  if (accuracy >= 60) return "text-warning";
  return "text-destructive";
}

export function accuracyOf(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/**
 * 热力条分档底色：token 只有最浅一档绿，其余用主色透明度补，
 * 深色主题自动跟着 --primary 走，不必像移动端那样各写一套色阶。
 */
export const HEAT_BG = [
  "bg-transparent",
  "bg-primary/15",
  "bg-primary/35",
  "bg-primary/65",
  "bg-primary",
] as const;

/** 0 格留空，其余按当日题量占 14 天峰值的比例分四档 */
export function heatLevel(value: number, max: number): number {
  if (value <= 0) return 0;
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 0.66) return 4;
  if (ratio > 0.33) return 3;
  if (ratio > 0.1) return 2;
  return 1;
}

/** 日标签工厂：今天一次算好，列表里每行不必重复格式化 */
export function createDayLabel(t: Translate) {
  const todayStr = beijingDateStr(new Date()) ?? "";
  const yesterdayStr = shiftDateStr(todayStr, -1);
  return (dateStr: string): string => {
    if (!dateStr) return "";
    if (dateStr === todayStr) return t("records.dayToday");
    if (dateStr === yesterdayStr) return t("records.dayYesterday");
    const [month, day] = dateStr.slice(5).split("-");
    return t("records.monthDay", { month: Number(month), day: Number(day) });
  };
}

/** 满一小时改说小时：1 小时 45 分比 105 分直观，也比 01:45 更适合中文 */
export function durationLabel(t: Translate, seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return mins > 0
      ? t("records.durationHoursMinutes", { h: hours, m: mins })
      : t("records.durationHours", { h: hours });
  }
  if (mins > 0) return t("records.durationMinutesSeconds", { m: mins, s: secs });
  return t("records.durationSeconds", { s: secs });
}

export interface RecordDayGroup {
  date: string;
  records: StudyRecordDto[];
  questions: number;
  wrong: number;
  duration: number;
}

/**
 * 按天分组：日键取北京日历日（与热力条、概览口径同一日界），
 * 组头数字来自本页已加载的记录，保证与下面的行对得上。
 */
export function groupRecordsByDay(records: StudyRecordDto[]): RecordDayGroup[] {
  const groups = new Map<string, RecordDayGroup>();
  for (const record of records) {
    const date = beijingDateStr(record.finishedAt ?? record.startedAt);
    if (!date) continue;
    const group = groups.get(date) ?? {
      date,
      records: [],
      questions: 0,
      wrong: 0,
      duration: 0,
    };
    group.records.push(record);
    group.questions += record.totalQuestions;
    group.wrong += record.wrongCount;
    group.duration += record.durationSeconds ?? 0;
    groups.set(date, group);
  }
  // 接口按 finishedAt 倒序返回，分组后仍需保证「最近的一天」在前
  return [...groups.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}
