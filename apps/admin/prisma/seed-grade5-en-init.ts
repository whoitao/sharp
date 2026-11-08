// 初始化小学五年级英语（人教版 PEP）教材 + 章节 + 知识点补充
// 蓝本：三四年级英语 PEP 结构（L1 Unit + L2 Part A/B/C，Recycle 无子节）
// 用法：cd apps/admin && npx tsx prisma/seed-grade5-en-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 3; // 英语
const GRADE_NAME = "五年级";
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 1; // 人教版

// 人教版 PEP 五年级英语目录：L1 Unit → L2 Part A/B/C
const PARTS = ["Part A", "Part B", "Part C"];
const BOOKS: { semester: number; name: string; units: string[] }[] = [
  {
    semester: 1,
    name: "英语 · 人教版 · 五年级上册",
    units: [
      "Unit 1 What's he like?",
      "Unit 2 My week",
      "Unit 3 What would you like?",
      "Recycle 1",
      "Unit 4 What can you do?",
      "Unit 5 There is a big bed",
      "Unit 6 In a nature park",
      "Recycle 2",
    ],
  },
  {
    semester: 2,
    name: "英语 · 人教版 · 五年级下册",
    units: [
      "Unit 1 My day",
      "Unit 2 My favourite season",
      "Unit 3 My school calendar",
      "Recycle 1",
      "Unit 4 When is the art show?",
      "Unit 5 Whose dog is it?",
      "Unit 6 Work quietly!",
      "Recycle 2",
    ],
  },
];

// 五年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "语音", names: ["辅音字母组合的发音"] },
  { parent: "词汇", names: ["季节与月份"] },
  { parent: "语法", names: ["现在进行时", "物主代词", "序数词"] },
];

async function main() {
  const grade = await prisma.grade.findFirst({ where: { name: GRADE_NAME } });
  if (!grade) throw new Error(`未找到年级: ${GRADE_NAME}`);
  const GRADE_ID = grade.id;
  console.log(`年级: #${GRADE_ID} ${grade.name}`);

  // 1. 教材
  let textbookCount = 0;
  const textbookIds: Record<number, number> = {};
  for (const book of BOOKS) {
    const tb = await prisma.textbook.upsert({
      where: {
        subjectId_gradeId_publisherId_semester: {
          subjectId: SUBJECT_ID,
          gradeId: GRADE_ID,
          publisherId: PUBLISHER_ID,
          semester: book.semester,
        },
      },
      update: { name: book.name },
      create: {
        subject: { connect: { id: SUBJECT_ID } },
        grade: { connect: { id: GRADE_ID } },
        publisher: { connect: { id: PUBLISHER_ID } },
        stage: { connect: { id: STAGE_ID } },
        semester: book.semester,
        name: book.name,
      },
    });
    textbookIds[book.semester] = tb.id;
    textbookCount++;
    console.log(`教材: #${tb.id} ${tb.name}`);
  }

  // 2. 章节（L1 Unit + L2 Part），先清旧章节再建
  let chapterCount = 0;
  for (const book of BOOKS) {
    const tbId = textbookIds[book.semester];
    await prisma.chapter.deleteMany({ where: { textbookId: tbId } });
    for (let ui = 0; ui < book.units.length; ui++) {
      const l1 = await prisma.chapter.create({
        data: { textbookId: tbId, name: book.units[ui], sortOrder: ui + 1 },
      });
      chapterCount++;
      // Recycle 复习单元不分 Part
      if (book.units[ui].startsWith("Recycle")) continue;
      for (let pi = 0; pi < PARTS.length; pi++) {
        await prisma.chapter.create({
          data: { textbookId: tbId, parentId: l1.id, name: PARTS[pi], sortOrder: pi + 1 },
        });
        chapterCount++;
      }
    }
    console.log(`  ${book.name}: ${book.units.length} 单元`);
  }

  // 3. 知识点补充
  let kpCount = 0;
  for (const group of NEW_KPS) {
    const parent = await prisma.knowledgePoint.findFirst({
      where: { subjectId: SUBJECT_ID, stageId: STAGE_ID, parentId: null, name: group.parent },
    });
    if (!parent) {
      console.warn(`  ⚠ 未找到 L1 知识点: ${group.parent}，跳过`);
      continue;
    }
    const maxSort = await prisma.knowledgePoint.aggregate({
      where: { parentId: parent.id },
      _max: { sortOrder: true },
    });
    let sort = (maxSort._max.sortOrder ?? 0) + 1;
    for (const name of group.names) {
      const exists = await prisma.knowledgePoint.findFirst({
        where: { subjectId: SUBJECT_ID, stageId: STAGE_ID, parentId: parent.id, name },
      });
      if (exists) continue;
      await prisma.knowledgePoint.create({
        data: { subjectId: SUBJECT_ID, stageId: STAGE_ID, parentId: parent.id, name, sortOrder: sort++ },
      });
      kpCount++;
      console.log(`  知识点: ${group.parent} / ${name}`);
    }
  }

  console.log(`\n完成：教材 ${textbookCount} 本，章节 ${chapterCount} 个，新增知识点 ${kpCount} 个`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
