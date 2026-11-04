import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 关联 ID（已在数据库中确认） ───
const STAGE_PRIMARY = 1; // 小学
const GRADE_G1 = 1; // 一年级
const SUBJECT_CN = 1; // 语文
const PUB_RJ = 1; // 人教版

// ─── 教材目录（按真实课本单元分组） ───
// level=1 章（单元/模块）, level=2 节（具体课/园地）

type ChapterNode = { level: 1 | 2; name: string; children?: ChapterNode[] };

const textbookShang = "语文 · 人教版 · 一年级上";
const textbookXia = "语文 · 人教版 · 一年级下";

const chaptersShang: ChapterNode[] = [
  {
    level: 1, name: "我上学了", children: [
      { level: 2, name: "我是中国人" },
      { level: 2, name: "我是小学生" },
      { level: 2, name: "我爱学语文" },
    ],
  },
  {
    level: 1, name: "识字（一）", children: [
      { level: 2, name: "1 天地人" },
      { level: 2, name: "2 金木水火土" },
      { level: 2, name: "3 口耳目" },
      { level: 2, name: "4 日月水火" },
      { level: 2, name: "5 对韵歌" },
      { level: 2, name: "口语交际：我说你做" },
      { level: 2, name: "语文园地一" },
      { level: 2, name: "快乐读书吧" },
    ],
  },
  {
    level: 1, name: "汉语拼音", children: [
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
    ],
  },
  {
    level: 1, name: "课文（一）", children: [
      { level: 2, name: "1 秋天" },
      { level: 2, name: "2 小小的船" },
      { level: 2, name: "3 江南" },
      { level: 2, name: "4 四季" },
      { level: 2, name: "口语交际：我们做朋友" },
      { level: 2, name: "语文园地四" },
    ],
  },
  {
    level: 1, name: "识字（二）", children: [
      { level: 2, name: "6 画" },
      { level: 2, name: "7 大小多少" },
      { level: 2, name: "8 小书包" },
      { level: 2, name: "9 日月明" },
      { level: 2, name: "10 升国旗" },
      { level: 2, name: "语文园地五" },
    ],
  },
  {
    level: 1, name: "课文（二）", children: [
      { level: 2, name: "5 影子" },
      { level: 2, name: "6 比尾巴" },
      { level: 2, name: "7 青蛙写诗" },
      { level: 2, name: "8 雨点儿" },
      { level: 2, name: "口语交际：用多大的声音" },
      { level: 2, name: "语文园地六" },
    ],
  },
  {
    level: 1, name: "课文（三）", children: [
      { level: 2, name: "9 明天要远足" },
      { level: 2, name: "10 大还是小" },
      { level: 2, name: "11 项链" },
      { level: 2, name: "语文园地七" },
    ],
  },
  {
    level: 1, name: "课文（四）", children: [
      { level: 2, name: "12 雪地里的小画家" },
      { level: 2, name: "13 乌鸦喝水" },
      { level: 2, name: "14 小蜗牛" },
      { level: 2, name: "口语交际：小兔运南瓜" },
      { level: 2, name: "语文园地八" },
    ],
  },
];

const chaptersXia: ChapterNode[] = [
  {
    level: 1, name: "识字（一）", children: [
      { level: 2, name: "1 春夏秋冬" },
      { level: 2, name: "2 姓氏歌" },
      { level: 2, name: "3 小青蛙" },
      { level: 2, name: "4 猜字谜" },
      { level: 2, name: "口语交际：听故事，讲故事" },
      { level: 2, name: "语文园地一" },
      { level: 2, name: "快乐读书吧" },
    ],
  },
  {
    level: 1, name: "课文（一）", children: [
      { level: 2, name: "1 吃水不忘挖井人" },
      { level: 2, name: "2 我多想去看看" },
      { level: 2, name: "3 一个接一个" },
      { level: 2, name: "4 四个太阳" },
      { level: 2, name: "语文园地二" },
    ],
  },
  {
    level: 1, name: "课文（二）", children: [
      { level: 2, name: "5 小公鸡和小鸭子" },
      { level: 2, name: "6 树和喜鹊" },
      { level: 2, name: "7 怎么都快乐" },
      { level: 2, name: "语文园地三" },
    ],
  },
  {
    level: 1, name: "识字（二）", children: [
      { level: 2, name: "5 动物儿歌" },
      { level: 2, name: "6 古对今" },
      { level: 2, name: "7 操场上" },
      { level: 2, name: "8 人之初" },
      { level: 2, name: "口语交际：请你帮个忙" },
      { level: 2, name: "语文园地四" },
    ],
  },
  {
    level: 1, name: "课文（三）", children: [
      { level: 2, name: "8 古诗二首" },
      { level: 2, name: "9 荷叶圆圆" },
      { level: 2, name: "10 要下雨了" },
      { level: 2, name: "语文园地五" },
    ],
  },
  {
    level: 1, name: "课文（四）", children: [
      { level: 2, name: "11 棉花姑娘" },
      { level: 2, name: "12 地球爷爷的手" },
      { level: 2, name: "口语交际：一起做游戏" },
      { level: 2, name: "语文园地六" },
    ],
  },
];

