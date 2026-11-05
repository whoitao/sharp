import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_INIT_USERNAME?.trim() || "whoitao";
  const envPassword = process.env.ADMIN_INIT_PASSWORD?.trim();
  const password = envPassword || randomBytes(16).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: {
      username,
      passwordHash,
      role: "admin",
    },
  });
  console.log(`Created admin: ${admin.username} (id: ${admin.id})`);
  if (!envPassword) {
    console.log(`初始密码（仅显示一次）: ${password}`);
  } else {
    console.log("初始密码来自 ADMIN_INIT_PASSWORD");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
