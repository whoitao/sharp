import { PrismaClient } from "@prisma/client";
import type { RawQuestion } from "./data/types";

const prisma = new PrismaClient();

const GRADE_ID = BigInt(8);
const SUBJECT_ID = BigInt(2); // 数学
const STAGE_ID = BigInt(2);
const PUB_ID = BigInt(3); // 北师大版
const SOURCE = "textbook";
const BATCH = 8;

const questions: RawQuestion[] = [
  // ============ 上册 ============
  { type: 1, content: `在 Rt△ABC 中，∠C=90°，AB=5，AC=3，则 BC 的长为`,
    analysis: `由勾股定理：BC² = AB² - AC² = 25 - 9 = 16，所以 BC=4。`,
    difficulty: 1, chapterName: `第一章 勾股定理`, kpNames: [`勾股定理及逆定理`],
    options: [
      { key: `A`, content: `3`, isCorrect: false },
      { key: `B`, content: `4`, isCorrect: true },
      { key: `C`, content: `5`, isCorrect: false },
      { key: `D`, content: `8`, isCorrect: false },
    ],
  },
  { type: 1, content: `下列各组数中，能构成直角三角形的是`,
    analysis: `3² + 4² = 9 + 16 = 25 = 5²，满足勾股定理逆定理，所以 3,4,5 能构成直角三角形。其他选项均不满足 a² + b² = c²。`,
    difficulty: 1, chapterName: `第一章 勾股定理`, kpNames: [`勾股定理及逆定理`],
    options: [
      { key: `A`, content: `1, 2, 3`, isCorrect: false },
      { key: `B`, content: `3, 4, 5`, isCorrect: true },
      { key: `C`, content: `5, 6, 7`, isCorrect: false },
      { key: `D`, content: `6, 7, 8`, isCorrect: false },
    ],
  },
  { type: 1, content: `√9 的值等于`,
    analysis: `√9 表示 9 的算术平方根，等于 3。注意算术平方根是非负的，不要与平方根混淆。`,
    difficulty: 1, chapterName: `第二章 实数`, kpNames: [`实数`],
    options: [
      { key: `A`, content: `3`, isCorrect: true },
      { key: `B`, content: `-3`, isCorrect: false },
      { key: `C`, content: `±3`, isCorrect: false },
      { key: `D`, content: `9`, isCorrect: false },
    ],
  },
  { type: 1, content: `下列各数中，是无理数的是`,
    analysis: `π 是无限不循环小数，属于无理数。0、3.14、√4=2 都是有理数。`,
    difficulty: 1, chapterName: `第二章 实数`, kpNames: [`有理数与无理数`],
    options: [
      { key: `A`, content: `0`, isCorrect: false },
      { key: `B`, content: `3.14`, isCorrect: false },
      { key: `C`, content: `π`, isCorrect: true },
      { key: `D`, content: `√4`, isCorrect: false },
    ],
  },
  { type: 1, content: `点 P(2, -3) 关于 x 轴对称的点的坐标是`,
    analysis: `关于 x 轴对称的点，横坐标相同，纵坐标互为相反数。所以 P(2,-3) 关于 x 轴对称的点为 (2, 3)。`,
    difficulty: 1, chapterName: `第三章 位置与坐标`, kpNames: [`平面直角坐标系`],
    options: [
      { key: `A`, content: `(2, 3)`, isCorrect: true },
      { key: `B`, content: `(-2, -3)`, isCorrect: false },
      { key: `C`, content: `(-2, 3)`, isCorrect: false },
      { key: `D`, content: `(3, -2)`, isCorrect: false },
    ],
  },
  { type: 1, content: `函数 y = 2x + 1 中，当 x = 3 时，y 的值为`,
    analysis: `将 x=3 代入函数：y = 2×3 + 1 = 7。`,
    difficulty: 1, chapterName: `第四章 一次函数`, kpNames: [`一次函数`],
    options: [
      { key: `A`, content: `5`, isCorrect: false },
      { key: `B`, content: `6`, isCorrect: false },
      { key: `C`, content: `7`, isCorrect: true },
      { key: `D`, content: `8`, isCorrect: false },
    ],
  },
  { type: 1, content: `一次函数 y = -x + 2 的图象不经过的象限是`,
    analysis: `k=-1<0，图象从左上到右下；b=2>0，图象与 y 轴交于正半轴。所以图象经过第一、二、四象限，不经过第三象限。`,
    difficulty: 2, chapterName: `第四章 一次函数`, kpNames: [`一次函数的概念与图象`],
    options: [
      { key: `A`, content: `第一象限`, isCorrect: false },
      { key: `B`, content: `第二象限`, isCorrect: false },
      { key: `C`, content: `第三象限`, isCorrect: true },
      { key: `D`, content: `第四象限`, isCorrect: false },
    ],
  },
  { type: 1, content: `方程组 { x + y = 5, x - y = 1 } 的解是`,
    analysis: `两式相加：2x = 6，x = 3；代入第一式：3 + y = 5，y = 2。所以解为 {x=3, y=2}。`,
    difficulty: 1, chapterName: `第五章 二元一次方程组`, kpNames: [`二元一次方程组的解法`],
    options: [
      { key: `A`, content: `{x=2, y=3}`, isCorrect: false },
      { key: `B`, content: `{x=3, y=2}`, isCorrect: true },
      { key: `C`, content: `{x=4, y=1}`, isCorrect: false },
      { key: `D`, content: `{x=1, y=4}`, isCorrect: false },
    ],
  },
  { type: 1, content: `已知一组数据：2, 3, 5, 5, 5，则这组数据的众数是`,
    analysis: `众数是出现次数最多的数。5 出现了 3 次，次数最多，所以众数是 5。`,
    difficulty: 1, chapterName: `第六章 数据的分析`, kpNames: [`平均数中位数众数`],
    options: [
      { key: `A`, content: `2`, isCorrect: false },
      { key: `B`, content: `3`, isCorrect: false },
      { key: `C`, content: `4`, isCorrect: false },
      { key: `D`, content: `5`, isCorrect: true },
    ],
  },
  { type: 1, content: `若 a ∥ b，∠1 = 50°，则 ∠2 等于（∠1 与 ∠2 是同位角）`,
    analysis: `两直线平行，同位角相等。因为 a ∥ b，∠1 与 ∠2 是同位角，所以 ∠2 = ∠1 = 50°。`,
    difficulty: 1, chapterName: `第七章 平行线的证明`, kpNames: [`平行线的判定与性质`],
    options: [
      { key: `A`, content: `40°`, isCorrect: false },
      { key: `B`, content: `50°`, isCorrect: true },
      { key: `C`, content: `130°`, isCorrect: false },
      { key: `D`, content: `140°`, isCorrect: false },
    ],
  },

  // ============ 下册 ============
  { type: 1, content: `等腰三角形的两边长分别为 3 和 7，则它的周长为`,
    analysis: `等腰三角形两腰相等。若腰长为 3，则 3+3=6 < 7，不能构成三角形；所以腰长只能为 7，周长 = 7+7+3 = 17。`,
    difficulty: 2, chapterName: `第一章 三角形的证明`, kpNames: [`等腰三角形的性质`],
    options: [
      { key: `A`, content: `13`, isCorrect: false },
      { key: `B`, content: `17`, isCorrect: true },
      { key: `C`, content: `13 或 17`, isCorrect: false },
      { key: `D`, content: `无法确定`, isCorrect: false },
    ],
  },
  { type: 1, content: `不等式 2x - 4 > 0 的解集是`,
    analysis: `2x - 4 > 0，移项得 2x > 4，两边除以 2 得 x > 2。`,
    difficulty: 1, chapterName: `第二章 一元一次不等式与一元一次不等式组`, kpNames: [`一元一次不等式`],
    options: [
      { key: `A`, content: `x > 2`, isCorrect: true },
      { key: `B`, content: `x < 2`, isCorrect: false },
      { key: `C`, content: `x > -2`, isCorrect: false },
      { key: `D`, content: `x < -2`, isCorrect: false },
    ],
  },
  { type: 1, content: `点 A(2, 3) 先向右平移 3 个单位，再向上平移 1 个单位，得到点 A' 的坐标是`,
    analysis: `向右平移 3 个单位，横坐标加 3：2+3=5；向上平移 1 个单位，纵坐标加 1：3+1=4。所以 A'(5, 4)。`,
    difficulty: 1, chapterName: `第三章 图形的平移与旋转`, kpNames: [`平移`],
    options: [
      { key: `A`, content: `(5, 4)`, isCorrect: true },
      { key: `B`, content: `(5, 2)`, isCorrect: false },
      { key: `C`, content: `(-1, 4)`, isCorrect: false },
      { key: `D`, content: `(2, 4)`, isCorrect: false },
    ],
  },
  { type: 1, content: `分解因式：x² - 9 =`,
    analysis: `x² - 9 = x² - 3²，利用平方差公式：a² - b² = (a+b)(a-b)，所以 x² - 9 = (x+3)(x-3)。`,
    difficulty: 1, chapterName: `第四章 因式分解`, kpNames: [`因式分解`],
    options: [
      { key: `A`, content: `(x-3)²`, isCorrect: false },
      { key: `B`, content: `(x+3)²`, isCorrect: false },
      { key: `C`, content: `(x+3)(x-3)`, isCorrect: true },
      { key: `D`, content: `(x+9)(x-1)`, isCorrect: false },
    ],
  },
  { type: 1, content: `分式 (x² - 1) / (x - 1) 化简后的结果是`,
    analysis: `x² - 1 = (x+1)(x-1)，所以原式 = (x+1)(x-1) / (x-1) = x+1（x ≠ 1）。`,
    difficulty: 1, chapterName: `第五章 分式与分式方程`, kpNames: [`分式的运算`],
    options: [
      { key: `A`, content: `x + 1`, isCorrect: true },
      { key: `B`, content: `x - 1`, isCorrect: false },
      { key: `C`, content: `x²`, isCorrect: false },
      { key: `D`, content: `1`, isCorrect: false },
    ],
  },
  { type: 1, content: `分式方程 1/x = 2/(x+1) 的解是`,
    analysis: `两边同乘 x(x+1)：x+1 = 2x，解得 x = 1。检验：x=1 时 x(x+1) ≠ 0，所以 x=1 是原方程的解。`,
    difficulty: 2, chapterName: `第五章 分式与分式方程`, kpNames: [`分式方程的解法`],
    options: [
      { key: `A`, content: `x = 1`, isCorrect: true },
      { key: `B`, content: `x = -1`, isCorrect: false },
      { key: `C`, content: `x = 2`, isCorrect: false },
      { key: `D`, content: `无解`, isCorrect: false },
    ],
  },
  { type: 1, content: `平行四边形 ABCD 中，∠A = 60°，则 ∠B 等于`,
    analysis: `平行四边形邻角互补，即 ∠A + ∠B = 180°。所以 ∠B = 180° - 60° = 120°。`,
    difficulty: 1, chapterName: `第六章 平行四边形`, kpNames: [`平行四边形的性质`],
    options: [
      { key: `A`, content: `60°`, isCorrect: false },
      { key: `B`, content: `90°`, isCorrect: false },
      { key: `C`, content: `120°`, isCorrect: true },
      { key: `D`, content: `180°`, isCorrect: false },
    ],
  },
  { type: 1, content: `一个多边形的内角和为 720°，则这个多边形是`,
    analysis: `多边形内角和公式：(n-2)×180° = 720°，解得 n-2 = 4，n = 6。所以是六边形。`,
    difficulty: 2, chapterName: `第六章 平行四边形`, kpNames: [`三角形`],
    options: [
      { key: `A`, content: `四边形`, isCorrect: false },
      { key: `B`, content: `五边形`, isCorrect: false },
      { key: `C`, content: `六边形`, isCorrect: true },
      { key: `D`, content: `八边形`, isCorrect: false },
    ],
  },
  { type: 1, content: `√12 - √3 的结果是`,
    analysis: `√12 = √(4×3) = 2√3，所以 √12 - √3 = 2√3 - √3 = √3。`,
    difficulty: 2, chapterName: `第二章 实数`, kpNames: [`二次根式的化简与计算`],
    options: [
      { key: `A`, content: `√3`, isCorrect: true },
      { key: `B`, content: `3`, isCorrect: false },
      { key: `C`, content: `√9`, isCorrect: false },
      { key: `D`, content: `2√3`, isCorrect: false },
    ],
  },
  { type: 1, content: `某班 5 名同学的数学成绩分别为：85, 90, 92, 88, 95，则这组数据的平均数是`,
    analysis: `平均数 = (85 + 90 + 92 + 88 + 95) / 5 = 450 / 5 = 90。`,
    difficulty: 1, chapterName: `第六章 数据的分析`, kpNames: [`平均数中位数众数`],
    options: [
      { key: `A`, content: `88`, isCorrect: false },
      { key: `B`, content: `89`, isCorrect: false },
      { key: `C`, content: `90`, isCorrect: true },
      { key: `D`, content: `92`, isCorrect: false },
    ],
  },
];