// ─── 知识点树（考纲维度，小学一年级语文） ───
// 结构：拼音 / 识字写字 / 阅读理解 / 语言运用 / 口语交际 / 综合实践
type KPNode = { name: string; children?: KPNode[] };

const kpTree: KPNode[] = [
  {
    name: "拼音",
    children: [
      { name: "声母认读", children: [
        { name: "双唇音 b p m" },
        { name: "唇齿音 f" },
        { name: "舌尖中音 d t n l" },
        { name: "舌根音 g k h" },
        { name: "舌面音 j q x" },
        { name: "舌尖前音 z c s" },
        { name: "舌尖后音 zh ch sh r" },
      ]},
      { name: "韵母认读", children: [
        { name: "单韵母 a o e i u ü" },
        { name: "复韵母 ai ei ui ao ou iu ie üe er" },
        { name: "前鼻韵母 an en in un ün" },
        { name: "后鼻韵母 ang eng ing ong" },
      ]},
      { name: "整体认读音节", children: [
        { name: "zhi chi shi ri zi ci si" },
        { name: "yi wu yu ye yue yuan yin yun ying" },
      ]},
      { name: "声调与标调规则" },
      { name: "两拼音节拼读" },
      { name: "三拼音节拼读" },
      { name: "轻声与变调" },
      { name: "隔音符号 y w 的用法" },
    ],
  },
  {
    name: "识字与写字",
    children: [
      { name: "常用汉字认读", children: [
        { name: "象形字" },
        { name: "指事字" },
        { name: "会意字" },
        { name: "形声字" },
      ]},
      { name: "偏旁部首", children: [
        { name: "常用偏旁识别" },
        { name: "偏旁表意功能" },
      ]},
      { name: "笔顺规则", children: [
        { name: "基本笔画" },
        { name: "笔顺书写规则" },
      ]},
      { name: "形近字辨析" },
      { name: "多音字" },
      { name: "同音字与近音字" },
    ],
  },
  {
    name: "阅读理解",
    children: [
      { name: "理解词语", children: [
        { name: "词语的本义" },
        { name: "词语在语境中的意思" },
        { name: "近义词" },
        { name: "反义词" },
        { name: "词语搭配" },
      ]},
      { name: "理解句子", children: [
        { name: "陈述句" },
        { name: "疑问句" },
        { name: "感叹句" },
        { name: "祈使句" },
      ]},
      { name: "理解课文内容", children: [
        { name: "提取主要信息" },
        { name: "理解课文大意" },
        { name: "感受课文情感" },
        { name: "联系生活实际理解" },
      ]},
      { name: "朗读与背诵", children: [
        { name: "正确朗读" },
        { name: "流利朗读" },
        { name: "有感情朗读" },
        { name: "课文背诵" },
      ]},
    ],
  },
  {
    name: "语言运用",
    children: [
      { name: "组词" },
      { name: "造句" },
      { name: "扩句与缩句" },
      { name: "标点符号", children: [
        { name: "句号" },
        { name: "问号" },
        { name: "感叹号" },
        { name: "逗号" },
      ]},
      { name: "简单修辞", children: [
        { name: "比喻" },
        { name: "拟人" },
      ]},
    ],
  },
  {
    name: "口语交际",
    children: [
      { name: "自我介绍" },
      { name: "简单日常对话" },
      { name: "倾听与回应" },
      { name: "表达清楚完整" },
    ],
  },
];

