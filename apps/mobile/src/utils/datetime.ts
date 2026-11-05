/**
 * 展示层时间格式化：接口返回 UTC ISO 字符串，界面固定按北京时间（Asia/Shanghai）输出。
 * 相对时间（如「3 小时前」）仍由调用方自行计算，这里只处理绝对时间。
 */
const DISPLAY_TIME_ZONE = 'Asia/Shanghai';

export interface DisplayDateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

export const getDisplayParts = (value: string | Date | null | undefined): DisplayDateParts | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
};

/** YYYY-MM-DD（北京时间）；空值或非法时间返回空串 */
export const formatDate = (value: string | Date | null | undefined): string => {
  const parts = getDisplayParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
};

/** YYYY-MM-DD HH:mm（北京时间） */
export const formatDateTime = (value: string | Date | null | undefined): string => {
  const parts = getDisplayParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` : '';
};
