// 初始化小学三年级数学（青岛版，六三制）教材 + 章节 + 知识点补充
// 蓝本：青岛版一二年级数学结构（L1 单元“主题——内容” + L2 编号课时）
// 用法：cd apps/admin && npx tsx prisma/seed-grade3-math-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 2; // 数学
const GRADE_ID = 3; // 三年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 7; // 青岛版

// 青岛版（六三制）三年级数学目录：L1 单元 → L2 课时
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "数学 · 青岛版 · 三年级上册",
    units: [
      { name: "一 动物趣闻——克、千克、吨的认识", lessons: ["1 克、千克的认识", "2 吨的认识"] },
      { name: "二 快乐大课间——两位数乘一位数", lessons: ["1 两位数乘一位数（不进位）", "2 两位数乘一位数（进位）", "3 求比一个数的几倍多（少）几的数"] },
      { name: "三 富饶的大海——三位数乘一位数", lessons: ["1 三位数乘一位数（不进位）", "2 三位数乘一位数（进位）", "3 因数中间或末尾有0的乘法"] },
      { name: "四 走进新农村——位置与变换", lessons: ["1 辨认方向", "2 平移与旋转"] },
      { name: "五 风筝厂见闻——两、三位数除以一位数（一）", lessons: ["1 整十数、几百几十数除以一位数", "2 两位数除以一位数", "3 三位数除以一位数"] },
      { name: "六 采摘节——混合运算", lessons: ["1 乘加、乘减混合运算", "2 除加、除减混合运算", "3 带小括号的混合运算"] },
      { name: "七 庆元旦——时、分、秒的认识", lessons: ["1 时、分的认识", "2 计算经过时间", "3 秒的认识"] },
      { name: "八 美化校园——图形的周长", lessons: ["1 认识周长", "2 长方形和正方形的周长"] },
      { name: "九 我当小厨师——分数的初步认识", lessons: ["1 认识几分之一", "2 认识几分之几", "3 分数的大小比较", "4 同分母分数加减法"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
  {
    semester: 2,
    name: "数学 · 青岛版 · 三年级下册",
    units: [
      { name: "一 采访果蔬会——两、三位数除以一位数（二）", lessons: ["1 三位数除以一位数（商是两位数）", "2 三位数除以一位数（商中间有0）", "3 三位数除以一位数（商末尾有0）"] },
      { name: "二 热闹的民俗节——对称", lessons: ["1 认识轴对称图形", "2 对称的应用"] },
      { name: "三 美丽的街景——两位数乘两位数", lessons: ["1 两位数乘两位数（不进位）", "2 两位数乘两位数（进位）"] },
      { name: "四 绿色生态园——解决问题", lessons: ["1 连乘解决问题", "2 连除解决问题", "3 乘除混合解决问题"] },
      { name: "五 我家买新房子了——长方形和正方形的面积", lessons: ["1 面积和面积单位", "2 长方形和正方形的面积", "3 周长与面积的比较"] },
      { name: "六 走进天文馆——年、月、日", lessons: ["1 年、月、日的认识", "2 24时计时法"] },
      { name: "七 家居中的学问——小数的初步认识", lessons: ["1 认识小数", "2 小数的大小比较", "3 简单的小数加减法"] },
      { name: "八 谁长得快——数据的收集与整理（二）", lessons: ["1 数据的收集与整理", "2 条形统计图"] },
      { name: "回顾整理——总复习", lessons: [] },
    ],
  },
];

// 三年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "数与代数", names: ["两位数乘一位数", "三位数乘一位数", "两位数乘两位数", "两、三位数除以一位数", "分数的初步认识", "小数的初步认识", "时、分、秒的认识", "质量单位的认识", "年、月、日"] },
  { parent: "图形与几何", names: ["图形的周长", "长方形和正方形的面积", "轴对称图形", "平移与旋转"] },
  { parent: "统计与概率", names: ["条形统计图"] },
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
