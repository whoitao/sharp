import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_PRIMARY = 1;
const GRADE_G2 = 2;
const SUBJECT_CN = 1;
const PUB_RJ = 1;

type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "语文 · 人教版 · 二年级上";
const textbookXia = "语文 · 人教版 · 二年级下";

// 统编版 2017 二年级语文上册
const chaptersShang: ChapterNode[] = [
  { level: 1, name: "课文（一）", children: [
    { level: 2, name: "1 小蝌蚪找妈妈" },
    { level: 2, name: "2 我是什么" },
    { level: 2, name: "3 植物妈妈有办法" },
    { level: 2, name: "口语交际：有趣的动物" },
    { level: 2, name: "语文园地一" },
    { level: 2, name: "快乐读书吧" },
  ]},
  { level: 1, name: "识字（一）", children: [
    { level: 2, name: "1 场景歌" },
    { level: 2, name: "2 树之歌" },
    { level: 2, name: "3 拍手歌" },
    { level: 2, name: "4 田家四季歌" },
    { level: 2, name: "语文园地二" },
  ]},
  { level: 1, name: "课文（二）", children: [
    { level: 2, name: "4 曹冲称象" },
    { level: 2, name: "5 玲玲的画" },
    { level: 2, name: "6 一封信" },
    { level: 2, name: "7 妈妈睡了" },
    { level: 2, name: "口语交际：做手工" },
    { level: 2, name: "语文园地三" },
  ]},
  { level: 1, name: "课文（三）", children: [
    { level: 2, name: "8 古诗二首" },
    { level: 2, name: "9 黄山奇石" },
    { level: 2, name: "10 日月潭" },
    { level: 2, name: "11 葡萄沟" },
    { level: 2, name: "语文园地四" },
  ]},
  { level: 1, name: "课文（四）", children: [
    { level: 2, name: "12 坐井观天" },
    { level: 2, name: "13 寒号鸟" },
    { level: 2, name: "14 我要的是葫芦" },
    { level: 2, name: "口语交际：商量" },
    { level: 2, name: "语文园地五" },
  ]},
  { level: 1, name: "课文（五）", children: [
    { level: 2, name: "15 大禹治水" },
    { level: 2, name: "16 朱德的扁担" },
    { level: 2, name: "17 难忘的泼水节" },
    { level: 2, name: "口语交际：看图讲故事" },
    { level: 2, name: "语文园地六" },
  ]},
  { level: 1, name: "课文（六）", children: [
    { level: 2, name: "18 古诗二首" },
    { level: 2, name: "19 雾在哪里" },
    { level: 2, name: "20 雪孩子" },
    { level: 2, name: "语文园地七" },
  ]},
  { level: 1, name: "课文（七）", children: [
    { level: 2, name: "21 狐假虎威" },
    { level: 2, name: "22 狐狸分奶酪" },
    { level: 2, name: "23 纸船和风筝" },
    { level: 2, name: "24 风娃娃" },
    { level: 2, name: "语文园地八" },
  ]},
];

// 统编版 2017 二年级语文下册
const chaptersXia: ChapterNode[] = [
  { level: 1, name: "课文（一）", children: [
    { level: 2, name: "1 古诗二首" },
    { level: 2, name: "2 找春天" },
    { level: 2, name: "3 开满鲜花的小路" },
    { level: 2, name: "4 邓小平爷爷植树" },
    { level: 2, name: "口语交际：注意说话的语气" },
    { level: 2, name: "语文园地一" },
    { level: 2, name: "快乐读书吧" },
  ]},
  { level: 1, name: "课文（二）", children: [
    { level: 2, name: "5 雷锋叔叔，你在哪里" },
    { level: 2, name: "6 千人糕" },
    { level: 2, name: "7 一匹出色的马" },
    { level: 2, name: "语文园地二" },
  ]},
  { level: 1, name: "识字（一）", children: [
    { level: 2, name: "1 神州谣" },
    { level: 2, name: "2 传统节日" },
    { level: 2, name: "3 贝的故事" },
    { level: 2, name: "4 中国美食" },
    { level: 2, name: "口语交际：长大以后做什么" },
    { level: 2, name: "语文园地三" },
  ]},
  { level: 1, name: "课文（三）", children: [
    { level: 2, name: "8 彩色的梦" },
    { level: 2, name: "9 枫树上的喜鹊" },
    { level: 2, name: "10 沙滩上的童话" },
    { level: 2, name: "11 我是一只小虫子" },
    { level: 2, name: "语文园地四" },
  ]},
  { level: 1, name: "课文（四）", children: [
    { level: 2, name: "12 寓言二则" },
    { level: 2, name: "13 画杨桃" },
    { level: 2, name: "14 小马过河" },
    { level: 2, name: "口语交际：图书借阅公约" },
    { level: 2, name: "语文园地五" },
  ]},
  { level: 1, name: "课文（五）", children: [
    { level: 2, name: "15 古诗二首" },
    { level: 2, name: "16 雷雨" },
    { level: 2, name: "17 要是你在野外迷了路" },
    { level: 2, name: "18 太空生活趣事多" },
    { level: 2, name: "语文园地六" },
  ]},
  { level: 1, name: "课文（六）", children: [
    { level: 2, name: "19 大象的耳朵" },
    { level: 2, name: "20 蜘蛛开店" },
    { level: 2, name: "21 青蛙卖泥塘" },
    { level: 2, name: "22 小毛虫" },
    { level: 2, name: "语文园地七" },
  ]},
  { level: 1, name: "课文（七）", children: [
    { level: 2, name: "23 祖先的摇篮" },
    { level: 2, name: "24 当世界年纪还小的时候" },
    { level: 2, name: "25 羿射九日" },
    { level: 2, name: "口语交际：推荐一部动画片" },
    { level: 2, name: "语文园地八" },
  ]},
];

