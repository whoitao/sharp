import type {
  AnswerItem,
  ArticleDetail,
  ArticleListItem,
  Chapter,
  ChapterStudyStat,
  Density,
  FavoriteListResponse,
  Grade,
  KnowledgePoint,
  KnowledgePointStudyStat,
  Language,
  LeaderboardPeriod,
  LoginResponse,
  PaginatedResponse,
  PetFeedRecord,
  PetFeedResult,
  PetFoodsData,
  PetHomeData,
  PetLeaderboardResponse,
  PetSpeciesInfo,
  Question,
  QuestionTag,
  QuizLeaderboardResponse,
  StudyRecord,
  StudyRecordSummary,
  StudyStatsOverview,
  StudyStatsRangeKey,
  Subject,
  SubjectOverview,
  TextbookCatalog,
  TextbookSubjectAvailability,
  Theme,
  UnitInfo,
  UserSettings
} from '@sharp/shared';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { dedupeInFlight } from '../utils/dedupe';
import { storage } from '../utils/storage';
import { getCached, setCached } from '../utils/studyCache';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://admin.sharp.whoitao.top/";

// ─── Mock data for offline/demo mode ───────────────────────────────────────────
const mockSubjects: Subject[] = [
  { id: '1', name: '英语', icon: null, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: '数学', icon: null, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: '语文', icon: null, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockKnowledgePoints: KnowledgePoint[] = [
  { id: '1', name: '词汇', parentId: null, subjectId: '1', sortOrder: 0, children: [], questionCount: 0 },
  { id: '2', name: '语法', parentId: null, subjectId: '1', sortOrder: 1, children: [], questionCount: 0 },
  { id: '3', name: '阅读理解', parentId: null, subjectId: '1', sortOrder: 2, children: [], questionCount: 0 },
];

function generateMockQuestions(unitIndex: number, count: number): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const qIndex = unitIndex * count + i + 1;
    questions.push({
      id: `${qIndex}`,
      gradeId: null,
      subjectId: null,
      chapterId: null,
      type: 1,
      content: `第${qIndex}题：以下哪个是 "elucidate" 的正确释义？`,
      analysis: '"elucidate" 意为阐明、解释。',
      difficulty: Math.ceil(Math.random() * 5),
      score: 1,
      sortOrder: i,
      createdAt: new Date().toISOString(),
      options: [
        {
          id: `${qIndex * 10 + 1}`,
          questionId: `${qIndex}`,
          optionKey: 'A',
          content: '阐明，解释',
          isCorrect: true,
          sortNo: 1,
        },
        {
          id: `${qIndex * 10 + 2}`,
          questionId: `${qIndex}`,
          optionKey: 'B',
          content: '混淆，使模糊',
          isCorrect: false,
          sortNo: 2,
        },
        {
          id: `${qIndex * 10 + 3}`,
          questionId: `${qIndex}`,
          optionKey: 'C',
          content: '消除，移除',
          isCorrect: false,
          sortNo: 3,
        },
        {
          id: `${qIndex * 10 + 4}`,
          questionId: `${qIndex}`,
          optionKey: 'D',
          content: '增加，提升',
          isCorrect: false,
          sortNo: 4,
        },
      ],
    });
  }
  return questions;
}

function generateMockUnits(totalQuestions: number, unitSize: number): UnitInfo[] {
  const unitCount = Math.ceil(totalQuestions / unitSize);
  const units: UnitInfo[] = [];
  for (let i = 0; i < unitCount; i++) {
    const start = i * unitSize;
    const end = Math.min(start + unitSize, totalQuestions);
    units.push({
      unitIndex: i,
      startIndex: start,
      endIndex: end - 1,
      totalQuestions: end - start,
      answeredCount: i === 0 ? 10 : 0,
      correctCount: i === 0 ? 8 : 0,
      status: i === 0 ? 'in_progress' : i < 2 ? 'completed' : 'not_started',
    });
  }
  return units;
}

// ─── Axios instance ────────────────────────────────────────────────────────────

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await storage.clear();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

/** 优先透出后端返回的业务错误文案，避免把所有失败都笼统归为网络错误 */
const apiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as AxiosError<{ error?: string }>).response?.data;
  return data?.error ?? fallback;
};

/** 宠物接口：优先透出后端 message（如「宠物吃饱了」），否则回退错误码 */
const petErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as AxiosError<{ error?: string; message?: string }>).response?.data;
  return data?.message ?? data?.error ?? fallback;
};

// ─── API Methods ───────────────────────────────────────────────────────────────

/** 教材版本选项：当前科目/年级下有章节的版本（0 题也算），附题数（后端 /api/app/publishers 按题数降序） */
export interface PublisherOption {
  id: string;
  name: string;
  questionCount: number;
}

// ─── 站内信 ──────────────────────────────────────────────────────────────────

