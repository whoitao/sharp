import type { TranslationKeys } from '../i18n/zh';
import type { NotificationType } from '../services/api';
import { getDisplayParts } from './datetime';

/** 列表与详情共用：类型 → 图标 + 文案 key */
export type NotificationTypeLabelKey =
  | 'notificationsTypeSystem'
  | 'notificationsTypePet'
  | 'notificationsTypeStudy'
  | 'notificationsTypeAccount';

export type NotificationIconName =
  | 'megaphone-outline'
  | 'paw-outline'
  | 'book-outline'
  | 'person-circle-outline';

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { icon: NotificationIconName; labelKey: NotificationTypeLabelKey }
> = {
  system: { icon: 'megaphone-outline', labelKey: 'notificationsTypeSystem' },
  pet: { icon: 'paw-outline', labelKey: 'notificationsTypePet' },
  study: { icon: 'book-outline', labelKey: 'notificationsTypeStudy' },
  account: { icon: 'person-circle-outline', labelKey: 'notificationsTypeAccount' },
};

/** 消息时间：今天/昨天显示时分，更早显示日期（北京时间）；列表与详情共用 */
export function formatNotificationTime(
  value: string | null,
  t: TranslationKeys,
): string {
  if (!value) return '';
  const parts = getDisplayParts(value);
  if (!parts) return '';
  const now = getDisplayParts(new Date());
  if (!now) return '';
  if (parts.year === now.year && parts.month === now.month && parts.day === now.day) {
    return `${t.notificationsToday} ${parts.hour}:${parts.minute}`;
  }
  const yesterday = getDisplayParts(new Date(Date.now() - 86400000));
  if (
    yesterday &&
    parts.year === yesterday.year &&
    parts.month === yesterday.month &&
    parts.day === yesterday.day
  ) {
    return `${t.notificationsYesterday} ${parts.hour}:${parts.minute}`;
  }
  return parts.year === now.year
    ? `${parts.month}-${parts.day}`
    : `${parts.year}-${parts.month}-${parts.day}`;
}
