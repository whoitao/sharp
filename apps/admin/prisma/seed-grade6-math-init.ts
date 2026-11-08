// 初始化小学六年级数学（青岛版，六三制）教材 + 章节 + 知识点补充
// 蓝本：青岛版一至五年级数学结构（L1 单元“主题——内容” + L2 编号课时）
// 用法：cd apps/admin && npx tsx prisma/seed-grade6-math-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 2; // 数学
const GRADE_ID = 6; // 六年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 7; // 青岛版

// 青岛版（六三制）六年级数学目录：L1 单元 → L2 课时
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "数学 · 青岛版 · 六年级上册",
    units: [
      { name: "一 小手艺展示——分数乘法", lessons: ["1 分数乘整数", "2 一个数乘分数", "3 求一个数的几分之几是多少", "4 倒数"] },
      { name: "二 摸球游戏——可能性", lessons: ["1 可能性"] },
      { name: "三 布艺兴趣小组——分数除法", lessons: ["1 分数除以整数", "2 一个数除以分数", "3 分数乘除混合运算"] },
      { name: "四 人体的奥秘——比", lessons: ["1 比的意义", "2 比的基本性质", "3 按比例分配"] },
      { name: "五 完美的图形——圆", lessons: ["1 圆的认识", "2 圆的周长", "3 圆的面积"] },
      { name: "六 中国的世界遗产——分数四则混合运算", lessons: ["1 分数四则混合运算", "2 稍复杂的分数乘法问题", "3 稍复杂的分数除法问题"] },
      { name: "七 体检中的百分数——百分数（一）", lessons: ["1 百分数的认识", "2 百分数与分数、小数的互化", "3 求一个数是另一个数的百分之几"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
  {
    semester: 2,
    name: "数学 · 青岛版 · 六年级下册",
    units: [
      { name: "一 欢乐农家游——百分数（二）", lessons: ["1 求一个数比另一个数多（少）百分之几", "2 百分数的应用", "3 折扣", "4 利息"] },
      { name: "二 冰淇淋盒有多大——圆柱和圆锥", lessons: ["1 圆柱和圆锥的认识", "2 圆柱的侧面积和表面积", "3 圆柱的体积", "4 圆锥的体积"] },
      { name: "三 啤酒生产中的数学——比例", lessons: ["1 比例的意义和基本性质", "2 正比例", "3 反比例", "4 用比例解决问题"] },
      { name: "四 快乐足球——比例尺", lessons: ["1 比例尺的认识", "2 求图上距离和实际距离", "3 图形的放大与缩小"] },
      { name: "五 奥运奖牌——扇形统计图", lessons: ["1 扇形统计图", "2 选择合适的统计图"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
];

// 六年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "数与代数", names: ["分数乘法", "分数除法", "比和比例", "百分数"] },
  { parent: "图形与几何", names: ["圆", "圆柱和圆锥"] },
  { parent: "统计与概率", names: ["扇形统计图", "可能性"] },
];

async function main() {
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

  // 2. 章节（L1 单元 + L2 课时），先清旧章节再建
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
