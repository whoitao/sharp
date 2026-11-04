import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_PRIMARY = 1;
const GRADE_G1 = 1;
const SUBJECT_CN = 1;
const PUB_RJ = 1;

type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "语文 · 人教版 · 一年级上";
const textbookXia = "语文 · 人教版 · 一年级下";

const chaptersShang: ChapterNode[] = [
  { level: 1, name: "我上学了", children: [
    { level: 2, name: "我是中国人" },
    { level: 2, name: "我是小学生" },
    { level: 2, name: "我爱学语文" },
  ]},
  { level: 1, name: "识字（一）", children: [
    { level: 2, name: "1 天地人" },
    { level: 2, name: "2 金木水火土" },
    { level: 2, name: "3 口耳目" },
    { level: 2, name: "4 日月水火" },
    { level: 2, name: "5 对韵歌" },
    { level: 2, name: "口语交际：我说你做" },
    { level: 2, name: "语文园地一" },
    { level: 2, name: "快乐读书吧" },
  ]},
  { level: 1, name: "汉语拼音", children: [
    { level: 2, name: "1 a o e" },
    { level: 2, name: "2 i u ü y w" },
    { level: 2, name: "3 b p m f" },
    { level: 2, name: "4 d t n l" },
    { level: 2, name: "5 g k h" },
    { level: 2, name: "6 j q x" },
    { level: 2, name: "7 z c s" },
    { level: 2, name: "8 zh ch sh r" },
    { level: 2, name: "语文园地二" },
    { level: 2, name: "9 ai ei ui" },
    { level: 2, name: "10 ao ou iu" },
    { level: 2, name: "11 ie üe er" },
    { level: 2, name: "12 an en in un ün" },
    { level: 2, name: "13 ang eng ing ong" },
    { level: 2, name: "语文园地三" },
  ]},
  { level: 1, name: "课文（一）", children: [
    { level: 2, name: "1 秋天" },
    { level: 2, name: "2 小小的船" },
    { level: 2, name: "3 江南" },
    { level: 2, name: "4 四季" },
    { level: 2, name: "口语交际：我们做朋友" },
    { level: 2, name: "语文园地四" },
  ]},
  { level: 1, name: "识字（二）", children: [
    { level: 2, name: "6 画" },
    { level: 2, name: "7 大小多少" },
    { level: 2, name: "8 小书包" },
    { level: 2, name: "9 日月明" },
    { level: 2, name: "10 升国旗" },
    { level: 2, name: "语文园地五" },
  ]},
  { level: 1, name: "课文（二）", children: [
    { level: 2, name: "5 影子" },
    { level: 2, name: "6 比尾巴" },
    { level: 2, name: "7 青蛙写诗" },
    { level: 2, name: "8 雨点儿" },
    { level: 2, name: "口语交际：用多大的声音" },
    { level: 2, name: "语文园地六" },
  ]},
  { level: 1, name: "课文（三）", children: [
    { level: 2, name: "9 明天要远足" },
    { level: 2, name: "10 大还是小" },
    { level: 2, name: "11 项链" },
    { level: 2, name: "语文园地七" },
  ]},
  { level: 1, name: "课文（四）", children: [
    { level: 2, name: "12 雪地里的小画家" },
    { level: 2, name: "13 乌鸦喝水" },
    { level: 2, name: "14 小蜗牛" },
    { level: 2, name: "口语交际：小兔运南瓜" },
    { level: 2, name: "语文园地八" },
  ]},
];

const chaptersXia: ChapterNode[] = [
  { level: 1, name: "识字（一）", children: [
    { level: 2, name: "1 春夏秋冬" },
    { level: 2, name: "2 姓氏歌" },
    { level: 2, name: "3 小青蛙" },
    { level: 2, name: "4 猜字谜" },
    { level: 2, name: "口语交际：听故事，讲故事" },
    { level: 2, name: "语文园地一" },
    { level: 2, name: "快乐读书吧" },
  ]},
  { level: 1, name: "课文（一）", children: [
    { level: 2, name: "1 吃水不忘挖井人" },
    { level: 2, name: "2 我多想去看看" },
    { level: 2, name: "3 一个接一个" },
    { level: 2, name: "4 四个太阳" },
    { level: 2, name: "语文园地二" },
  ]},
  { level: 1, name: "课文（二）", children: [
    { level: 2, name: "5 小公鸡和小鸭子" },
    { level: 2, name: "6 树和喜鹊" },
    { level: 2, name: "7 怎么都快乐" },
    { level: 2, name: "语文园地三" },
  ]},
  { level: 1, name: "识字（二）", children: [
    { level: 2, name: "5 动物儿歌" },
    { level: 2, name: "6 古对今" },
    { level: 2, name: "7 操场上" },
    { level: 2, name: "8 人之初" },
    { level: 2, name: "口语交际：请你帮个忙" },
    { level: 2, name: "语文园地四" },
  ]},
  { level: 1, name: "课文（三）", children: [
    { level: 2, name: "8 古诗二首" },
    { level: 2, name: "9 荷叶圆圆" },
    { level: 2, name: "10 要下雨了" },
    { level: 2, name: "语文园地五" },
  ]},
  { level: 1, name: "课文（四）", children: [
    { level: 2, name: "11 棉花姑娘" },
    { level: 2, name: "12 地球爷爷的手" },
    { level: 2, name: "口语交际：一起做游戏" },
    { level: 2, name: "语文园地六" },
  ]},
];

