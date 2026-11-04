import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 关联 ID ───
const STAGE_PRIMARY = 1; // 小学
const GRADE_G1 = 1; // 一年级
const SUBJECT_MATH = 2; // 数学

// ─── 目录数据 ───
type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "数学 · 青岛版 · 一年级上";
const textbookXia = "数学 · 青岛版 · 一年级下";

// 青岛版 2024秋版 一年级数学上册
const chaptersShang: ChapterNode[] = [
  { level: 1, name: "我的幼儿园", children: [
    { level: 2, name: "主题活动" },
  ]},
  { level: 1, name: "一 快乐的课堂——1~5数的认识和加减法", children: [
    { level: 2, name: "1 1~5的认识" },
    { level: 2, name: "2 5以内数的组成" },
    { level: 2, name: "3 5以内数的大小比较" },
    { level: 2, name: "4 5以内的加法" },
    { level: 2, name: "5 5以内的减法" },
  ]},
  { level: 1, name: "二 走进花果山——6~10数的认识和加减法", children: [
    { level: 2, name: "1 6、7的认识和加减法" },
    { level: 2, name: "2 8、9的认识和加减法" },
    { level: 2, name: "3 0的认识和加减法" },
    { level: 2, name: "4 10的认识和加减法" },
    { level: 2, name: "5 连加、连减、加减混合" },
  ]},
  { level: 1, name: "三 创意拼搭——认识图形（一）", children: [
    { level: 2, name: "1 认识长方体、正方体、圆柱、球" },
  ]},
  { level: 1, name: "智慧广场——简单的重叠问题", children: [
    { level: 2, name: "重叠问题" },
  ]},
  { level: 1, name: "四 漂亮的粘贴画——11~20各数的认识", children: [
    { level: 2, name: "1 11~20各数的认识" },
    { level: 2, name: "2 11~20数大小的比较" },
    { level: 2, name: "3 十加几（不进位）" },
    { level: 2, name: "4 十几减几（不退位）" },
  ]},
  { level: 1, name: "找找身边的数", children: [
    { level: 2, name: "实践活动" },
  ]},
  { level: 1, name: "五 我爱读书——20以内的进位加法", children: [
    { level: 2, name: "1 9加几" },
    { level: 2, name: "2 8加几" },
    { level: 2, name: "3 7、6加几" },
  ]},
  { level: 1, name: "智慧广场——移多补少问题", children: [
    { level: 2, name: "移多补少" },
  ]},
  { level: 1, name: "六 我爱冰雪运动——总复习", children: [
    { level: 2, name: "总复习" },
  ]},
];

// 青岛版 2025春版 一年级数学下册
const chaptersXia: ChapterNode[] = [
  { level: 1, name: "一 逛公园——20以内的退位减法", children: [
    { level: 2, name: "1 十几减9" },
    { level: 2, name: "2 十几减8" },
    { level: 2, name: "3 十几减6、5、4、3、2、1" },
  ]},
  { level: 1, name: "二 丰收了——100以内数的认识", children: [
    { level: 2, name: "1 100以内数的认识" },
    { level: 2, name: "2 100以内数大小的比较" },
    { level: 2, name: "3 用多一些、少一些、多得多、少得多描述大小关系" },
    { level: 2, name: "4 整十数加整十数和整十数加一位数及相应减法" },
    { level: 2, name: "5 百数表" },
  ]},
  { level: 1, name: "三 玩转图形——认识平面图形", children: [
    { level: 2, name: "1 认识平面图形" },
    { level: 2, name: "2 图形的拼组" },
  ]},
  { level: 1, name: "有趣的拼摆", children: [
    { level: 2, name: "实践活动" },
  ]},
  { level: 1, name: "四 护绿行动——100以内的加减法（一）", children: [
    { level: 2, name: "1 两位数加一位数和两位数加整十数（不进位）" },
    { level: 2, name: "2 两位数减一位数和两位数减整十数（不退位）" },
    { level: 2, name: "3 两位数加一位数（进位）" },
    { level: 2, name: "4 整十数减一位数（退位）、两位数减一位数（退位）" },
    { level: 2, name: "5 解决求一个数比另一个数多（少）多少问题" },
  ]},
  { level: 1, name: "智慧广场——填数游戏", children: [
    { level: 2, name: "填数游戏" },
  ]},
  { level: 1, name: "爱心义卖", children: [
    { level: 2, name: "主题活动" },
  ]},
  { level: 1, name: "五 海趣——100以内的加减法（二）", children: [
    { level: 2, name: "1 两位数加两位数笔算（不进位）" },
    { level: 2, name: "2 两位数减两位数笔算（不退位）" },
    { level: 2, name: "3 两位数加两位数笔算（进位）" },
    { level: 2, name: "4 两位数减两位数笔算（退位）" },
    { level: 2, name: "5 解决求比一个数多几的数问题" },
    { level: 2, name: "6 解决求比一个数少几的数问题" },
  ]},
];

