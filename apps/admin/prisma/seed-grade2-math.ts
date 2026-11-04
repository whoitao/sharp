import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_PRIMARY = 1;
const GRADE_G2 = 2;
const SUBJECT_MATH = 2;
const PUB_QD = 7;

type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "数学 · 青岛版 · 二年级上";
const textbookXia = "数学 · 青岛版 · 二年级下";

// 青岛版（五四制）2025 二年级数学上册
const chaptersShang: ChapterNode[] = [
  { level: 1, name: "一 妈妈的小帮手——分类（一）", children: [
    { level: 2, name: "1 分类并记录" },
    { level: 2, name: "2 连续分类" },
  ]},
  { level: 1, name: "二 中国戏法和杂技——表内乘法（一）", children: [
    { level: 2, name: "1 乘法的初步认识" },
    { level: 2, name: "2 认识乘法各部分名称" },
    { level: 2, name: "3 5的乘法口诀" },
    { level: 2, name: "4 2的乘法口诀" },
    { level: 2, name: "5 3的乘法口诀" },
    { level: 2, name: "6 乘加、乘减" },
  ]},
  { level: 1, name: "智慧广场——分类数图形", children: [
    { level: 2, name: "分类数图形" },
  ]},
  { level: 1, name: "三 多彩的社团——表内乘法（二）", children: [
    { level: 2, name: "1 7的乘法口诀" },
    { level: 2, name: "2 8的乘法口诀" },
    { level: 2, name: "3 9的乘法口诀" },
    { level: 2, name: "4 乘法的应用" },
  ]},
  { level: 1, name: "主题活动——我们的校园", children: [
    { level: 2, name: "实践活动" },
  ]},
  { level: 1, name: "四 传统节日——除法的初步认识", children: [
    { level: 2, name: "1 平均分" },
    { level: 2, name: "2 除法的初步认识" },
    { level: 2, name: "3 认识除法各部分名称" },
    { level: 2, name: "4 有关0的除法" },
  ]},
  { level: 1, name: "五 教室里的测量——厘米、米的认识", children: [
    { level: 2, name: "1 认识厘米" },
    { level: 2, name: "2 用厘米测量" },
    { level: 2, name: "3 认识米" },
    { level: 2, name: "4 厘米和米的关系" },
  ]},
  { level: 1, name: "主题活动——身体上的小尺子", children: [
    { level: 2, name: "实践活动" },
  ]},
  { level: 1, name: "六 变废为宝——表内除法", children: [
    { level: 2, name: "1 用乘法口诀求商" },
    { level: 2, name: "2 用乘法口诀求商（二）" },
    { level: 2, name: "3 乘除法的关系" },
    { level: 2, name: "4 解决实际问题" },
  ]},
  { level: 1, name: "智慧广场——列举", children: [
    { level: 2, name: "列举问题" },
  ]},
  { level: 1, name: "七 过年——总复习", children: [
    { level: 2, name: "总复习" },
  ]},
];

