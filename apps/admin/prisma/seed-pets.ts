import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type StageSeed = {
  stageKey: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  sortOrder: number;
};

const speciesSeeds: {
  code: string;
  name: string;
  theme: string;
  icon: string;
  tagline: string;
  sortOrder: number;
  stages: StageSeed[];
}[] = [
  {
    code: "cat",
    name: "小猫",
    theme: "可爱系",
    icon: "🐱",
    tagline: "安静又黏人，陪你慢慢进步",
    sortOrder: 1,
    stages: [
      { stageKey: "juvenile", name: "幼猫", minLevel: 1, maxLevel: 9, sortOrder: 1 },
      { stageKey: "growing", name: "成猫", minLevel: 10, maxLevel: 19, sortOrder: 2 },
      { stageKey: "mature", name: "魔法猫", minLevel: 20, maxLevel: 30, sortOrder: 3 },
    ],
  },
  {
    code: "dog",
    name: "小狗",
    theme: "忠诚系",
    icon: "🐶",
    tagline: "热情忠诚，每次练习都想陪着你",
    sortOrder: 2,
    stages: [
      { stageKey: "juvenile", name: "幼犬", minLevel: 1, maxLevel: 9, sortOrder: 1 },
      { stageKey: "growing", name: "成犬", minLevel: 10, maxLevel: 19, sortOrder: 2 },
      { stageKey: "mature", name: "守护犬", minLevel: 20, maxLevel: 30, sortOrder: 3 },
    ],
  },
  {
    code: "rabbit",
    name: "小兔",
    theme: "灵动系",
    icon: "🐰",
    tagline: "轻盈灵动，喜欢跳跃式的小进步",
    sortOrder: 3,
    stages: [
      { stageKey: "juvenile", name: "幼兔", minLevel: 1, maxLevel: 9, sortOrder: 1 },
      { stageKey: "growing", name: "成兔", minLevel: 10, maxLevel: 19, sortOrder: 2 },
      { stageKey: "mature", name: "月兔", minLevel: 20, maxLevel: 30, sortOrder: 3 },
    ],
  },
  {
    code: "fox",
    name: "小狐",
    theme: "智慧系",
    icon: "🦊",
    tagline: "聪明机敏，最爱解开难题",
    sortOrder: 4,
    stages: [
      { stageKey: "juvenile", name: "幼狐", minLevel: 1, maxLevel: 9, sortOrder: 1 },
      { stageKey: "growing", name: "成狐", minLevel: 10, maxLevel: 19, sortOrder: 2 },
      { stageKey: "mature", name: "九尾狐", minLevel: 20, maxLevel: 30, sortOrder: 3 },
    ],
  },
  {
    code: "bird",
    name: "小鸟",
    theme: "自由系",
    icon: "🐦",
    tagline: "自由向上，飞得越高看得越远",
    sortOrder: 5,
    stages: [
      { stageKey: "juvenile", name: "幼鸟", minLevel: 1, maxLevel: 9, sortOrder: 1 },
      { stageKey: "growing", name: "成鸟", minLevel: 10, maxLevel: 19, sortOrder: 2 },
      { stageKey: "mature", name: "凤凰", minLevel: 20, maxLevel: 30, sortOrder: 3 },
    ],
  },
];

const foodSeeds = [
  {
    foodType: "normal",
    name: "普通食物",
    icon: "🍎",
    satietyGain: 10,
    expGain: 0,
    dailyCap: 30,
    bankDailyCap: 15,
    obtainRule: "每答对 1 题获得 1 个",
    sortOrder: 1,
  },
  {
    foodType: "premium",
    name: "高级食物",
    icon: "🍰",
    satietyGain: 30,
    expGain: 5,
    dailyCap: 5,
    bankDailyCap: null,
    obtainRule: "单次练习最长连对 ≥ 5 题获得 1 个",
    sortOrder: 2,
  },
  {
    foodType: "rare",
    name: "稀有食物",
    icon: "⭐",
    satietyGain: 50,
    expGain: 15,
    dailyCap: 2,
    bankDailyCap: null,
    obtainRule: "完成一个单元（章节练习且题量 ≥ 10）获得 1 个",
    sortOrder: 3,
  },
];

async function main() {
  for (const seed of speciesSeeds) {
    const species = await prisma.petSpecies.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        theme: seed.theme,
        icon: seed.icon,
        tagline: seed.tagline,
        sortOrder: seed.sortOrder,
      },
      create: {
        code: seed.code,
        name: seed.name,
        theme: seed.theme,
        icon: seed.icon,
        tagline: seed.tagline,
        sortOrder: seed.sortOrder,
      },
    });

    for (const stage of seed.stages) {
      await prisma.petSpeciesStage.upsert({
        where: {
          speciesId_stageKey: { speciesId: species.id, stageKey: stage.stageKey },
        },
        update: {
          name: stage.name,
          minLevel: stage.minLevel,
          maxLevel: stage.maxLevel,
          sortOrder: stage.sortOrder,
        },
        create: { speciesId: species.id, ...stage },
      });
    }
    console.log(`宠物分类已初始化：${seed.name}（3 个阶段）`);
  }

  for (const food of foodSeeds) {
    await prisma.petFoodDef.upsert({
      where: { foodType: food.foodType },
      update: {
        name: food.name,
        icon: food.icon,
        satietyGain: food.satietyGain,
        expGain: food.expGain,
        dailyCap: food.dailyCap,
        bankDailyCap: food.bankDailyCap,
        obtainRule: food.obtainRule,
        sortOrder: food.sortOrder,
      },
      create: food,
    });
    console.log(`宠物食品已初始化：${food.name}`);
  }

  await prisma.petConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log("宠物全局配置已就绪");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
