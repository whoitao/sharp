import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_PRIMARY = 1;
const GRADE_G2 = 2; // 二年级
const SUBJECT_EN = 3; // 英语
const PUB_WY = 8; // 外研版

type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "英语 · 外研版（一起点）· 二年级上";
const textbookXia = "英语 · 外研版（一起点）· 二年级下";

// 外研版 新标准一起点 二年级英语上册
const chaptersShang: ChapterNode[] = [
  { level: 1, name: "Module 1 I like the ABC song.", children: [
    { level: 2, name: "Unit 1 I like the ABC song." },
    { level: 2, name: "Unit 2 I like football." },
  ]},
  { level: 1, name: "Module 2 I don't like meat.", children: [
    { level: 2, name: "Unit 1 I don't like meat." },
    { level: 2, name: "Unit 2 I don't like ginger." },
  ]},
  { level: 1, name: "Module 3 Do you like bananas?", children: [
    { level: 2, name: "Unit 1 Do you like bananas?" },
    { level: 2, name: "Unit 2 Do they like apples?" },
  ]},
  { level: 1, name: "Module 4 Sam likes T-shirts.", children: [
    { level: 2, name: "Unit 1 Sam likes T-shirts." },
    { level: 2, name: "Unit 2 He doesn't like these trousers." },
  ]},
  { level: 1, name: "Module 5 At 7, I get up.", children: [
    { level: 2, name: "Unit 1 At 7, I get up." },
    { level: 2, name: "Unit 2 I go home at 5." },
  ]},
  { level: 1, name: "Module 6 What do you do on Sundays?", children: [
    { level: 2, name: "Unit 1 What do you do on Sundays?" },
    { level: 2, name: "Unit 2 Where do you live?" },
  ]},
  { level: 1, name: "Module 7 How do you go to school?", children: [
    { level: 2, name: "Unit 1 How do you go to school?" },
    { level: 2, name: "Unit 2 I go by train." },
  ]},
  { level: 1, name: "Module 8 She goes swimming.", children: [
    { level: 2, name: "Unit 1 She goes swimming." },
    { level: 2, name: "Unit 2 Does he play the piano?" },
  ]},
  { level: 1, name: "Module 9 It's winter.", children: [
    { level: 2, name: "Unit 1 It's winter." },
    { level: 2, name: "Unit 2 What does he do in summer?" },
  ]},
  { level: 1, name: "Module 10 Happy New Year!", children: [
    { level: 2, name: "Unit 1 Happy New Year!" },
    { level: 2, name: "Unit 2 We have Christmas." },
  ]},
  { level: 1, name: "Review Module", children: [
    { level: 2, name: "复习" },
  ]},
  { level: 1, name: "单词表", children: [
    { level: 2, name: "Words" },
  ]},
  { level: 1, name: "Reading for pleasure", children: [
    { level: 2, name: "趣味阅读" },
  ]},
];

// 外研版 新标准一起点 二年级英语下册
const chaptersXia: ChapterNode[] = [
  { level: 1, name: "Module 1 What's the weather like?", children: [
    { level: 2, name: "Unit 1 What's the weather like?" },
    { level: 2, name: "Unit 2 I like swimming." },
  ]},
  { level: 1, name: "Module 2 She's listening to the radio.", children: [
    { level: 2, name: "Unit 1 She's listening to the radio." },
    { level: 2, name: "Unit 2 I'm drawing a picture." },
  ]},
  { level: 1, name: "Module 3 Sam isn't tidying his room.", children: [
    { level: 2, name: "Unit 1 Sam isn't tidying his room." },
    { level: 2, name: "Unit 2 Are you doing your homework?" },
  ]},
  { level: 1, name: "Module 4 What are you doing?", children: [
    { level: 2, name: "Unit 1 What are you doing?" },
    { level: 2, name: "Unit 2 What's he doing?" },
  ]},
  { level: 1, name: "Module 5 Lingling is skipping.", children: [
    { level: 2, name: "Unit 1 Lingling is skipping." },
    { level: 2, name: "Unit 2 What are the kids playing?" },
  ]},
  { level: 1, name: "Module 6 I usually play basketball.", children: [
    { level: 2, name: "Unit 1 I usually play basketball." },
    { level: 2, name: "Unit 2 My grandma usually cooks." },
  ]},
  { level: 1, name: "Module 7 It's Children's Day today.", children: [
    { level: 2, name: "Unit 1 It's Children's Day today." },
    { level: 2, name: "Unit 2 We're having a picnic." },
  ]},
  { level: 1, name: "Module 8 The train is going up a hill.", children: [
    { level: 2, name: "Unit 1 The train is going up a hill." },
    { level: 2, name: "Unit 2 The horse is turning around." },
  ]},
  { level: 1, name: "Module 9 Turn left.", children: [
    { level: 2, name: "Unit 1 Turn left." },
    { level: 2, name: "Unit 2 Where do you live?" },
  ]},
  { level: 1, name: "Module 10 It's next to the park.", children: [
    { level: 2, name: "Unit 1 It's next to the park." },
    { level: 2, name: "Unit 2 He's helping a child." },
  ]},
  { level: 1, name: "Review Module", children: [
    { level: 2, name: "复习" },
  ]},
  { level: 1, name: "单词表", children: [
    { level: 2, name: "Words" },
  ]},
  { level: 1, name: "Reading for pleasure", children: [
    { level: 2, name: "趣味阅读" },
  ]},
];

