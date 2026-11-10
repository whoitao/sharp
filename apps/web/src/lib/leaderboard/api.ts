export type LeaderboardPeriod = "week" | "month" | "all";

export interface QuizLeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string | null;
  avatar: string | null;
  totalQuestions: number;
  accuracy: number;
  gradeName: string | null;
}

export interface PetLeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string | null;
  avatar: string | null;
  petName: string | null;
  petSpecies: string | null;
  petImageUrl: string | null;
  petLevel: number;
  petExp: number;
}

export interface QuizLeaderboardResponse {
  entries: QuizLeaderboardEntry[];
  currentUser: QuizLeaderboardEntry | null;
  nextRankGap: number | null;
}

export interface PetLeaderboardResponse {
  entries: PetLeaderboardEntry[];
  currentUser: PetLeaderboardEntry | null;
  nextRankGap: number | null;
}

export class LeaderboardApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "LeaderboardApiError";
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`/api/app${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new LeaderboardApiError(res.status, `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getQuizLeaderboard(period: LeaderboardPeriod = "week"): Promise<QuizLeaderboardResponse> {
  return request<QuizLeaderboardResponse>(`/leaderboard?type=quiz&period=${period}`);
}

export function getPetLeaderboard(period: LeaderboardPeriod = "week"): Promise<PetLeaderboardResponse> {
  return request<PetLeaderboardResponse>(`/leaderboard?type=pet&period=${period}`);
}
