/**
 * 科目图标统一存 @expo/vector-icons 的 Ionicons 名称，后台通过同一份字体渲染，
 * 移动端直接交给 <Ionicons />，两端显示完全一致。
 * 这里是允许选择的图标白名单（codepoint 取自 Ionicons 15.x 的 glyphmap）。
 */
export const SUBJECT_ICON_GLYPHS = {
  // 数学 / 逻辑
  "calculator-outline": 0xf1cd,
  "grid-outline": 0xf356,
  "shapes-outline": 0xf56f,
  "infinite-outline": 0xf395,
  "stats-chart-outline": 0xf59c,
  "pie-chart-outline": 0xf4b8,
  "bar-chart-outline": 0xf170,
  "trending-up-outline": 0xf5fc,
  "resize-outline": 0xf533,
  "pricetags-outline": 0xf4ee,
  "hourglass-outline": 0xf386,
  "timer-outline": 0xf5e1,
  "compass-outline": 0xf284,
  "navigate-outline": 0xf470,
  "locate-outline": 0xf3c2,

  // 语文 / 外语 / 人文
  "book-outline": 0xf1a6,
  "library-outline": 0xf3b6,
  "reader-outline": 0xf50c,
  "language-outline": 0xf3aa,
  "text-outline": 0xf5cc,
  "chatbubbles-outline": 0xf218,
  "chatbox-ellipses-outline": 0xf20d,
  "newspaper-outline": 0xf473,
  "document-text-outline": 0xf2b4,
  "create-outline": 0xf293,
  "pencil-outline": 0xf49d,

  // 美术 / 音乐 / 影视
  "brush-outline": 0xf1b8,
  "color-palette-outline": 0xf27e,
  "color-filter-outline": 0xf27b,
  "easel-outline": 0xf2c6,
  "images-outline": 0xf392,
  "camera-outline": 0xf1dc,
  "videocam-outline": 0xf611,
  "film-outline": 0xf2ff,
  "mic-outline": 0xf45e,
  "headset-outline": 0xf368,
  "musical-notes-outline": 0xf46a,
  "musical-note-outline": 0xf467,

  // 物理 / 化学 / 生物 / 地理
  "flask-outline": 0xf320,
  "beaker-outline": 0xf18e,
  "prism-outline": 0xf4f4,
  "magnet-outline": 0xf42e,
  "nuclear-outline": 0xf482,
  "thermometer-outline": 0xf5cf,
  "earth-outline": 0xf2c3,
  "globe-outline": 0xf350,
  "planet-outline": 0xf4c4,
  "leaf-outline": 0xf3b3,
  "nutrition-outline": 0xf485,
  "paw-outline": 0xf49a,
  "bug-outline": 0xf1bb,
  "fish-outline": 0xf30b,
  "rocket-outline": 0xf548,

  // 体育 / 健康
  "fitness-outline": 0xf30e,
  "football-outline": 0xf32c,
  "basketball-outline": 0xf17f,
  "tennisball-outline": 0xf5c6,
  "bicycle-outline": 0xf197,
  "body-outline": 0xf1a0,
  "heart-outline": 0xf377,
  "medkit-outline": 0xf44c,
  "pulse-outline": 0xf4f7,

  // 信息技术
  "laptop-outline": 0xf3ad,
  "desktop-outline": 0xf29f,
  "phone-portrait-outline": 0xf4b5,
  "hardware-chip-outline": 0xf365,
  "terminal-outline": 0xf5c9,
  "code-slash-outline": 0xf26f,
  "cog-outline": 0xf275,
  "construct-outline": 0xf287,
  "cube-outline": 0xf299,
  "layers-outline": 0xf3b0,
  "git-network-outline": 0xf347,
  "game-controller-outline": 0xf335,

  // 通用 / 其他学科
  "school-outline": 0xf55d,
  "trophy-outline": 0xf602,
  "medal-outline": 0xf446,
  "star-outline": 0xf599,
  "bulb-outline": 0xf1c1,
  "flag-outline": 0xf311,
  "ribbon-outline": 0xf545,
  "bookmark-outline": 0xf1a9,
  "briefcase-outline": 0xf1b2,
  "people-outline": 0xf4a3,
  "walk-outline": 0xf623,
  "airplane-outline": 0xf10a,
  "car-outline": 0xf1e2,
  "train-outline": 0xf5ed,
  "home-outline": 0xf383,
  "business-outline": 0xf1c7,
  "map-outline": 0xf443,
  "pin-outline": 0xf4bb,
  "time-outline": 0xf5de,
  "calendar-outline": 0xf1d6,
} as const;

export type SubjectIconName = keyof typeof SUBJECT_ICON_GLYPHS;

export const SUBJECT_ICON_NAMES = Object.keys(SUBJECT_ICON_GLYPHS) as SubjectIconName[];

export function isSubjectIconName(value?: string | null): value is SubjectIconName {
  return !!value && value in SUBJECT_ICON_GLYPHS;
}
