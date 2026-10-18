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
  type: QuestionType;
  content: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  createdAt: string;
  options: QuestionOption[];
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
}

export interface Admin {
  id: string;
  username: string;
  role: string;
  createdAt: string;
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
  unitIndex: number;
  startedAt: string;
  finishedAt: string | null;
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

export interface FinishStudyRequest {
  categoryId: string;
  unitIndex: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
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
}