// 青岛版（五四制）2025 二年级数学下册
const chaptersXia: ChapterNode[] = [
  { level: 1, name: "一 野营——有余数的除法", children: [
    { level: 2, name: "1 有余数除法的认识" },
    { level: 2, name: "2 有余数除法的笔算" },
    { level: 2, name: "3 余数与除数的关系" },
    { level: 2, name: "4 用有余数的除法解决问题" },
  ]},
  { level: 1, name: "二 游览北京——万以内数的认识", children: [
    { level: 2, name: "1 千以内数的认识" },
    { level: 2, name: "2 万以内数的认识" },
    { level: 2, name: "3 万以内数的读写" },
    { level: 2, name: "4 万以内数的大小比较" },
    { level: 2, name: "5 近似数" },
    { level: 2, name: "6 整百、整千数的加减法" },
  ]},
  { level: 1, name: "三 甜甜的梦——毫米、分米、千米的认识", children: [
    { level: 2, name: "1 认识毫米" },
    { level: 2, name: "2 认识分米" },
    { level: 2, name: "3 认识千米" },
    { level: 2, name: "4 长度单位间的换算" },
  ]},
  { level: 1, name: "智慧广场", children: [
    { level: 2, name: "简单的周期问题" },
  ]},
  { level: 1, name: "四 勤劳的小蜜蜂——万以内的加减法（一）", children: [
    { level: 2, name: "1 两位数加减两位数的口算" },
    { level: 2, name: "2 三位数加减三位数（不进位、不退位）" },
    { level: 2, name: "3 三位数加减三位数（进位、退位）" },
    { level: 2, name: "4 加减法的验算" },
  ]},
  { level: 1, name: "五 谁的眼睛亮——观察物体", children: [
    { level: 2, name: "1 从不同方向观察物体" },
    { level: 2, name: "2 辨认从不同方向观察到的形状" },
  ]},
  { level: 1, name: "六 田园小卫士——万以内的加减法（二）", children: [
    { level: 2, name: "1 三位数加三位数（连续进位）" },
    { level: 2, name: "2 三位数减三位数（连续退位）" },
    { level: 2, name: "3 被减数中间或末尾有0的减法" },
    { level: 2, name: "4 解决“求比一个数多（少）几”的问题" },
  ]},
  { level: 1, name: "七 爱心行动——图形与拼组", children: [
    { level: 2, name: "1 认识长方形和正方形" },
    { level: 2, name: "2 认识五边形和六边形" },
    { level: 2, name: "3 图形的拼组" },
  ]},
  { level: 1, name: "八 休闲假日——解决问题", children: [
    { level: 2, name: "1 乘加、乘减问题" },
    { level: 2, name: "2 除加、除减问题" },
    { level: 2, name: "3 带小括号的混合运算" },
  ]},
  { level: 1, name: "九 我是体育小明星——数据的收集与整理（一）", children: [
    { level: 2, name: "1 用不同的方法收集数据" },
    { level: 2, name: "2 用统计表整理数据" },
    { level: 2, name: "3 用画正字的方法收集数据" },
  ]},
];

// ─── 二年级数学知识点树 ───
type KPNode = { name: string; children?: KPNode[] };

