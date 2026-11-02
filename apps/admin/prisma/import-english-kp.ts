/**
 * 导入初中英语知识点树（2022 版义务教育英语课程标准 + 中考考纲）。
 *
 * 三级结构：一级模块 → 二级主题 → 三级考点。
 * stageId=2（初中），subjectId=3（英语）。
 *
 * 运行：npx tsx prisma/import-english-kp.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_ID = BigInt(2);
const SUBJECT_ID = BigInt(3);

/** 三级节点 */
type L3 = string;
/** 二级节点：name + 三级列表 */
type L2 = { name: string; children: L3[] };
/** 一级节点：name + 二级列表 */
type L1 = { name: string; children: L2[] };

const TREE: L1[] = [
  // 1. 名词
  {
    name: "名词",
    children: [
      {
        name: "名词的分类",
        children: ["可数名词与不可数名词", "专有名词与普通名词", "集体名词与物质名词"],
      },
      {
        name: "名词的数",
        children: [
          "可数名词复数的规则变化",
          "可数名词复数的不规则变化",
          "不可数名词的量化表达",
          "单复数同形的名词",
        ],
      },
      {
        name: "名词所有格",
        children: ["'s 所有格的构成", "of 所有格的用法", "双重所有格", "共有与各自所有"],
      },
      {
        name: "名词的句法功能",
        children: ["名词作主语和宾语", "名词作表语和宾补", "名词作定语", "名词作同位语"],
      },
    ],
  },
  // 2. 冠词与数词
  {
    name: "冠词与数词",
    children: [
      {
        name: "冠词",
        children: [
          "不定冠词 a/an 的基本用法",
          "定冠词 the 的用法",
          "零冠词的场合",
          "冠词的固定搭配",
        ],
      },
      {
        name: "数词",
        children: [
          "基数词的构成与用法",
          "序数词的构成与用法",
          "分数、小数与百分数",
          "时间、日期与编号表达",
          "年代表达（in the 1990s）",
        ],
      },
    ],
  },
  // 3. 代词
  {
    name: "代词",
    children: [
      {
        name: "人称代词与物主代词",
        children: ["人称代词主格与宾格", "形容词性物主代词", "名词性物主代词", "物主代词与 of 连用"],
      },
      {
        name: "反身代词与指示代词",
        children: [
          "反身代词的构成与用法",
          "反身代词固定搭配",
          "指示代词 this/that/these/those",
        ],
      },
      {
        name: "不定代词",
        children: [
          "some/any 及复合不定代词",
          "each 与 every 的区别",
          "both/all/either/neither/none",
          "few/little/a few/a little",
          "other/another/the other/others",
          "many/much/a lot of",
        ],
      },
      {
        name: "疑问代词与关系代词",
        children: ["疑问代词 who/whom/whose/what/which", "关系代词在从句中的作用"],
      },
    ],
  },
  // 4. 介词与连词
  {
    name: "介词与连词",
    children: [
      {
        name: "介词",
        children: [
          "时间介词 in/on/at",
          "时间介词 for/since/during/by",
          "地点介词 in/on/at/over/under",
          "方位介词 between/among/around",
          "方式介词 by/with/in/through",
          "介词固定搭配（动词+介词、形容词+介词）",
        ],
      },
      {
        name: "连词",
        children: [
          "并列连词 and/but/or/so",
          "并列连词 both...and/either...or/neither...nor/not only...but also",
          "从属连词 because/since/as（原因）",
          "从属连词 if/unless（条件）",
          "从属连词 when/while/as/before/after（时间）",
          "从属连词 though/although/even though（让步）",
        ],
      },
    ],
  },
  // 5. 形容词与副词
  {
    name: "形容词与副词",
    children: [
      {
        name: "形容词",
        children: [
          "形容词作定语与表语",
          "形容词作宾语补足语",
          "形容词作定语的后置情况",
          "多个形容词的排列顺序",
          "the + 形容词表一类人",
        ],
      },
      {
        name: "副词",
        children: [
          "副词的分类（时间/地点/方式/程度）",
          "副词在句中的位置",
          "形容词变副词的规则",
          "兼有形容词与副词形式的词",
        ],
      },
      {
        name: "比较等级",
        children: [
          "比较级与最高级的构成",
          "原级比较 as...as / not as(so)...as",
          "比较级的用法与修饰",
          "最高级的用法与范围",
          "比较级的特殊句型（the more...the more / 比较级+and+比较级）",
        ],
      },
    ],
  },
  // 6. 动词分类与情态动词
  {
    name: "动词分类与情态动词",
    children: [
      {
        name: "动词分类",
        children: [
          "实义动词（及物与不及物）",
          "系动词（be/look/sound/smell/taste/feel/become/get）",
          "助动词 do/does/did/have/has/will",
          "延续性动词与非延续性动词",
        ],
      },
      {
        name: "情态动词",
        children: [
          "can/could 表能力与请求",
          "may/might 表许可与推测",
          "must/have to 表必须与不得不",
          "should/ought to 表建议",
          "need/dare 的用法",
          "情态动词表推测（must/may/can't）",
          "情态动词+have done 表对过去的推测",
        ],
      },
    ],
  },
  // 7. 动词时态
  {
    name: "动词时态",
    children: [
      {
        name: "一般时态",
        children: [
          "一般现在时的用法",
          "一般过去时的用法",
          "一般将来时的表达（will/be going to/be to）",
          "一般现在时表将来（时刻表/条件句）",
        ],
      },
      {
        name: "进行时态",
        children: [
          "现在进行时的用法",
          "过去进行时的用法",
          "现在进行时表将来",
          "always 与进行时连用表感情色彩",
        ],
      },
      {
        name: "完成时态",
        children: [
          "现在完成时的用法（已完成/未完成）",
          "现在完成时与一般过去时的区别",
          "过去完成时的用法",
          "现在完成时与 since/for 连用",
          "have been to 与 have gone to",
        ],
      },
      {
        name: "时态比较与选择",
        children: [
          "现在完成时 vs 一般过去时",
          "过去完成时 vs 一般过去时",
          "主句与从句时态的呼应",
          "时间/条件状语从句中的时态",
        ],
      },
    ],
  },
  // 8. 被动语态
  {
    name: "被动语态",
    children: [
      {
        name: "被动语态的构成与时态",
        children: [
          "被动语态的基本构成（be+过去分词）",
          "一般现在时的被动语态",
          "一般过去时的被动语态",
          "一般将来时的被动语态",
          "现在进行时的被动语态",
          "现在完成时的被动语态",
        ],
      },
      {
        name: "主动变被动与特殊情况",
        children: [
          "主动语态变被动语态的方法",
          "含双宾语的被动语态",
          "含复合宾语的被动语态",
          "不用于被动语态的动词（不及物/系动词）",
          "被动语态与系表结构的区别",
          "主动形式表被动意义的动词",
        ],
      },
    ],
  },
  // 9. 非谓语动词
  {
    name: "非谓语动词",
    children: [
      {
        name: "动词不定式",
        children: [
          "不定式作主语与表语",
          "不定式作宾语（want/hope/decide 等）",
          "不定式作宾补（ask/tell/want sb. to do）",
          "不定式作定语与状语",
          "省略 to 的不定式（使役/感官动词后）",
          "疑问词+不定式结构",
          "too...to / enough to 结构",
        ],
      },
      {
        name: "动名词",
        children: [
          "动名词作主语与表语",
          "动名词作宾语（enjoy/finish/mind/practice 等）",
          "动名词作定语",
          "只能跟动名词的动词与短语",
          "动名词的复合结构",
        ],
      },
      {
        name: "动词不定式与动名词的区别",
        children: [
          "remember/forget/regret 后接 to do 与 doing",
          "stop/try/mean 后接 to do 与 doing",
          "need/require/want 后接 doing 与 to be done",
          "like/love/prefer 后接 to do 与 doing",
        ],
      },
    ],
  },
  // 10. 简单句与句子种类
  {
    name: "简单句与句子种类",
    children: [
      {
        name: "句子成分与基本句型",
        children: [
          "主语、谓语、宾语、表语",
          "定语、状语、宾语补足语",
          "五种基本句型（SV/SVO/SVP/SVOO/SVOC）",
          "there be 句型",
        ],
      },
      {
        name: "疑问句",
        children: [
          "一般疑问句",
          "特殊疑问句",
          "选择疑问句",
          "反意疑问句的构成",
          "反意疑问句的特殊情况（祈使句/there be/情态动词）",
        ],
      },
      {
        name: "祈使句与感叹句",
        children: [
          "祈使句的肯定与否定形式",
          "祈使句的反意疑问句",
          "感叹句 what 与 how 的用法",
          "感叹句的省略形式",
        ],
      },
    ],
  },
  // 11. 并列句
  {
    name: "并列句",
    children: [
      {
        name: "并列连词",
        children: [
          "表联合关系（and/both...and/not only...but also）",
          "表转折关系（but/however/while/yet）",
          "表选择关系（or/either...or）",
          "表因果关系（so/for）",
        ],
      },
    ],
  },
  // 12. 宾语从句
  {
    name: "宾语从句",
    children: [
      {
        name: "宾语从句的引导词",
        children: [
          "that 引导的宾语从句",
          "if/whether 引导的宾语从句",
          "if 与 whether 的区别",
          "疑问词引导的宾语从句",
        ],
      },
      {
        name: "宾语从句的语序与时态",
        children: [
          "宾语从句用陈述语序",
          "主句现在时从句时态不限",
          "主句过去时从句用相应过去时态",
          "客观真理用一般现在时",
        ],
      },
      {
        name: "直接引语与间接引语",
        children: [
          "陈述句变间接引语",
          "一般疑问句变间接引语",
          "特殊疑问句变间接引语",
          "时态与时间状语的变化",
        ],
      },
    ],
  },
  // 13. 定语从句
  {
    name: "定语从句",
    children: [
      {
        name: "关系代词",
        children: [
          "who/whom/whose 的用法",
          "which 的用法",
          "that 的用法",
          "关系代词只能用 that 的情况",
          "关系代词只能用 which 的情况",
        ],
      },
      {
        name: "关系副词与其他",
        children: [
          "when 表时间",
          "where 表地点",
          "why 表原因",
          "限制性与非限制性定语从句",
          "介词+关系代词结构",
        ],
      },
    ],
  },
  // 14. 状语从句
  {
    name: "状语从句",
    children: [
      {
        name: "时间状语从句",
        children: [
          "when/while/as 的区别",
          "before/after/since/until",
          "as soon as / the moment",
          "主将从现原则",
        ],
      },
      {
        name: "原因与条件状语从句",
        children: [
          "because/since/as 表原因",
          "if/unless 表条件",
          "as long as / on condition that",
        ],
      },
      {
        name: "让步与目的状语从句",
        children: [
          "though/although/even though 表让步",
          "so that/in order that 表目的",
          "so...that / such...that 表结果",
          "as...as / than 表比较",
        ],
      },
    ],
  },
  // 15. 主谓一致与特殊句式
  {
    name: "主谓一致与特殊句式",
    children: [
      {
        name: "主谓一致",
        children: [
          "语法一致原则",
          "意义一致原则（集合名词/度量衡）",
          "就近原则（there be/either...or）",
          "就远原则（with/together with/as well as）",
          "不定代词作主语的主谓一致",
        ],
      },
      {
        name: "特殊句式",
        children: [
          "倒装句（全部倒装/部分倒装）",
          "强调句 It is/was...that",
          "省略句",
          "there be 句型的时态与主谓一致",
        ],
      },
    ],
  },
  // 16. 词汇辨析
  {
    name: "词汇辨析",
    children: [
      {
        name: "易混动词",
        children: [
          "speak/say/talk/tell",
          "borrow/lend/keep",
          "bring/take/carry/fetch",
          "look/see/watch/read",
          "listen/hear",
          "find/look for/find out",
          "arrive/reach/get to",
          "accept/receive",
          "spend/cost/take/pay",
          "join/join in/take part in/attend",
        ],
      },
      {
        name: "易混名词与形容词",
        children: [
          "family/home/house",
          "job/work",
          "message/news/information",
          "big/large/great",
          "tall/high",
          "interesting/interested",
          "alone/lonely",
        ],
      },
      {
        name: "短语动词与固定搭配",
        children: [
          "look 短语（look up/look for/look after/look through）",
          "take 短语（take off/take up/take after/take place）",
          "get 短语（get up/get over/get along with/get through）",
          "turn 短语（turn on/off/up/down/to/into）",
          "give 短语（give up/give in/give out/give away）",
          "put 短语（put on/off/up/away/down）",
          "come 短语（come up with/come out/come true）",
          "make 短语（make up/make of/make from/make progress）",
        ],
      },
    ],
  },
  // 17. 情景交际
  {
    name: "情景交际",
    children: [
      {
        name: "日常交际",
        children: [
          "问候与告别",
          "感谢与应答",
          "道歉与应答",
          "邀请与应答",
          "请求帮助与提供帮助",
          "同意与不同意",
        ],
      },
      {
        name: "功能场景",
        children: [
          "购物（问价/选择/付款）",
          "就医（描述症状/诊断）",
          "问路与指路",
          "打电话用语",
          "谈论天气",
          "就餐用语",
          "图书馆用语",
        ],
      },
    ],
  },
  // 18. 阅读理解
  {
    name: "阅读理解",
    children: [
      {
        name: "题型与策略",
        children: [
          "细节理解题",
          "词义猜测题",
          "推理判断题",
          "主旨大意题",
          "标题归纳题",
          "数字计算题",
          "观点态度题",
        ],
      },
    ],
  },
  // 19. 书面表达
  {
    name: "书面表达",
    children: [
      {
        name: "应用文",
        children: [
          "书信/邮件格式与常用句式",
          "通知/海报格式",
          "请假条/便条",
          "演讲稿",
        ],
      },
      {
        name: "话题作文",
        children: [
          "写人记事类",
          "观点论述类",
          "图表/图片作文",
          "建议类（how to...）",
          "对比类（advantages and disadvantages）",
        ],
      },
      {
        name: "写作技巧",
        children: [
          "篇章结构（开头/主体/结尾）",
          "过渡词与衔接手段",
          "常用高级句型",
          "常见错误与避免",
        ],
      },
    ],
  },
];