// ─── 工具函数 ───

async function ensureChapter(
  textbookId: bigint,
  level: 1 | 2,
  name: string,
  parentId: bigint | null,
  sortOrder: number,
) {
  const existing = await prisma.chapter.findFirst({
    where: { textbookId, level, name, parentId },
  });
  if (existing) {
    await prisma.chapter.update({ where: { id: existing.id }, data: { sortOrder } });
    return existing.id;
  }
  const created = await prisma.chapter.create({
    data: { textbookId, level, name, parentId, sortOrder },
  });
  return created.id;
}

async function ensureTextbook(
  name: string,
  semester: number,
) {
  const upserted = await prisma.textbook.upsert({
    where: {
      subjectId_gradeId_publisherId_semester: {
        subjectId: BigInt(SUBJECT_CN),
        gradeId: BigInt(GRADE_G1),
        publisherId: BigInt(PUB_RJ),
        semester,
      },
    },
    update: { name },
    create: {
      name,
      publisherId: BigInt(PUB_RJ),
      subjectId: BigInt(SUBJECT_CN),
      stageId: BigInt(STAGE_PRIMARY),
      gradeId: BigInt(GRADE_G1),
      semester,
    },
  });
  return upserted.id;
}

async function ensureKP(
  parentId: bigint | null,
  name: string,
  sortOrder: number,
) {
  const upserted = await prisma.knowledgePoint.upsert({
    where: {
      stageId_subjectId_parentId_name: {
        stageId: BigInt(STAGE_PRIMARY),
        subjectId: BigInt(SUBJECT_CN),
        parentId,
        name,
      },
    },
    update: { sortOrder },
    create: {
      name,
      parentId,
      subjectId: BigInt(SUBJECT_CN),
      stageId: BigInt(STAGE_PRIMARY),
      sortOrder,
    },
  });
  return upserted.id;
}

async function seedChapters(
  textbookId: bigint,
  nodes: ChapterNode[],
  offsetSort = 1,
) {
  let topSort = offsetSort;
  for (const unit of nodes) {
    const unitId = await ensureChapter(textbookId, 1, unit.name, null, topSort++);
    let sectionSort = 1;
    for (const section of unit.children ?? []) {
      await ensureChapter(textbookId, 2, section.name, unitId, sectionSort++);
    }
  }
  return topSort;
}

async function seedKP(
  nodes: KPNode[],
  parentId: bigint | null = null,
  sortStart = 1,
): Promise<{ id: bigint; endSort: number }[]> {
  const results: { id: bigint; endSort: number }[] = [];
  let sort = sortStart;
  for (const node of nodes) {
    const nodeId = await ensureKP(parentId, node.name, sort++);
    results.push({ id: nodeId, endSort: sort });
    if (node.children && node.children.length > 0) {
      // 从 sort=1 开始子节点，因为同一父节点下 sortOrder 是相对的
      const childResults = await seedKP(node.children, nodeId, 1);
      sort = childResults[childResults.length - 1]?.endSort ?? sort;
    }
  }
  return results;
}

// ─── 主流程 ───

async function main() {
  console.log("开始初始化小学一年级语文（人教版）数据...");

  // 1. 教材
  const tidShang = await ensureTextbook(textbookShang, 1);
  const tidXia = await ensureTextbook(textbookXia, 2);
  console.log(`✓ Textbook: ${textbookShang} (id=${tidShang}), ${textbookXia} (id=${tidXia})`);

  // 2. 章节
  await seedChapters(tidShang, chaptersShang);
  console.log(`✓ Chapters: ${textbookShang} 已写入`);
  await seedChapters(tidXia, chaptersXia);
  console.log(`✓ Chapters: ${textbookXia} 已写入`);

  // 3. 知识点
  await seedKP(kpTree, null, 1);
  console.log("✓ KnowledgePoints（小学语文一年级考纲）已写入");

  // 4. 统计
  const chapterCount = await prisma.chapter.count({ where: { textbookId: { in: [tidShang, tidXia] } } });
  const kpCount = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_CN), stageId: BigInt(STAGE_PRIMARY) },
  });
  console.log(`\n=== 完成 ===`);
  console.log(`小学一年级语文章节总数: ${chapterCount}`);
  console.log(`小学语文考纲知识点总数: ${kpCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
