// 初始化小学三年级语文（人教版/部编版）教材 + 章节 + 知识点补充
// 蓝本：一年级/二年级语文教材结构（L1 单元 + L2 课文）
// 用法：cd apps/admin && npx tsx prisma/seed-grade3-cn-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 1; // 语文
const GRADE_ID = 3; // 三年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 1; // 人教版

// 部编版三年级语文目录：L1 单元 → L2 课文/栏目
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "语文 · 人教版 · 三年级上册",
    units: [
      { name: "第一单元", lessons: ["1 大青树下的小学", "2 花的学校", "3 不懂就要问", "口语交际：我的暑假生活", "习作：猜猜他是谁", "语文园地一"] },
      { name: "第二单元", lessons: ["4 古诗三首（山行/赠刘景文/夜书所见）", "5 铺满金色巴掌的水泥道", "6 秋天的雨", "7 听听，秋的声音", "习作：写日记", "语文园地二"] },
      { name: "第三单元", lessons: ["8 卖火柴的小女孩", "9 那一定会很好", "10 在牛肚子里旅行", "11 一块奶酪", "习作：我来编童话", "语文园地三", "快乐读书吧"] },
      { name: "第四单元", lessons: ["12 总也倒不了的老屋", "13 胡萝卜先生的长胡子", "14 小狗学叫", "口语交际：名字里的故事", "习作：续写故事", "语文园地四"] },
      { name: "第五单元", lessons: ["15 搭船的鸟", "16 金色的草地", "习作例文", "习作：我们眼中的缤纷世界"] },
      { name: "第六单元", lessons: ["17 古诗三首（望天门山/饮湖上初晴后雨/望洞庭）", "18 富饶的西沙群岛", "19 海滨小城", "20 美丽的小兴安岭", "习作：这儿真美", "语文园地六"] },
      { name: "第七单元", lessons: ["21 大自然的声音", "22 父亲、树林和鸟", "23 带刺的朋友", "口语交际：身边的“小事”", "习作：我有一个想法", "语文园地七"] },
      { name: "第八单元", lessons: ["24 司马光", "25 掌声", "26 灰雀", "27 手术台就是阵地", "口语交际：请教", "习作：那次玩得真高兴", "语文园地八"] },
    ],
  },
  {
    semester: 2,
    name: "语文 · 人教版 · 三年级下册",
    units: [
      { name: "第一单元", lessons: ["1 古诗三首（绝句/惠崇春江晚景/三衢道中）", "2 燕子", "3 荷花", "4 昆虫备忘录", "口语交际：春游去哪儿玩", "习作：我的植物朋友", "语文园地一"] },
      { name: "第二单元", lessons: ["5 守株待兔", "6 陶罐和铁罐", "7 鹿角和鹿腿", "8 池子与河流", "口语交际：该不该实行班干部轮流制", "习作：看图画，写一写", "语文园地二", "快乐读书吧"] },
      { name: "第三单元", lessons: ["9 古诗三首（元日/清明/九月九日忆山东兄弟）", "10 纸的发明", "11 赵州桥", "12 一幅名扬中外的画", "综合性学习：中华传统节日", "语文园地三"] },
      { name: "第四单元", lessons: ["13 花钟", "14 蜜蜂", "15 小虾", "习作：我做了一项小实验", "语文园地四"] },
      { name: "第五单元", lessons: ["16 宇宙的另一边", "17 我变成了一棵树", "习作例文", "习作：奇妙的想象"] },
      { name: "第六单元", lessons: ["18 童年的水墨画", "19 剃头大师", "20 肥皂泡", "21 我不能失信", "习作：身边那些有特点的人", "语文园地六"] },
      { name: "第七单元", lessons: ["22 我们奇妙的世界", "23 海底世界", "24 火烧云", "口语交际：劝告", "习作：国宝大熊猫", "语文园地七"] },
      { name: "第八单元", lessons: ["25 慢性子裁缝和急性子顾客", "26 方帽子店", "27 漏", "28 枣核", "口语交际：趣味故事会", "习作：这样想象真有趣", "语文园地八"] },
    ],
  },
];

// 三年级阶段补充的 L2 知识点（挂到现有 L1 知识点下，stageId=1）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "阅读理解", names: ["概括段落大意", "中心句与中心思想", "体会人物情感", "联系上下文理解词语"] },
  { parent: "语言运用", names: ["修改病句", "关联词语运用", "比喻与拟人"] },
  { parent: "古诗文积累", names: ["古诗默写"] },
  { parent: "识字与写字", names: ["形声字"] },
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

  // 2. 章节（L1 单元 + L2 课文），先清旧章节再建
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

  // 3. 知识点补充（L2，挂到现有 L1 下）
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
