/** 答题页数据：复用 /api/app/** 透传代理；结算走 BFF 幂等入口。 */

import { AppApiError } from "@/lib/learn/api";

export interface QuizOption {
  id: string;
  questionId: string;
  optionKey: string;
  content: string;
  isCorrect: boolean;
  sortNo: number;
}

export interface QuizQuestion {
  id: string;
  gradeId: string | null;
  type: number;
  content: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  sortOrder: number;
  options: QuizOption[];
  progress: { status: string; correctCount: number; wrongCount: number } | null;
  /** 本题关联的知识点；接口未返回时为空，答题页据此决定是否展示「本题考点」 */
  knowledgePoints?: { id: string; name: string; parentId: string | null }[];
}

export interface PreviousStudy {
  finishedAt: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
}

export interface StudyStartResponse {
  id: string | null;
  chapterId: string | null;
  unitIndex: number;
  totalQuestions: number;
  startedAt: string;
  previous: PreviousStudy | null;
}

export interface AnswerPayload {
  questionId: string;
  selectedKeys: string[];
  isCorrect: boolean;
}

export interface QuizAnswerRecord {
  selectedKeys: string[];
  isCorrect: boolean;
}

/** 一次作答会话的结果摘要，结果页据此渲染错题回顾 */
export interface QuizOutcome {
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  totalQuestions: number;
  durationSeconds: number;
  records: Record<string, QuizAnswerRecord>;
}

/** 多选（type 2）需要先选再确认；其余（单选、判断）选中即判 */
export function isMultipleChoice(question: QuizQuestion): boolean {
  return question.type === 2;
}

export function correctKeys(question: QuizQuestion): string[] {
  return question.options.filter((o) => o.isCorrect).map((o) => o.optionKey);
}

export function isAnswerCorrect(question: QuizQuestion, selected: string[]): boolean {
  const correct = correctKeys(question);
  if (correct.length !== selected.length) return false;
  return correct.every((key) => selected.includes(key));
}

/** 一次作答的范围：章节模式只有 chapterId；知识点模式用 subjectId + knowledgePointId */
export interface QuizScope {
  chapterId: string | null;
  subjectId: string | null;
  gradeId: string | null;
  publisherId: string | null;
  knowledgePointId: string | null;
}

/** 与移动端一致：进入先取「上次学习」摘要，同时校验单元是否有题 */
export async function startStudy(
  scope: QuizScope,
  unitIndex: number,
): Promise<StudyStartResponse> {
  const query = new URLSearchParams();
  if (!scope.chapterId) {
    if (scope.subjectId) query.set("subjectId", scope.subjectId);
    if (scope.gradeId) query.set("gradeId", scope.gradeId);
    if (scope.publisherId) query.set("publisherId", scope.publisherId);
    if (scope.knowledgePointId) query.set("knowledgePointId", scope.knowledgePointId);
  }
  const qs = query.toString();
  const res = await fetch(`/api/app/study/start${qs ? `?${qs}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(
      scope.chapterId ? { chapterId: scope.chapterId, unitIndex } : { unitIndex },
    ),
  });
  if (!res.ok) throw new AppApiError(res.status);
  return (await res.json()) as StudyStartResponse;
}

export async function fetchUnitQuestions(
  scope: QuizScope,
  unitIndex: number,
): Promise<QuizQuestion[]> {
  let url: string;
  if (scope.chapterId) {
    url = `/api/app/chapters/${scope.chapterId}/units/${unitIndex}/questions`;
  } else {
    const query = new URLSearchParams();
    if (scope.subjectId) query.set("subjectId", scope.subjectId);
    if (scope.gradeId) query.set("gradeId", scope.gradeId);
    if (scope.knowledgePointId) query.set("knowledgePointId", scope.knowledgePointId);
    url = `/api/app/units/${unitIndex}/questions?${query.toString()}`;
  }
  const res = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new AppApiError(res.status);
  return (await res.json()) as QuizQuestion[];
}

export interface FinishPayload {
  scope: QuizScope;
  unitIndex: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  answers: AnswerPayload[];
  clientSessionId: string;
}

/** 只调用一次结算接口；BFF 按 clientSessionId 幂等，重复提交返回同一结果 */
export async function finishStudy(payload: FinishPayload): Promise<void> {
  const { scope, ...rest } = payload;
  const res = await fetch("/api/study/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      ...rest,
      chapterId: scope.chapterId,
      subjectId: scope.subjectId,
      gradeId: scope.gradeId,
      knowledgePointId: scope.knowledgePointId,
    }),
  });
  if (!res.ok) throw new AppApiError(res.status);
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** 作答会话标识：同一范围同一单元同一标签页内稳定复用，结算成功后清除 */
export function quizSessionKey(scope: QuizScope, unitIndex: number): string {
  const scopeKey = scope.chapterId
    ? `chapter-${scope.chapterId}`
    : `kp-${scope.knowledgePointId ?? "all"}-s-${scope.subjectId ?? "all"}`;
  return `sharp:quiz-session:${scopeKey}:${unitIndex}`;
}
