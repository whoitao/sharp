// 初始化小学五年级语文（人教版/部编版）教材 + 章节 + 知识点补充
// 蓝本：三四年级语文教材结构（L1 单元 + L2 课文/栏目）
// 用法：cd apps/admin && npx tsx prisma/seed-grade5-cn-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 1; // 语文
const GRADE_ID = 5; // 五年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 1; // 人教版

// 部编版五年级语文目录：L1 单元 → L2 课文/栏目
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "语文 · 人教版 · 五年级上册",
    units: [
      { name: "第一单元", lessons: ["1 白鹭", "2 落花生", "3 桂花雨", "4 珍珠鸟", "口语交际：制定班级公约", "习作：我的心爱之物", "语文园地一"] },
      { name: "第二单元", lessons: ["5 搭石", "6 将相和", "7 什么比猎豹的速度更快", "8 冀中的地道战", "习作：“漫画”老师", "语文园地二"] },
      { name: "第三单元", lessons: ["9 猎人海力布", "10 牛郎织女（一）", "11 牛郎织女（二）", "口语交际：讲民间故事", "习作：缩写故事", "语文园地三", "快乐读书吧"] },
      { name: "第四单元", lessons: ["12 古诗三首（示儿/题临安邸/己亥杂诗）", "13 少年中国说（节选）", "14 圆明园的毁灭", "15 小岛", "习作：二十年后的家乡", "语文园地四"] },
      { name: "第五单元", lessons: ["16 太阳", "17 松鼠", "习作例文", "习作：介绍一种事物"] },
      { name: "第六单元", lessons: ["18 慈母情深", "19 父爱之舟", "20 “精彩极了”和“糟糕透了”", "口语交际：父母之爱", "习作：我想对您说", "语文园地六"] },
      { name: "第七单元", lessons: ["21 古诗词三首（山居秋暝/枫桥夜泊/长相思）", "22 四季之美", "23 鸟的天堂", "24 月迹", "习作：____即景", "语文园地七"] },
      { name: "第八单元", lessons: ["25 古人谈读书", "26 忆读书", "27 我的“长生果”", "口语交际：我最喜欢的人物形象", "习作：推荐一本书", "语文园地八"] },
    ],
  },
  {
    semester: 2,
    name: "语文 · 人教版 · 五年级下册",
    units: [
      { name: "第一单元", lessons: ["1 古诗三首（四时田园杂兴/稚子弄冰/村晚）", "2 祖父的园子", "3 月是故乡明", "4 梅花魂", "口语交际：走进他们的童年岁月", "习作：那一刻，我长大了", "语文园地一"] },
      { name: "第二单元", lessons: ["5 草船借箭", "6 景阳冈", "7 猴王出世", "8 红楼春趣", "口语交际：我们都来演一演", "习作：写读后感", "语文园地二", "快乐读书吧"] },
      { name: "第三单元", lessons: ["综合性学习：遨游汉字王国（汉字真有趣/我爱你，汉字）"] },
      { name: "第四单元", lessons: ["9 古诗三首（从军行/秋夜将晓出篱门迎凉有感/闻官军收河南河北）", "10 青山处处埋忠骨", "11 军神", "12 清贫", "习作：他____了", "语文园地四"] },
      { name: "第五单元", lessons: ["13 人物描写一组（摔跤/他像一棵挺脱的树/两茎灯草）", "14 刷子李", "习作例文", "习作：形形色色的人"] },
      { name: "第六单元", lessons: ["15 自相矛盾", "16 田忌赛马", "17 跳水", "习作：神奇的探险之旅", "语文园地六"] },
      { name: "第七单元", lessons: ["18 威尼斯的小艇", "19 牧场之国", "20 金字塔", "口语交际：我是小小讲解员", "习作：中国的世界文化遗产", "语文园地七"] },
      { name: "第八单元", lessons: ["21 杨氏之子", "22 手指", "23 童年的发现", "口语交际：我们都来讲笑话", "习作：漫画的启示", "语文园地八"] },
    ],
  },
];

// 五年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "阅读理解", names: ["感受人物形象", "说明方法及其作用", "静态描写与动态描写"] },
  { parent: "语言运用", names: ["转述与概括"] },
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
