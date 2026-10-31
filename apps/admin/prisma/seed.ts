import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up existing data (in order of dependencies)
  await prisma.userDailyStat.deleteMany();
  await prisma.userQuestionProgress.deleteMany();
  await prisma.userStudyRecord.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();

  // Create admin user
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.admin.create({
    data: {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "admin",
    },
  });
  console.log(`Created admin: ${admin.username}`);

  // 学段字典（年级的上级维度）
  const stageSeeds = [
    { name: "小学", sortOrder: 1 },
    { name: "初中", sortOrder: 2 },
    { name: "高中", sortOrder: 3 },
    { name: "大学", sortOrder: 4 },
  ];
  const stageMap = new Map<string, bigint>();
  for (const s of stageSeeds) {
    const stage = await prisma.stage.upsert({
      where: { name: s.name },
      update: { sortOrder: s.sortOrder },
      create: s,
    });
    stageMap.set(stage.name, stage.id);
  }

  // 年级与科目：分类已合并进年级，示例数据直接落在年级上
  const cet4Grade = await prisma.grade.upsert({
    where: { name: "大一" },
    update: {},
    create: { name: "大一", stageId: stageMap.get("大学")!, sortOrder: 10 },
  });

  const gkMathGrade = await prisma.grade.upsert({
    where: { name: "高三" },
    update: {},
    create: { name: "高三", stageId: stageMap.get("高中")!, sortOrder: 6 },
  });

  const englishSubject = await prisma.subject.upsert({
    where: { name: "英语" },
    update: {},
    create: { name: "英语", sortOrder: 1 },
  });

  const mathSubject = await prisma.subject.upsert({
    where: { name: "数学" },
    update: {},
    create: { name: "数学", sortOrder: 2 },
  });

  console.log(`Created grades: 大一, 高三 / subjects: 英语, 数学`);

  // Create sample CET4 questions
  const questions = [
    {
      type: 1,
      content: "What is the capital of France?",
      analysis: "Paris is the capital and most populous city of France.",
      difficulty: 1,
      score: 1,
      sortOrder: 0,
      options: [
        { optionKey: "A", content: "London", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "Paris", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "Berlin", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "Madrid", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "Which word means 'very happy'?",
      analysis: "'Elated' means ecstatically happy.",
      difficulty: 2,
      score: 1,
      sortOrder: 1,
      options: [
        { optionKey: "A", content: "Elated", isCorrect: true, sortNo: 0 },
        { optionKey: "B", content: "Devastated", isCorrect: false, sortNo: 1 },
        { optionKey: "C", content: "Anxious", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "Confused", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "Choose the correct sentence:",
      analysis: "Subject-verb agreement: 'She' requires 'goes'.",
      difficulty: 1,
      score: 1,
      sortOrder: 2,
      options: [
        { optionKey: "A", content: "She go to school every day.", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "She goes to school every day.", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "She going to school every day.", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "She gone to school every day.", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 3,
      content: "The word 'beautiful' is an adjective.",
      analysis: "'Beautiful' describes a noun, so it is an adjective.",
      difficulty: 1,
      score: 1,
      sortOrder: 3,
      options: [
        { optionKey: "A", content: "True", isCorrect: true, sortNo: 0 },
        { optionKey: "B", content: "False", isCorrect: false, sortNo: 1 },
      ],
    },
    {
      type: 1,
      content: "What is the past tense of 'run'?",
      analysis: "The past tense of 'run' is 'ran'.",
      difficulty: 1,
      score: 1,
      sortOrder: 4,
      options: [
        { optionKey: "A", content: "Runned", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "Ran", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "Running", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "Runs", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "Which preposition completes: 'She is good ___ painting'?",
      analysis: "The correct phrase is 'good at'.",
      difficulty: 2,
      score: 1,
      sortOrder: 5,
      options: [
        { optionKey: "A", content: "in", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "on", isCorrect: false, sortNo: 1 },
        { optionKey: "C", content: "at", isCorrect: true, sortNo: 2 },
        { optionKey: "D", content: "for", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "What does 'ubiquitous' mean?",
      analysis: "'Ubiquitous' means present, appearing, or found everywhere.",
      difficulty: 3,
      score: 2,
      sortOrder: 6,
      options: [
        { optionKey: "A", content: "Rare and unusual", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "Present everywhere", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "Very small", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "Extremely fast", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "Choose the correct spelling:",
      analysis: "The correct spelling is 'accommodate' with double 'c' and double 'm'.",
      difficulty: 2,
      score: 1,
      sortOrder: 7,
      options: [
        { optionKey: "A", content: "Accomodate", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "Accommodate", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "Acommodate", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "Acomodate", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 2,
      content: "Which of the following are prepositions? (Select all that apply)",
      analysis: "In, on, and at are all prepositions. 'Quickly' is an adverb.",
      difficulty: 2,
      score: 2,
      sortOrder: 8,
      options: [
        { optionKey: "A", content: "in", isCorrect: true, sortNo: 0 },
        { optionKey: "B", content: "on", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "at", isCorrect: true, sortNo: 2 },
        { optionKey: "D", content: "quickly", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "What is the meaning of the idiom 'break the ice'?",
      analysis: "'Break the ice' means to initiate conversation or relieve tension.",
      difficulty: 2,
      score: 1,
      sortOrder: 9,
      options: [
        { optionKey: "A", content: "To break something frozen", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "To initiate conversation in a social setting", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "To cause trouble", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "To end a relationship", isCorrect: false, sortNo: 3 },
      ],
    },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: {
        gradeId: cet4Grade.id,
        subjectId: englishSubject.id,
        type: q.type,
        content: q.content,
        analysis: q.analysis,
        difficulty: q.difficulty,
        score: q.score,
        sortOrder: q.sortOrder,
        options: {
          create: q.options,
        },
      },
    });
  }

  console.log(`Created ${questions.length} sample questions for CET4`);

  // Create sample 高考数学 questions
  const mathQuestions = [
    {
      type: 1,
      content: "What is the derivative of f(x) = x^2?",
      analysis: "Using the power rule, the derivative of x^2 is 2x.",
      difficulty: 1,
      score: 1,
      sortOrder: 0,
      options: [
        { optionKey: "A", content: "x", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "2x", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "x^2", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "2", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "What is the value of sin(90 degrees)?",
      analysis: "sin(90 degrees) = 1.",
      difficulty: 1,
      score: 1,
      sortOrder: 1,
      options: [
        { optionKey: "A", content: "0", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "1", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "-1", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "undefined", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 1,
      content: "What is the solution set of x^2 - 4 = 0?",
      analysis: "x^2 - 4 = (x-2)(x+2) = 0, so x = 2 or x = -2.",
      difficulty: 2,
      score: 1,
      sortOrder: 2,
      options: [
        { optionKey: "A", content: "{2}", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "{-2}", isCorrect: false, sortNo: 1 },
        { optionKey: "C", content: "{2, -2}", isCorrect: true, sortNo: 2 },
        { optionKey: "D", content: "{4}", isCorrect: false, sortNo: 3 },
      ],
    },
    {
      type: 3,
      content: "The sum of interior angles of a triangle is 180 degrees.",
      analysis: "This is a fundamental theorem in Euclidean geometry.",
      difficulty: 1,
      score: 1,
      sortOrder: 3,
      options: [
        { optionKey: "A", content: "True", isCorrect: true, sortNo: 0 },
        { optionKey: "B", content: "False", isCorrect: false, sortNo: 1 },
      ],
    },
    {
      type: 1,
      content: "What is log base 10 of 1000?",
      analysis: "log10(1000) = log10(10^3) = 3.",
      difficulty: 2,
      score: 1,
      sortOrder: 4,
      options: [
        { optionKey: "A", content: "2", isCorrect: false, sortNo: 0 },
        { optionKey: "B", content: "3", isCorrect: true, sortNo: 1 },
        { optionKey: "C", content: "10", isCorrect: false, sortNo: 2 },
        { optionKey: "D", content: "100", isCorrect: false, sortNo: 3 },
      ],
    },
  ];

  for (const q of mathQuestions) {
    await prisma.question.create({
      data: {
        gradeId: gkMathGrade.id,
        subjectId: mathSubject.id,
        type: q.type,
        content: q.content,
        analysis: q.analysis,
        difficulty: q.difficulty,
        score: q.score,
        sortOrder: q.sortOrder,
        options: {
          create: q.options,
        },
      },
    });
  }

  console.log(`Created ${mathQuestions.length} sample questions for 高考数学`);

  // Create a sample user
  const userPasswordHash = await bcrypt.hash("user123", 10);
  const user = await prisma.user.create({
    data: {
      username: "testuser",
      passwordHash: userPasswordHash,
      nickname: "Test User",
    },
  });

  await prisma.userSettings.create({
    data: {
      userId: user.id,
      unitSize: 20,
      theme: "system",
    },
  });

  console.log(`Created test user: ${user.username}`);

  // Create sample study records
  const cet4Id = cet4Grade.id;
  const gkMathId = gkMathGrade.id;

  await prisma.userStudyRecord.createMany({
    data: [
      {
        userId: user.id,
        gradeId: cet4Id,
        unitIndex: 0,
        startedAt: new Date(Date.now() - 86400000 * 5),
        finishedAt: new Date(Date.now() - 86400000 * 5 + 600000),
        totalQuestions: 20,
        correctCount: 18,
        wrongCount: 2,
        durationSeconds: 600,
      },
      {
        userId: user.id,
        gradeId: cet4Id,
        unitIndex: 1,
        startedAt: new Date(Date.now() - 86400000 * 4),
        finishedAt: new Date(Date.now() - 86400000 * 4 + 720000),
        totalQuestions: 20,
        correctCount: 16,
        wrongCount: 4,
        durationSeconds: 720,
      },
      {
        userId: user.id,
        gradeId: cet4Id,
        unitIndex: 2,
        startedAt: new Date(Date.now() - 86400000 * 3),
        finishedAt: new Date(Date.now() - 86400000 * 3 + 540000),
        totalQuestions: 20,
        correctCount: 15,
        wrongCount: 5,
        durationSeconds: 540,
      },
      {
        userId: user.id,
        gradeId: gkMathId,
        unitIndex: 0,
        startedAt: new Date(Date.now() - 86400000 * 2),
        finishedAt: new Date(Date.now() - 86400000 * 2 + 900000),
        totalQuestions: 20,
        correctCount: 14,
        wrongCount: 6,
        durationSeconds: 900,
      },
      {
        userId: user.id,
        gradeId: gkMathId,
        unitIndex: 1,
        startedAt: new Date(Date.now() - 86400000),
        finishedAt: new Date(Date.now() - 86400000 + 660000),
        totalQuestions: 20,
        correctCount: 17,
        wrongCount: 3,
        durationSeconds: 660,
      },
      {
        userId: user.id,
        gradeId: cet4Id,
        unitIndex: 3,
        startedAt: new Date(),
        finishedAt: null,
        totalQuestions: 20,
        correctCount: 10,
        wrongCount: 5,
        durationSeconds: 300,
      },
    ],
  });

  console.log("Created 6 sample study records");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
