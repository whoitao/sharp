import { Prisma } from "@prisma/client";
import { grantPetRewards } from "@/lib/pet";
import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { chapterQuestionWhere, getChapterSubtreeIds } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

/** QuestionType.MULTIPLE_CHOICE = 2；其余题型（单选/判断）与移动端一样按单选语义判定 */
const MULTIPLE_CHOICE_TYPE = 2;

interface ParsedAnswer {
  questionId: bigint;
  selectedKeys: string[];
}

interface GradedAnswer {
  questionId: bigint;
  isCorrect: boolean;
}

interface QuestionForGrading {
  type: number;
  options: { optionKey: string; isCorrect: boolean }[];
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 主键解析：只接受正整数或纯数字字符串，避免 BigInt 抛错导致 500 */
function toId(value: unknown): bigint | null {
  const zero = BigInt(0);
  if (typeof value === "bigint") return value > zero ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? BigInt(value) : null;
  }
  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    const parsed = BigInt(value);
    return parsed > zero ? parsed : null;
  }
  return null;
}

/**
 * 判分口径与移动端 QuizScreen 完全一致：
 * - 多选（type=2）：选中集合与正确集合完全相等 —— 全对才算对，少选/错选都算错；
 * - 单选/判断：选中的唯一选项等于第一个正确项（移动端 options.find(o => o.isCorrect)）。
 * 额外加固（移动端 UI 不会产生的输入）：选项 key 不存在、selectedKeys 有重复项一律判错。
 */
function gradeAnswer(question: QuestionForGrading, selectedKeys: string[]): boolean {
  const validKeys = new Set(question.options.map((option) => option.optionKey));
  const uniqueSelected = new Set(selectedKeys);
  if (
    selectedKeys.some((key) => !validKeys.has(key)) ||
    uniqueSelected.size !== selectedKeys.length
  ) {
    return false;
  }

  const correctKeys = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.optionKey);
  if (correctKeys.length === 0) return false;

  if (question.type === MULTIPLE_CHOICE_TYPE) {
    return (
      selectedKeys.length === correctKeys.length &&
      selectedKeys.every((key) => correctKeys.includes(key))
    );
  }

  return selectedKeys.length === 1 && selectedKeys[0] === correctKeys[0];
}

