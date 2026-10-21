import type {
  AnswerItem,
  Category,
  KnowledgePoint,
  Language,
  LoginResponse,
  PaginatedResponse,
  Question,
  StudyRecord,
  Subject,
  Theme,
  UnitInfo,
  User,
  UserSettings,
} from '@sharp/shared';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { storage } from '../utils/storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://admin.sharp.whoitao.top/";

// ─── Mock data for offline/demo mode ───────────────────────────────────────────
console.log('API_BASE_URL:', API_BASE_URL);
const mockUser: User = {
  id: '1',
  username: 'demo',
  nickname: 'Demo User',
  avatar: null,
  status: 'active' as any,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCategories: Category[] = [
  {
    id: '1',
    name: '英语四级',
    parentId: '0',
    sortOrder: 1,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
  },
  {
    id: '2',
    name: '英语六级',
    parentId: '0',
    sortOrder: 2,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 120,
  },
  {
    id: '3',
    name: '托福词汇',
    parentId: '0',
    sortOrder: 3,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 200,
  },
  {
    id: '4',
    name: '雅思词汇',
    parentId: '0',
    sortOrder: 4,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 180,
  },
];

const mockSubCategories: Category[] = [
  {
    id: '11',
    name: '高频词汇',
    parentId: '1',
    sortOrder: 1,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 50,
  },
  {
    id: '12',
    name: '核心词汇',
    parentId: '1',
    sortOrder: 2,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 50,
  },
];

const mockSubjects: Subject[] = [
  { id: '1', name: '英语', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: '数学', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: '语文', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockKnowledgePoints: KnowledgePoint[] = [
  { id: '1', name: '词汇', parentId: null, children: [], questionCount: 0 },
  { id: '2', name: '语法', parentId: null, children: [], questionCount: 0 },
  { id: '3', name: '阅读理解', parentId: null, children: [], questionCount: 0 },
];

function generateMockQuestions(categoryId: string, unitIndex: number, count: number): Question[] {
  const questions: Question[] = [];
  const catId = parseInt(categoryId);
  for (let i = 0; i < count; i++) {
    const qIndex = unitIndex * count + i + 1;
    questions.push({
      id: `${catId * 1000 + qIndex}`,
      categoryId,
      type: 1,
      content: `第${qIndex}题：以下哪个是 "elucidate" 的正确释义？`,
      analysis: '"elucidate" 意为阐明、解释。',
      difficulty: Math.ceil(Math.random() * 5),
      score: 1,
      sortOrder: i,
      createdAt: new Date().toISOString(),
      options: [
        {
          id: `${catId * 10000 + qIndex * 10 + 1}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'A',
          content: '阐明，解释',
          isCorrect: true,
          sortNo: 1,
        },
        {
          id: `${catId * 10000 + qIndex * 10 + 2}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'B',
          content: '混淆，使模糊',
          isCorrect: false,
          sortNo: 2,
        },
        {
          id: `${catId * 10000 + qIndex * 10 + 3}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'C',
          content: '消除，移除',
          isCorrect: false,
          sortNo: 3,
        },
        {
          id: `${catId * 10000 + qIndex * 10 + 4}`,
          questionId: `${catId * 1000 + qIndex}`,
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

function generateMockUnits(categoryId: string, totalQuestions: number, unitSize: number): UnitInfo[] {
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
    } catch {
      if (username && password) {
        return {
          token: 'mock-jwt-token-' + Date.now(),
          user: { ...mockUser, username },
        };
      }
      throw new Error('Login failed');
    }
  },

  async register(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/app/auth/register', {
        username,
        password,
      });
      return response.data;
    } catch {
      if (username && password) {
        return {
          token: 'mock-jwt-token-' + Date.now(),
          user: { ...mockUser, username },
        };
      }
      throw new Error('Registration failed');
    }
  },

  // Categories
  async getCategories(parentId: string): Promise<Category[]> {
    try {
      const response = await apiClient.get<Category[]>('/api/app/categories', {
        params: { parentId },
      });
      return response.data;
    } catch {
      if (parentId === '0') {
        return mockCategories;
      }
      return mockSubCategories;
    }
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    try {
      const response = await apiClient.get<Subject[]>('/api/app/subjects');
      return response.data;
    } catch {
      return mockSubjects;
    }
  },

  // Knowledge Points
  async getKnowledgePoints(subjectId?: string): Promise<KnowledgePoint[]> {
    try {
      const params = subjectId ? { subjectId } : {};
      const response = await apiClient.get<KnowledgePoint[]>('/api/app/knowledge-points', { params });
      return response.data;
    } catch {
      return mockKnowledgePoints;
    }
  },

  // Units
  async getUnits(categoryId: string): Promise<UnitInfo[]> {
    try {
      const response = await apiClient.get<{ units: UnitInfo[] }>(`/api/app/categories/${categoryId}/units`);
      return response.data.units;
    } catch {
      const category = mockCategories.find((c) => c.id === categoryId);
      const total = category?.questionCount ?? 100;
      return generateMockUnits(categoryId, total, 20);
    }
  },

  // Questions
  async getQuestions(categoryId: string, unitIndex: number): Promise<Question[]> {
    try {
      const response = await apiClient.get<Question[]>(
        `/api/app/categories/${categoryId}/units/${unitIndex}/questions`,
      );
      return response.data;
    } catch {
      return generateMockQuestions(categoryId, unitIndex, 20);
    }
  },

  // Study sessions
  async startStudy(categoryId: string, unitIndex: number): Promise<void> {
    try {
      await apiClient.post('/api/app/study/start', { categoryId, unitIndex });
    } catch {
      // silently succeed in mock mode
    }
  },

  async finishStudy(
    categoryId: string,
    unitIndex: number,
    stats: { correctCount: number; wrongCount: number; durationSeconds: number; answers: AnswerItem[] }
  ): Promise<void> {
    try {
      await apiClient.post('/api/app/study/finish', {
        categoryId,
        unitIndex,
        ...stats,
      });
    } catch {
      // silently succeed in mock mode
    }
  },

  // Study records
  async getStudyRecords(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<StudyRecord>> {
    try {
      const response = await apiClient.get<PaginatedResponse<StudyRecord>>(
        '/api/app/study/records',
        { params: { page, pageSize } }
      );
      return response.data;
    } catch {
      const mockRecords: StudyRecord[] = Array.from({ length: 5 }, (_, i) => ({
        id: `record-${i}`,
        userId: '1',
        categoryId: '1',
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
  async getWrongQuestions(categoryId?: string): Promise<Question[]> {
    try {
      const params = categoryId ? { categoryId } : {};
      const response = await apiClient.get<{
        data: Array<{
          questionId: string;
          categoryId: string;
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
        params,
      });
      return response.data.data.map((item) => item.question);
    } catch {
      return generateMockQuestions('1', 0, 5);
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
      };
    }
  },
};

export default api;
