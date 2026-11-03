/** 电子宠物：移动端接口与页面共用的类型定义（字段与 /api/app/pet 出参一致） */

export type PetState = 'active' | 'normal' | 'hungry' | 'asleep';

/** 领养页：单个阶段（幼年 / 成长 / 成熟） */
export interface PetSpeciesStageInfo {
  id: string;
  stageKey: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  imageUrl: string | null;
  idleLottieUrl: string | null;
  feedLottieUrl: string | null;
  evolveLottieUrl: string | null;
}

/** 领养页：宠物种类与完整进化路线 */
export interface PetSpeciesInfo {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  icon: string | null;
  tagline: string | null;
  stages: PetSpeciesStageInfo[];
}

/** 当前所处成长阶段 */
export interface PetGrowthStage {
  key: string;
  name: string;
  imageUrl: string | null;
  idleLottieUrl: string | null;
  feedLottieUrl: string | null;
  evolveLottieUrl: string | null;
  /** 侧身形象（走动用），无分层动作包时为空 */
  sideImageUrl: string | null;
  /** 分层动作包清单，空时回落为单动画 */
  motionManifestUrl: string | null;
}

/** 宠物详情（首页卡片与宠物页共用） */
export interface PetDetail {
  id: string;
  nickname: string;
  species: { code: string; name: string; theme: string | null; icon: string | null };
  growthStage: PetGrowthStage;
  schoolStageName: string | null;
  level: number;
  experience: number;
  /** 升到下一级所需累计经验；满级时与 experience 相同 */
  expToNext: number;
  expPerLevel: number;
  satiety: number;
  satietyMax: number;
  state: PetState;
  canFeed: boolean;
  adoptedAt: string;
  companionDays: number;
  /** 三阶段进化路线，用于「查看进化路线」 */
  route: { stageKey: string; name: string; imageUrl: string | null; level: number }[];
}

export interface PetTodayInfo {
  expGained: number;
  expCap: number;
  remainingExp: number;
  feedCount: number;
}

export interface PetBackpackItem {
  foodType: string;
  name: string;
  icon: string | null;
  quantity: number;
  /** 单个食物增加的饱腹度 */
  satiety: number;
  /** 单个食物增加的经验 */
  exp: number;
  obtainHint: string | null;
}

export interface PetStats {
  totalCorrect: number;
  feedCount: number;
  favoriteSubject: string | null;
}

export interface PetFeedRecord {
  id: string;
  createdAt: string;
  dateLabel: string;
  foodType: string;
  quantity: number;
  satietyGain: number;
  expGain: number;
  levelUp: boolean;
  stageUp: boolean;
}

/** GET /api/app/pet */
export interface PetHomeData {
  pet: PetDetail | null;
  today: PetTodayInfo;
  backpack: PetBackpackItem[];
  stats: PetStats;
  recentFeeds: PetFeedRecord[];
}

/** GET /api/app/pet/foods */
export interface PetFoodsData {
  foods: PetBackpackItem[];
  satiety: number;
  satietyMax: number;
}

/** POST /api/app/pet/feed */
export interface PetFeedResult {
  foodType: string;
  quantity: number;
  satietyGain: number;
  expGain: number;
  satiety: number;
  experience: number;
  level: number;
  levelUp: boolean;
  stageUp: boolean;
  evolution: { stageKey: string; name: string; imageUrl: string | null } | null;
  backpack: Record<string, number>;
  today: { expGained: number; expCap: number };
  capped: { satiety: boolean; exp: boolean };
}

/** POST /api/app/study/finish 追加的 pet 出参 */
export interface PetGrantResult {
  granted: { normal: number; premium: number; rare: number };
  expGained: number;
  todayExp: number;
  expCap: number;
  riskBlocked: boolean;
  level: number;
  levelUp: boolean;
  stageUp: boolean;
  evolution: { stageKey: string; name: string; imageUrl: string | null } | null;
  backpack: Record<string, number>;
}
