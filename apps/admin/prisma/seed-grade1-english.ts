import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_PRIMARY = 1;
const GRADE_G1 = 1;
const SUBJECT_EN = 3; // 英语

type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "英语 · 外研版（一起点）· 一年级上";
const textbookXia = "英语 · 外研版（一起点）· 一年级下";

// 外研版 新标准一起点 一年级英语上册
const chaptersShang: ChapterNode[] = [
  { level: 1, name: "Module 1 Hello!", children: [
    { level: 2, name: "Unit 1 Hello!" },
    { level: 2, name: "Unit 2 How are you?" },
  ]},
  { level: 1, name: "Module 2 What's your name?", children: [
    { level: 2, name: "Unit 1 What's your name?" },
    { level: 2, name: "Unit 2 I'm a boy." },
  ]},
  { level: 1, name: "Module 3 Sit down!", children: [
    { level: 2, name: "Unit 1 Sit down!" },
    { level: 2, name: "Unit 2 Point to the window!" },
  ]},
  { level: 1, name: "Module 4 It's red!", children: [
    { level: 2, name: "Unit 1 It's red!" },
    { level: 2, name: "Unit 2 It's a red dog." },
  ]},
  { level: 1, name: "Module 5 This is our teacher.", children: [
    { level: 2, name: "Unit 1 This is our teacher." },
    { level: 2, name: "Unit 2 That is a yellow cat." },
  ]},
  { level: 1, name: "Module 6 What's this?", children: [
    { level: 2, name: "Unit 1 What's this?" },
    { level: 2, name: "Unit 2 It's my ruler." },
  ]},
  { level: 1, name: "Module 7 Is it a dog?", children: [
    { level: 2, name: "Unit 1 Is it a dog?" },
    { level: 2, name: "Unit 2 It's a yellow cat." },
  ]},
  { level: 1, name: "Module 8 How many?", children: [
    { level: 2, name: "Unit 1 How many?" },
    { level: 2, name: "Unit 2 How many pink balls?" },
  ]},
  { level: 1, name: "Module 9 How old are you?", children: [
    { level: 2, name: "Unit 1 How old are you?" },
    { level: 2, name: "Unit 2 Happy birthday!" },
  ]},
  { level: 1, name: "Module 10 That is my father.", children: [
    { level: 2, name: "Unit 1 That is my father." },
    { level: 2, name: "Unit 2 That is his car." },
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

// 外研版 新标准一起点 一年级英语下册
const chaptersXia: ChapterNode[] = [
  { level: 1, name: "Module 1 He's a doctor.", children: [
    { level: 2, name: "Unit 1 He's a doctor." },
    { level: 2, name: "Unit 2 She's a nurse." },
  ]},
  { level: 1, name: "Module 2 Where's the bird?", children: [
    { level: 2, name: "Unit 1 Where's the bird?" },
    { level: 2, name: "Unit 2 The toy car is under the bed." },
  ]},
  { level: 1, name: "Module 3 Where's the orange cat?", children: [
    { level: 2, name: "Unit 1 Where's the orange cat?" },
    { level: 2, name: "Unit 2 How many green birds?" },
  ]},
  { level: 1, name: "Module 4 This is my head.", children: [
    { level: 2, name: "Unit 1 This is my head." },
    { level: 2, name: "Unit 2 These are your eyes." },
  ]},
  { level: 1, name: "Module 5 They're cows.", children: [
    { level: 2, name: "Unit 1 They're cows." },
    { level: 2, name: "Unit 2 It's thin." },
  ]},
  { level: 1, name: "Module 6 These snakes are short.", children: [
    { level: 2, name: "Unit 1 These snakes are short." },
    { level: 2, name: "Unit 2 They're little and cute." },
  ]},
  { level: 1, name: "Module 7 There is a cat in the tree.", children: [
    { level: 2, name: "Unit 1 There is a cat in the tree." },
    { level: 2, name: "Unit 2 There are three brown monkeys." },
  ]},
  { level: 1, name: "Module 8 There's a pair of shorts under that duck.", children: [
    { level: 2, name: "Unit 1 There's a pair of shorts under that duck." },
    { level: 2, name: "Unit 2 There are two footballs under my desk." },
  ]},
  { level: 1, name: "Module 9 I like football.", children: [
    { level: 2, name: "Unit 1 I like football." },
    { level: 2, name: "Unit 2 What's your favourite sport?" },
  ]},
  { level: 1, name: "Module 10 Let's play football!", children: [
    { level: 2, name: "Unit 1 Let's play football!" },
    { level: 2, name: "Unit 2 Let's sing!" },
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

// ─── 英语知识点树 ───
type KPNode = { name: string; children?: KPNode[] };

const kpTree: KPNode[] = [
  {
    name: "语音",
    children: [
      { name: "字母认读", children: [
        { name: "26个字母大小写" },
        { name: "字母顺序" },
      ]},
      { name: "字母发音", children: [
        { name: "元音字母 a e i o u 发音" },
        { name: "辅音字母发音" },
      ]},
    ],
  },
  {
    name: "词汇",
    children: [
      { name: "问候与自我介绍", children: [
        { name: "Hello, Hi, Good morning" },
        { name: "I'm / My name is" },
        { name: "How are you? / I'm fine" },
      ]},
      { name: "颜色", children: [
        { name: "red, blue, green, yellow" },
        { name: "black, white, pink, orange" },
      ]},
      { name: "数字", children: [
        { name: "one ~ ten" },
      ]},
      { name: "动物", children: [
        { name: "cat, dog, bird, panda" },
        { name: "cow, monkey, snake, frog" },
      ]},
      { name: "家庭成员", children: [
        { name: "father, mother, grandpa, grandma" },
        { name: "sister, brother" },
      ]},
      { name: "身体部位", children: [
        { name: "head, eye, ear, nose, mouth" },
        { name: "hand, foot, leg, arm" },
      ]},
      { name: "学习用品", children: [
        { name: "ruler, pencil, book, bag" },
      ]},
      { name: "方位介词", children: [
        { name: "in, on, under" },
      ]},
      { name: "职业", children: [
        { name: "doctor, nurse, teacher, driver" },
      ]},
      { name: "运动", children: [
        { name: "football, basketball, swim, run" },
      ]},
      { name: "形容词", children: [
        { name: "big, small, tall, short" },
        { name: "thin, fat, cute, little" },
      ]},
    ],
  },
  {
    name: "句型",
    children: [
      { name: "祈使句", children: [
        { name: "Sit down, please." },
        { name: "Point to the ..." },
        { name: "Stand up." },
      ]},
      { name: "陈述句", children: [
        { name: "This is ... / That is ..." },
        { name: "I'm a boy / girl." },
        { name: "It's red / a dog." },
        { name: "These are ... / Those are ..." },
        { name: "He's a doctor / She's a nurse." },
        { name: "They're cows." },
        { name: "There is a cat ..." },
        { name: "There are three monkeys ..." },
        { name: "I like football." },
      ]},
      { name: "一般疑问句", children: [
        { name: "Is it a dog?" },
        { name: "Is this / that ...?" },
        { name: "Are they ...?" },
      ]},
      { name: "特殊疑问句", children: [
        { name: "What's your name?" },
        { name: "What's this?" },
        { name: "Where's the bird?" },
        { name: "How many?" },
        { name: "How old are you?" },
        { name: "What's your favourite sport?" },
      ]},
      { name: "所属关系", children: [
        { name: "my, your, his, her" },
        { name: "That is my father." },
        { name: "That is his car." },
      ]},
    ],
  },
  {
    name: "语法",
    children: [
      { name: "be动词", children: [
        { name: "am, is, are 用法" },
        { name: "He's / She's / It's" },
        { name: "They're / We're" },
      ]},
      { name: "单复数", children: [
        { name: "名词单数与复数" },
        { name: "This / These" },
        { name: "That / Those" },
      ]},
      { name: "There be 句型", children: [
        { name: "There is + 单数" },
        { name: "There are + 复数" },
      ]},
      { name: "方位介词", children: [
        { name: "in / on / under" },
      ]},
      { name: "物主代词", children: [
        { name: "my / your" },
        { name: "his / her" },
      ]},
    ],
  },
  {
    name: "日常交际",
    children: [
      { name: "问候与道别" },
      { name: "自我介绍" },
      { name: "课堂指令" },
      { name: "生日祝福" },
      { name: "表达喜好" },
      { name: "询问位置" },
      { name: "询问数量" },
    ],
  },
];

// ─── 工具函数 ───

async function ensurePublisher(name: string) {
  return prisma.publisher.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function ensureTextbook(publisherId: bigint, name: string, semester: number) {
  return prisma.textbook.upsert({
    where: {
      subjectId_gradeId_publisherId_semester: {
        subjectId: BigInt(SUBJECT_EN),
        gradeId: BigInt(GRADE_G1),
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
      gradeId: BigInt(GRADE_G1),
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

// ─── 主流程 ───

async function main() {
  console.log("=== Step 1: 创建外研版 Publisher ===");
  const pub = await ensurePublisher("外研版");
  console.log(`✓ 外研版 (id=${pub.id})`);

  console.log("\n=== Step 2: 创建教材 ===");
  const tidShang = await ensureTextbook(pub.id, textbookShang, 1);
  const tidXia = await ensureTextbook(pub.id, textbookXia, 2);
  console.log(`✓ ${textbookShang} (id=${tidShang.id})`);
  console.log(`✓ ${textbookXia} (id=${tidXia.id})`);

  console.log("\n=== Step 3: 写入一年级上章节 ===");
  await seedOneTextbook(tidShang.id, chaptersShang);
  const c1 = await prisma.chapter.count({ where: { textbookId: tidShang.id } });
  console.log(`✓ 一年级上: ${c1} 条`);

  console.log("\n=== Step 4: 写入一年级下章节 ===");
  await seedOneTextbook(tidXia.id, chaptersXia);
  const c2 = await prisma.chapter.count({ where: { textbookId: tidXia.id } });
  console.log(`✓ 一年级下: ${c2} 条`);

  console.log("\n=== Step 5: 写入英语知识点 ===");
  await seedKPRecursive(kpTree, null, 0);
  const kps = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_EN), stageId: BigInt(STAGE_PRIMARY) },
  });

  console.log(`\n=== 完成 ===`);
  console.log(`章节: 上=${c1} 下=${c2} 共=${c1 + c2}`);
  console.log(`知识点: ${kps} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