const kpTree: KPNode[] = [
  {
    name: "数与代数",
    children: [
      { name: "表内乘法", children: [
        { name: "乘法的意义" },
        { name: "乘法算式的读写" },
        { name: "乘法各部分名称" },
        { name: "5的乘法口诀" },
        { name: "2的乘法口诀" },
        { name: "3的乘法口诀" },
        { name: "4的乘法口诀" },
        { name: "6的乘法口诀" },
        { name: "7的乘法口诀" },
        { name: "8的乘法口诀" },
        { name: "9的乘法口诀" },
        { name: "乘加、乘减" },
      ]},
      { name: "表内除法", children: [
        { name: "平均分的意义" },
        { name: "除法的意义" },
        { name: "除法算式的读写" },
        { name: "除法各部分名称" },
        { name: "用乘法口诀求商" },
        { name: "有关0的除法" },
        { name: "乘除法的关系" },
      ]},
      { name: "有余数的除法", children: [
        { name: "有余数除法的意义" },
        { name: "余数与除数的关系" },
        { name: "有余数除法的笔算" },
        { name: "用有余数的除法解决问题" },
      ]},
      { name: "万以内数的认识", children: [
        { name: "千以内数的认识" },
        { name: "万以内数的认识" },
        { name: "数的组成" },
        { name: "万以内数的读写" },
        { name: "万以内数的大小比较" },
        { name: "近似数" },
        { name: "整百、整千数的加减法" },
      ]},
      { name: "万以内数的加减法", children: [
        { name: "两位数加减两位数的口算" },
        { name: "三位数加减三位数（不进位不退位）" },
        { name: "三位数加三位数（进位）" },
        { name: "三位数减三位数（退位）" },
        { name: "连续进位加法" },
        { name: "连续退位减法" },
        { name: "被减数中间或末尾有0的减法" },
        { name: "加减法的验算" },
        { name: "估算" },
      ]},
      { name: "混合运算", children: [
        { name: "乘加、乘减混合运算" },
        { name: "除加、除减混合运算" },
        { name: "带小括号的混合运算" },
        { name: "运算顺序" },
      ]},
    ],
  },
  {
    name: "图形与几何",
    children: [
      { name: "图形的拼组", children: [
        { name: "认识长方形" },
        { name: "认识正方形" },
        { name: "认识五边形" },
        { name: "认识六边形" },
        { name: "图形的拼组" },
      ]},
      { name: "测量", children: [
        { name: "认识厘米" },
        { name: "用厘米测量" },
        { name: "认识米" },
        { name: "厘米和米的关系" },
        { name: "认识毫米" },
        { name: "认识分米" },
        { name: "认识千米" },
        { name: "长度单位间的换算" },
        { name: "选择合适的长度单位" },
      ]},
      { name: "观察物体", children: [
        { name: "从不同方向观察物体" },
        { name: "辨认从不同方向观察到的形状" },
      ]},
    ],
  },
  {
    name: "统计与概率",
    children: [
      { name: "数据的收集与整理", children: [
        { name: "用不同的方法收集数据" },
        { name: "用统计表整理数据" },
        { name: "用画正字的方法收集数据" },
        { name: "根据数据回答问题" },
      ]},
    ],
  },
  {
    name: "综合与实践",
    children: [
      { name: "分类数图形" },
      { name: "列举问题" },
      { name: "简单的周期问题" },
      { name: "身体上的小尺子" },
      { name: "我们的校园" },
    ],
  },
  {
    name: "解决问题",
    children: [
      { name: "用乘法解决实际问题" },
      { name: "用除法解决实际问题" },
      { name: "乘加、乘减解决问题" },
      { name: "除加、除减解决问题" },
      { name: "求比一个数多（少）几的问题" },
      { name: "用有余数的除法解决问题" },
    ],
  },
];

// ─── 工具函数 ───

async function ensureTextbook(publisherId: bigint, name: string, semester: number) {
  return prisma.textbook.upsert({
    where: {
      subjectId_gradeId_publisherId_semester: {
        subjectId: BigInt(SUBJECT_MATH),
        gradeId: BigInt(GRADE_G2),
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
  console.log("=== Step 1: 创建教材 ===");
  const tidShang = await ensureTextbook(BigInt(PUB_QD), textbookShang, 1);
  const tidXia = await ensureTextbook(BigInt(PUB_QD), textbookXia, 2);
  console.log(`✓ ${textbookShang} (id=${tidShang.id})`);
  console.log(`✓ ${textbookXia} (id=${tidXia.id})`);

  console.log("\n=== Step 2: 写入二年级上章节 ===");
  await seedOneTextbook(tidShang.id, chaptersShang);
  const c1 = await prisma.chapter.count({ where: { textbookId: tidShang.id } });
  console.log(`✓ 二年级上: ${c1} 条`);

  console.log("\n=== Step 3: 写入二年级下章节 ===");
  await seedOneTextbook(tidXia.id, chaptersXia);
  const c2 = await prisma.chapter.count({ where: { textbookId: tidXia.id } });
  console.log(`✓ 二年级下: ${c2} 条`);

  console.log("\n=== Step 4: 写入二年级数学知识点 ===");
  await seedKPRecursive(kpTree, null, 0);
  const kps = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_MATH), stageId: BigInt(STAGE_PRIMARY) },
  });

  console.log(`\n=== 完成 ===`);
  console.log(`章节: 上=${c1} 下=${c2} 共=${c1 + c2}`);
  console.log(`数学知识点(小学累计): ${kps} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
