/** Web 学员端教材接口：全部经由 BFF /api/app/** 透传，浏览器不直连 admin。 */

export interface TextbookDto {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  stageId: string;
  stageName: string;
  gradeId: string;
  gradeName: string;
  gradeSortOrder: number;
  publisherId: string;
  publisherName: string;
  semester: number;
  semesterLabel: string;
  coverUrl: string | null;
  chapterCount: number;
  questionCount: number;
  selected: boolean;
}

export interface CatalogSubjectDto {
  id: string;
  name: string;
  icon: string | null;
  textbooks: TextbookDto[];
}

export interface CatalogStageDto {
  id: string;
  name: string;
  subjects: CatalogSubjectDto[];
}

export interface CatalogResponse {
  stages: CatalogStageDto[];
  selectedTextbookId?: string | null;
}

/** 年级字典（全量，含没有教材的年级），用于筛选面板 */
export interface GradeDto {
  id: string;
  name: string;
  stageId: string;
  stage: string;
  sortOrder: number;
}

/** 科目字典（全量，含没有教材的科目），用于筛选面板 */
export interface SubjectDto {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export interface ChapterNodeDto {
  id: string;
  textbookId: string;
  parentId: string | null;
  level: number;
  name: string;
  sortOrder: number;
  questionCount: number;
  children: ChapterNodeDto[];
}

/** 知识点树节点：与 /api/app/knowledge-points 返回结构一致 */
export interface KnowledgePointDto {
  id: string;
  name: string;
  parentId: string | null;
  subjectId: string | null;
  stageId: string;
  sortOrder: number;
  questionCount: number;
  children: KnowledgePointDto[];
}

export type UnitStatus = "not_started" | "in_progress" | "completed";

export interface UnitDto {
  unitIndex: number;
  startIndex: number;
  endIndex: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  status: UnitStatus;
}

export interface UnitsResponse {
  /** 章节单元接口返回；知识点单元接口没有该字段 */
  chapterId?: string;
  /** 知识点单元接口返回；章节单元接口没有该字段 */
  subjectId?: string;
  unitSize: number;
  totalQuestions: number;
  totalUnits: number;
  page: number;
  pageSize: number;
  units: UnitDto[];
}

export interface StudyRecordDto {
  id: string;
  userId?: string;
  /** 学习来源：chapter 教材章节 / knowledge 考纲知识点 / bank 题库 */
  scopeType?: "chapter" | "knowledge" | "bank";
  gradeId?: string | null;
  /** 记录自身的年级，或由章节所属教材反推 */
  gradeName?: string | null;
  chapterId?: string | null;
  chapterName?: string | null;
  /** 教材版本 · 年级，如「人教版 · 初一」 */
  textbookLabel?: string | null;
  subjectId?: string | null;
  knowledgePointId?: string | null;
  unitIndex: number;
  startedAt?: string;
  finishedAt: string | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number | null;
}

export interface StudyRecordsResponse {
  data: StudyRecordDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DailyStatDto {
  date: string;
  questionsAnswered: number;
  sessionsCompleted: number;
  studyDuration: number;
}

export type StudyStatsRangeKey = "today" | "week" | "month" | "all";

/** 口径聚合：正确率取自 StudyAttempt，其余取自 UserDailyStat 日行 */
export interface RangeStatsDto {
  questionsAnswered: number;
  sessionsCompleted: number;
  studyDuration: number;
  activeDays: number;
  accuracy: number;
}

/** 热力条日点：服务端固定补满近 14 个北京日，缺日补零 */
export type DailySeriesPointDto = DailyStatDto;


/** 学习统计总览：与 /api/app/study/stats 返回结构一致。
 *  totalQuestions/accuracy/recentStats 是历史字段（去重题数口径，与 rangeStats 不可比），
 *  新界面一律改用 rangeStats 与 dailySeries。 */
export interface StudyStatsDto {
  totalDays: number;
  totalQuestions: number;
  streak: number;
  totalCorrect: number;
  totalSessions: number;
  totalStudyDuration: number;
  accuracy: number;
  recentStats: DailyStatDto[];
  range: StudyStatsRangeKey;
  longestStreak: number;
  /** YYYY-MM-DD（北京时间）；从未作答时为 null */
  lastActiveDate: string | null;
  rangeStats: RangeStatsDto;
  dailySeries: DailySeriesPointDto[];
}

/** 按章节统计：顶级章，含子节题目 */
export interface ChapterStatDto {
  id: string;
  name: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctQuestions: number;
  lastPracticedAt: string | null;
}

/** 按知识点统计：父节点按题目去重聚合子树 */
export interface KnowledgePointStatDto {
  id: string;
  name: string;
  parentId: string | null;
  totalQuestions: number;
  answeredQuestions: number;
  correctQuestions: number;
  lastPracticedAt: string | null;
  children: KnowledgePointStatDto[];
}

export interface WrongQuestionOptionDto {
  id: string;
  questionId?: string;
  optionKey: string;
  content: string;
  isCorrect: boolean;
  sortNo: number;
}

export interface WrongQuestionDto {
  questionId: string;
  status: string;
  lastPracticedAt: string | null;
  correctCount: number;
  wrongCount: number;
  question: {
    id: string;
    gradeId: string | null;
    type: number;
    content: string;
    analysis: string | null;
    difficulty: number;
    score?: number;
    options: WrongQuestionOptionDto[];
  };
}

export interface WrongQuestionsResponse {
  data: WrongQuestionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FavoriteQuestionDto {
  id: string;
  gradeId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  type: number;
  content: string;
  analysis: string | null;
  difficulty: number;
  score?: number;
  chapter: {
    id: string;
    name: string;
    textbookId: string;
    textbookName: string | null;
  } | null;
  options: WrongQuestionOptionDto[];
}

export interface FavoriteItemDto {
  questionId: string;
  createdAt: string;
  note: string | null;
  question: FavoriteQuestionDto;
}

export interface FavoritesResponse {
  data: FavoriteItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class AppApiError extends Error {
  constructor(readonly status: number) {
    super(`Request failed with ${status}`);
    this.name = "AppApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api/app${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new AppApiError(res.status);
  return (await res.json()) as T;
}

export function fetchCatalog(): Promise<CatalogResponse> {
  return getJson<CatalogResponse>("/textbooks");
}

/** 年级字典按 sortOrder 返回，顺序即学段/年级的展示顺序 */
export function fetchGrades(): Promise<GradeDto[]> {
  return getJson<GradeDto[]>("/grades");
}

/** 科目字典按 sortOrder 返回 */
export function fetchSubjects(): Promise<SubjectDto[]> {
  return getJson<SubjectDto[]>("/subjects");
}

export function fetchChapterTree(textbookId: string): Promise<ChapterNodeDto[]> {
  return getJson<ChapterNodeDto[]>(`/textbooks/${textbookId}/chapters`);
}

/** 单元按服务端设置的 unitSize 切分，一次取满（上限 100） */
export function fetchUnits(chapterId: string): Promise<UnitsResponse> {
  return getJson<UnitsResponse>(`/chapters/${chapterId}/units?pageSize=100`);
}

/** 该章节最近的学习记录，用于推导每个单元的「上次学习」 */
export function fetchRecords(chapterId: string): Promise<StudyRecordsResponse> {
  return getJson<StudyRecordsResponse>(
    `/study/records?chapterId=${chapterId}&pageSize=100`,
  );
}

/** 学习记录分页列表：年级/科目/来源/单日筛选口径与移动端一致 */
export function fetchStudyRecords(
  params: {
    page?: number;
    pageSize?: number;
    gradeId?: string | null;
    subjectId?: string | null;
    scopeType?: StudyRecordDto["scopeType"];
    /** YYYY-MM-DD（北京时间）：热力条点选某天后只看那一天 */
    date?: string | null;
  } = {},
): Promise<StudyRecordsResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  if (params.gradeId) query.set("gradeId", params.gradeId);
  if (params.subjectId) query.set("subjectId", params.subjectId);
  if (params.scopeType) query.set("scopeType", params.scopeType);
  if (params.date) query.set("date", params.date);
  return getJson<StudyRecordsResponse>(`/study/records?${query.toString()}`);
}

/** 学习总览：range 决定概览四指标口径，days 只影响 legacy recentStats */
export function fetchStudyStats(
  params: { range?: StudyStatsRangeKey; days?: number } = {},
): Promise<StudyStatsDto> {
  const query = new URLSearchParams({ days: String(params.days ?? 14) });
  if (params.range) query.set("range", params.range);
  return getJson<StudyStatsDto>(`/study/stats?${query.toString()}`);
}

/** 我的收藏：分页 + 年级/科目/教材筛选，口径与 Web 端范围一致 */
export function fetchFavorites(
  params: {
    page?: number;
    pageSize?: number;
    gradeId?: string | null;
    subjectId?: string | null;
    textbookId?: string | null;
  } = {},
): Promise<FavoritesResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  if (params.gradeId) query.set("gradeId", params.gradeId);
  if (params.subjectId) query.set("subjectId", params.subjectId);
  if (params.textbookId) query.set("textbookId", params.textbookId);
  return getJson<FavoritesResponse>(`/favorites?${query.toString()}`);
}

/** 取消收藏：接口幂等，未收藏也返回成功 */
export async function removeFavorite(questionId: string): Promise<void> {
  const res = await fetch(`/api/app/favorites/${encodeURIComponent(questionId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new AppApiError(res.status);
}

/** 按章节统计：需要当前教材 */
export function fetchChapterStats(textbookId: string): Promise<ChapterStatDto[]> {
  return getJson<ChapterStatDto[]>(
    `/study/stats/chapters?textbookId=${encodeURIComponent(textbookId)}`,
  );
}

/** 按知识点统计：与移动端一致，按学段/科目过滤 */
export function fetchKnowledgePointStats(
  params: { stageId?: string | null; subjectId?: string | null } = {},
): Promise<KnowledgePointStatDto[]> {
  const query = new URLSearchParams();
  if (params.stageId) query.set("stageId", params.stageId);
  if (params.subjectId) query.set("subjectId", params.subjectId);
  const search = query.toString();
  return getJson<KnowledgePointStatDto[]>(
    `/study/stats/knowledge-points${search ? `?${search}` : ""}`,
  );
}

/** 错题本：按年级/科目筛选，返回题目与错误统计 */
export function fetchWrongQuestions(
  params: {
    page?: number;
    pageSize?: number;
    gradeId?: string | null;
    subjectId?: string | null;
  } = {},
): Promise<WrongQuestionsResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  if (params.gradeId) query.set("gradeId", params.gradeId);
  if (params.subjectId) query.set("subjectId", params.subjectId);
  return getJson<WrongQuestionsResponse>(
    `/study/wrong-questions?${query.toString()}`,
  );
}

/** 知识点学范围：与移动端一致，取当前教材的科目/学段/年级/版本 */
export interface KnowledgeScope {
  subjectId: string;
  stageId: string | null;
  gradeId: string | null;
  publisherId: string | null;
}

/** 知识点树（含子节点），过滤口径与移动端「按知识点学」完全一致 */
export function fetchKnowledgePoints(
  scope: KnowledgeScope,
): Promise<KnowledgePointDto[]> {
  const params = new URLSearchParams({ subjectId: scope.subjectId });
  if (scope.stageId) params.set("stageId", scope.stageId);
  if (scope.gradeId) params.set("gradeId", scope.gradeId);
  if (scope.publisherId) params.set("publisherId", scope.publisherId);
  return getJson<KnowledgePointDto[]>(`/knowledge-points?${params.toString()}`);
}

/** 某个知识点（含子知识点）下的单元，一次取满（上限 100） */
export function fetchKnowledgeUnits(params: {
  subjectId: string;
  gradeId: string | null;
  publisherId: string | null;
  knowledgePointId: string;
}): Promise<UnitsResponse> {
  const query = new URLSearchParams({
    subjectId: params.subjectId,
    knowledgePointId: params.knowledgePointId,
    pageSize: "100",
  });
  if (params.gradeId) query.set("gradeId", params.gradeId);
  if (params.publisherId) query.set("publisherId", params.publisherId);
  return getJson<UnitsResponse>(`/units?${query.toString()}`);
}

/** 该知识点最近的学习记录，用于推导每个单元的「上次学习」 */
export function fetchKnowledgeRecords(
  knowledgePointId: string,
): Promise<StudyRecordsResponse> {
  return getJson<StudyRecordsResponse>(
    `/study/records?knowledgePointId=${knowledgePointId}&pageSize=100`,
  );
}

export function flattenTextbooks(stage: CatalogStageDto | null | undefined): TextbookDto[] {
  if (!stage) return [];
  return stage.subjects.flatMap((subject) => subject.textbooks);
}

/** 取第一个有题目的章节（深度优先），用于进入二级视图时的默认选中 */
export function firstChapterWithQuestions(
  nodes: ChapterNodeDto[],
): ChapterNodeDto | null {
  for (const node of nodes) {
    if (node.questionCount > 0) return node;
  }
  for (const node of nodes) {
    const child = firstChapterWithQuestions(node.children);
    if (child) return child;
  }
  return null;
}

/** 取第一个有题目的知识点（深度优先），用于进入知识点视图时的默认选中 */
export function firstKnowledgePointWithQuestions(
  nodes: KnowledgePointDto[],
): KnowledgePointDto | null {
  for (const node of nodes) {
    if (node.questionCount > 0) return node;
  }
  for (const node of nodes) {
    const child = firstKnowledgePointWithQuestions(node.children);
    if (child) return child;
  }
  return null;
}

/** 答题入口：参数与 /api/app/chapters 的过滤口径一一对应 */
export function quizHref(
  chapterId: string,
  unitIndex: number,
  chapterName?: string | null,
): string {
  const query = new URLSearchParams({
    chapterId,
    unitIndex: String(unitIndex),
  });
  // 仅供答题页头部展示，不参与接口过滤
  if (chapterName) query.set("chapterName", chapterName);
  return `/learn/quiz?${query.toString()}`;
}

/** 知识点答题入口：参数与 /api/app/units 的过滤口径一一对应 */
export function knowledgeQuizHref(params: {
  subjectId: string;
  gradeId: string | null;
  publisherId: string | null;
  knowledgePointId: string;
  knowledgePointName?: string | null;
  unitIndex: number;
}): string {
  const query = new URLSearchParams({
    subjectId: params.subjectId,
    knowledgePointId: params.knowledgePointId,
    unitIndex: String(params.unitIndex),
  });
  if (params.gradeId) query.set("gradeId", params.gradeId);
  if (params.publisherId) query.set("publisherId", params.publisherId);
  // 仅供答题页头部展示，不参与接口过滤
  if (params.knowledgePointName) query.set("knowledgePointName", params.knowledgePointName);
  return `/learn/quiz?${query.toString()}`;
}
