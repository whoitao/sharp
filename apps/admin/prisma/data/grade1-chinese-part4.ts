import type { RawQuestion } from "./types";

// ────────────────────────────────────────────────
// 人教版一年级语文（下册）Part 4：100 道
// 覆盖：下册课文（一）后半 / 课文（二）（三）（四） / 识字（二）
// ────────────────────────────────────────────────

export const grade1ChinesePart4: RawQuestion[] = [
  { type: 1, content: `"沿着弯弯的小路，就会走出天山"中，"弯弯"形容小路（ ）。`,
    analysis: `"弯弯"写小路弯曲不直的样子。`,
    difficulty: 2, semester: 2, chapterName: `2 我多想去看看`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `又宽又平`, isCorrect: false },
      { key: `B`, content: `又短又窄`, isCorrect: false },
      { key: `C`, content: `笔直`, isCorrect: false },
      { key: `D`, content: `弯曲不直`, isCorrect: true }
    ],
  },
  { type: 3, content: `课文中的"我"非常想去北京看看天安门。`,
    analysis: `课文写"我对妈妈说，我多想去看看"，表达去北京的愿望。`,
    difficulty: 1, semester: 2, chapterName: `2 我多想去看看`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"我"正玩着踩影子，大人叫"我"（ ）。`,
    analysis: `课文写"正玩着踩影子，就听大人叫着：快回家睡觉！"`,
    difficulty: 1, semester: 2, chapterName: `3 一个接一个`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `回家睡觉`, isCorrect: true },
      { key: `B`, content: `吃饭`, isCorrect: false },
      { key: `C`, content: `洗澡`, isCorrect: false },
      { key: `D`, content: `写作业`, isCorrect: false }
    ],
  },
  { type: 1, content: `"我"正做着好梦，大人叫"我"（ ）。`,
    analysis: `课文写"正做着好梦，又听见大人在叫：该起床上学啦！"`,
    difficulty: 1, semester: 2, chapterName: `3 一个接一个`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `去玩`, isCorrect: false },
      { key: `B`, content: `起床上学`, isCorrect: true },
      { key: `C`, content: `吃饭`, isCorrect: false },
      { key: `D`, content: `散步`, isCorrect: false }
    ],
  },
  { type: 3, content: `课文中的"我"总能从另一件事中找到快乐。`,
    analysis: `"我"虽然被打断，但想到睡觉能做美梦、上学能见到小伙伴，就又开心了。`,
    difficulty: 2, semester: 2, chapterName: `3 一个接一个`, kpNames: [`感受课文情感`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"一个接一个"在课文中指的是（ ）。`,
    analysis: `课文写一件事接着一件事发生，所以"一个接一个"指事情接连发生。`,
    difficulty: 2, semester: 2, chapterName: `3 一个接一个`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `一个人接一个人`, isCorrect: false },
      { key: `B`, content: `一个球接一个球`, isCorrect: false },
      { key: `C`, content: `一件件事接连发生`, isCorrect: true },
      { key: `D`, content: `一天接一天`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文告诉我们，遇到不开心的事可以（ ）。`,
    analysis: `换个角度想一想，就会发现事情也有好的一面。`,
    difficulty: 2, semester: 2, chapterName: `3 一个接一个`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `一直哭`, isCorrect: false },
      { key: `B`, content: `发脾气`, isCorrect: false },
      { key: `C`, content: `不理人`, isCorrect: false },
      { key: `D`, content: `换个角度想一想`, isCorrect: true }
    ],
  },
  { type: 1, content: `"我"画了个绿绿的太阳，挂在（ ）的天空。`,
    analysis: `课文写"我画了个绿绿的太阳，挂在夏天的天空"。`,
    difficulty: 1, semester: 2, chapterName: `4 四个太阳`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `夏天`, isCorrect: true },
      { key: `B`, content: `春天`, isCorrect: false },
      { key: `C`, content: `秋天`, isCorrect: false },
      { key: `D`, content: `冬天`, isCorrect: false }
    ],
  },
  { type: 1, content: `金黄的太阳送给（ ）。`,
    analysis: `课文写"我画了个金黄的太阳，送给秋天"，秋天果子熟了。`,
    difficulty: 1, semester: 2, chapterName: `4 四个太阳`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `夏天`, isCorrect: false },
      { key: `B`, content: `秋天`, isCorrect: true },
      { key: `C`, content: `冬天`, isCorrect: false },
      { key: `D`, content: `春天`, isCorrect: false }
    ],
  },
  { type: 1, content: `红红的太阳送给（ ）。`,
    analysis: `课文写"我画了个红红的太阳，送给冬天"，温暖小朋友冻僵的手和脸。`,
    difficulty: 1, semester: 2, chapterName: `4 四个太阳`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `秋天`, isCorrect: false },
      { key: `B`, content: `夏天`, isCorrect: false },
      { key: `C`, content: `冬天`, isCorrect: true },
      { key: `D`, content: `春天`, isCorrect: false }
    ],
  },
  { type: 3, content: `春天是多彩的季节，所以"我"画了个彩色的太阳。`,
    analysis: `课文写"春天是个多彩的季节"，所以画彩色的太阳。`,
    difficulty: 2, semester: 2, chapterName: `4 四个太阳`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `课文表达了小朋友（ ）的美好心愿。`,
    analysis: `画不同颜色的太阳，让每个季节更美好，表达关心他人的心愿。`,
    difficulty: 3, semester: 2, chapterName: `4 四个太阳`, kpNames: [`感受课文情感`],
    options: [
      { key: `A`, content: `想当画家`, isCorrect: false },
      { key: `B`, content: `喜欢太阳`, isCorrect: false },
      { key: `C`, content: `想晒太阳`, isCorrect: false },
      { key: `D`, content: `热爱大自然、关心他人`, isCorrect: true }
    ],
  },
  { type: 1, content: `"春眠不觉晓，处处闻啼（ ）。"`,
    analysis: `诗句是"春眠不觉晓，处处闻啼鸟"，写春天早晨鸟儿鸣叫。`,
    difficulty: 2, semester: 2, chapterName: `语文园地二`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `鸟`, isCorrect: true },
      { key: `B`, content: `蝉`, isCorrect: false },
      { key: `C`, content: `鸡`, isCorrect: false },
      { key: `D`, content: `犬`, isCorrect: false }
    ],
  },
  { type: 1, content: `"夜来风雨声，花落知多（ ）。"`,
    analysis: `诗句是"夜来风雨声，花落知多少"，感叹落花很多。`,
    difficulty: 2, semester: 2, chapterName: `语文园地二`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `多`, isCorrect: false },
      { key: `B`, content: `少`, isCorrect: true },
      { key: `C`, content: `香`, isCorrect: false },
      { key: `D`, content: `美`, isCorrect: false }
    ],
  },
  { type: 3, content: `《春晓》写的是春天早晨的景象。`,
    analysis: `"春眠不觉晓"写春天早晨，诗人听到鸟叫、想起夜里的风雨。`,
    difficulty: 1, semester: 2, chapterName: `语文园地二`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"处处闻啼鸟"中，"闻"的意思是（ ）。`,
    analysis: `古诗中"闻"常表示听见，这里指到处听到鸟叫声。`,
    difficulty: 3, semester: 2, chapterName: `语文园地二`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `闻气味`, isCorrect: false },
      { key: `B`, content: `看见`, isCorrect: false },
      { key: `C`, content: `听见`, isCorrect: true },
      { key: `D`, content: `询问`, isCorrect: false }
    ],
  },
  { type: 1, content: `小公鸡在草地里找到了许多（ ）。`,
    analysis: `课文写小公鸡在草地里找到许多虫子，吃得很欢。`,
    difficulty: 1, semester: 2, chapterName: `5 小公鸡和小鸭子`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `小鱼`, isCorrect: false },
      { key: `B`, content: `石子`, isCorrect: false },
      { key: `C`, content: `花朵`, isCorrect: false },
      { key: `D`, content: `虫子`, isCorrect: true }
    ],
  },
  { type: 1, content: `小鸭子捉不到虫子，急得（ ）。`,
    analysis: `课文写小鸭子捉不到虫子，急得直哭。`,
    difficulty: 1, semester: 2, chapterName: `5 小公鸡和小鸭子`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `直哭`, isCorrect: true },
      { key: `B`, content: `大笑`, isCorrect: false },
      { key: `C`, content: `唱歌`, isCorrect: false },
      { key: `D`, content: `跳舞`, isCorrect: false }
    ],
  },
  { type: 1, content: `小鸭子到河里做什么（ ）。`,
    analysis: `课文写小鸭子说"我到河里捉鱼给你吃"。`,
    difficulty: 1, semester: 2, chapterName: `5 小公鸡和小鸭子`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `游泳比赛`, isCorrect: false },
      { key: `B`, content: `捉鱼`, isCorrect: true },
      { key: `C`, content: `洗澡`, isCorrect: false },
      { key: `D`, content: `喝水`, isCorrect: false }
    ],
  },
  { type: 3, content: `小公鸡不听劝告，偷偷跟在小鸭子后面下了水。`,
    analysis: `小鸭子说小公鸡不会游泳会淹死，小公鸡不信，偷偷跟着下了水。`,
    difficulty: 2, semester: 2, chapterName: `5 小公鸡和小鸭子`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `小公鸡落水后，是（ ）救了它。`,
    analysis: `小鸭子飞快游过去，让小公鸡坐在自己背上，救了小公鸡。`,
    difficulty: 1, semester: 2, chapterName: `5 小公鸡和小鸭子`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `小青蛙`, isCorrect: false },
      { key: `B`, content: `小鱼`, isCorrect: false },
      { key: `C`, content: `小鸭子`, isCorrect: true },
      { key: `D`, content: `小乌龟`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文告诉我们朋友之间要（ ）。`,
    analysis: `小公鸡给小鸭子虫子吃，小鸭子救了小公鸡，说明朋友要互相帮助。`,
    difficulty: 1, semester: 2, chapterName: `5 小公鸡和小鸭子`, kpNames: [`感受课文情感`],
    options: [
      { key: `A`, content: `互相争吵`, isCorrect: false },
      { key: `B`, content: `各玩各的`, isCorrect: false },
      { key: `C`, content: `互相取笑`, isCorrect: false },
      { key: `D`, content: `互相帮助`, isCorrect: true }
    ],
  },
  { type: 1, content: `从前，这里只有（ ）棵树。`,
    analysis: `课文开头写"从前，这里只有一棵树"。`,
    difficulty: 1, semester: 2, chapterName: `6 树和喜鹊`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `一`, isCorrect: true },
      { key: `B`, content: `两`, isCorrect: false },
      { key: `C`, content: `三`, isCorrect: false },
      { key: `D`, content: `很多`, isCorrect: false }
    ],
  },
  { type: 1, content: `后来，这里种了好多好多树，树和喜鹊变得（ ）。`,
    analysis: `有了邻居和朋友，树和喜鹊都很快乐。`,
    difficulty: 1, semester: 2, chapterName: `6 树和喜鹊`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `更孤单`, isCorrect: false },
      { key: `B`, content: `很快乐`, isCorrect: true },
      { key: `C`, content: `很伤心`, isCorrect: false },
      { key: `D`, content: `很生气`, isCorrect: false }
    ],
  },
  { type: 1, content: `树和喜鹊一开始很孤单，是因为（ ）。`,
    analysis: `只有一棵树、一只喜鹊，没有邻居，所以很孤单。`,
    difficulty: 2, semester: 2, chapterName: `6 树和喜鹊`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `天气太冷`, isCorrect: false },
      { key: `B`, content: `没有食物`, isCorrect: false },
      { key: `C`, content: `只有一个，没有邻居`, isCorrect: true },
      { key: `D`, content: `树太小`, isCorrect: false }
    ],
  },
  { type: 3, content: `有了邻居和朋友，树和喜鹊都快乐了。`,
    analysis: `课文结尾写"树很快乐，喜鹊也很快乐"。`,
    difficulty: 1, semester: 2, chapterName: `6 树和喜鹊`, kpNames: [`感受课文情感`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"叽叽喳喳"是描写喜鹊的（ ）。`,
    analysis: `"叽叽喳喳"模仿鸟叫的声音，写的是喜鹊的叫声。`,
    difficulty: 2, semester: 2, chapterName: `6 树和喜鹊`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `样子`, isCorrect: false },
      { key: `B`, content: `颜色`, isCorrect: false },
      { key: `C`, content: `翅膀`, isCorrect: false },
      { key: `D`, content: `叫声`, isCorrect: true }
    ],
  },
  { type: 1, content: `一个人玩，可以（ ）。`,
    analysis: `课文写一个人玩可以折船、折马，静悄悄地也很有趣。`,
    difficulty: 1, semester: 2, chapterName: `7 怎么都快乐`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `折船、折马`, isCorrect: true },
      { key: `B`, content: `拔河`, isCorrect: false },
      { key: `C`, content: `老鹰捉小鸡`, isCorrect: false },
      { key: `D`, content: `开运动会`, isCorrect: false }
    ],
  },
  { type: 1, content: `两个人玩，可以（ ）。`,
    analysis: `课文写两个人玩可以讲故事、下象棋、打乒乓球。`,
    difficulty: 1, semester: 2, chapterName: `7 怎么都快乐`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `开运动会`, isCorrect: false },
      { key: `B`, content: `下象棋`, isCorrect: true },
      { key: `C`, content: `拔河`, isCorrect: false },
      { key: `D`, content: `踢足球`, isCorrect: false }
    ],
  },
  { type: 1, content: `许多人玩，可以（ ）。`,
    analysis: `课文写许多人玩可以拔河、老鹰捉小鸡，还能开运动会。`,
    difficulty: 1, semester: 2, chapterName: `7 怎么都快乐`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `独自折纸`, isCorrect: false },
      { key: `B`, content: `一个人跳绳`, isCorrect: false },
      { key: `C`, content: `拔河`, isCorrect: true },
      { key: `D`, content: `独自看书`, isCorrect: false }
    ],
  },
  { type: 3, content: `课文告诉我们，一个人玩和许多人玩都很快乐。`,
    analysis: `课文题目就是"怎么都快乐"，一个人、两个人、许多人都有各自的快乐。`,
    difficulty: 1, semester: 2, chapterName: `7 怎么都快乐`, kpNames: [`感受课文情感`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"独自一个，静悄悄的"中，"独自"的意思是（ ）。`,
    analysis: `"独自"就是只有自己一个人。`,
    difficulty: 2, semester: 2, chapterName: `7 怎么都快乐`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `两个人`, isCorrect: false },
      { key: `B`, content: `很多人`, isCorrect: false },
      { key: `C`, content: `和家人`, isCorrect: false },
      { key: `D`, content: `一个人`, isCorrect: true }
    ],
  },
  { type: 1, content: `"赠人玫瑰，手有余（ ）。"`,
    analysis: `谚语是"赠人玫瑰，手有余香"，帮助别人自己也会快乐。`,
    difficulty: 2, semester: 2, chapterName: `语文园地三`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `香`, isCorrect: true },
      { key: `B`, content: `甜`, isCorrect: false },
      { key: `C`, content: `暖`, isCorrect: false },
      { key: `D`, content: `光`, isCorrect: false }
    ],
  },
  { type: 3, content: `帮助别人，自己也会快乐。`,
    analysis: `"赠人玫瑰，手有余香"说的就是这个道理。`,
    difficulty: 1, semester: 2, chapterName: `语文园地三`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"人心齐，泰山（ ）。"`,
    analysis: `谚语是"人心齐，泰山移"，大家团结一致就能做成难事。`,
    difficulty: 2, semester: 2, chapterName: `语文园地三`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `倒`, isCorrect: false },
      { key: `B`, content: `移`, isCorrect: true },
      { key: `C`, content: `高`, isCorrect: false },
      { key: `D`, content: `小`, isCorrect: false }
    ],
  },
  { type: 1, content: `"三个臭皮匠，顶个（ ）。"`,
    analysis: `这句俗语说人多智慧多，三个普通人合起来能顶一个聪明人。`,
    difficulty: 3, semester: 2, chapterName: `语文园地三`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `孙悟空`, isCorrect: false },
      { key: `B`, content: `张飞`, isCorrect: false },
      { key: `C`, content: `诸葛亮`, isCorrect: true },
      { key: `D`, content: `关羽`, isCorrect: false }
    ],
  },
  { type: 1, content: `蜻蜓在半空（ ）。`,
    analysis: `儿歌写"蜻蜓半空展翅飞"。`,
    difficulty: 1, semester: 2, chapterName: `5 动物儿歌`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `捉迷藏`, isCorrect: false },
      { key: `B`, content: `造宫殿`, isCorrect: false },
      { key: `C`, content: `运食粮`, isCorrect: false },
      { key: `D`, content: `展翅飞`, isCorrect: true }
    ],
  },
  { type: 1, content: `蝴蝶在花间（ ）。`,
    analysis: `儿歌写"蝴蝶花间捉迷藏"。`,
    difficulty: 1, semester: 2, chapterName: `5 动物儿歌`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `捉迷藏`, isCorrect: true },
      { key: `B`, content: `展翅飞`, isCorrect: false },
      { key: `C`, content: `结网`, isCorrect: false },
      { key: `D`, content: `游泳`, isCorrect: false }
    ],
  },
  { type: 1, content: `蚯蚓在土里（ ）。`,
    analysis: `儿歌写"蚯蚓土里造宫殿"。`,
    difficulty: 1, semester: 2, chapterName: `5 动物儿歌`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `运食粮`, isCorrect: false },
      { key: `B`, content: `造宫殿`, isCorrect: true },
      { key: `C`, content: `展翅飞`, isCorrect: false },
      { key: `D`, content: `捉迷藏`, isCorrect: false }
    ],
  },
  { type: 1, content: `蚂蚁在地上（ ）。`,
    analysis: `儿歌写"蚂蚁地上运食粮"。`,
    difficulty: 1, semester: 2, chapterName: `5 动物儿歌`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `结网`, isCorrect: false },
      { key: `B`, content: `造宫殿`, isCorrect: false },
      { key: `C`, content: `运食粮`, isCorrect: true },
      { key: `D`, content: `游泳`, isCorrect: false }
    ],
  },
  { type: 3, content: `蝌蚪在池中游得欢，蜘蛛在房前结网忙。`,
    analysis: `这是儿歌最后两句的原句。`,
    difficulty: 1, semester: 2, chapterName: `5 动物儿歌`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"蜻蜓、蝴蝶、蚂蚁"这些字都带有（ ）。`,
    analysis: `这些字都有虫字旁，虫字旁的字大多和昆虫有关。`,
    difficulty: 2, semester: 2, chapterName: `5 动物儿歌`, kpNames: [`偏旁表意功能`],
    options: [
      { key: `A`, content: `木字旁`, isCorrect: false },
      { key: `B`, content: `氵`, isCorrect: false },
      { key: `C`, content: `艹`, isCorrect: false },
      { key: `D`, content: `虫字旁`, isCorrect: true }
    ],
  },
  { type: 1, content: `"古对今，圆对（ ）。"`,
    analysis: `课文写"古对今，圆对方"，圆和方相对。`,
    difficulty: 1, semester: 2, chapterName: `6 古对今`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `方`, isCorrect: true },
      { key: `B`, content: `长`, isCorrect: false },
      { key: `C`, content: `短`, isCorrect: false },
      { key: `D`, content: `高`, isCorrect: false }
    ],
  },
  { type: 1, content: `"严寒对酷暑，春暖对（ ）。"`,
    analysis: `课文写"严寒对酷暑，春暖对秋凉"。`,
    difficulty: 1, semester: 2, chapterName: `6 古对今`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `夏热`, isCorrect: false },
      { key: `B`, content: `秋凉`, isCorrect: true },
      { key: `C`, content: `冬冷`, isCorrect: false },
      { key: `D`, content: `春风`, isCorrect: false }
    ],
  },
  { type: 1, content: `"和风对（ ）。"`,
    analysis: `课文写"和风对细雨，朝霞对夕阳"。`,
    difficulty: 1, semester: 2, chapterName: `6 古对今`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `大雪`, isCorrect: false },
      { key: `B`, content: `乌云`, isCorrect: false },
      { key: `C`, content: `细雨`, isCorrect: true },
      { key: `D`, content: `雷电`, isCorrect: false }
    ],
  },
  { type: 3, content: `"莺歌对燕舞，鸟语对花香"是一组对韵。`,
    analysis: `这是课文最后一句，前后两两相对，读起来很有节奏。`,
    difficulty: 1, semester: 2, chapterName: `6 古对今`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"晨对暮"中，"晨"和"暮"分别指（ ）。`,
    analysis: `"晨"是早晨，"暮"是傍晚，两者意思相对。`,
    difficulty: 2, semester: 2, chapterName: `6 古对今`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `春天和秋天`, isCorrect: false },
      { key: `B`, content: `今天和明天`, isCorrect: false },
      { key: `C`, content: `上面和下面`, isCorrect: false },
      { key: `D`, content: `早晨和傍晚`, isCorrect: true }
    ],
  },
  { type: 1, content: `课文中，同学们在操场上（ ）。`,
    analysis: `课文写了打球、拔河、拍皮球、跳高、跑步、踢足球等活动。`,
    difficulty: 1, semester: 2, chapterName: `7 操场上`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `打球、拔河、踢足球`, isCorrect: true },
      { key: `B`, content: `睡觉`, isCorrect: false },
      { key: `C`, content: `看书`, isCorrect: false },
      { key: `D`, content: `画画`, isCorrect: false }
    ],
  },
  { type: 1, content: `"拍皮球"的"拍"表示（ ）的动作。`,
    analysis: `"拍"是用手掌打，拍皮球就是用手掌一下一下打皮球。`,
    difficulty: 2, semester: 2, chapterName: `7 操场上`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `用脚踢`, isCorrect: false },
      { key: `B`, content: `用手打`, isCorrect: true },
      { key: `C`, content: `用头顶`, isCorrect: false },
      { key: `D`, content: `用肩扛`, isCorrect: false }
    ],
  },
  { type: 3, content: `"跳高、跑步、踢足球"都是体育活动。`,
    analysis: `这些都是在操场上进行的体育锻炼活动。`,
    difficulty: 1, semester: 2, chapterName: `7 操场上`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"铃声响，上课了"说明我们该（ ）。`,
    analysis: `上课铃响了，要马上回教室准备上课。`,
    difficulty: 1, semester: 2, chapterName: `7 操场上`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `继续玩`, isCorrect: false },
      { key: `B`, content: `回家`, isCorrect: false },
      { key: `C`, content: `回教室上课`, isCorrect: true },
      { key: `D`, content: `吃饭`, isCorrect: false }
    ],
  },
  { type: 1, content: `"天天锻炼身体好"告诉我们（ ）。`,
    analysis: `只有天天坚持锻炼，身体才会好。`,
    difficulty: 1, semester: 2, chapterName: `7 操场上`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `不用运动`, isCorrect: false },
      { key: `B`, content: `只在体育课运动`, isCorrect: false },
      { key: `C`, content: `运动没有用`, isCorrect: false },
      { key: `D`, content: `要坚持运动`, isCorrect: true }
    ],
  },
  { type: 1, content: `"人之初，性本善"中，"善"的意思是（ ）。`,
    analysis: `"善"就是善良，这句话说人刚出生时本性是善良的。`,
    difficulty: 2, semester: 2, chapterName: `8 人之初`, kpNames: [`文言文初步`],
    options: [
      { key: `A`, content: `善良`, isCorrect: true },
      { key: `B`, content: `凶恶`, isCorrect: false },
      { key: `C`, content: `聪明`, isCorrect: false },
      { key: `D`, content: `勇敢`, isCorrect: false }
    ],
  },
  { type: 1, content: `"子不学，非所宜"中，"宜"的意思是（ ）。`,
    analysis: `"宜"是应该的意思，小孩不学习是不应该的。`,
    difficulty: 3, semester: 2, chapterName: `8 人之初`, kpNames: [`文言文初步`],
    options: [
      { key: `A`, content: `便宜`, isCorrect: false },
      { key: `B`, content: `应该`, isCorrect: true },
      { key: `C`, content: `合适的人`, isCorrect: false },
      { key: `D`, content: `喜欢`, isCorrect: false }
    ],
  },
  { type: 3, content: `"玉不琢，不成器"是说玉不雕琢就不能成为有用的器物。`,
    analysis: `这句话用玉作比喻，说明人也要经过学习才能成才。`,
    difficulty: 2, semester: 2, chapterName: `8 人之初`, kpNames: [`文言文初步`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"幼不学，老何为"告诉我们（ ）。`,
    analysis: `小时候不学习，长大了能做什么呢？告诉我们要从小努力学习。`,
    difficulty: 2, semester: 2, chapterName: `8 人之初`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `老了才学习`, isCorrect: false },
      { key: `B`, content: `不用学习`, isCorrect: false },
      { key: `C`, content: `小时候要好好学习`, isCorrect: true },
      { key: `D`, content: `学习没有用`, isCorrect: false }
    ],
  },
  { type: 1, content: `"玉不琢，不成器"中用玉来比喻（ ）。`,
    analysis: `玉要雕琢才成器物，人也要学习才能成才，所以用玉比喻人。`,
    difficulty: 3, semester: 2, chapterName: `8 人之初`, kpNames: [`文言文初步`],
    options: [
      { key: `A`, content: `玉很贵重`, isCorrect: false },
      { key: `B`, content: `雕刻很难`, isCorrect: false },
      { key: `C`, content: `器物很有用`, isCorrect: false },
      { key: `D`, content: `人需要学习才能成才`, isCorrect: true }
    ],
  },
  { type: 1, content: `想请别人帮忙，应该（ ）。`,
    analysis: `请人帮忙要有礼貌，用"请"字，把事情说清楚。`,
    difficulty: 1, semester: 2, chapterName: `口语交际：请你帮个忙`, kpNames: [`表达清楚完整`],
    options: [
      { key: `A`, content: `有礼貌地说"请你帮帮我"`, isCorrect: true },
      { key: `B`, content: `命令别人`, isCorrect: false },
      { key: `C`, content: `直接抢`, isCorrect: false },
      { key: `D`, content: `不说话`, isCorrect: false }
    ],
  },
  { type: 1, content: `别人帮你之后，要说（ ）。`,
    analysis: `得到别人帮助要说"谢谢"，这是基本的礼貌。`,
    difficulty: 1, semester: 2, chapterName: `口语交际：请你帮个忙`, kpNames: [`简单日常对话`],
    options: [
      { key: `A`, content: `再见`, isCorrect: false },
      { key: `B`, content: `谢谢`, isCorrect: true },
      { key: `C`, content: `对不起`, isCorrect: false },
      { key: `D`, content: `不客气`, isCorrect: false }
    ],
  },
  { type: 3, content: `请人帮忙时，要把事情说清楚。`,
    analysis: `把事情说清楚，别人才能帮到你。`,
    difficulty: 1, semester: 2, chapterName: `口语交际：请你帮个忙`, kpNames: [`表达清楚完整`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"蜻蜓"的"蜻"的偏旁是（ ）。`,
    analysis: `"蜻"左边是虫字旁，右边的"青"表示读音。`,
    difficulty: 2, semester: 2, chapterName: `语文园地四`, kpNames: [`常用偏旁识别`],
    options: [
      { key: `A`, content: `青`, isCorrect: false },
      { key: `B`, content: `氵`, isCorrect: false },
      { key: `C`, content: `虫`, isCorrect: true },
      { key: `D`, content: `日`, isCorrect: false }
    ],
  },
  { type: 1, content: `"蚂"的偏旁是"虫"，说明它和（ ）有关。`,
    analysis: `虫字旁表示和昆虫有关，"蚂蚁"就是一种昆虫。`,
    difficulty: 2, semester: 2, chapterName: `语文园地四`, kpNames: [`偏旁表意功能`],
    options: [
      { key: `A`, content: `马`, isCorrect: false },
      { key: `B`, content: `水`, isCorrect: false },
      { key: `C`, content: `草`, isCorrect: false },
      { key: `D`, content: `昆虫`, isCorrect: true }
    ],
  },
  { type: 3, content: `"蜘蛛、蝴蝶、蚂蚁"都是虫字旁的字，和虫子有关。`,
    analysis: `虫字旁的字大多表示昆虫或小动物。`,
    difficulty: 1, semester: 2, chapterName: `语文园地四`, kpNames: [`偏旁表意功能`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"古对今"中的"今"和"古"意思（ ）。`,
    analysis: `"今"是现在，"古"是从前，两者意思相反。`,
    difficulty: 1, semester: 2, chapterName: `语文园地四`, kpNames: [`反义词`],
    options: [
      { key: `A`, content: `相反`, isCorrect: true },
      { key: `B`, content: `相同`, isCorrect: false },
      { key: `C`, content: `相近`, isCorrect: false },
      { key: `D`, content: `无关`, isCorrect: false }
    ],
  },
  { type: 1, content: `《池上》中，"小娃撑小艇，偷采（ ）回。"`,
    analysis: `诗句是"小娃撑小艇，偷采白莲回"。`,
    difficulty: 2, semester: 2, chapterName: `8 古诗二首`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `荷花`, isCorrect: false },
      { key: `B`, content: `白莲`, isCorrect: true },
      { key: `C`, content: `菱角`, isCorrect: false },
      { key: `D`, content: `荷叶`, isCorrect: false }
    ],
  },
  { type: 1, content: `《池上》的作者是（ ）。`,
    analysis: `《池上》是唐代诗人白居易写的。`,
    difficulty: 2, semester: 2, chapterName: `8 古诗二首`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `李白`, isCorrect: false },
      { key: `B`, content: `杜甫`, isCorrect: false },
      { key: `C`, content: `白居易`, isCorrect: true },
      { key: `D`, content: `杨万里`, isCorrect: false }
    ],
  },
  { type: 1, content: `《小池》中，"小荷才露尖尖角，早有（ ）立上头。"`,
    analysis: `诗句是"小荷才露尖尖角，早有蜻蜓立上头"。`,
    difficulty: 2, semester: 2, chapterName: `8 古诗二首`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `蝴蝶`, isCorrect: false },
      { key: `B`, content: `蜜蜂`, isCorrect: false },
      { key: `C`, content: `小鸟`, isCorrect: false },
      { key: `D`, content: `蜻蜓`, isCorrect: true }
    ],
  },
  { type: 1, content: `《小池》的作者是（ ）。`,
    analysis: `《小池》是宋代诗人杨万里写的。`,
    difficulty: 2, semester: 2, chapterName: `8 古诗二首`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `杨万里`, isCorrect: true },
      { key: `B`, content: `白居易`, isCorrect: false },
      { key: `C`, content: `李白`, isCorrect: false },
      { key: `D`, content: `王维`, isCorrect: false }
    ],
  },
  { type: 3, content: `"不解藏踪迹，浮萍一道开"写小娃不懂得隐藏行踪。`,
    analysis: `小娃偷采白莲后，浮萍被船分开，留下了痕迹，说明他不懂得隐藏。`,
    difficulty: 3, semester: 2, chapterName: `8 古诗二首`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `《小池》中"泉眼无声惜细流"的"惜"表达了作者（ ）的感情。`,
    analysis: `"惜"是爱惜，诗人把泉水写得很有情意，表达喜爱之情。`,
    difficulty: 3, semester: 2, chapterName: `8 古诗二首`, kpNames: [`感受古诗意境`],
    options: [
      { key: `A`, content: `讨厌`, isCorrect: false },
      { key: `B`, content: `喜爱`, isCorrect: true },
      { key: `C`, content: `害怕`, isCorrect: false },
      { key: `D`, content: `生气`, isCorrect: false }
    ],
  },
  { type: 1, content: `"小荷才露尖尖角"描写的是（ ）季节。`,
    analysis: `荷叶刚刚露出尖角，蜻蜓已经飞来，写的是初夏景象。`,
    difficulty: 2, semester: 2, chapterName: `8 古诗二首`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `深秋`, isCorrect: false },
      { key: `B`, content: `寒冬`, isCorrect: false },
      { key: `C`, content: `初夏`, isCorrect: true },
      { key: `D`, content: `早春`, isCorrect: false }
    ],
  },
  { type: 1, content: `小水珠把荷叶当作（ ）。`,
    analysis: `课文写小水珠说："荷叶是我的摇篮。"`,
    difficulty: 1, semester: 2, chapterName: `9 荷叶圆圆`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `停机坪`, isCorrect: false },
      { key: `B`, content: `歌台`, isCorrect: false },
      { key: `C`, content: `凉伞`, isCorrect: false },
      { key: `D`, content: `摇篮`, isCorrect: true }
    ],
  },
  { type: 1, content: `小蜻蜓把荷叶当作（ ）。`,
    analysis: `课文写小蜻蜓说："荷叶是我的停机坪。"`,
    difficulty: 1, semester: 2, chapterName: `9 荷叶圆圆`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `停机坪`, isCorrect: true },
      { key: `B`, content: `摇篮`, isCorrect: false },
      { key: `C`, content: `歌台`, isCorrect: false },
      { key: `D`, content: `凉伞`, isCorrect: false }
    ],
  },
  { type: 1, content: `小青蛙把荷叶当作（ ）。`,
    analysis: `课文写小青蛙说："荷叶是我的歌台。"`,
    difficulty: 1, semester: 2, chapterName: `9 荷叶圆圆`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `摇篮`, isCorrect: false },
      { key: `B`, content: `歌台`, isCorrect: true },
      { key: `C`, content: `停机坪`, isCorrect: false },
      { key: `D`, content: `凉伞`, isCorrect: false }
    ],
  },
  { type: 1, content: `小鱼儿把荷叶当作（ ）。`,
    analysis: `课文写小鱼儿说："荷叶是我的凉伞。"`,
    difficulty: 1, semester: 2, chapterName: `9 荷叶圆圆`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `歌台`, isCorrect: false },
      { key: `B`, content: `摇篮`, isCorrect: false },
      { key: `C`, content: `凉伞`, isCorrect: true },
      { key: `D`, content: `停机坪`, isCorrect: false }
    ],
  },
  { type: 3, content: `荷叶圆圆的，绿绿的。`,
    analysis: `课文开头就写"荷叶圆圆的，绿绿的"。`,
    difficulty: 1, semester: 2, chapterName: `9 荷叶圆圆`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文把荷叶当成人来写，用了（ ）的手法。`,
    analysis: `小水珠、小蜻蜓、小青蛙、小鱼儿都会说话，把物当人写，是拟人。`,
    difficulty: 3, semester: 2, chapterName: `9 荷叶圆圆`, kpNames: [`拟人`],
    options: [
      { key: `A`, content: `比喻`, isCorrect: false },
      { key: `B`, content: `夸张`, isCorrect: false },
      { key: `C`, content: `排比`, isCorrect: false },
      { key: `D`, content: `拟人`, isCorrect: true }
    ],
  },
  { type: 1, content: `下雨前，燕子为什么飞得低（ ）。`,
    analysis: `课文写空气潮湿，虫子的翅膀沾了小水珠飞不高，燕子要低飞捉虫。`,
    difficulty: 2, semester: 2, chapterName: `10 要下雨了`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `空气潮湿，虫子翅膀沾水飞不高`, isCorrect: true },
      { key: `B`, content: `燕子累了`, isCorrect: false },
      { key: `C`, content: `燕子在找食物`, isCorrect: false },
      { key: `D`, content: `燕子在玩耍`, isCorrect: false }
    ],
  },
  { type: 1, content: `下雨前，小鱼游到（ ）来透气。`,
    analysis: `下雨前水里闷得很，小鱼游到水面上来透气。`,
    difficulty: 1, semester: 2, chapterName: `10 要下雨了`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `水底`, isCorrect: false },
      { key: `B`, content: `水面上`, isCorrect: true },
      { key: `C`, content: `岸上`, isCorrect: false },
      { key: `D`, content: `石头下`, isCorrect: false }
    ],
  },
  { type: 3, content: `蚂蚁搬家也是要下雨的征兆。`,
    analysis: `下雨前蚂蚁会把家搬到高处，这是它们躲避雨水的办法。`,
    difficulty: 2, semester: 2, chapterName: `10 要下雨了`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `小白兔看到天阴沉沉的，说明（ ）。`,
    analysis: `天阴沉沉的是下雨前的样子，说明快要下雨了。`,
    difficulty: 1, semester: 2, chapterName: `10 要下雨了`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `天晴了`, isCorrect: false },
      { key: `B`, content: `刮风了`, isCorrect: false },
      { key: `C`, content: `要下雨了`, isCorrect: true },
      { key: `D`, content: `下雪了`, isCorrect: false }
    ],
  },
  { type: 1, content: `"朝霞不出门，晚霞行（ ）。"`,
    analysis: `这是天气谚语，出现晚霞预示第二天天气晴好，可以远行千里。`,
    difficulty: 3, semester: 2, chapterName: `语文园地五`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `万里`, isCorrect: false },
      { key: `B`, content: `一天`, isCorrect: false },
      { key: `C`, content: `半天`, isCorrect: false },
      { key: `D`, content: `千里`, isCorrect: true }
    ],
  },
  { type: 3, content: `"有雨山戴帽，无雨半山腰"是一句关于天气的谚语。`,
    analysis: `山顶有云像戴帽，说明要下雨；云在半山腰，说明没有雨。`,
    difficulty: 2, semester: 2, chapterName: `语文园地五`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"蚂蚁搬家蛇过道，大雨不久就（ ）。"`,
    analysis: `这句谚语说蚂蚁搬家、蛇过道都是大雨将至的征兆。`,
    difficulty: 2, semester: 2, chapterName: `语文园地五`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `来到`, isCorrect: true },
      { key: `B`, content: `停了`, isCorrect: false },
      { key: `C`, content: `变小`, isCorrect: false },
      { key: `D`, content: `走远`, isCorrect: false }
    ],
  },
  { type: 1, content: `棉花姑娘生病了，是因为叶子上有（ ）。`,
    analysis: `课文写棉花姑娘叶子上有许多可恶的蚜虫，所以生病了。`,
    difficulty: 1, semester: 2, chapterName: `11 棉花姑娘`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `蝴蝶`, isCorrect: false },
      { key: `B`, content: `蚜虫`, isCorrect: true },
      { key: `C`, content: `蜜蜂`, isCorrect: false },
      { key: `D`, content: `蚂蚁`, isCorrect: false }
    ],
  },
  { type: 1, content: `最后是谁治好了棉花姑娘的病（ ）。`,
    analysis: `七星瓢虫吃光了蚜虫，治好了棉花姑娘的病。`,
    difficulty: 1, semester: 2, chapterName: `11 棉花姑娘`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `燕子`, isCorrect: false },
      { key: `B`, content: `啄木鸟`, isCorrect: false },
      { key: `C`, content: `七星瓢虫`, isCorrect: true },
      { key: `D`, content: `青蛙`, isCorrect: false }
    ],
  },
  { type: 1, content: `燕子只会捉（ ）的害虫。`,
    analysis: `课文写燕子说："我只会捉空中飞的害虫。"`,
    difficulty: 1, semester: 2, chapterName: `11 棉花姑娘`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `树干里`, isCorrect: false },
      { key: `B`, content: `田里`, isCorrect: false },
      { key: `C`, content: `水里`, isCorrect: false },
      { key: `D`, content: `空中飞`, isCorrect: true }
    ],
  },
  { type: 3, content: `啄木鸟会捉树干里的害虫。`,
    analysis: `课文写啄木鸟说："我只会捉树干里的害虫。"`,
    difficulty: 1, semester: 2, chapterName: `11 棉花姑娘`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `课文告诉我们，不同的动物（ ）。`,
    analysis: `燕子捉空中的虫，啄木鸟捉树干里的虫，青蛙捉田里的虫，各有本领。`,
    difficulty: 2, semester: 2, chapterName: `11 棉花姑娘`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `各有各的本领`, isCorrect: true },
      { key: `B`, content: `都会治病`, isCorrect: false },
      { key: `C`, content: `都吃棉花`, isCorrect: false },
      { key: `D`, content: `都住在田里`, isCorrect: false }
    ],
  },
  { type: 1, content: `小猴想吃树上的桃子，可是（ ）。`,
    analysis: `课文写小猴想吃树上的桃子，可是够不着。`,
    difficulty: 1, semester: 2, chapterName: `12 地球爷爷的手`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `桃子没熟`, isCorrect: false },
      { key: `B`, content: `够不着`, isCorrect: true },
      { key: `C`, content: `树太高倒了`, isCorrect: false },
      { key: `D`, content: `他不爱吃`, isCorrect: false }
    ],
  },
  { type: 1, content: `桃子自己掉下来，是因为（ ）。`,
    analysis: `地球有引力，把成熟的桃子往下拉，所以桃子会掉下来。`,
    difficulty: 2, semester: 2, chapterName: `12 地球爷爷的手`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `风吹的`, isCorrect: false },
      { key: `B`, content: `小猴摇树`, isCorrect: false },
      { key: `C`, content: `地球爷爷有引力`, isCorrect: true },
      { key: `D`, content: `小兔摘的`, isCorrect: false }
    ],
  },
  { type: 3, content: `"地球爷爷的手"指的是地球的引力。`,
    analysis: `课文把地球引力比作地球爷爷的手，能把东西往下拉。`,
    difficulty: 2, semester: 2, chapterName: `12 地球爷爷的手`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文把地球的引力说成（ ）。`,
    analysis: `课文用"地球爷爷的手"来写引力，这是拟人的写法。`,
    difficulty: 2, semester: 2, chapterName: `12 地球爷爷的手`, kpNames: [`拟人`],
    options: [
      { key: `A`, content: `地球爷爷的脚`, isCorrect: false },
      { key: `B`, content: `地球爷爷的眼睛`, isCorrect: false },
      { key: `C`, content: `地球爷爷的嘴巴`, isCorrect: false },
      { key: `D`, content: `地球爷爷的手`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个现象和地球引力有关（ ）。`,
    analysis: `抛起的球会落回地面，就是地球引力在起作用。`,
    difficulty: 2, semester: 2, chapterName: `12 地球爷爷的手`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `抛起的球会落下来`, isCorrect: true },
      { key: `B`, content: `太阳会发光`, isCorrect: false },
      { key: `C`, content: `鸟儿会叫`, isCorrect: false },
      { key: `D`, content: `花儿会开`, isCorrect: false }
    ],
  },
  { type: 1, content: `想和同学一起做游戏，应该（ ）。`,
    analysis: `想和别人一起玩，要有礼貌地邀请，别人才愿意和你玩。`,
    difficulty: 1, semester: 2, chapterName: `口语交际：一起做游戏`, kpNames: [`简单日常对话`],
    options: [
      { key: `A`, content: `抢别人的玩具`, isCorrect: false },
      { key: `B`, content: `有礼貌地邀请`, isCorrect: true },
      { key: `C`, content: `站在旁边生气`, isCorrect: false },
      { key: `D`, content: `推别人`, isCorrect: false }
    ],
  },
  { type: 3, content: `做游戏时要遵守规则，注意安全。`,
    analysis: `遵守规则游戏才公平，注意安全才不会受伤。`,
    difficulty: 1, semester: 2, chapterName: `口语交际：一起做游戏`, kpNames: [`表达清楚完整`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `游戏时同学不小心碰到你，你应该（ ）。`,
    analysis: `别人不小心碰到你，说声"没关系"，大家还是好朋友。`,
    difficulty: 1, semester: 2, chapterName: `口语交际：一起做游戏`, kpNames: [`简单日常对话`],
    options: [
      { key: `A`, content: `打回去`, isCorrect: false },
      { key: `B`, content: `大哭大闹`, isCorrect: false },
      { key: `C`, content: `说"没关系"`, isCorrect: true },
      { key: `D`, content: `不理他`, isCorrect: false }
    ],
  },
  { type: 1, content: `"敏而好学，不耻下问"告诉我们要（ ）。`,
    analysis: `这句话告诉我们要勤奋好学，向别人请教不觉得羞耻。`,
    difficulty: 3, semester: 2, chapterName: `语文园地六`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `只问老师`, isCorrect: false },
      { key: `B`, content: `不问别人`, isCorrect: false },
      { key: `C`, content: `自己瞎猜`, isCorrect: false },
      { key: `D`, content: `虚心向别人学习`, isCorrect: true }
    ],
  },
  { type: 3, content: `"不知则问，不能则学"鼓励我们不懂就问、不会就学。`,
    analysis: `不知道就问，不会就学，这样才会不断进步。`,
    difficulty: 2, semester: 2, chapterName: `语文园地六`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"读书百遍，而义自（ ）。"`,
    analysis: `这句话说书读得多了，意思自然就明白了。`,
    difficulty: 3, semester: 2, chapterName: `语文园地六`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `见`, isCorrect: true },
      { key: `B`, content: `现`, isCorrect: false },
      { key: `C`, content: `明`, isCorrect: false },
      { key: `D`, content: `知`, isCorrect: false }
    ],
  }
];
