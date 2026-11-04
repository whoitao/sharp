// 初始化管理员角色与权限，并把存量管理员全部回填到 super 角色。
// 可重复执行：内置角色的权限会被重置为预设值，自定义角色不受影响。
import { PrismaClient } from "@prisma/client";
import { ROLE_PRESETS } from "../lib/permissions";

const prisma = new PrismaClient();

async function main() {
  for (const preset of ROLE_PRESETS) {
    const role = await prisma.adminRole.upsert({
      where: { code: preset.code },
      update: {
        name: preset.name,
        description: preset.description,
        isSystem: preset.isSystem,
        sortOrder: preset.sortOrder,
      },
      create: {
        code: preset.code,
        name: preset.name,
        description: preset.description,
        isSystem: preset.isSystem,
        sortOrder: preset.sortOrder,
      },
    });

    // 内置角色：权限以代码预设为准，先清后写，保证与代码一致
    await prisma.adminRolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.adminRolePermission.createMany({
      data: preset.permissions.map((permission) => ({ roleId: role.id, permission })),
      skipDuplicates: true,
    });

    console.log(`✓ 角色 ${preset.code} (${preset.name}) → ${preset.permissions.length} 项权限`);
  }

  const superRole = await prisma.adminRole.findUnique({ where: { code: "super" } });
  if (!superRole) throw new Error("super 角色创建失败");

  // 存量管理员回填 super
  const backfill = await prisma.admin.updateMany({
    where: { roleId: null },
    data: { roleId: superRole.id, role: "super" },
  });
  console.log(`✓ 回填 ${backfill.count} 个存量管理员到 super 角色`);

  const roles = await prisma.adminRole.findMany({
    include: { _count: { select: { admins: true, permissions: true } } },
    orderBy: { sortOrder: "asc" },
  });
  console.log("\n角色总览：");
  for (const r of roles) {
    console.log(`  ${r.code.padEnd(10)} ${r.name.padEnd(8)} 管理员:${r._count.admins}  权限:${r._count.permissions}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