export type NotificationType = 'system' | 'pet' | 'study' | 'account';
export type NotificationLevel = 'info' | 'warning' | 'important';
export type NotificationActionType = 'none' | 'page' | 'url';

/** 与 /api/app/notifications 系列接口返回字段保持一致 */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  body: string;
  actionType: NotificationActionType;
  actionValue: string | null;
  publishedAt: string | null;
  readAt: string | null;
  isRead: boolean;
}

export interface NotificationListResult {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

/** 站内信接口错误：保留 HTTP 状态码，页面据此区分「内容已失效（404）」与加载失败 */
export class NotificationApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'NotificationApiError';
  }
}

// ─── 问题反馈（契约与 web/后端保持一致） ────────────────────────────────────────

export type FeedbackCategory = 'bug' | 'suggestion' | 'content' | 'account' | 'other';
export type FeedbackStatus = 'pending' | 'replied' | 'closed';

export interface FeedbackListItem {
  id: string;
  summary: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  replyCount: number;
  lastReplyAt: string | null;
  hasUnreadReply: boolean;
  createdAt: string;
}

export interface FeedbackReplyItem {
  id: string;
  authorType: 'user' | 'admin';
  content: string;
  createdAt: string;
}

export interface FeedbackDetail {
  id: string;
  content: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  source: string;
  pageContext: string | null;
  contact: string | null;
  replyCount: number;
  createdAt: string;
  lastReplyAt: string | null;
  replies: FeedbackReplyItem[];
}

export interface FeedbackListResult {
  items: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 保留 HTTP 状态码与后端错误码（如 CONTENT_TOO_SHORT / FEEDBACK_CLOSED），页面直接透出服务端文案 */
export class FeedbackApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'FeedbackApiError';
  }
}

const toFeedbackError = (err: unknown, fallback: string): FeedbackApiError => {
  const response = (err as AxiosError<{ error?: string; code?: string }>).response;
  return new FeedbackApiError(
    response?.status ?? 0,
    response?.data?.error ?? fallback,
    response?.data?.code,
  );
};

