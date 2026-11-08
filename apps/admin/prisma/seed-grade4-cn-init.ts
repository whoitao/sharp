// 初始化小学四年级语文（人教版/部编版）教材 + 章节 + 知识点补充
// 蓝本：一二三年级语文教材结构（L1 单元 + L2 课文/栏目）
// 用法：cd apps/admin && npx tsx prisma/seed-grade4-cn-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 1; // 语文
const GRADE_ID = 4; // 四年级
const STAGE_ID = 1; // 小学
const PUBLISHER_ID = 1; // 人教版

// 部编版四年级语文目录：L1 单元 → L2 课文/栏目
const BOOKS: { semester: number; name: string; units: { name: string; lessons: string[] }[] }[] = [
  {
    semester: 1,
    name: "语文 · 人教版 · 四年级上册",
    units: [
      { name: "第一单元", lessons: ["1 观潮", "2 走月亮", "3 现代诗二首（秋晚的江上/花牛歌）", "4 繁星", "口语交际：我们与环境", "习作：推荐一个好地方", "语文园地一"] },
      { name: "第二单元", lessons: ["5 一个豆荚里的五粒豆", "6 蝙蝠和雷达", "7 呼风唤雨的世纪", "8 蝴蝶的家", "习作：小小“动物园”", "语文园地二"] },
      { name: "第三单元", lessons: ["9 古诗三首（暮江吟/题西林壁/雪梅）", "10 爬山虎的脚", "11 蟋蟀的住宅", "口语交际：爱护眼睛，保护视力", "习作：写观察日记", "语文园地三"] },
      { name: "第四单元", lessons: ["12 盘古开天地", "13 精卫填海", "14 普罗米修斯", "15 女娲补天", "习作：我和____过一天", "语文园地四", "快乐读书吧"] },
      { name: "第五单元", lessons: ["16 麻雀", "17 爬天都峰", "习作例文", "习作：生活万花筒"] },
      { name: "第六单元", lessons: ["18 牛和鹅", "19 一只窝囊的大老虎", "20 陀螺", "口语交际：安慰", "习作：记一次游戏", "语文园地六"] },
      { name: "第七单元", lessons: ["21 古诗三首（出塞/凉州词/夏日绝句）", "22 为中华之崛起而读书", "23 梅兰芳蓄须", "24 延安，我把你追寻", "习作：写信", "语文园地七"] },
      { name: "第八单元", lessons: ["25 王戎不取道旁李", "26 西门豹治邺", "27 故事二则（扁鹊治病/纪昌学射）", "口语交际：讲历史人物故事", "习作：我的心儿怦怦跳", "语文园地八"] },
    ],
  },
  {
    semester: 2,
    name: "语文 · 人教版 · 四年级下册",
    units: [
      { name: "第一单元", lessons: ["1 古诗词三首（宿新市徐公店/四时田园杂兴/清平乐·村居）", "2 乡下人家", "3 天窗", "4 三月桃花水", "口语交际：转述", "习作：我的乐园", "语文园地一"] },
      { name: "第二单元", lessons: ["5 琥珀", "6 飞向蓝天的恐龙", "7 纳米技术就在我们身边", "8 千年梦圆在今朝", "口语交际：说新闻", "习作：我的奇思妙想", "语文园地二", "快乐读书吧"] },
      { name: "第三单元", lessons: ["9 短诗三首（繁星）", "10 绿", "11 白桦", "12 在天晴了的时候", "综合性学习：轻叩诗歌大门", "语文园地三"] },
      { name: "第四单元", lessons: ["13 猫", "14 母鸡", "15 白鹅", "习作：我的动物朋友", "语文园地四"] },
      { name: "第五单元", lessons: ["16 海上日出", "17 记金华的双龙洞", "习作例文", "习作：游____"] },
      { name: "第六单元", lessons: ["18 文言文二则（囊萤夜读/铁杵成针）", "19 小英雄雨来", "20 我们家的男子汉", "21 芦花鞋", "口语交际：朋友相处的秘诀", "习作：我学会了____", "语文园地六"] },
      { name: "第七单元", lessons: ["22 古诗三首（芙蓉楼送辛渐/塞下曲/墨梅）", "23 “诺曼底号”遇难记", "24 黄继光", "25 挑山工", "口语交际：自我介绍", "习作：我的“自画像”", "语文园地七"] },
      { name: "第八单元", lessons: ["26 宝葫芦的秘密", "27 巨人的花园", "28 海的女儿", "习作：故事新编", "语文园地八"] },
    ],
  },
];

// 四年级阶段补充的 L2 知识点（挂到现有 L1 知识点下）
const NEW_KPS: { parent: string; names: string[] }[] = [
  { parent: "阅读理解", names: ["把握文章主要内容", "体会作者思想感情", "提问与批注"] },
  { parent: "语言运用", names: ["句式转换", "仿写句子"] },
  { parent: "古诗文积累", names: ["文言文初步"] },
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
