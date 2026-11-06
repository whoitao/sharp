/** 宠物接口封装：字段与 /api/app/pet 出参、packages/shared/src/pet.ts 保持一致 */

export type PetState = "active" | "normal" | "hungry" | "asleep";

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

export interface PetSpeciesInfo {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  icon: string | null;
  tagline: string | null;
  stages: PetSpeciesStageInfo[];
}

export interface PetGrowthStage {
  key: string;
  name: string;
  imageUrl: string | null;
  idleLottieUrl: string | null;
  feedLottieUrl: string | null;
  evolveLottieUrl: string | null;
  sideImageUrl: string | null;
  motionManifestUrl: string | null;
}

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

export interface PetHomeData {
  pet: PetDetail | null;
  today: PetTodayInfo;
  backpack: PetBackpackItem[];
  stats: PetStats;
  recentFeeds: PetFeedRecord[];
}

export interface PetFoodsData {
  foods: PetBackpackItem[];
  satiety: number;
  satietyMax: number;
}

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

export interface PetFeedsResponse {
  data: PetFeedRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 保留接口错误码，便于喂食/领养时给出与移动端一致的提示 */
export class PetApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, code: string | null) {
    super(code ?? `HTTP ${status}`);
    this.name = "PetApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/app${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { error?: unknown };
      code = typeof body.error === "string" ? body.error : null;
    } catch {
      /* 非 JSON 错误体 */
    }
    throw new PetApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export function getPetHome(): Promise<PetHomeData> {
  return request<PetHomeData>("/pet");
}

export function getPetSpecies(): Promise<PetSpeciesInfo[]> {
  return request<PetSpeciesInfo[]>("/pet/species");
}

export function adoptPet(speciesId: string, nickname: string): Promise<{ pet: { id: string } }> {
  return request<{ pet: { id: string } }>("/pet/adopt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speciesId, nickname }),
  });
}

export function getPetFoods(): Promise<PetFoodsData> {
  return request<PetFoodsData>("/pet/foods");
}

export function feedPet(foodType: string, quantity: number): Promise<PetFeedResult> {
  return request<PetFeedResult>("/pet/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foodType, quantity }),
  });
}

export function getPetFeeds(page = 1): Promise<PetFeedsResponse> {
  return request<PetFeedsResponse>(`/pet/feeds?page=${page}`);
}