// ─── 二年级英语知识点树 ───
type KPNode = { name: string; children?: KPNode[] };

const kpTree: KPNode[] = [
  {
    name: "词汇",
    children: [
      { name: "喜好表达", children: [
        { name: "like / don't like" },
        { name: "likes / doesn't like" },
      ]},
      { name: "食物", children: [
        { name: "meat, rice, noodles" },
        { name: "ginger, onion, garlic" },
        { name: "banana, apple, orange" },
      ]},
      { name: "衣物", children: [
        { name: "T-shirt, shirt, dress" },
        { name: "trousers, socks, shoes" },
        { name: "coat, hat, cap" },
      ]},
      { name: "时间与作息", children: [
        { name: "get up, go home, go to school" },
        { name: "have breakfast/lunch/dinner" },
        { name: "usually, often, sometimes" },
        { name: "on Sundays" },
      ]},
      { name: "交通方式", children: [
        { name: "by bus, by train, by car" },
        { name: "on foot" },
      ]},
      { name: "乐器与运动", children: [
        { name: "play the piano, drums" },
        { name: "play football, basketball" },
        { name: "go swimming" },
      ]},
      { name: "季节与天气", children: [
        { name: "spring, summer, autumn, winter" },
        { name: "sunny, rainy, cloudy, windy" },
        { name: "cold, hot, warm, cool" },
      ]},
      { name: "节日", children: [
        { name: "New Year, Christmas" },
        { name: "Children's Day" },
      ]},
      { name: "方位与指路", children: [
        { name: "turn left, turn right" },
        { name: "go straight on" },
        { name: "next to, near, beside" },
      ]},
      { name: "动作动词(进行时)", children: [
        { name: "listening to the radio" },
        { name: "drawing a picture" },
        { name: "tidying his room" },
        { name: "doing homework" },
        { name: "skipping, running, playing" },
        { name: "helping a child" },
      ]},
      { name: "地点场所", children: [
        { name: "park, school, home" },
        { name: "hill, river, lake" },
      ]},
    ],
  },
  {
    name: "句型",
    children: [
      { name: "一般现在时(主语I/you/we/they)", children: [
        { name: "I like / don't like ..." },
        { name: "Do you like ...?" },
        { name: "What do you do on Sundays?" },
        { name: "How do you go to school?" },
        { name: "Where do you live?" },
      ]},
      { name: "一般现在时(主语he/she/it)", children: [
        { name: "He/She likes ... / doesn't like ..." },
        { name: "Does he/she ...?" },
        { name: "What does he do in summer?" },
        { name: "Sam likes T-shirts." },
      ]},
      { name: "现在进行时", children: [
        { name: "He's/She's/It's + doing" },
        { name: "I'm + doing" },
        { name: "You're/We're/They're + doing" },
        { name: "What are you doing?" },
        { name: "What's he doing?" },
        { name: "Are you doing your homework?" },
        { name: "Sam isn't tidying his room." },
      ]},
      { name: "祈使句", children: [
        { name: "Turn left / Turn right." },
        { name: "Go straight on." },
      ]},
      { name: "there be 与方位", children: [
        { name: "It's next to the park." },
        { name: "The train is going up a hill." },
      ]},
    ],
  },
  {
    name: "语法",
    children: [
      { name: "一般现在时", children: [
        { name: "第三人称单数变化规则" },
        { name: "动词+s/es" },
        { name: "like -> likes" },
        { name: "play -> plays" },
        { name: "go -> goes" },
        { name: "do -> does" },
      ]},
      { name: "现在进行时", children: [
        { name: "be + 动词ing" },
        { name: "规则变化: +ing" },
        { name: "去e+ing: like->liking" },
        { name: "双写+ing: run->running, skip->skipping" },
        { name: "不规则: lie->lying, tie->tying" },
      ]},
      { name: "频度副词", children: [
        { name: "usually, often, sometimes, always" },
        { name: "位置: be动词后, 实义动词前" },
      ]},
      { name: "时间介词", children: [
        { name: "at + 时间点: at 7, at 5" },
        { name: "on + 星期: on Sundays" },
        { name: "in + 月份/季节: in summer" },
      ]},
      { name: "交通介词", children: [
        { name: "by + 交通工具: by bus, by train" },
        { name: "on foot" },
      ]},
    ],
  },
  {
    name: "日常交际",
    children: [
      { name: "表达喜好与厌恶" },
      { name: "询问与回答日常习惯" },
      { name: "询问与回答出行方式" },
      { name: "描述天气与季节活动" },
      { name: "指路与问路" },
      { name: "描述正在进行的动作" },
      { name: "节日问候与庆祝" },
      { name: "谈论食物与健康" },
    ],
  },
];

