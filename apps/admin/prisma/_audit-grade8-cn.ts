import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  // 看现有小学语文教材的章节格式
  const chapters = await p.chapter.findMany({
    where: { textbook: { subjectId: 1 } },
    select: { level: true, name: true, textbookId: true },
    orderBy: [{ textbookId: "asc" }, { level: "asc" }],
  });
  console.log("=== 小学语文章节示例 ===");
  for (const c of chapters.filter((_, i) => i < 30)) {
    console.log(`L${c.level} | tb=${c.textbookId} | ${c.name}`);
  }

  // publisher 名字
  const pubs = await p.publisher.findMany({ select: { id: true, name: true } });
  console.log("\n=== 出版社 ===");
  for (const p of pubs) console.log(`id=${p.id} ${p.name}`);

  // stage 定义
  const stages = await p.stage.findMany({ select: { id: true, name: true } });
  console.log("\n=== stage ===");
  for (const s of stages) console.log(`id=${s.id} ${s.name}`);

  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
