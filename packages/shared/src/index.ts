export enum QuestionType {
  SINGLE_CHOICE = 1,
  MULTIPLE_CHOICE = 2,
  TRUE_FALSE = 3,
  FILL_BLANK = 4,
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export enum QuestionStatus {
  UNSEEN = 'unseen',
  CORRECT = 'correct',
  WRONG = 'wrong',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum Language {
  ZH = 'zh',
  EN = 'en',
}

export enum Density {
  COMPACT = 'compact',
  COMFORTABLE = 'comfortable',
  SPACIOUS = 'spacious',
}

export interface Category {
  id: string;
  name: string;
  parentId: string;
  sortOrder: number;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  questionCount?: number;
}

export interface Question {
  id: string;
  categoryId: string;
  subjectId: string | null;
  type: QuestionType;
  content: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  createdAt: string;
  options: QuestionOption[];
  knowledgePoints?: { id: string; name: string; parentId: string | null }[];
}

export interface QuestionOption {
  id: string;
  questionId: string;
  optionKey: string;
  content: string;
  isCorrect: boolean;
  sortNo: number;
}

export interface User {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  unitSize: number;
  theme: Theme;
  language: Language;
  density: Density;
}

export interface Admin {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 首页科目概览：题目总量与当前用户已学比例 */
export interface SubjectOverview {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  questionCount: number;
  learnedCount: number;
  /** 已学百分比（0-100，按已作答的去重题目数 / 题目总数） */
  progress: number;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  parentId: string | null;
  subjectId: string | null;
  sortOrder: number;
  questionCount?: number;
  children?: KnowledgePoint[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitInfo {
  unitIndex: number;
  startIndex: number;
  endIndex: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface StudyRecord {
  id: string;
  userId: string;
  categoryId: string;
  /** 学习时选择的科目筛选（null = 未筛选） */
  subjectId: string | null;
  /** 学习时选择的知识点筛选（null = 未筛选） */
  knowledgePointId: string | null;
  unitIndex: number;
  startedAt: string;
  finishedAt: string | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
}

/** 重学某单元时展示的「上次学习」摘要（只含已完成的记录） */
export interface StudyRecordSummary {
  finishedAt: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
}

export interface QuestionProgress {
  userId: string;
  questionId: string;
  categoryId: string;
  status: QuestionStatus;
  lastPracticedAt: string | null;
  correctCount: number;
  wrongCount: number;
}

export interface DailyStat {
  userId: string;
  date: string;
  questionsAnswered: number;
  unitsCompleted: number;
  studyDurationSeconds: number;
}

export interface DashboardStats {
  totalUsers: number;
  todayNewUsers: number;
  todayActiveUsers: number;
  totalStudySessions: number;
  todayStudySessions: number;
  totalCategories: number;
  totalQuestions: number;
}

export interface TrendData {
  date: string;
  newUsers: number;
  studySessions: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SubmitAnswerRequest {
  questionId: string;
  selectedKeys: string[];
}

export interface StartStudyRequest {
  categoryId: string;
  unitIndex: number;
}

export interface AnswerItem {
  questionId: string;
  selectedKeys: string[];
  isCorrect: boolean;
}

export interface FinishStudyRequest {
  categoryId: string;
  unitIndex: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  answers: AnswerItem[];
}

export interface CreateCategoryRequest {
  name: string;
  parentId: string;
  sortOrder?: number;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  sortOrder?: number;
  icon?: string;
}

export interface CreateQuestionRequest {
  categoryId: string;
  subjectId?: string;
  knowledgePointIds?: string[];
  type: QuestionType;
  content: string;
  analysis?: string;
  difficulty?: number;
  score?: number;
  sortOrder?: number;
  options: {
    optionKey: string;
    content: string;
    isCorrect: boolean;
  }[];
}

export interface UpdateQuestionRequest {
  subjectId?: string;
  knowledgePointIds?: string[];
  type?: QuestionType;
  content?: string;
  analysis?: string;
  difficulty?: number;
  score?: number;
  sortOrder?: number;
  options?: {
    optionKey: string;
    content: string;
    isCorrect: boolean;
  }[];
}

export interface UpdateSettingsRequest {
  unitSize?: number;
  theme?: Theme;
  language?: Language;
  density?: Density;
}

/**
 * Supabase Storage 公开桶的默认名字（apps/admin 里 env 覆盖）。
 * 和 apps/admin/lib/storage.ts 保持一致。
 */
export const DEFAULT_SUPABASE_AVATAR_BUCKET = 'sharpbucket';

/**
 * 头像 URL 拼接 helper。
 *
 * DB 里只存相对路径：{userId}/avatars/avatar.jpg
 * 展示层用它拼完整 URL，Supabase project 迁移 / 换 CDN 不用改 DB。
 *
 * 兼容历史：如果 avatarPath 已经是 https://... 完整 URL，原样返回。
 */
export function buildAvatarUrl(
  avatarPath: string | null | undefined,
  supabaseUrl: string | undefined,
  bucket: string = DEFAULT_SUPABASE_AVATAR_BUCKET,
): string | null {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) return avatarPath;
  if (!supabaseUrl) return null;
  const base = supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${bucket}/${avatarPath}`;
}