export const api = {
  // Auth
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/app/auth/login', {
        username,
        password,
      });
      return response.data;
    } catch (err) {
      // 不再回退 mock token：假 token 会让后续所有接口 401，问题被掩盖
      throw new Error(apiErrorMessage(err, 'Login failed'));
    }
  },

  async register(username: string, password: string): Promise<LoginResponse> {
    try {
      await apiClient.post(
        '/api/app/auth/register',
        { username, password },
        { headers: { 'x-client-source': 'mobile' } }
      );
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Registration failed'));
    }
    // 后端注册接口只返回 user，不返回 token，需再用同一凭据登录换取 token
    return api.login(username, password);
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return dedupeInFlight('subjects', async () => {
      const cached = await getCached<Subject[]>('subjects');
      if (cached) return cached;

      try {
        const response = await apiClient.get<Subject[]>('/api/app/subjects');
        if (response.data.length > 0) {
          await setCached('subjects', response.data);
        }
        return response.data;
      } catch {
        return mockSubjects;
      }
    });
  },

  // 首页科目概览：题目总数 + 当前用户已学比例，随作答变化，不走本地缓存。
  // tagIds?: 按题目标签（如中考真题/模拟题）过滤题目与进度，多选时命中任意一个即算入。
  async getSubjectOverview(tagIds?: string[]): Promise<SubjectOverview[]> {
    const cacheSuffix = tagIds && tagIds.length > 0 ? tagIds.join(',') : 'all';
    return dedupeInFlight(`subjectOverview:${cacheSuffix}`, async () => {
      try {
        const params: Record<string, string> = {};
        if (tagIds && tagIds.length > 0) params.tagIds = tagIds.join(',');
        const response = await apiClient.get<SubjectOverview[]>('/api/app/subjects/overview', {
          params,
        });
        return response.data;
      } catch {
        return [];
      }
    });
  },

  // Knowledge Points
  // gradeId / publisherId：全局学习范围（年级 + 「我的教材」版本），传入后题数按同一口径重算并裁剪空分支
  async getKnowledgePoints(
    subjectId?: string,
    stageId?: string,
    gradeId?: string | null,
    publisherId?: string | null,
  ): Promise<KnowledgePoint[]> {
    // 缓存键必须包含年级与教材版本，切换版本后重新拉取而不是命中旧缓存
    const cacheSuffix = `${subjectId ?? 'all'}|${stageId ?? 'all'}|${gradeId ?? 'all'}|${publisherId ?? 'all'}`;
    return dedupeInFlight(`knowledgePoints:${cacheSuffix}`, async () => {
      const cached = await getCached<KnowledgePoint[]>('knowledgePoints', cacheSuffix);
      if (cached) return cached;

      try {
        const params: Record<string, string> = {};
        if (subjectId) params.subjectId = subjectId;
        if (stageId) params.stageId = stageId;
        if (gradeId) params.gradeId = gradeId;
        if (publisherId) params.publisherId = publisherId;
        const response = await apiClient.get<KnowledgePoint[]>('/api/app/knowledge-points', { params });
        if (response.data.length > 0) {
          await setCached('knowledgePoints', response.data, cacheSuffix);
        }
        return response.data;
      } catch {
        return mockKnowledgePoints;
      }
    });
  },

  // Units
  // gradeId 为空表示不限年级；tagIds 为多选 chips，命中任意标签即可
  async getUnits(params: {
    subjectId: string;
    gradeId?: string | null;
    publisherId?: string | null;
    knowledgePointId?: string | null;
    tagIds?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<{ units: UnitInfo[]; totalUnits: number; totalQuestions: number }> {
    const {
      subjectId,
      gradeId,
      publisherId,
      knowledgePointId,
      tagIds,
      page = 1,
      pageSize = 10,
    } = params;
    try {
      const query: Record<string, string> = {
        subjectId,
        page: String(page),
        pageSize: String(pageSize),
      };
      if (gradeId) query.gradeId = gradeId;
      if (publisherId) query.publisherId = publisherId;
      if (knowledgePointId) query.knowledgePointId = knowledgePointId;
      if (tagIds && tagIds.length > 0) query.tagIds = tagIds.join(',');
      const response = await apiClient.get<{
        units: UnitInfo[];
        totalUnits: number;
        totalQuestions: number;
      }>('/api/app/units', { params: query });
      return {
        units: response.data.units,
        totalUnits: response.data.totalUnits,
        totalQuestions: response.data.totalQuestions,
      };
    } catch {
      // mock 数据均为英语题，选择非英语科目时返回空
      if (subjectId !== '1') return { units: [], totalUnits: 0, totalQuestions: 0 };
      const total = 100;
      const totalUnits = Math.ceil(total / 20);
      const all = generateMockUnits(total, 20);
      const start = (page - 1) * pageSize;
      return {
        units: all.slice(start, start + pageSize),
        totalUnits,
        totalQuestions: total,
      };
    }
  },

  // Questions
  async getQuestions(params: {
    subjectId: string;
    unitIndex: number;
    gradeId?: string | null;
    publisherId?: string | null;
    knowledgePointId?: string | null;
    tagIds?: string[];
  }): Promise<Question[]> {
    const { subjectId, unitIndex, gradeId, publisherId, knowledgePointId, tagIds } = params;
    try {
      const query: Record<string, string> = { subjectId };
      if (gradeId) query.gradeId = gradeId;
      if (publisherId) query.publisherId = publisherId;
      if (knowledgePointId) query.knowledgePointId = knowledgePointId;
      if (tagIds && tagIds.length > 0) query.tagIds = tagIds.join(',');
      const response = await apiClient.get<Question[]>(
        `/api/app/units/${unitIndex}/questions`,
        { params: query },
      );
      return response.data;
    } catch {
      // mock 数据均为英语题，选择非英语科目时返回空
      if (subjectId !== '1') return [];
      return generateMockQuestions(unitIndex, 20);
    }
  },

  // 教材（Publisher / Grade / Chapter）
  // 教材版本：返回当前科目/年级下「已有章节」的版本（0 题也算），附题数（后端按题数降序）
  async fetchPublishers(subjectId?: string, gradeId?: string): Promise<PublisherOption[]> {
    return dedupeInFlight(`fetchPublishers:${subjectId ?? 'all'}:${gradeId ?? 'all'}`, async () => {
      try {
        const params: Record<string, string> = {};
        if (subjectId) params.subjectId = subjectId;
        if (gradeId) params.gradeId = gradeId;
        const response = await apiClient.get<{ items: PublisherOption[] }>(
          '/api/app/publishers',
          { params },
        );
        return response.data.items ?? [];
      } catch {
        return [];
      }
    });
  },

  // 教材版本字典（只用于 id → name 展示）；沿用 24 小时本地缓存
  async getPublishers(): Promise<PublisherOption[]> {
    return dedupeInFlight('publishers', async () => {
      const cached = await getCached<PublisherOption[]>('publishers');
      if (cached) return cached;

      const items = await api.fetchPublishers();
      if (items.length > 0) await setCached('publishers', items);
      return items;
    });
  },

  /**
   * 年级字典（全局选择器用）。
   * 传 subjectId 时同时返回该科目下各年级的题目/章节数，可用于只展示有内容的年级。
   */
  async getGrades(subjectId?: string): Promise<Grade[]> {
    // 不缓存：questionCount / chapterCount 会随后台题库维护变化
    return dedupeInFlight(`grades:${subjectId ?? 'all'}`, async () => {
      try {
        const params = subjectId ? { subjectId } : {};
        const response = await apiClient.get<Grade[]>('/api/app/grades', { params });
        return response.data;
      } catch {
        return [];
      }
    });
  },

  // 题目标签（横向筛选 chips）；不缓存，标签会随后台维护变化
  async getTags(subjectId?: string): Promise<QuestionTag[]> {
    return dedupeInFlight(`tags:${subjectId ?? 'all'}`, async () => {
      try {
        const params = subjectId ? { subjectId } : {};
        const response = await apiClient.get<QuestionTag[]>('/api/app/tags', { params });
        return response.data;
      } catch {
        return [];
      }
    });
  },

  // 章节树（含后代题数）；不缓存，题数会随题目导入变化
  async getChapters(
    gradeId: string,
    subjectId?: string,
    publisherId?: string,
  ): Promise<Chapter[]> {
    return dedupeInFlight(
      `chapters:${gradeId}:${subjectId ?? 'all'}:${publisherId ?? 'all'}`,
      async () => {
        try {
          const params: Record<string, string> = {};
          if (subjectId) params.subjectId = subjectId;
          if (publisherId) params.publisherId = publisherId;
          const response = await apiClient.get<Chapter[]>(
            `/api/app/grades/${gradeId}/chapters`,
            { params },
          );
          return response.data;
        } catch {
          return [];
        }
      },
    );
  },

  // 有教材内容的科目；空数组时不露出教材入口
  async getTextbookAvailability(): Promise<TextbookSubjectAvailability[]> {
    return dedupeInFlight('textbookAvailability', async () => {
      try {
        const response = await apiClient.get<{ subjects: TextbookSubjectAvailability[] }>(
          '/api/app/textbooks/availability',
        );
        return response.data.subjects ?? [];
      } catch {
        return [];
      }
    });
  },

  // 「我的教材」目录：学段 → 科目 → 教材（含封面与选中态）
  async getTextbookCatalog(): Promise<TextbookCatalog> {
    return dedupeInFlight('textbookCatalog', async () => {
      try {
        const response = await apiClient.get<TextbookCatalog>('/api/app/textbooks');
        return {
          stages: response.data.stages ?? [],
          selectedTextbookId: response.data.selectedTextbookId ?? null,
        };
      } catch {
        return { stages: [], selectedTextbookId: null };
      }
    });
  },

  // 某本教材的章节树
  async getChaptersByTextbook(textbookId: string): Promise<Chapter[]> {
    return dedupeInFlight(`textbookChapters:${textbookId}`, async () => {
      try {
        const response = await apiClient.get<Chapter[]>(
          `/api/app/textbooks/${textbookId}/chapters`,
        );
        return response.data;
      } catch {
        return [];
      }
    });
  },

  async getChapterUnits(
    chapterId: string,
    subjectId?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ units: UnitInfo[]; totalUnits: number; totalQuestions: number }> {
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (subjectId) params.subjectId = subjectId;
      const response = await apiClient.get<{
        units: UnitInfo[];
        totalUnits: number;
        totalQuestions: number;
      }>(`/api/app/chapters/${chapterId}/units`, { params });
      return {
        units: response.data.units,
        totalUnits: response.data.totalUnits,
        totalQuestions: response.data.totalQuestions,
      };
    } catch {
      return { units: [], totalUnits: 0, totalQuestions: 0 };
    }
  },

  async getChapterQuestions(
    chapterId: string,
    unitIndex: number,
    subjectId?: string,
  ): Promise<Question[]> {
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      const response = await apiClient.get<Question[]>(
        `/api/app/chapters/${chapterId}/units/${unitIndex}/questions`,
        { params },
      );
      return response.data;
    } catch {
      return [];
    }
  },

  // 教材章节学习：记录去重键为 chapterId + unitIndex
  async startChapterStudy(
    chapterId: string,
    unitIndex: number,
    subjectId?: string,
  ): Promise<{ previous: StudyRecordSummary | null }> {
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      const response = await apiClient.post<{ previous: StudyRecordSummary | null }>(
        '/api/app/study/start',
        { chapterId, unitIndex },
        { params },
      );
      return { previous: response.data?.previous ?? null };
    } catch {
      return { previous: null };
    }
  },

  async restartChapterStudy(
    chapterId: string,
    unitIndex: number,
    subjectId?: string,
  ): Promise<void> {
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      await apiClient.post('/api/app/study/restart', { chapterId, unitIndex }, { params });
    } catch {
      // silently succeed in mock mode
    }
  },

  async finishChapterStudy(
    chapterId: string,
    unitIndex: number,
    stats: {
      correctCount: number;
      wrongCount: number;
      durationSeconds: number;
      answers: AnswerItem[];
      subjectId?: string;
    },
  ): Promise<void> {
    try {
      await apiClient.post('/api/app/study/finish', {
        chapterId,
        unitIndex,
        ...stats,
        subjectId: stats.subjectId ?? null,
        knowledgePointId: null,
      });
    } catch {
      // silently succeed in mock mode
    }
  },

  // Study sessions
  // 返回该单元之前已完成的一次记录（有则用于答题页展示「上次学习」摘要）
  async startStudy(params: {
    unitIndex: number;
    subjectId?: string | null;
    gradeId?: string | null;
    publisherId?: string | null;
    knowledgePointId?: string | null;
    tagIds?: string[];
  }): Promise<{ previous: StudyRecordSummary | null }> {
    try {
      const { unitIndex, subjectId, gradeId, publisherId, knowledgePointId, tagIds } = params;
      const query: Record<string, string> = {};
      if (subjectId) query.subjectId = subjectId;
      if (gradeId) query.gradeId = gradeId;
      if (publisherId) query.publisherId = publisherId;
      if (knowledgePointId) query.knowledgePointId = knowledgePointId;
      if (tagIds && tagIds.length > 0) query.tagIds = tagIds.join(',');
      const response = await apiClient.post<{ previous: StudyRecordSummary | null }>(
        '/api/app/study/start',
        { unitIndex },
        { params: query },
      );
      return { previous: response.data?.previous ?? null };
    } catch {
      // silently succeed in mock mode
      return { previous: null };
    }
  },

  // 再学一次：不再清除历史（学习事实只追加），本次完成会记为一条新记录
  async restartStudy(params: {
    unitIndex: number;
    subjectId?: string | null;
    gradeId?: string | null;
    knowledgePointId?: string | null;
    tagIds?: string[];
  }): Promise<void> {
    try {
      const { unitIndex, subjectId, gradeId, knowledgePointId, tagIds } = params;
      const query: Record<string, string> = {};
      if (subjectId) query.subjectId = subjectId;
      if (gradeId) query.gradeId = gradeId;
      if (knowledgePointId) query.knowledgePointId = knowledgePointId;
      if (tagIds && tagIds.length > 0) query.tagIds = tagIds.join(',');
      await apiClient.post('/api/app/study/restart', { unitIndex }, { params: query });
    } catch {
      // silently succeed in mock mode
    }
  },

  async finishStudy(
    unitIndex: number,
    stats: {
      correctCount: number;
      wrongCount: number;
      durationSeconds: number;
      answers: AnswerItem[];
      subjectId?: string | null;
      gradeId?: string | null;
      knowledgePointId?: string | null;
      tagIds?: string[];
    }
  ): Promise<void> {
    try {
      await apiClient.post('/api/app/study/finish', {
        unitIndex,
        ...stats,
        // 同一单元在不同筛选下各有一条记录，服务端按完整键定位
        subjectId: stats.subjectId ?? null,
        gradeId: stats.gradeId ?? null,
        knowledgePointId: stats.knowledgePointId ?? null,
        tagIds: stats.tagIds && stats.tagIds.length > 0 ? stats.tagIds : null,
      });
    } catch {
      // silently succeed in mock mode
    }
  },

  // Study records
  async getStudyRecords(params: {
    page?: number;
    pageSize?: number;
    gradeId?: string | null;
    subjectId?: string | null;
    knowledgePointId?: string | null;
    chapterId?: string | null;
    /** 学习来源筛选 */
    scopeType?: StudyRecord['scopeType'];
    /** 北京时间日界 YYYY-MM-DD，按 finishedAt 落在当天筛选 */
    date?: string;
  } = {}): Promise<PaginatedResponse<StudyRecord>> {
    const {
      page = 1,
      pageSize = 20,
      gradeId,
      subjectId,
      knowledgePointId,
      chapterId,
      scopeType,
      date,
    } = params;
    const query: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (gradeId) query.gradeId = gradeId;
    if (subjectId) query.subjectId = subjectId;
    if (knowledgePointId) query.knowledgePointId = knowledgePointId;
    if (chapterId) query.chapterId = chapterId;
    if (scopeType) query.scopeType = scopeType;
    if (date) query.date = date;
    const response = await apiClient.get<PaginatedResponse<StudyRecord>>('/api/app/study/records', {
      params: query,
    });
    return response.data;
  },

  // Stats
  async getStats(range: StudyStatsRangeKey = 'all'): Promise<StudyStatsOverview> {
    const response = await apiClient.get<StudyStatsOverview>('/api/app/study/stats', {
      params: { range },
    });
    return response.data;
  },

  // 按章节统计：某本教材的顶级章（含子节题目）
  async getChapterStats(textbookId: string): Promise<ChapterStudyStat[]> {
    try {
      const response = await apiClient.get<ChapterStudyStat[]>(
        '/api/app/study/stats/chapters',
        { params: { textbookId } },
      );
      return response.data;
    } catch {
      return [];
    }
  },

  // 按知识点统计：父节点按题目去重聚合子树
  async getKnowledgePointStats(params: {
    stageId?: string | null;
    subjectId?: string | null;
  } = {}): Promise<KnowledgePointStudyStat[]> {
    const query: Record<string, string> = {};
    if (params.stageId) query.stageId = params.stageId;
    if (params.subjectId) query.subjectId = params.subjectId;
    try {
      const response = await apiClient.get<KnowledgePointStudyStat[]>(
        '/api/app/study/stats/knowledge-points',
        { params: query },
      );
      return response.data;
    } catch {
      return [];
    }
  },

  // Wrong questions
  async getWrongQuestions(params?: { gradeId?: string; subjectId?: string }): Promise<Question[]> {
    try {
      const query: Record<string, string> = {};
      if (params?.gradeId) query.gradeId = params.gradeId;
      if (params?.subjectId) query.subjectId = params.subjectId;
      const response = await apiClient.get<{
        data: Array<{
          questionId: string;
          status: string;
          lastPracticedAt: string;
          correctCount: number;
          wrongCount: number;
          question: Question;
        }>;
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/api/app/study/wrong-questions', {
        params: query,
      });
      return response.data.data.map((item) => item.question);
    } catch {
      return generateMockQuestions(0, 5);
    }
  },

  // Favorites
  /** 收藏列表：默认按收藏时间倒序，可按年级/科目/教材过滤 */
  async getFavorites(params: {
    page?: number;
    pageSize?: number;
    gradeId?: string | null;
    subjectId?: string | null;
    textbookId?: string | null;
  } = {}): Promise<FavoriteListResponse> {
    const { page = 1, pageSize = 20, gradeId, subjectId, textbookId } = params;
    const query: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (gradeId) query.gradeId = gradeId;
    if (subjectId) query.subjectId = subjectId;
    if (textbookId) query.textbookId = textbookId;
    // 失败向上抛：列表页需要区分「没有收藏」与「加载失败」
    const response = await apiClient.get<FavoriteListResponse>('/api/app/favorites', {
      params: query,
    });
    return response.data;
  },

  /** 收藏题目：服务端幂等，重复收藏返回同一条记录 */
  async addFavorite(questionId: string): Promise<void> {
    await apiClient.post('/api/app/favorites', { questionId });
  },

  /** 取消收藏：未收藏时服务端同样返回成功 */
  async removeFavorite(questionId: string): Promise<void> {
    await apiClient.delete(`/api/app/favorites/${questionId}`);
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    try {
      const response = await apiClient.get<UserSettings>('/api/app/settings');
      return response.data;
    } catch {
      return {
        userId: '1',
        unitSize: 20,
        theme: 'light' as Theme,
        language: 'zh' as Language,
        density: 'comfortable' as Density,
        gradeId: null,
        subjectId: null,
        publisherId: null,
        textbookId: null,
        scopeHintSeenAt: null,
      };
    }
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const response = await apiClient.put<UserSettings>('/api/app/settings', settings);
      return response.data;
    } catch {
      return {
        userId: '1',
        unitSize: settings.unitSize ?? 20,
        theme: settings.theme ?? ('light' as Theme),
        language: settings.language ?? ('zh' as Language),
        density: settings.density ?? ('comfortable' as Density),
        gradeId: settings.gradeId ?? null,
        subjectId: settings.subjectId ?? null,
        publisherId: settings.publisherId ?? null,
        textbookId: settings.textbookId ?? null,
        scopeHintSeenAt: settings.scopeHintSeenAt ?? null,
      };
    }
  },

  /** 标记首次登录「选择教材」引导已处理；时间由服务端写入 */
  async ackScopeHint(): Promise<UserSettings> {
    const response = await apiClient.put<UserSettings>('/api/app/settings', { scopeHintSeen: true });
    return response.data;
  },
  // Avatar upload — 失败必须让调用方看到真实错误，这里不做 mock 兜底
  async uploadAvatar(file: { uri: string; name: string; type: string }): Promise<string> {
    const form = new FormData();

    if (Platform.OS === 'web') {
      // 浏览器端：RN 的 { uri, name, type } 是 native descriptor，浏览器 FormData 会把它当普通
      // object append，后端 instanceof File 检查通不过 → 400。必须 fetch 文件二进制转成 Blob。
      const response = await fetch(file.uri);
      const blob = await response.blob();
      form.append('file', blob, file.name);
    } else {
      // RN 端：原生层识别 { uri, name, type } 组装 multipart（RN 官方模式）。
      // 不要用 axios：其 XHR 适配器在 Android 上对文件 part 编码不可靠，服务端解析 multipart 失败。
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    }

    const token = await storage.getToken();
    // 保留原 axios 实例的 30s 超时语义
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/+$/, '')}/api/app/profile/avatar`,
        {
          method: 'POST',
          // 不要手动设置 Content-Type：RN/浏览器都会自动补 multipart/form-data + boundary
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        // 打出真实状态码 + 响应体，方便定位（404=线上未部署新路由、401=token 失效、413=超 1MB、415=格式不支持）
        const body = await response.text().catch(() => '');
        console.warn('[avatar] upload failed:', response.status, body);
        // TEMP-DIAG: 响应体片段带进 message，安卓 APK 看不到 console 日志
        const err = new Error(`HTTP ${response.status} ${body.slice(0, 160)}`) as Error & { status: number };
        err.status = response.status;
        throw err;
      }

      const data = (await response.json()) as { avatar: string };
      return data.avatar;
    } finally {
      clearTimeout(timer);
    }
  },
  // 更新个人资料（昵称/性别/手机号，至少传一个字段）
  async updateProfile(patch: { nickname?: string; gender?: string; phone?: string }): Promise<{ nickname?: string; gender?: string | null; phone?: string | null }> {
    const response = await apiClient.patch<{ nickname?: string; gender?: string | null; phone?: string | null }>('/api/app/profile', patch);
    return response.data;
  },

  // Articles（只取发布到移动端的已发布文章）
  async getArticles(page = 1, pageSize = 20): Promise<{ items: ArticleListItem[]; total: number }> {
    try {
      const response = await apiClient.get<{ items: ArticleListItem[]; total: number }>(
        '/api/app/articles',
        { params: { channel: 'mobile', page, pageSize } },
      );
      return { items: response.data.items ?? [], total: response.data.total ?? 0 };
    } catch {
      return { items: [], total: 0 };
    }
  },

  async getArticleDetail(id: string): Promise<ArticleDetail | null> {
    try {
      // view=1 计入浏览次数
      const response = await apiClient.get<ArticleDetail>(`/api/app/articles/${id}`, {
        params: { channel: 'mobile', view: 1 },
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // ─── 站内信 ─────────────────────────────────────────────────────────────────
  /** 消息列表：未读优先、发布时间倒序，附带未读总数；失败向上抛，由页面区分空态与失败态 */
  async getNotifications(params: {
    filter?: 'all' | 'unread';
    page?: number;
    pageSize?: number;
  } = {}): Promise<NotificationListResult> {
    const { filter = 'all', page = 1, pageSize = 20 } = params;
    try {
      const response = await apiClient.get<NotificationListResult>('/api/app/notifications', {
        params: { filter, page: String(page), pageSize: String(pageSize) },
      });
      return response.data;
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'notifications load failed'));
    }
  },

  /** 导航栏红点：只取未读数；失败返回 null，调用方沿用上一次结果 */
  async getNotificationUnreadCount(): Promise<number | null> {
    try {
      const response = await apiClient.get<{ count: number }>('/api/app/notifications/unread-count');
      return typeof response.data?.count === 'number' ? response.data.count : 0;
    } catch {
      return null;
    }
  },

  /** 消息详情：校验消息对当前用户可见；404 时抛 NotificationApiError 由页面提示内容已失效 */
  async getNotificationDetail(id: string): Promise<NotificationItem> {
    try {
      const response = await apiClient.get<NotificationItem>('/api/app/notifications/detail', {
        params: { id },
      });
      return response.data;
    } catch (err) {
      const status = (err as AxiosError).response?.status ?? 0;
      throw new NotificationApiError(status, apiErrorMessage(err, 'notifications detail failed'));
    }
  },

  /** 标记单条已读：服务端幂等 upsert */
  async markNotificationRead(id: string): Promise<void> {
    await apiClient.post('/api/app/notifications/read', { id });
  },

  /** 全部已读：只影响当前用户全部未读消息 */
  async markAllNotificationsRead(): Promise<number> {
    try {
      const response = await apiClient.post<{ count: number }>('/api/app/notifications/read-all');
      return response.data?.count ?? 0;
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'notifications read-all failed'));
    }
  },

  // ─── 电子宠物 ───────────────────────────────────────────────────────────────
  /** 领养页：5 种宠物及其三阶段进化路线（失败返回空列表，不阻塞页面） */
  async getPetSpecies(): Promise<PetSpeciesInfo[]> {
    try {
      const response = await apiClient.get<PetSpeciesInfo[]>('/api/app/pet/species');
      return response.data;
    } catch {
      return [];
    }
  },

  /** 宠物详情 / 首页卡片；未领养时 pet 为 null */
  async getPet(): Promise<PetHomeData> {
    const response = await apiClient.get<PetHomeData>('/api/app/pet');
    return response.data;
  },

  async adoptPet(speciesId: string, nickname: string): Promise<void> {
    try {
      await apiClient.post('/api/app/pet/adopt', { speciesId, nickname });
    } catch (err) {
      throw new Error(petErrorMessage(err, 'Adopt failed'));
    }
  },

  async getPetFoods(): Promise<PetFoodsData> {
    const response = await apiClient.get<PetFoodsData>('/api/app/pet/foods');
    return response.data;
  },

  async feedPet(foodType: string, quantity: number): Promise<PetFeedResult> {
    try {
      const response = await apiClient.post<PetFeedResult>('/api/app/pet/feed', { foodType, quantity });
      return response.data;
    } catch (err) {
      const data = (err as AxiosError<{ error?: string; code?: string; message?: string }>).response?.data;
      // 睡眠期喂普通/高级食物会被服务端拒绝：保留错误码，页面据此给出睡眠提示
      if (data?.code === 'SLEEP_LOCKED' || data?.error === 'SLEEP_LOCKED') {
        throw new Error('SLEEP_LOCKED');
      }
      throw new Error(petErrorMessage(err, 'Feed failed'));
    }
  },

  async getPetFeeds(page = 1): Promise<PaginatedResponse<PetFeedRecord>> {
    const response = await apiClient.get<PaginatedResponse<PetFeedRecord>>('/api/app/pet/feeds', {
      params: { page },
    });
    return response.data;
  },

  async getQuizLeaderboard(period: LeaderboardPeriod = 'week'): Promise<QuizLeaderboardResponse> {
    const response = await apiClient.get<QuizLeaderboardResponse>('/api/app/leaderboard', {
      params: { type: 'quiz', period },
    });
    return response.data;
  },

  async getPetLeaderboard(period: LeaderboardPeriod = 'week'): Promise<PetLeaderboardResponse> {
    const response = await apiClient.get<PetLeaderboardResponse>('/api/app/leaderboard', {
      params: { type: 'pet', period },
    });
    return response.data;
  },

  // ─── 问题反馈 ───────────────────────────────────────────────────────────────
  /** 我的反馈列表（倒序分页）；失败向上抛，由页面区分空态与失败态 */
  async listFeedback(page = 1, pageSize = 20): Promise<FeedbackListResult> {
    try {
      const response = await apiClient.get<FeedbackListResult>('/api/app/feedback', {
        params: { page, pageSize },
      });
      return response.data;
    } catch (err) {
      throw toFeedbackError(err, 'Feedback load failed');
    }
  },

  /** 反馈详情：服务端会在有未读回复时顺便标记已读 */
  async getFeedback(id: string): Promise<FeedbackDetail> {
    try {
      const response = await apiClient.get<FeedbackDetail>(
        `/api/app/feedback/${encodeURIComponent(id)}`,
      );
      return response.data;
    } catch (err) {
      throw toFeedbackError(err, 'Feedback load failed');
    }
  },

  /** 提交反馈：content 为富文本 HTML，服务端清洗并校验正文图片归属 */
  async createFeedback(payload: {
    content: string;
    category: FeedbackCategory;
    contact?: string;
    pageContext?: string;
    clientVersion?: string;
  }): Promise<{ id: string; status: FeedbackStatus; createdAt: string }> {
    try {
      const response = await apiClient.post<{ id: string; status: FeedbackStatus; createdAt: string }>(
        '/api/app/feedback',
        payload,
        // 服务端据此把 source 记为 app，不信任 body
        { headers: { 'x-client-source': 'mobile' } },
      );
      return response.data;
    } catch (err) {
      throw toFeedbackError(err, 'Feedback submit failed');
    }
  },

  /** 用户追问（纯文本，保留换行）；反馈已关闭时服务端返回 409 FEEDBACK_CLOSED */
  async replyFeedback(id: string, content: string): Promise<FeedbackReplyItem> {
    try {
      const response = await apiClient.post<FeedbackReplyItem>(
        `/api/app/feedback/${encodeURIComponent(id)}`,
        { content },
      );
      return response.data;
    } catch (err) {
      throw toFeedbackError(err, 'Feedback reply failed');
    }
  },

  /**
   * 反馈正文图片上传：复用后端 /api/app/feedback/upload（multipart 字段 file），
   * 与头像上传同一套原生 FormData 写法，不新增第二条上传通道。
   */
  async uploadFeedbackImage(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<{ url: string; path: string }> {
    const form = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      form.append('file', blob, file.name);
    } else {
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    }

    const token = await storage.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/+$/, '')}/api/app/feedback/upload`,
        {
          method: 'POST',
          // 不要手动设置 Content-Type：RN/浏览器会自动补 boundary
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-client-source': 'mobile',
          },
          body: form,
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let message = `HTTP ${response.status}`;
        try {
          const body = JSON.parse(text) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // 非 JSON 响应保留状态码
        }
        throw new FeedbackApiError(response.status, message);
      }

      return (await response.json()) as { url: string; path: string };
    } finally {
      clearTimeout(timer);
    }
  },
};

export default api;
