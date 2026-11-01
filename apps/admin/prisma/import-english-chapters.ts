/**
 * 导入人教版初中英语六册章节（2024 新教材）。
 *
 * 结构：册（level 1，记录学期）→ 单元（level 2）。
 * 英语单元下不再细分章/节，题目直接挂载到单元节点。
 *
 * 运行：npx tsx prisma/import-english-chapters.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_ID = 3n; // 英语
const PUBLISHER_ID = 1n; // 人教版

interface UnitDef {
  name: string;
}
interface BookDef {
  gradeId: bigint;
  gradeName: string;
  semester: 1 | 2;
  units: UnitDef[];
}

const BOOKS: BookDef[] = [
  {
    gradeId: 7n,
    gradeName: "七年级",
    semester: 1,
    units: [
      { name: "Starter Unit 1 Hello!" },
      { name: "Starter Unit 2 Keep Tidy!" },
      { name: "Starter Unit 3 Welcome!" },
      { name: "Unit 1 You and Me" },
      { name: "Unit 2 We're Family!" },
      { name: "Unit 3 My School" },
      { name: "Unit 4 My Favourite Subject" },
      { name: "Unit 5 Fun Clubs" },
      { name: "Unit 6 A Day in the Life" },
      { name: "Unit 7 Happy Birthday！" },
    ],
  },
  {
    gradeId: 7n,
    gradeName: "七年级",
    semester: 2,
    units: [
      { name: "Unit 1 Animal friends" },
      { name: "Unit 2 No Rules, No Order" },
      { name: "Unit 3 Keep Fit" },
      { name: "Unit 4 Eat Well" },
      { name: "Unit 5 Here and Now" },
      { name: "Unit 6 Rain or Shine" },
      { name: "Unit 7 A Day to Remember" },
      { name: "Unit 8 Once upon a Time" },
    ],
  },
  {
    gradeId: 8n,
    gradeName: "八年级",
    semester: 1,
    units: [
      { name: "Unit 1 Happy Holiday" },
      { name: "Unit 2 Home Sweet Home" },
      { name: "Unit 3 Same or Different？" },
      { name: "Unit 4 Amazing Plants and Animals" },
      { name: "Unit 5 What a Delicious Meal！" },
      { name: "Unit 6 Plan for Yourself" },
      { name: "Unit 7 When Tomorrow Comes" },
      { name: "Unit 8 Let's Communicate!" },
    ],
  },
  {
    gradeId: 8n,
    gradeName: "八年级",
    semester: 2,
    units: [
      { name: "Unit 1 Time to Relax" },
      { name: "Unit 2 Stay Healthy" },
      { name: "Unit 3 Growing Up" },
      { name: "Unit 4 The Wonders of Nature" },
      { name: "Unit 5 Nature's Temper" },
      { name: "Unit 6 Crossing Cultures" },
      { name: "Unit 7 A Good Read" },
      { name: "Unit 8 Making a Difference" },
    ],
  },
  {
    gradeId: 9n,
    gradeName: "九年级",
    semester: 1,
    units: [
      { name: "Unit 1 The Changing World" },
      { name: "Unit 2 Inspiring People" },
      { name: "Unit 3 Smart Learning" },
      { name: "Unit 4 Our Memory" },
      { name: "Unit 5 Power of Ideas" },
      { name: "Unit 6 Beyond Earth" },
      { name: "Unit 7 Feel the Rhythm" },
      { name: "Unit 8 More than a Game" },
    ],
  },
  {
    gradeId: 9n,
    gradeName: "九年级",
    semester: 2,
    units: [
      { name: "Unit 1 Let's Celebrate!" },
      { name: "Unit 2 A Look into the Past" },
      { name: "Unit 3 A Taste of Art" },
      { name: "Unit 4 Reduce, Reuse, Recycle" },
      { name: "Unit 5 Open to New Beginnings" },
    ],
  },
];

async function main() {
  const existing = await prisma.chapter.count({
    where: { subjectId: SUBJECT_ID, publisherId: PUBLISHER_ID },
  });
  if (existing > 0) {
    console.error(`已存在 ${existing} 条英语人教版章节，终止导入以避免重复。`);
    process.exit(1);
  }

  const semesterLabel = (s: 1 | 2) => (s === 1 ? "上" : "下");

  // 不使用全局事务：Supabase pgbouncer 对长事务有限制，顺序创建即可。
  for (const book of BOOKS) {
    const bookName = `人教版-${book.gradeName}${semesterLabel(book.semester)}`;
    const bookNode = await prisma.chapter.create({
      data: {
        gradeId: book.gradeId,
        subjectId: SUBJECT_ID,
        publisherId: PUBLISHER_ID,
        level: 1,
        semester: book.semester,
        name: bookName,
        sortOrder: book.semester,
      },
    });

    for (let i = 0; i < book.units.length; i += 1) {
      await prisma.chapter.create({
        data: {
          gradeId: book.gradeId,
          subjectId: SUBJECT_ID,
          publisherId: PUBLISHER_ID,
          parentId: bookNode.id,
          level: 2,
          name: book.units[i].name,
          sortOrder: i + 1,
        },
      });
    }
    console.log(`✓ ${bookName}：${book.units.length} 个单元`);
  }

  const total = await prisma.chapter.count({
    where: { subjectId: SUBJECT_ID, publisherId: PUBLISHER_ID },
  });
  console.log(`\n导入完成：共 ${total} 个章节节点（6 册 + 单元）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
