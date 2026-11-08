// 初始化小学五年级数学（青岛版，六三制）教材 + 章节 + 知识点补充
// 蓝本：青岛版一至四年级数学结构（L1 单元“主题——内容” + L2 编号课时）
// 用法：cd apps/admin && npx tsx prisma/seed-grade5-math-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 2; // 数学
const GRADE_ID = 5; // 五年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 7; // 青岛版

// 青岛版（六三制）五年级数学目录：L1 单元 → L2 课时
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "数学 · 青岛版 · 五年级上册",
    units: [
      { name: "一 今天我当家——小数乘法", lessons: ["1 小数乘整数", "2 小数乘小数", "3 积的近似数", "4 小数四则混合运算"] },
      { name: "二 图案美——对称、平移与旋转", lessons: ["1 轴对称图形", "2 平移", "3 旋转"] },
      { name: "三 游三峡——小数除法", lessons: ["1 小数除以整数", "2 一个数除以小数", "3 商的近似数", "4 循环小数"] },
      { name: "四 走进动物园——简易方程", lessons: ["1 方程的意义", "2 等式的性质", "3 解方程", "4 列方程解决实际问题"] },
      { name: "五 生活中的多边形——多边形的面积", lessons: ["1 平行四边形的面积", "2 三角形的面积", "3 梯形的面积", "4 组合图形的面积"] },
      { name: "六 团体操表演——因数与倍数", lessons: ["1 因数与倍数", "2 2、5的倍数的特征", "3 3的倍数的特征", "4 质数与合数"] },
      { name: "七 绿色家园——折线统计图", lessons: ["1 折线统计图", "2 选择合适的统计图"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
  {
    semester: 2,
    name: "数学 · 青岛版 · 五年级下册",
    units: [
      { name: "一 中国的热极——认识负数", lessons: ["1 认识负数", "2 用正负数表示生活中的量"] },
      { name: "二 校园艺术节——分数的意义和性质", lessons: ["1 分数的意义", "2 真分数与假分数", "3 分数与除法", "4 分数的基本性质"] },
      { name: "三 剪纸中的数学——分数加减法（一）", lessons: ["1 公因数和最大公因数", "2 约分", "3 同分母分数加减法", "4 公倍数和最小公倍数"] },
      { name: "四 走进军营——方向与位置", lessons: ["1 用数对确定位置", "2 根据方向和距离确定位置"] },
      { name: "五 关注环境——分数加减法（二）", lessons: ["1 异分母分数加减法", "2 分数加减混合运算"] },
      { name: "六 爱护眼睛——复式统计图", lessons: ["1 复式条形统计图", "2 复式折线统计图"] },
      { name: "七 包装盒——长方体和正方体", lessons: ["1 长方体和正方体的认识", "2 长方体和正方体的表面积", "3 体积和体积单位", "4 长方体和正方体的体积", "5 容积和容积单位"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
];

// 五年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "数与代数", names: ["小数乘法", "小数除法", "简易方程", "因数与倍数", "认识负数", "分数的意义和性质", "分数加减法"] },
  { parent: "图形与几何", names: ["多边形的面积", "长方体和正方体", "用数对确定位置"] },
  { parent: "统计与概率", names: ["折线统计图", "复式统计图"] },
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
