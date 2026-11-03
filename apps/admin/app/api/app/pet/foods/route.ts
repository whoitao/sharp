import { requireAppUser } from "@/lib/middleware";
import { getPetConfig, getPrimaryPet } from "@/lib/pet";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 食物背包：三类食物 + 数量 + 效果说明 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const [defs, items, link, config] = await Promise.all([
    prisma.petFoodDef.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } }),
    prisma.petFoodItem.findMany({ where: { userId: appUser.id } }),
    getPrimaryPet(appUser.id),
    getPetConfig(),
  ]);

  const quantityOf = (type: string) => items.find((i) => i.foodType === type)?.quantity ?? 0;

  return NextResponse.json({
    foods: defs.map((d) => ({
      foodType: d.foodType,
      name: d.name,
      icon: d.icon,
      quantity: quantityOf(d.foodType),
      satiety: d.satietyGain,
      exp: d.expGain,
      obtainHint: d.obtainRule,
    })),
    satiety: link?.pet.satiety ?? 0,
    satietyMax: config.satietyMax,
  });
}