async function seedOneTextbook(textbookId: bigint, nodes: ChapterNode[]) {
  // 1. 先一次性查出已有章节
  const existing = await prisma.chapter.findMany({
    where: { textbookId },
    select: { id: true, name: true, level: true, parentId: true },
  });
  const key = (name: string, level: number, parentId: bigint | null) =>
    `${level}|${parentId ?? "null"}|${name}`;
  const existingMap = new Map<string, bigint>();
  for (const c of existing) existingMap.set(key(c.name, c.level, c.parentId), c.id);

  // 2. 构造 level=1 创建列表
  const unitCreates = nodes
    .map((n, i) => ({ name: n.name, level: 1, parentId: null as bigint | null, sortOrder: i + 1 }))
    .filter((c) => !existingMap.has(key(c.name, 1, null)));

  // 3. 批量创建 level=1
  console.log(`  创建 ${unitCreates.length} 个章节...`);
  await Promise.all(
    unitCreates.map((c) =>
      prisma.chapter.create({
        data: { textbookId, level: 1, name: c.name, parentId: null, sortOrder: c.sortOrder },
      }),
    ),
  );

  // 4. 重新查全部章节（包含刚创建的）
  const allNow = await prisma.chapter.findMany({
    where: { textbookId },
    select: { id: true, name: true, level: true, parentId: true },
  });
  const nameToId = new Map<string, bigint>();
  for (const c of allNow) {
    nameToId.set(`${c.level}|${c.name}`, c.id);
  }

  // 5. 构造 level=2 创建列表（需先拿到 parentId）
  const sectionCreates: { name: string; level: number; parentId: bigint; sortOrder: number }[] = [];
  for (const unit of nodes) {
    const unitId = nameToId.get(`1|${unit.name}`)!;
    unit.children?.forEach((sec, i) => {
      if (!existingMap.has(key(sec.name, 2, unitId))) {
        sectionCreates.push({
          name: sec.name, level: 2, parentId: unitId, sortOrder: i + 1,
        });
      }
    });
  }

  console.log(`  创建 ${sectionCreates.length} 个节...`);
  await Promise.all(
    sectionCreates.map((c) =>
      prisma.chapter.create({
        data: { textbookId, level: 2, name: c.name, parentId: c.parentId, sortOrder: c.sortOrder },
      }),
    ),
  );
}

async function main() {
  console.log("=== 清理旧数据 ===");
  const tbShang = await prisma.textbook.findFirst({ where: { name: textbookShang } });
  const tbXia = await prisma.textbook.findFirst({ where: { name: textbookXia } });
  if (tbShang) await prisma.chapter.deleteMany({ where: { textbookId: tbShang.id } });
  if (tbXia) await prisma.chapter.deleteMany({ where: { textbookId: tbXia.id } });

  console.log("=== 创建教材 ===");
  const tidShang = await prisma.textbook.upsert({
    where: { subjectId_gradeId_publisherId_semester: {
      subjectId: BigInt(SUBJECT_CN), gradeId: BigInt(GRADE_G1),
      publisherId: BigInt(PUB_RJ), semester: 1,
    }},
    update: { name: textbookShang },
    create: {
      name: textbookShang, publisherId: BigInt(PUB_RJ),
      subjectId: BigInt(SUBJECT_CN), stageId: BigInt(STAGE_PRIMARY),
      gradeId: BigInt(GRADE_G1), semester: 1,
    },
  });
  const tidXia = await prisma.textbook.upsert({
    where: { subjectId_gradeId_publisherId_semester: {
      subjectId: BigInt(SUBJECT_CN), gradeId: BigInt(GRADE_G1),
      publisherId: BigInt(PUB_RJ), semester: 2,
    }},
    update: { name: textbookXia },
    create: {
      name: textbookXia, publisherId: BigInt(PUB_RJ),
      subjectId: BigInt(SUBJECT_CN), stageId: BigInt(STAGE_PRIMARY),
      gradeId: BigInt(GRADE_G1), semester: 2,
    },
  });

  console.log("=== 写入一年级上章节 ===");
  await seedOneTextbook(tidShang.id, chaptersShang);
  const c1 = await prisma.chapter.count({ where: { textbookId: tidShang.id } });
  console.log(`✓ 一年级上: ${c1} 条`);

  console.log("=== 写入一年级下章节 ===");
  await seedOneTextbook(tidXia.id, chaptersXia);
  const c2 = await prisma.chapter.count({ where: { textbookId: tidXia.id } });
  console.log(`✓ 一年级下: ${c2} 条`);

  console.log(`\n=== 章节完成: 上=${c1} 下=${c2} 共=${c1 + c2} ===`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
