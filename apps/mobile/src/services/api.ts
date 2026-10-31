import type {
  AnswerItem,
  Chapter,
  Density,
  Grade,
  KnowledgePoint,
  Language,
  LoginResponse,
  PaginatedResponse,
  Publisher,
  Question,
  QuestionTag,
  StudyRecord,
  StudyRecordSummary,
  Subject,
  SubjectOverview,
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

// ─── API Methods ───────────────────────────────────────────────────────────────

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
      await apiClient.post('/api/app/auth/register', { username, password });
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

  // 首页科目概览：题目总数 + 当前用户已学比例，随作答变化，不走本地缓存
  async getSubjectOverview(): Promise<SubjectOverview[]> {
    return dedupeInFlight('subjectOverview', async () => {
      try {
        const response = await apiClient.get<SubjectOverview[]>('/api/app/subjects/overview');
        return response.data;
      } catch {
        return [];
      }
    });
  },

  // Knowledge Points
  async getKnowledgePoints(subjectId?: string, stageId?: string): Promise<KnowledgePoint[]> {
    const cacheSuffix = `${subjectId ?? 'all'}|${stageId ?? 'all'}`;
    return dedupeInFlight(`knowledgePoints:${cacheSuffix}`, async () => {
      const cached = await getCached<KnowledgePoint[]>('knowledgePoints', cacheSuffix);
      if (cached) return cached;

      try {
        const params: Record<string, string> = {};
        if (subjectId) params.subjectId = subjectId;
        if (stageId) params.stageId = stageId;
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
    knowledgePointId?: string | null;
    tagIds?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<{ units: UnitInfo[]; totalUnits: number; totalQuestions: number }> {
    const {
      subjectId,
      gradeId,
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
    knowledgePointId?: string | null;
    tagIds?: string[];
  }): Promise<Question[]> {
    const { subjectId, unitIndex, gradeId, knowledgePointId, tagIds } = params;
    try {
      const query: Record<string, string> = { subjectId };
      if (gradeId) query.gradeId = gradeId;
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
  // 教材元数据变化很少，沿用 24 小时本地缓存
  async getPublishers(): Promise<Publisher[]> {
    return dedupeInFlight('publishers', async () => {
      const cached = await getCached<Publisher[]>('publishers');
      if (cached) return cached;

      try {
        const response = await apiClient.get<Publisher[]>('/api/app/publishers');
        if (response.data.length > 0) await setCached('publishers', response.data);
        return response.data;
      } catch {
        return [];
      }
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
    knowledgePointId?: string | null;
    tagIds?: string[];
  }): Promise<{ previous: StudyRecordSummary | null }> {
    try {
      const { unitIndex, subjectId, gradeId, knowledgePointId, tagIds } = params;
      const query: Record<string, string> = {};
      if (subjectId) query.subjectId = subjectId;
      if (gradeId) query.gradeId = gradeId;
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

  // 再学一次：清空该单元之前的学习记录，本次从零开始
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
  } = {}): Promise<PaginatedResponse<StudyRecord>> {
    const { page = 1, pageSize = 20, gradeId, subjectId, knowledgePointId, chapterId } = params;
    try {
      const query: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (gradeId) query.gradeId = gradeId;
      if (subjectId) query.subjectId = subjectId;
      if (knowledgePointId) query.knowledgePointId = knowledgePointId;
      if (chapterId) query.chapterId = chapterId;
      const response = await apiClient.get<PaginatedResponse<StudyRecord>>(
        '/api/app/study/records',
        { params: query }
      );
      return response.data;
    } catch {
      const mockRecords: StudyRecord[] = Array.from({ length: 5 }, (_, i) => ({
        id: `record-${i}`,
        userId: '1',
        gradeId: null,
        chapterId: null,
        subjectId: null,
        knowledgePointId: null,
        unitIndex: i,
        startedAt: new Date(Date.now() - i * 86400000).toISOString(),
        finishedAt: new Date(Date.now() - i * 86400000 + 600000).toISOString(),
        totalQuestions: 20,
        correctCount: 15 + i,
        wrongCount: 5 - i,
        durationSeconds: 600,
      }));
      return {
        data: mockRecords,
        total: 5,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
    }
  },

  // Stats
  async getStats(): Promise<{
    totalDays: number;
    totalQuestions: number;
    streak: number;
  }> {
    try {
      const response = await apiClient.get('/api/app/study/stats');
      return response.data;
    } catch {
      return {
        totalDays: 15,
        totalQuestions: 320,
        streak: 7,
      };
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
      };
    }
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
};

export default api;
