import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const GRADE_ID = 8;
const SUBJECT_ID = 1;
const PUB_ID = 1;

async function main() {
  // 1. 建教材
  const textbooks = [
    { name: "语文 · 人教版 · 初二上册", semester: 1 },
    { name: "语文 · 人教版 · 初二下册", semester: 2 },
  ];
  const tbMap = new Map<number, bigint>();
  for (const tb of textbooks) {
    const created = await p.textbook.upsert({
      where: {
        subjectId_gradeId_publisherId_semester: {
          subjectId: BigInt(SUBJECT_ID),
          gradeId: BigInt(GRADE_ID),
          publisherId: BigInt(PUB_ID),
          semester: tb.semester,
        },
      },
      update: {},
      create: {
        subjectId: BigInt(SUBJECT_ID),
        gradeId: BigInt(GRADE_ID),
        publisherId: BigInt(PUB_ID),
        stageId: 2n,
        semester: tb.semester,
        name: tb.name,
      },
    });
    tbMap.set(tb.semester, created.id);
    console.log(`  教材 sem=${tb.semester}: id=${created.id}`);
  }

  // 2. 建章节
  const unitsUp = [
    "第一单元 新闻两则",
    "第二单元 回忆性散文",
    "第三单元 山水散文",
    "第四单元 事物说明文",
    "第五单元 古代诗词曲",
    "第六单元 古代议论文",
  ];
  const unitsDown = [
    "第一单元 民俗文化",
    "第二单元 事理说明文",
    "第三单元 古代山水游记",
    "第四单元 演讲词与议论文",
    "第五单元 诸子散文",
    "第六单元 叙事诗与赠别诗",
  ];

  for (const semester of [1, 2]) {
    const tbId = tbMap.get(semester)!;
    const units = semester === 1 ? unitsUp : unitsDown;
    for (let i = 0; i < units.length; i++) {
      const unitName = units[i];
      const existing = await p.chapter.findFirst({
        where: { textbookId: tbId, name: unitName },
      });
      if (!existing) {
        await p.chapter.create({
          data: {
            textbookId: tbId,
            level: 1,
            sortOrder: i + 1,
            name: unitName,
          },
        });
      }
    }
    console.log(`  章节 sem=${semester}: ${units.length} 个`);
  }

  // 3. 建知识点
  const kps = [
    "字音辨析",
    "字形辨析",
    "词语运用",
    "成语辨析",
    "病句辨析",
    "标点符号",
    "语句排序",
    "修辞手法",
    "语言得体",
    "作家作品",
    "文体常识",
    "文化常识",
    "散文阅读",
    "小说阅读",
    "说明文阅读",
    "议论文阅读",
    "新闻阅读",
    "段落作用分析",
    "词语语境义理解",
    "句子赏析",
    "概括内容要点",
    "理解文章主旨",
    "文言文实词",
    "文言文虚词",
    "通假字",
    "古今异义",
    "词类活用",
    "文言句式",
    "文言文翻译",
    "文言文断句",
    "古诗默写",
    "古诗理解",
    "古诗鉴赏",
    "古诗题材分类",
    "诗词曲常识",
    "审题立意",
    "语言表达",
  ];

  let created = 0;
  for (const name of kps) {
    const existing = await p.knowledgePoint.findFirst({
      where: { name, subjectId: BigInt(SUBJECT_ID), stageId: 2, parentId: null },
    });
    if (!existing) {
      await p.knowledgePoint.create({
        data: {
          name,
          subjectId: BigInt(SUBJECT_ID),
          stageId: 2,
        },
      });
      created++;
    }
  }
  console.log(`  知识点: ${created} 新建 (subjectId=1 stage=2)`);

  // 验证
  const verifyTB = await p.textbook.findMany({ where: { gradeId: 8, subjectId: 1 } });
  const verifyCh = await p.chapter.count({
    where: { textbook: { gradeId: 8, subjectId: 1 } },
  });
  const verifyKP = await p.knowledgePoint.count({
    where: { subjectId: 1, stageId: 2 },
  });
  console.log(`\n=== 验证 ===`);
  console.log(`  教材: ${verifyTB.length}`);
  console.log(`  章节: ${verifyCh}`);
  console.log(`  知识点: ${verifyKP}`);

  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
