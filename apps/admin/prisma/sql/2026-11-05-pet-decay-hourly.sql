-- 电子宠物饱腹度改为「按完整小时」结算（2026-11-05）
-- 执行：在 apps/admin 下运行
--   ./node_modules/.bin/prisma db execute --schema prisma/schema.prisma --file prisma/sql/2026-11-05-pet-decay-hourly.sql
-- 也可在 Supabase SQL Editor 直接执行。

-- 1) 新增按小时结算基准。
--    存量记录统一从迁移时刻起算，避免沿用旧的 lastDecayDate 导致一次性大幅掉饱腹度。
ALTER TABLE "Pet" ADD COLUMN "lastDecayAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Pet" SET "lastDecayAt" = CURRENT_TIMESTAMP;

-- 2) 旧的按天基准不再使用。
ALTER TABLE "Pet" DROP COLUMN "lastDecayDate";

-- 3) 饱腹度上限默认值 100 -> 200。
ALTER TABLE "PetConfig" ALTER COLUMN "satietyMax" SET DEFAULT 200;

-- 4) 现有配置行提升到 200。
UPDATE "PetConfig" SET "satietyMax" = 200 WHERE "id" = 'default';