// ─── 二年级语文知识点树（在一年级基础上新增） ───
type KPNode = { name: string; children?: KPNode[] };

const kpTree: KPNode[] = [
  {
    name: "识字与写字",
    children: [
      { name: "常用汉字认读", children: [
        { name: "形声字" },
        { name: "形近字辨析" },
        { name: "多音字" },
        { name: "同音字" },
      ]},
      { name: "部首查字法", children: [
        { name: "确定部首" },
        { name: "数剩余笔画" },
        { name: "在字典中查找" },
      ]},
      { name: "笔顺书写规则", children: [
        { name: "先横后竖" },
        { name: "先撇后捺" },
        { name: "从上到下" },
        { name: "从左到右" },
        { name: "先外后内再封口" },
      ]},
      { name: "词语积累", children: [
        { name: "ABAB式词语" },
        { name: "AABB式词语" },
        { name: "ABCC式词语" },
        { name: "ABB式词语" },
        { name: "反义词" },
        { name: "近义词" },
      ]},
    ],
  },
  {
    name: "阅读理解",
    children: [
      { name: "理解词语", children: [
        { name: "联系上下文理解词语" },
        { name: "查字典理解词语" },
        { name: "结合生活经验理解" },
      ]},
      { name: "理解句子", children: [
        { name: "联系上下文理解句子" },
        { name: "理解比喻句" },
        { name: "理解拟人句" },
        { name: "理解排比句" },
      ]},
      { name: "理解课文内容", children: [
        { name: "提取课文主要信息" },
        { name: "概括课文主要内容" },
        { name: "理解课文表达的思想感情" },
        { name: "联系生活实际理解" },
      ]},
      { name: "朗读与背诵", children: [
        { name: "正确流利有感情地朗读" },
        { name: "分角色朗读" },
        { name: "背诵指定课文" },
        { name: "背诵优秀诗文" },
      ]},
    ],
  },
  {
    name: "古诗文积累",
    children: [
      { name: "古诗背诵", children: [
        { name: "咏柳（贺知章）" },
        { name: "村居（高鼎）" },
        { name: "晓出净慈寺送林子方（杨万里）" },
        { name: "绝句（杜甫）" },
        { name: "登鹳雀楼（王之涣）" },
        { name: "望庐山瀑布（李白）" },
        { name: "夜宿山寺（李白）" },
        { name: "敕勒歌" },
      ]},
      { name: "古诗理解", children: [
        { name: "理解古诗大意" },
        { name: "感受古诗意境" },
        { name: "古诗中的修辞手法" },
      ]},
      { name: "寓言故事", children: [
        { name: "亡羊补牢" },
        { name: "揠苗助长" },
        { name: "狐假虎威" },
        { name: "坐井观天" },
        { name: "寒号鸟" },
      ]},
    ],
  },
  {
    name: "语言运用",
    children: [
      { name: "造句与扩句", children: [
        { name: "用指定词语造句" },
        { name: "把字句" },
        { name: "被字句" },
        { name: "陈述句变反问句" },
      ]},
      { name: "标点符号", children: [
        { name: "逗号、句号、问号、感叹号" },
        { name: "冒号、引号" },
        { name: "顿号" },
      ]},
      { name: "简单修辞", children: [
        { name: "比喻" },
        { name: "拟人" },
        { name: "排比" },
      ]},
      { name: "写话训练", children: [
        { name: "看图写话" },
        { name: "写通顺的句子" },
        { name: "写自己想说的话" },
      ]},
    ],
  },
  {
    name: "口语交际",
    children: [
      { name: "自我介绍与询问" },
      { name: "表达简单的意思和想法" },
      { name: "有礼貌地与人交流" },
      { name: "注意说话的语气" },
      { name: "讲述简短的故事" },
      { name: "讲清楚一件事的经过" },
      { name: "推荐一部动画片" },
      { name: "商量事情" },
    ],
  },
];

// ─── 工具函数 ───

async function ensureTextbook(publisherId: bigint, name: string, semester: number) {
  return prisma.textbook.upsert({
    where: {
      subjectId_gradeId_publisherId_semester: {
        subjectId: BigInt(SUBJECT_CN),
        gradeId: BigInt(GRADE_G2),
        publisherId,
        semester,
      },
    },
    update: { name },
    create: {
      name,
      publisherId,
      subjectId: BigInt(SUBJECT_CN),
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
  const subjectId = BigInt(SUBJECT_CN);
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
  const tidShang = await ensureTextbook(BigInt(PUB_RJ), textbookShang, 1);
  const tidXia = await ensureTextbook(BigInt(PUB_RJ), textbookXia, 2);
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

  console.log("\n=== Step 4: 写入二年级语文知识点 ===");
  await seedKPRecursive(kpTree, null, 0);
  const kps = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_CN), stageId: BigInt(STAGE_PRIMARY) },
  });

  console.log(`\n=== 完成 ===`);
  console.log(`章节: 上=${c1} 下=${c2} 共=${c1 + c2}`);
  console.log(`语文知识点(小学累计): ${kps} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