// ─── seed 入库逻辑（复用 grade2-math 脚本架构） ───

async function main() {
  console.log(`=== 准备写入 ${questions.length} 道初二数学单选 ===\n`);

  // 1. 加载章节映射
  console.log("=== Step 1: 加载章节映射 ===");
  const textbooks = await prisma.textbook.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, publisherId: PUB_ID },
    select: { id: true, name: true },
  });
  for (const t of textbooks) console.log(`  教材: id=${t.id} ${t.name}`);
  const tbIds = textbooks.map(t => t.id);
  const chapters = await prisma.chapter.findMany({
    where: { textbookId: { in: tbIds } },
    select: { id: true, name: true, level: true },
  });
  const l2Map = new Map<string, bigint>();
  const l1Map = new Map<string, bigint>();
  for (const c of chapters) {
    if (c.level === 2) l2Map.set(c.name, c.id);
    else l1Map.set(c.name, c.id);
  }
  console.log(`  L2: ${l2Map.size}, L1: ${l1Map.size}`);

  // 2. 加载知识点映射
  console.log("\n=== Step 2: 加载知识点映射 ===");
  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
    select: { id: true, name: true },
  });
  const kpMap = new Map<string, bigint>();
  for (const k of allKP) if (!kpMap.has(k.name)) kpMap.set(k.name, k.id);
  console.log(`  知识点: ${kpMap.size} 个`);

  // 3. 清理旧数据
  console.log("\n=== Step 3: 清理旧数据 ===");
  const oldQ = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
    select: { id: true },
  });
  const oldIds = oldQ.map(q => q.id);
  if (oldIds.length > 0) {
    // 先删所有引用 Question 的子表
    await prisma.userQuestionProgress.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.studyAttemptItem.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionOption.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.question.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`  已删除 ${oldIds.length} 条旧数据`);
  } else {
    console.log(`  无旧数据需要清理`);
  }

  // 4. 分批并发写入
  console.log(`\n=== Step 4: 分批并发写入 ${questions.length} 道 ===`);
  let success = 0;
  let skipped: string[] = [];
  const start = Date.now();

  for (let batchStart = 0; batchStart < questions.length; batchStart += BATCH) {
    const batch = questions.slice(batchStart, batchStart + BATCH);
    const created = await Promise.all(
      batch.map(async (q, idx) => {
        const globalIdx = batchStart + idx;
        let chapterId: bigint | null = null;
        if (q.chapterName) {
          chapterId = l2Map.get(q.chapterName) ?? l1Map.get(q.chapterName) ?? null;
          if (chapterId === null) skipped.push(`[${globalIdx + 1}] 章节未匹配: ${q.chapterName}`);
        }
        const kpIds: bigint[] = [];
        if (q.kpNames) {
          for (const name of q.kpNames) {
            const id = kpMap.get(name);
            if (id) kpIds.push(id);
            else skipped.push(`[${globalIdx + 1}] 知识点未匹配: ${name}`);
          }
        }

        const question = await prisma.question.create({
          data: {
            type: q.type, content: q.content,
            analysis: q.analysis ?? null,
            difficulty: q.difficulty ?? 1,
            score: q.score ?? 1,
            gradeId: GRADE_ID, subjectId: SUBJECT_ID,
            chapterId, source: SOURCE,
            sortOrder: globalIdx + 1,
          },
        });

        const writes: Promise<unknown>[] = [];
        if (q.options.length > 0) {
          writes.push(prisma.questionOption.createMany({
            data: q.options.map(opt => ({
              questionId: question.id, optionKey: opt.key,
              content: opt.content, isCorrect: opt.isCorrect,
              sortNo: opt.key.charCodeAt(0) - 65,
            })),
          }));
        }
        if (kpIds.length > 0) {
          writes.push(prisma.questionKnowledgePoint.createMany({
            data: kpIds.map(kpId => ({ questionId: question.id, knowledgePointId: kpId })),
            skipDuplicates: true,
          }));
        }
        await Promise.all(writes);
        return question;
      }),
    );

    success += created.length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${success}/${questions.length}  (${elapsed}s)`);
  }

  // 5. 汇总
  console.log(`\n=== 完成: ${success} 道 (总耗时 ${((Date.now() - start) / 1000).toFixed(1)}s) ===`);
  console.log(`未匹配警告: ${skipped.length}`);
  if (skipped.length > 0) {
    const unique = [...new Set(skipped)];
    console.log("  详情:");
    for (const s of unique) console.log(`    ⚠️ ${s}`);
  }

  const finalCount = await prisma.question.count({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
  });
  const optCount = await prisma.questionOption.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  const kpLinkCount = await prisma.questionKnowledgePoint.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  console.log(`\n最终统计: 题目=${finalCount} 选项=${optCount} 知识点关联=${kpLinkCount}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
