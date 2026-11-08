// 初始化小学四年级数学（青岛版，六三制）教材 + 章节 + 知识点补充
// 蓝本：青岛版一二三年级数学结构（L1 单元“主题——内容” + L2 编号课时）
// 用法：cd apps/admin && npx tsx prisma/seed-grade4-math-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 2; // 数学
const GRADE_ID = 4; // 四年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 7; // 青岛版

// 青岛版（六三制）四年级数学目录：L1 单元 → L2 课时
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "数学 · 青岛版 · 四年级上册",
    units: [
      { name: "一 泰山古树——计算器", lessons: ["1 认识计算器", "2 用计算器探索规律"] },
      { name: "二 节能减排——用字母表示数", lessons: ["1 用字母表示数", "2 用字母表示数量关系和计算公式"] },
      { name: "三 快乐农场——运算律", lessons: ["1 加法运算律", "2 乘法交换律和结合律", "3 乘法分配律"] },
      { name: "四 巧手小木匠——认识多边形", lessons: ["1 三角形的认识", "2 三角形的分类", "3 三角形三边的关系", "4 三角形的内角和", "5 平行四边形和梯形的认识"] },
      { name: "五 动物世界——小数的意义和性质", lessons: ["1 小数的意义", "2 小数的性质", "3 小数点位置移动引起小数大小的变化", "4 名数的改写", "5 求小数的近似数"] },
      { name: "六 趣味拼搭——观察物体", lessons: ["1 从不同方向观察物体", "2 观察立体图形"] },
      { name: "七 奇异的克隆牛——小数加减法", lessons: ["1 小数加减法", "2 小数加减混合运算"] },
      { name: "八 我锻炼 我健康——平均数", lessons: ["1 平均数的认识", "2 分段统计表"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
  {
    semester: 2,
    name: "数学 · 青岛版 · 四年级下册",
    units: [
      { name: "一 大数知多少——万以上数的认识", lessons: ["1 万以上数的认识", "2 万以上数的读写", "3 万以上数的大小比较", "4 求近似数", "5 数字编码"] },
      { name: "二 繁忙的工地——线和角", lessons: ["1 直线、射线和线段", "2 角的认识", "3 角的度量", "4 角的分类和画法"] },
      { name: "三 保护大天鹅——三位数乘两位数", lessons: ["1 三位数乘两位数的口算", "2 三位数乘两位数的笔算", "3 积的变化规律"] },
      { name: "四 交通中的线——平行与相交", lessons: ["1 认识平行", "2 认识垂直", "3 两点间的距离", "4 点到直线的距离"] },
      { name: "五 收获的季节——除数是两位数的除法", lessons: ["1 除数是整十数的口算", "2 除数是两位数的笔算", "3 商不变的性质"] },
      { name: "六 快捷的物流运输——解决问题", lessons: ["1 相遇问题", "2 行程问题"] },
      { name: "七 小小志愿者——混合运算", lessons: ["1 不带括号的混合运算", "2 带括号的混合运算"] },
      { name: "八 新校服——条形统计图", lessons: ["1 条形统计图（一）", "2 条形统计图（二）"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
];

// 四年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "数与代数", names: ["用字母表示数", "运算律", "小数的意义和性质", "小数加减法", "万以上数的认识", "三位数乘两位数", "除数是两位数的除法", "平均数"] },
  { parent: "图形与几何", names: ["线和角", "认识多边形", "平行与相交"] },
  { parent: "统计与概率", names: ["分段统计表"] },
  { parent: "综合与实践", names: ["计算器的使用"] },
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
