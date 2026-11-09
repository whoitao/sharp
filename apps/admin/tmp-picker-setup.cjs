const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
(async () => {
  const passwordHash = await bcrypt.hash("test123456", 10);
  const user = await prisma.user.upsert({
    where: { username: "tmp_picker_debug" },
    update: { passwordHash },
    create: { username: "tmp_picker_debug", passwordHash, source: "web" },
    select: { id: true },
  });
  const grade = await prisma.grade.findFirst({ where: { name: "一年级" } });
  const subject = await prisma.subject.findFirst({ where: { name: "数学" } });
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: { gradeId: grade.id, subjectId: subject.id, textbookId: null },
    create: { userId: user.id, gradeId: grade.id, subjectId: subject.id },
  });
  console.log("ready", user.id);
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