/** 本次练习最长连对：只取最大值，不按每段连对重复计算 */
function longestStreak(answers: GradedAnswer[]): number {
  let best = 0;
  let current = 0;
  for (const answer of answers) {
    if (answer.isCorrect) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid JSON body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("invalid JSON body");
  }

  const {
    gradeId,
    unitIndex,
    chapterId,
    durationSeconds,
    answers,
    subjectId,
    knowledgePointId,
    tagIds,
    clientSessionId,
  } = body;

  const isChapter = chapterId !== undefined && chapterId !== null;
  const parsedChapterId = isChapter ? toId(chapterId) : null;
  const parsedSubjectId = subjectId === undefined || subjectId === null ? null : toId(subjectId);
  const parsedGradeId = gradeId === undefined || gradeId === null ? null : toId(gradeId);
  const parsedKnowledgePointId =
    knowledgePointId === undefined || knowledgePointId === null ? null : toId(knowledgePointId);

  if (isChapter && parsedChapterId === null) return badRequest("chapterId is invalid");
  if (subjectId !== undefined && subjectId !== null && parsedSubjectId === null) {
    return badRequest("subjectId is invalid");
  }
  if (gradeId !== undefined && gradeId !== null && parsedGradeId === null) {
    return badRequest("gradeId is invalid");
  }
  if (
    !isChapter &&
    knowledgePointId !== undefined &&
    knowledgePointId !== null &&
    parsedKnowledgePointId === null
  ) {
    return badRequest("knowledgePointId is invalid");
  }

  if (
    unitIndex === undefined ||
    (!isChapter && !parsedSubjectId && parsedGradeId === null) ||
    durationSeconds === undefined
  ) {
    return badRequest("unitIndex, (chapterId or subjectId), and durationSeconds are required");
  }
  if (
    typeof unitIndex !== "number" ||
    !Number.isSafeInteger(unitIndex) ||
    unitIndex < 0 ||
    unitIndex > 1_000_000
  ) {
    return badRequest("unitIndex is invalid");
  }
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0 ||
    durationSeconds > 2_147_483_647
  ) {
    return badRequest("durationSeconds must be a non-negative number");
  }
  const duration = Math.floor(durationSeconds);

  // 客户端的 correctCount / wrongCount / answers[].isCorrect 仅作为兼容字段接收，一律不作为真相来源
  if (!Array.isArray(answers)) {
    return badRequest("answers must be an array");
  }

  const seenQuestionIds = new Set<string>();
  const parsedAnswers: ParsedAnswer[] = [];
  for (const raw of answers) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return badRequest("answers contains an invalid item");
    }
    const questionId = toId((raw as { questionId?: unknown }).questionId);
    if (questionId === null) return badRequest("answers contains an invalid questionId");
    const key = questionId.toString();
    // 重复题目会破坏「一次作答一题」的口径，也容易放大进度/奖励，直接拒绝
    if (seenQuestionIds.has(key)) return badRequest(`duplicate questionId: ${key}`);
    seenQuestionIds.add(key);

    const selectedKeys = (raw as { selectedKeys?: unknown }).selectedKeys;
    if (
      !Array.isArray(selectedKeys) ||
      selectedKeys.some((selected) => typeof selected !== "string")
    ) {
      return badRequest(`selectedKeys must be a string array (questionId: ${key})`);
    }
    parsedAnswers.push({ questionId, selectedKeys });
  }

  // 判分所需的题目与选项：选项顺序与题目接口一致（sortNo 升序），保证与移动端选中项口径相同
  const questions =
    parsedAnswers.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: parsedAnswers.map((answer) => answer.questionId) } },
          select: {
            id: true,
            subjectId: true,
            type: true,
            options: {
              select: { optionKey: true, isCorrect: true },
              orderBy: { sortNo: "asc" },
            },
          },
        })
      : [];
  const questionById = new Map(questions.map((question) => [question.id.toString(), question]));

  for (const answer of parsedAnswers) {
    if (!questionById.has(answer.questionId.toString())) {
      return badRequest(`question not found: ${answer.questionId}`);
    }
  }

  // 归属校验：拒绝本次学习范围之外的题目，避免刷进度 / 统计 / 宠物奖励
  if (parsedAnswers.length > 0 && isChapter) {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: appUser.id },
      select: { unitSize: true },
    });
    const unitSize = settings?.unitSize ?? 20;
    const chapterIds = await getChapterSubtreeIds(parsedChapterId!);
    const unitWhere = chapterQuestionWhere(chapterIds, parsedSubjectId);
    if (!unitWhere) return badRequest("No questions found for this chapter");

    // 与 start 接口完全相同的取题窗口：章节子树 + 相同排序 + 相同分页
    const unitQuestions = await prisma.question.findMany({
      where: unitWhere,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      skip: unitIndex * unitSize,
      take: unitSize,
      select: { id: true },
    });
    const allowedQuestionIds = new Set(unitQuestions.map((question) => question.id.toString()));
    for (const answer of parsedAnswers) {
      if (!allowedQuestionIds.has(answer.questionId.toString())) {
        return badRequest(`questionId ${answer.questionId} is not in this unit`);
      }
    }
  } else if (parsedAnswers.length > 0 && parsedSubjectId) {
    for (const answer of parsedAnswers) {
      const question = questionById.get(answer.questionId.toString())!;
      if (question.subjectId?.toString() !== parsedSubjectId.toString()) {
        return badRequest(`questionId ${answer.questionId} does not belong to this subject`);
      }
    }
  }

  // 逐题重算：对错数、总题数全部由服务端判定结果得出
  const gradedAnswers: GradedAnswer[] = parsedAnswers.map((answer) => {
    const question = questionById.get(answer.questionId.toString())!;
    return {
      questionId: answer.questionId,
      isCorrect: gradeAnswer(question, answer.selectedKeys),
    };
  });

  const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;
  const wrongCount = gradedAnswers.length - correctCount;
  const totalQuestions = gradedAnswers.length;
  const maxStreak = longestStreak(gradedAnswers);

  // 标签筛选上下文：与 start 保持一致（升序逗号串）
  const tagFilter =
    !isChapter && Array.isArray(tagIds) && tagIds.length > 0
      ? tagIds
          .map((tag) => String(tag))
          .sort()
          .join(",")
      : null;

  const kpId = isChapter ? null : parsedKnowledgePointId;
  const scopeType = isChapter ? "chapter" : kpId ? "knowledge" : "bank";

  const finishedAt = new Date();
  const startedAt = new Date(finishedAt.getTime() - duration * 1000);

  // 每次完成都追加一条不可变的学习事实；单元只是本次取题的分页窗口，不参与统计
  let attempt: { id: string };
  try {
    attempt = await prisma.studyAttempt.create({
      data: {
        userId: appUser.id,
        scopeType,
        gradeId: parsedGradeId,
        chapterId: parsedChapterId,
        unitIndex,
        subjectId: parsedSubjectId,
        knowledgePointId: kpId,
        tagFilter,
        totalQuestions,
        correctCount,
        wrongCount,
        durationSeconds: duration,
        startedAt,
        finishedAt,
        items: {
          create: gradedAnswers.map((answer) => ({
            questionId: answer.questionId,
            isCorrect: answer.isCorrect,
          })),
        },
      },
    });
  } catch (error) {
    // 引用了不存在的章节/科目/年级/知识点（或题目被并发删除）时按非法输入拒绝，不返回 500
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return badRequest("invalid scope reference");
    }
    throw error;
  }

  // 每题的最新状态是跨次学习的累计数据，继续保留
  const filter = {
    subjectId: parsedSubjectId,
    knowledgePointId: kpId,
  };

  for (const answer of gradedAnswers) {
    const isCorrect = answer.isCorrect;
    await prisma.userQuestionProgress.upsert({
      where: {
        userId_questionId: {
          userId: appUser.id,
          questionId: answer.questionId,
        },
      },
      update: {
        lastPracticedAt: new Date(),
        correctCount: { increment: isCorrect ? 1 : 0 },
        wrongCount: { increment: isCorrect ? 0 : 1 },
        status: isCorrect ? "correct" : "wrong",
        ...filter,
      },
      create: {
        userId: appUser.id,
        questionId: answer.questionId,
        ...filter,
        status: isCorrect ? "correct" : "wrong",
        lastPracticedAt: new Date(),
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
      },
    });
  }

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.userDailyStat.upsert({
    where: {
      userId_date: {
        userId: appUser.id,
        date: today,
      },
    },
    update: {
      questionsAnswered: { increment: totalQuestions },
      sessionsCompleted: { increment: 1 },
      studyDuration: { increment: duration },
    },
    create: {
      userId: appUser.id,
      date: today,
      questionsAnswered: totalQuestions,
      sessionsCompleted: 1,
      studyDuration: duration,
    },
  });

  // 宠物反馈：结算成功后发放经验与食物；未领养返回 null，不影响原流程
  const [subject, chapter, knowledgePoint] = await Promise.all([
    parsedSubjectId
      ? prisma.subject.findUnique({ where: { id: parsedSubjectId }, select: { name: true } })
      : null,
    parsedChapterId
      ? prisma.chapter.findUnique({ where: { id: parsedChapterId }, select: { name: true } })
      : null,
    kpId ? prisma.knowledgePoint.findUnique({ where: { id: kpId }, select: { name: true } }) : null,
  ]);

  const pet = await grantPetRewards({
    userId: appUser.id,
    attemptId: attempt.id,
    // 旧客户端未传 clientSessionId 时用 attemptId 兜底：每次结算唯一，天然幂等
    clientSessionId: typeof clientSessionId === "string" && clientSessionId ? clientSessionId : attempt.id,
    scopeType,
    subjectId: parsedSubjectId,
    subjectName: subject?.name ?? null,
    chapterId: parsedChapterId,
    knowledgePointId: kpId,
    scopeName: chapter?.name ?? knowledgePoint?.name ?? null,
    correctCount,
    totalQuestions,
    durationSeconds: duration,
    maxStreak,
  });

  return NextResponse.json({ success: true, attemptId: attempt.id, pet });
}