// ─── 数学知识点树 ───
type KPNode = { name: string; children?: KPNode[] };

const kpTree: KPNode[] = [
  {
    name: "数与代数",
    children: [
      { name: "数的认识", children: [
        { name: "1~5的认识" },
        { name: "6~10的认识" },
        { name: "0的认识" },
        { name: "11~20各数的认识" },
        { name: "100以内数的认识" },
        { name: "数的组成" },
        { name: "数的顺序" },
        { name: "基数与序数" },
      ]},
      { name: "数的比较", children: [
        { name: "认识＞、＜、＝" },
        { name: "5以内数的大小比较" },
        { name: "10以内数的大小比较" },
        { name: "11~20数大小的比较" },
        { name: "100以内数大小的比较" },
        { name: "多一些、少一些、多得多、少得多" },
      ]},
      { name: "加法", children: [
        { name: "5以内的加法" },
        { name: "6、7的加法" },
        { name: "8、9的加法" },
        { name: "10的加法" },
        { name: "20以内的进位加法" },
        { name: "两位数加一位数（不进位）" },
        { name: "两位数加整十数（不进位）" },
        { name: "两位数加一位数（进位）" },
        { name: "两位数加两位数笔算（不进位）" },
        { name: "两位数加两位数笔算（进位）" },
      ]},
      { name: "减法", children: [
        { name: "5以内的减法" },
        { name: "6、7的减法" },
        { name: "8、9的减法" },
        { name: "0的加减法" },
        { name: "10的减法" },
        { name: "20以内的退位减法" },
        { name: "十几减9" },
        { name: "十几减8" },
        { name: "十几减6、5、4、3、2、1" },
        { name: "两位数减一位数（不退位）" },
        { name: "两位数减整十数（不退位）" },
        { name: "两位数减一位数（退位）" },
        { name: "两位数减两位数笔算（不退位）" },
        { name: "两位数减两位数笔算（退位）" },
      ]},
      { name: "连加连减与加减混合", children: [
        { name: "连加" },
        { name: "连减" },
        { name: "加减混合" },
      ]},
      { name: "整十数的运算", children: [
        { name: "整十数加整十数" },
        { name: "整十数加一位数" },
        { name: "相应的减法" },
      ]},
      { name: "十加几与十几减几", children: [
        { name: "十加几（不进位）" },
        { name: "十几减几（不退位）" },
      ]},
    ],
  },
  {
    name: "图形与几何",
    children: [
      { name: "立体图形", children: [
        { name: "认识长方体" },
        { name: "认识正方体" },
        { name: "认识圆柱" },
        { name: "认识球" },
      ]},
      { name: "平面图形", children: [
        { name: "认识长方形" },
        { name: "认识正方形" },
        { name: "认识三角形" },
        { name: "认识圆" },
        { name: "图形的拼组" },
      ]},
    ],
  },
  {
    name: "综合与实践",
    children: [
      { name: "简单的重叠问题" },
      { name: "移多补少问题" },
      { name: "填数游戏" },
      { name: "找规律" },
      { name: "百数表" },
    ],
  },
  {
    name: "解决问题",
    children: [
      { name: "看图列式" },
      { name: "解决求一个数比另一个数多（少）多少的问题" },
      { name: "解决求比一个数多几的数的问题" },
      { name: "解决求比一个数少几的数的问题" },
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
        subjectId: BigInt(SUBJECT_MATH),
        gradeId: BigInt(GRADE_G1),
        publisherId,
        semester,
      },
    },
    update: { name },
    create: {
      name,
      publisherId,
      subjectId: BigInt(SUBJECT_MATH),
      stageId: BigInt(STAGE_PRIMARY),
      gradeId: BigInt(GRADE_G1),
      semester,
    },
  });
}

async function seedOneTextbook(textbookId: bigint, nodes: ChapterNode[]) {
  // 1. 清理
  await prisma.chapter.deleteMany({ where: { textbookId } });

  // 2. 批量创建 level=1
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

  // 3. 查新创建的 level=1
  const allL1 = await prisma.chapter.findMany({
    where: { textbookId, level: 1 },
    select: { id: true, name: true },
  });
  const nameToId = new Map(allL1.map((c) => [c.name, c.id]));

  // 4. 批量创建 level=2
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
  const subjectId = BigInt(SUBJECT_MATH);
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
  console.log("=== Step 1: 创建青岛版 Publisher ===");
  const pub = await ensurePublisher("青岛版");
  console.log(`✓ 青岛版 (id=${pub.id})`);

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

  console.log("\n=== Step 5: 写入数学知识点 ===");
  await seedKPRecursive(kpTree, null, 0);
  const kps = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_MATH), stageId: BigInt(STAGE_PRIMARY) },
  });

  console.log(`\n=== 完成 ===`);
  console.log(`教材: 2 本`);
  console.log(`章节: 上=${c1} 下=${c2} 共=${c1 + c2}`);
  console.log(`知识点: ${kps} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