async function main() {
  const existing = await prisma.knowledgePoint.count({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
  });
  console.log(`英语(初中)现有知识点: ${existing} 个`);

  let created = 0;
  for (let i = 0; i < TREE.length; i += 1) {
    const l1 = TREE[i];
    const l1Node = await prisma.knowledgePoint.create({
      data: {
        name: l1.name,
        subjectId: SUBJECT_ID,
        stageId: STAGE_ID,
        parentId: null,
        sortOrder: i + 1,
      },
    });
    created += 1;

    for (let j = 0; j < l1.children.length; j += 1) {
      const l2 = l1.children[j];
      const l2Node = await prisma.knowledgePoint.create({
        data: {
          name: l2.name,
          subjectId: SUBJECT_ID,
          stageId: STAGE_ID,
          parentId: l1Node.id,
          sortOrder: j + 1,
        },
      });
      created += 1;

      for (let k = 0; k < l2.children.length; k += 1) {
        await prisma.knowledgePoint.create({
          data: {
            name: l2.children[k],
            subjectId: SUBJECT_ID,
            stageId: STAGE_ID,
            parentId: l2Node.id,
            sortOrder: k + 1,
          },
        });
        created += 1;
      }
    }
    console.log(`✓ ${l1.name}（${l1.children.length} 个二级）`);
  }

  console.log(`\n导入完成：新增 ${created} 个知识点节点`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
