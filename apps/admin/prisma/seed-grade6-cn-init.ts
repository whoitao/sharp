// 初始化小学六年级语文（人教版/部编版）教材 + 章节 + 知识点补充
// 蓝本：三四五年级语文教材结构（L1 单元 + L2 课文/栏目）
// 用法：cd apps/admin && npx tsx prisma/seed-grade6-cn-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 1; // 语文
const GRADE_ID = 6; // 六年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 1; // 人教版

// 部编版六年级语文目录：L1 单元 → L2 课文/栏目
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "语文 · 人教版 · 六年级上册",
    units: [
      { name: "第一单元", lessons: ["1 草原", "2 丁香结", "3 古诗词三首（宿建德江/六月二十七日望湖楼醉书/西江月·夜行黄沙道中）", "4 花之歌", "习作：变形记", "语文园地一"] },
      { name: "第二单元", lessons: ["5 七律·长征", "6 狼牙山五壮士", "7 开国大典", "8 灯光", "9 我的战友邱少云", "口语交际：演讲", "习作：多彩的活动", "语文园地二"] },
      { name: "第三单元", lessons: ["10 竹节人", "11 宇宙生命之谜", "12 故宫博物院", "习作：____让生活更美好", "语文园地三"] },
      { name: "第四单元", lessons: ["13 桥", "14 穷人", "15 在柏林", "口语交际：请你支持我", "习作：笔尖流出的故事", "语文园地四", "快乐读书吧：笑与泪，经历与成长"] },
      { name: "第五单元", lessons: ["16 夏天里的成长", "17 盼", "习作例文", "习作：围绕中心意思写"] },
      { name: "第六单元", lessons: ["18 古诗三首（浪淘沙/江南春/书湖阴先生壁）", "19 只有一个地球", "20 青山不老", "21 三黑和土地", "口语交际：意见不同怎么办", "习作：学写倡议书", "语文园地六"] },
      { name: "第七单元", lessons: ["22 文言文二则（伯牙鼓琴/书戴嵩画牛）", "23 月光曲", "24 京剧趣谈", "口语交际：聊聊书法", "习作：我的拿手好戏", "语文园地七"] },
      { name: "第八单元", lessons: ["25 少年闰土", "26 好的故事", "27 我的伯父鲁迅先生", "28 有的人——纪念鲁迅有感", "习作：有你，真好", "语文园地八"] },
    ],
  },
  {
    semester: 2,
    name: "语文 · 人教版 · 六年级下册",
    units: [
      { name: "第一单元", lessons: ["1 北京的春节", "2 腊八粥", "3 古诗三首（寒食/迢迢牵牛星/十五夜望月）", "4 藏戏", "口语交际：即兴发言", "习作：家乡的风俗", "语文园地一"] },
      { name: "第二单元", lessons: ["5 鲁滨逊漂流记（节选）", "6 骑鹅旅行记（节选）", "7 汤姆·索亚历险记（节选）", "口语交际：同读一本书", "习作：写作品梗概", "语文园地二", "快乐读书吧：漫步世界名著花园"] },
      { name: "第三单元", lessons: ["8 匆匆", "9 那个星期天", "习作例文", "习作：让真情自然流露"] },
      { name: "第四单元", lessons: ["10 古诗三首（马诗/石灰吟/竹石）", "11 十六年前的回忆", "12 为人民服务", "13 金色的鱼钩", "习作：心愿", "语文园地四"] },
      { name: "第五单元", lessons: ["14 文言文二则（学弈/两小儿辩日）", "15 真理诞生于一百个问号之后", "16 表里的生物", "17 他们那时候多有趣啊", "口语交际：辩论", "习作：插上科学的翅膀飞", "语文园地五"] },
      { name: "第六单元", lessons: ["综合性学习：难忘小学生活（回忆往事/依依惜别）"] },
    ],
  },
];

// 六年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "阅读理解", names: ["领会文章表达方法", "名著导读"] },
  { parent: "语言运用", names: ["学写应用文"] },
  { parent: "古诗文积累", names: ["诗词中的意象"] },
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

  // 3. 知识点补充（逐个打印，避免静默遗漏）
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
      if (exists) {
        console.log(`  跳过(已存在): ${group.parent} / ${name}`);
        continue;
      }
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
