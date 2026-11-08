// 初始化初三化学（鲁教版）教材 + 章节 + 知识点（化学科目 KP 树从零建立）
// 蓝本：鲁教版（山东科学技术出版社）九年级化学上、下册
// 用法：cd apps/admin && npx tsx prisma/seed-grade9-chem-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 5; // 化学
const GRADE_ID = 9; // 初三
const STAGE_ID = 2; // 初中
const PUBLISHER_ID = 4; // 鲁教版

// 化学 L1 知识点（标准五大主题）
const L1_KPS = ["科学探究", "身边的化学物质", "物质构成的奥秘", "物质的化学变化", "化学与社会发展"];

// 九年级化学补充的 L2 知识点
const L2_KPS: { parent: string; names: string[] }[] = [
  { parent: "科学探究", names: ["常见化学实验仪器与基本操作", "气体的制取与性质", "物质的分离与提纯"] },
  { parent: "身边的化学物质", names: ["空气与氧气", "溶液", "常见的酸和碱", "金属", "常见的盐", "水和常见的溶液"] },
  { parent: "物质构成的奥秘", names: ["原子的构成", "元素与元素周期表", "化学式与化合价"] },
  { parent: "物质的化学变化", names: ["质量守恒定律", "化学方程式", "燃烧与灭火"] },
  { parent: "化学与社会发展", names: ["化学与能源", "化学与材料", "化学与环境保护", "化学与健康"] },
];

// 鲁教版九年级化学目录：L1 单元 → L2 节
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "化学 · 鲁教版 · 九年级上册",
    units: [
      {
        name: "第一单元 步入化学殿堂",
        lessons: ["1 化学真奇妙", "2 体验化学探究", "到实验室去：化学实验基本技能训练（一）"],
      },
      {
        name: "第二单元 探索水世界",
        lessons: ["1 水分子的变化", "2 水分子的运动", "3 原子的构成", "4 物质在水中的溶解", "到实验室去：化学实验基本技能训练（二）"],
      },
      {
        name: "第三单元 溶液",
        lessons: ["1 溶液的形成", "2 溶液组成的定量表示", "3 物质的溶解性", "到实验室去：配制一定溶质质量分数的溶液"],
      },
      {
        name: "第四单元 我们周围的空气",
        lessons: ["1 空气的成分", "2 物质组成的表示", "3 氧气", "到实验室去：氧气的实验室制取与性质"],
      },
      {
        name: "第五单元 定量研究化学反应",
        lessons: ["1 化学反应中的质量守恒", "2 化学反应的表示", "3 化学反应中的有关计算"],
      },
      {
        name: "第六单元 燃烧与燃料",
        lessons: ["1 燃烧与灭火", "2 化石燃料的利用", "3 大自然中的二氧化碳", "到实验室去：二氧化碳的实验室制取与性质"],
      },
    ],
  },
  {
    semester: 2,
    name: "化学 · 鲁教版 · 九年级下册",
    units: [
      {
        name: "第七单元 常见的酸和碱",
        lessons: ["1 酸及其性质", "2 碱及其性质", "3 溶液的酸碱性", "4 酸碱中和反应", "到实验室去：探究酸和碱的化学性质"],
      },
      {
        name: "第八单元 海水中的化学",
        lessons: ["1 海洋化学资源", "2 海水“晒盐”", "3 海水“制碱”", "到实验室去：粗盐中难溶性杂质的去除"],
      },
      {
        name: "第九单元 金属",
        lessons: ["1 常见的金属材料", "2 金属的化学性质", "3 钢铁的锈蚀与防护", "到实验室去：探究金属的性质"],
      },
      {
        name: "第十单元 化学与健康",
        lessons: ["1 食物中的有机物", "2 化学元素与人体健康", "3 远离有毒物质"],
      },
      {
        name: "第十一单元 化学与社会发展",
        lessons: ["1 化学与能源开发", "2 化学与材料研制", "3 化学与农业生产", "4 化学与环境保护"],
      },
    ],
  },
];

async function main() {
  // 1. 化学 L1 知识点（若无则建）
  let l1Count = 0;
  const l1Ids: Record<string, string> = {};
  for (const name of L1_KPS) {
    const found = await prisma.knowledgePoint.findFirst({
      where: { subjectId: SUBJECT_ID, stageId: STAGE_ID, parentId: null, name },
    });
    if (found) {
      l1Ids[name] = found.id;
      continue;
    }
    const kp = await prisma.knowledgePoint.create({
      data: { subjectId: SUBJECT_ID, stageId: STAGE_ID, name, sortOrder: L1_KPS.indexOf(name) + 1 },
    });
    l1Ids[name] = kp.id;
    l1Count++;
    console.log(`L1 知识点: ${name}`);
  }

  // 2. L2 知识点
  let l2Count = 0;
  for (const group of L2_KPS) {
    const parentId = l1Ids[group.parent];
    if (!parentId) {
      console.warn(`  ⚠ L1 知识点未就绪: ${group.parent}，跳过`);
      continue;
    }
    const maxSort = await prisma.knowledgePoint.aggregate({
      where: { parentId },
      _max: { sortOrder: true },
    });
    let sort = (maxSort._max.sortOrder ?? 0) + 1;
    for (const name of group.names) {
      const exists = await prisma.knowledgePoint.findFirst({
        where: { subjectId: SUBJECT_ID, stageId: STAGE_ID, parentId, name },
      });
      if (exists) {
        console.log(`  跳过(已存在): ${group.parent} / ${name}`);
        continue;
      }
      await prisma.knowledgePoint.create({
        data: { subjectId: SUBJECT_ID, stageId: STAGE_ID, parentId, name, sortOrder: sort++ },
      });
      l2Count++;
      console.log(`  知识点: ${group.parent} / ${name}`);
    }
  }

  // 3. 教材
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

  // 4. 章节（L1 单元 + L2 节）
  let chapterCount = 0;
  for (const book of BOOKS) {
    const tbId = textbookIds[book.semester];
    await prisma.chapter.deleteMany({ where: { textbookId: tbId } });
    for (let ui = 0; ui < book.units.length; ui++) {
      const unit = book.units[ui];
      const l1 = await prisma.chapter.create({
        data: { textbookId: tbId, name: unit.name, sortOrder: ui + 1 },
      });
      chapterCount++;
      for (let li = 0; li < unit.lessons.length; li++) {
        await prisma.chapter.create({
          data: { textbookId: tbId, parentId: l1.id, name: unit.lessons[li], sortOrder: li + 1 },
        });
        chapterCount++;
      }
    }
    console.log(`  ${book.name}: ${book.units.length} 单元`);
  }

  console.log(
    `\n完成：L1 知识点 ${l1Count} 个（新建），L2 知识点 ${l2Count} 个，教材 ${textbookCount} 本，章节 ${chapterCount} 个`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
