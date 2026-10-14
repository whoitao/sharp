import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("abby513", 10);
  const admin = await prisma.admin.create({
    data: {
      username: "whoitao",
      passwordHash,
      role: "admin",
    },
  });
  console.log(`Created admin: ${admin.username} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
