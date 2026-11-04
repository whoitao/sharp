import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_PRIMARY = 1; // 小学
const SUBJECT_CN = 1; // 语文

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

async function upsertKP(parentId: bigint | null, node: KPNode, sortOrder: number) {
  // Prisma 复合键 upsert 不支持 parentId=null，分开处理
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
    where: {
      stageId_subjectId_parentId_name: { stageId, subjectId, parentId, name: node.name },
    },
    update: { sortOrder },
    create: { name: node.name, parentId, subjectId, stageId, sortOrder },
  });
}

async function seedRecursive(nodes: KPNode[], parentId: bigint | null, depth: number) {
  let sort = 1;
  for (const node of nodes) {
    const created = await upsertKP(parentId, node, sort++);
    console.log(`${"  ".repeat(depth)}${node.name}`);
    if (node.children?.length) {
      await seedRecursive(node.children, created.id, depth + 1);
    }
  }
}

async function main() {
  console.log("=== 开始写入小学语文（一年级）知识点 ===");
  await seedRecursive(kpTree, null, 0);
  const count = await prisma.knowledgePoint.count({
    where: { subjectId: BigInt(SUBJECT_CN), stageId: BigInt(STAGE_PRIMARY) },
  });
  console.log(`\n=== 知识点完成: ${count} 条 ===`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