// ─── 复用一年级的工具函数 ───

async function ensureTextbook(publisherId: bigint, name: string, semester: number) {
  return prisma.textbook.upsert({
    where: {
      subjectId_gradeId_publisherId_semester: {
        subjectId: BigInt(SUBJECT_EN),
        gradeId: BigInt(GRADE_G2),
        publisherId,
        semester,
      },
    },
    update: { name },
    create: {
      name,
      publisherId,
      subjectId: BigInt(SUBJECT_EN),
      stageId: BigInt(STAGE_PRIMARY),
      gradeId: BigInt(GRADE_G2),
      semester,
    },
  });
}

async function seedOneTextbook(textbookId: bigint, nodes: ChapterNode[]) {
  await prisma.chapter.deleteMany({ where: { textbookId } });

  const l1Creates = nodes.map((n, i) => ({
    name: n.name, level: 1, parentId: null as bigint | null, sortOrder: i + 1,
  }));
  await Promise.all(
    l1Creates.map((c) =>
      prisma.chapter.create({
        data: { textbookId, level: 1, name: c.name, parentId: null, sortOrder: c.sortOrder },
      }),
    ),
  );

  const allL1 = await prisma.chapter.findMany({
    where: { textbookId, level: 1 },
    select: { id: true, name: true },
  });
  const nameToId = new Map(allL1.map((c) => [c.name, c.id]));

  const l2Creates: { name: string; level: number; parentId: bigint; sortOrder: number }[] = [];
  for (const unit of nodes) {
    const unitId = nameToId.get(unit.name);
    if (!unitId) continue;
    unit.children?.forEach((sec, i) => {
      l2Creates.push({ name: sec.name, level: 2, parentId: unitId, sortOrder: i + 1 });
    });
  }
  await Promise.all(
    l2Creates.map((c) =>
      prisma.chapter.create({
        data: { textbookId, level: 2, name: c.name, parentId: c.parentId, sortOrder: c.sortOrder },
      }),
    ),
  );
}

async function upsertKP(parentId: bigint | null, node: KPNode, sortOrder: number) {
  const subjectId = BigInt(SUBJECT_EN);
  const stageId = BigInt(STAGE_PRIMARY);

  if (parentId === null) {
    const existing = await prisma.knowledgePoint.findFirst({
      where: { subjectId, stageId, parentId: null, name: node.name },
    });
    if (existing) {
      return prisma.knowledgePoint.update({ where: { id: existing.id }, data: { sortOrder } });
    }
    return prisma.knowledgePoint.create({
      data: { name: node.name, parentId: null, subjectId, stageId, sortOrder },
    });
  }
  return prisma.knowledgePoint.upsert({
    where: { stageId_subjectId_parentId_name: { stageId, subjectId, parentId, name: node.name } },
    update: { sortOrder },
    create: { name: node.name, parentId, subjectId, stageId, sortOrder },
  });
}

async function seedKPRecursive(nodes: KPNode[], parentId: bigint | null, depth = 0) {
  let sort = 1;
  for (const node of nodes) {
    const created = await upsertKP(parentId, node, sort++);
    console.log(`${"  ".repeat(depth)}${node.name}`);
    if (node.children?.length) {
      await seedKPRecursive(node.children, created.id, depth + 1);
    }
  }
}

async function main() {
  console.log("=== 外研版（一起点）二年级英语 ===");

  console.log("\nStep 1: 创建教材");
  const tidShang = await ensureTextbook(BigInt(PUB_WY), textbookShang, 1);
  const tidXia = await ensureTextbook(BigInt(PUB_WY), textbookXia, 2);
  console.log(`✓ ${textbookShang} (id=${tidShang.id})`);
  console.log(`✓ ${textbookXia} (id=${tidXia.id})`);

  console.log("\nStep 2: 写入二年级上章节");
  await seedOneTextbook(tidShang.id, chaptersShang);
  const c1 = await prisma.chapter.count({ where: { textbookId: tidShang.id } });
  console.log(`✓ 二年级上: ${c1} 条`);

  console.log("\nStep 3: 写入二年级下章节");
  await seedOneTextbook(tidXia.id, chaptersXia);
  const c2 = await prisma.chapter.count({ where: { textbookId: tidXia.id } });
  console.log(`✓ 二年级下: ${c2} 条`);

  console.log("\nStep 4: 写入二年级英语知识点");
  await seedKPRecursive(kpTree, null, 0);
  const kps = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_EN), stageId: BigInt(STAGE_PRIMARY) },
  });

  console.log(`\n=== 完成 ===`);
  console.log(`章节: 上=${c1} 下=${c2} 共=${c1 + c2}`);
  console.log(`英语知识点(小学累计): ${kps} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
