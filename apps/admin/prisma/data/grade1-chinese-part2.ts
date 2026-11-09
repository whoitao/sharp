import type { RawQuestion } from "./types";

// ────────────────────────────────────────────────
// 人教版一年级语文（上册）Part 2：100 道
// 覆盖：汉语拼音（后 4 课） / 课文（一） / 识字（二） / 课文（二）前半
// ────────────────────────────────────────────────

export const grade1ChinesePart2: RawQuestion[] = [
  { type: 1, content: `"小猴"的"猴"的韵母是（ ）。`,
    analysis: `"猴"读 hóu，韵母是复韵母 ou。`,
    difficulty: 1, semester: 1, chapterName: `10 ao ou iu`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ou`, isCorrect: true },
      { key: `B`, content: `ao`, isCorrect: false },
      { key: `C`, content: `iu`, isCorrect: false },
      { key: `D`, content: `ui`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面哪个字的韵母是"iu"（ ）。`,
    analysis: `"六"读 liù，韵母是 iu；"老"是 ao，"口"是 ou，"好"是 ao。`,
    difficulty: 3, semester: 1, chapterName: `10 ao ou iu`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `老`, isCorrect: false },
      { key: `B`, content: `六`, isCorrect: true },
      { key: `C`, content: `口`, isCorrect: false },
      { key: `D`, content: `好`, isCorrect: false }
    ],
  },
  { type: 1, content: `"树叶"的"叶"的韵母是（ ）。`,
    analysis: `"叶"读 yè，韵母是复韵母 ie。`,
    difficulty: 1, semester: 1, chapterName: `11 ie üe er`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `üe`, isCorrect: false },
      { key: `B`, content: `er`, isCorrect: false },
      { key: `C`, content: `ie`, isCorrect: true },
      { key: `D`, content: `ei`, isCorrect: false }
    ],
  },
  { type: 1, content: `"月亮"的"月"的韵母是（ ）。`,
    analysis: `"月"读 yuè，韵母是复韵母 üe。`,
    difficulty: 1, semester: 1, chapterName: `11 ie üe er`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ie`, isCorrect: false },
      { key: `B`, content: `er`, isCorrect: false },
      { key: `C`, content: `ui`, isCorrect: false },
      { key: `D`, content: `üe`, isCorrect: true }
    ],
  },
  { type: 1, content: `"儿子"的"儿"的韵母是（ ）。`,
    analysis: `"儿"读 ér，韵母是特殊韵母 er。`,
    difficulty: 1, semester: 1, chapterName: `11 ie üe er`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `er`, isCorrect: true },
      { key: `B`, content: `ie`, isCorrect: false },
      { key: `C`, content: `üe`, isCorrect: false },
      { key: `D`, content: `ai`, isCorrect: false }
    ],
  },
  { type: 3, content: `"er"是复韵母，可以单独成音节。`,
    analysis: `er 是特殊韵母，能自己单独成一个音节，如"儿、耳、二"。`,
    difficulty: 2, semester: 1, chapterName: `11 ie üe er`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"写字"的"写"的韵母是（ ）。`,
    analysis: `"写"读 xiě，韵母是复韵母 ie。`,
    difficulty: 1, semester: 1, chapterName: `11 ie üe er`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `üe`, isCorrect: false },
      { key: `B`, content: `ie`, isCorrect: true },
      { key: `C`, content: `er`, isCorrect: false },
      { key: `D`, content: `ia`, isCorrect: false }
    ],
  },
  { type: 1, content: `"雪"的韵母是（ ）。`,
    analysis: `"雪"读 xuě，韵母是 üe，和 x 相拼时两点省略。`,
    difficulty: 2, semester: 1, chapterName: `11 ie üe er`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ie`, isCorrect: false },
      { key: `B`, content: `er`, isCorrect: false },
      { key: `C`, content: `üe`, isCorrect: true },
      { key: `D`, content: `ue`, isCorrect: false }
    ],
  },
  { type: 1, content: `"大山"的"山"的韵母是（ ）。`,
    analysis: `"山"读 shān，韵母是前鼻韵母 an。`,
    difficulty: 1, semester: 1, chapterName: `12 an en in un ün`, kpNames: [`前鼻韵母 an en in un ün`],
    options: [
      { key: `A`, content: `en`, isCorrect: false },
      { key: `B`, content: `in`, isCorrect: false },
      { key: `C`, content: `ang`, isCorrect: false },
      { key: `D`, content: `an`, isCorrect: true }
    ],
  },
  { type: 1, content: `"大门"的"门"的韵母是（ ）。`,
    analysis: `"门"读 mén，韵母是前鼻韵母 en。`,
    difficulty: 1, semester: 1, chapterName: `12 an en in un ün`, kpNames: [`前鼻韵母 an en in un ün`],
    options: [
      { key: `A`, content: `en`, isCorrect: true },
      { key: `B`, content: `an`, isCorrect: false },
      { key: `C`, content: `in`, isCorrect: false },
      { key: `D`, content: `un`, isCorrect: false }
    ],
  },
  { type: 1, content: `"树林"的"林"的韵母是（ ）。`,
    analysis: `"林"读 lín，韵母是前鼻韵母 in。`,
    difficulty: 1, semester: 1, chapterName: `12 an en in un ün`, kpNames: [`前鼻韵母 an en in un ün`],
    options: [
      { key: `A`, content: `an`, isCorrect: false },
      { key: `B`, content: `in`, isCorrect: true },
      { key: `C`, content: `en`, isCorrect: false },
      { key: `D`, content: `ing`, isCorrect: false }
    ],
  },
  { type: 3, content: `"an、en、in、un、ün"都是前鼻韵母。`,
    analysis: `这五个韵母都以 n 结尾，是前鼻韵母。`,
    difficulty: 2, semester: 1, chapterName: `12 an en in un ün`, kpNames: [`前鼻韵母 an en in un ün`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"白云"的"云"的韵母是（ ）。`,
    analysis: `"云"读 yún，韵母是前鼻韵母 ün。`,
    difficulty: 2, semester: 1, chapterName: `12 an en in un ün`, kpNames: [`前鼻韵母 an en in un ün`],
    options: [
      { key: `A`, content: `un`, isCorrect: false },
      { key: `B`, content: `in`, isCorrect: false },
      { key: `C`, content: `ün`, isCorrect: true },
      { key: `D`, content: `en`, isCorrect: false }
    ],
  },
  { type: 1, content: `"春天"的"春"的韵母是（ ）。`,
    analysis: `"春"读 chūn，韵母是前鼻韵母 un。`,
    difficulty: 1, semester: 1, chapterName: `12 an en in un ün`, kpNames: [`前鼻韵母 an en in un ün`],
    options: [
      { key: `A`, content: `ün`, isCorrect: false },
      { key: `B`, content: `an`, isCorrect: false },
      { key: `C`, content: `en`, isCorrect: false },
      { key: `D`, content: `un`, isCorrect: true }
    ],
  },
  { type: 1, content: `"帮忙"的"帮"的韵母是（ ）。`,
    analysis: `"帮"读 bāng，韵母是后鼻韵母 ang。`,
    difficulty: 1, semester: 1, chapterName: `13 ang eng ing ong`, kpNames: [`后鼻韵母 ang eng ing ong`],
    options: [
      { key: `A`, content: `ang`, isCorrect: true },
      { key: `B`, content: `an`, isCorrect: false },
      { key: `C`, content: `eng`, isCorrect: false },
      { key: `D`, content: `ing`, isCorrect: false }
    ],
  },
  { type: 1, content: `"台灯"的"灯"的韵母是（ ）。`,
    analysis: `"灯"读 dēng，韵母是后鼻韵母 eng。`,
    difficulty: 1, semester: 1, chapterName: `13 ang eng ing ong`, kpNames: [`后鼻韵母 ang eng ing ong`],
    options: [
      { key: `A`, content: `en`, isCorrect: false },
      { key: `B`, content: `eng`, isCorrect: true },
      { key: `C`, content: `ang`, isCorrect: false },
      { key: `D`, content: `ong`, isCorrect: false }
    ],
  },
  { type: 1, content: `"星星"的"星"的韵母是（ ）。`,
    analysis: `"星"读 xīng，韵母是后鼻韵母 ing。`,
    difficulty: 1, semester: 1, chapterName: `13 ang eng ing ong`, kpNames: [`后鼻韵母 ang eng ing ong`],
    options: [
      { key: `A`, content: `in`, isCorrect: false },
      { key: `B`, content: `eng`, isCorrect: false },
      { key: `C`, content: `ing`, isCorrect: true },
      { key: `D`, content: `ong`, isCorrect: false }
    ],
  },
  { type: 3, content: `"ang、eng、ing、ong"都是后鼻韵母。`,
    analysis: `这四个韵母都以 ng 结尾，是后鼻韵母。`,
    difficulty: 2, semester: 1, chapterName: `13 ang eng ing ong`, kpNames: [`后鼻韵母 ang eng ing ong`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"红花"的"红"的韵母是（ ）。`,
    analysis: `"红"读 hóng，韵母是后鼻韵母 ong。`,
    difficulty: 1, semester: 1, chapterName: `13 ang eng ing ong`, kpNames: [`后鼻韵母 ang eng ing ong`],
    options: [
      { key: `A`, content: `eng`, isCorrect: false },
      { key: `B`, content: `ing`, isCorrect: false },
      { key: `C`, content: `ang`, isCorrect: false },
      { key: `D`, content: `ong`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个字的韵母是"ong"（ ）。`,
    analysis: `"钟"读 zhōng，韵母是 ong；"灯"是 eng，"星"是 ing，"帮"是 ang。`,
    difficulty: 3, semester: 1, chapterName: `13 ang eng ing ong`, kpNames: [`后鼻韵母 ang eng ing ong`],
    options: [
      { key: `A`, content: `钟`, isCorrect: true },
      { key: `B`, content: `灯`, isCorrect: false },
      { key: `C`, content: `星`, isCorrect: false },
      { key: `D`, content: `帮`, isCorrect: false }
    ],
  },
  { type: 1, content: `"yuan"是（ ）。`,
    analysis: `yuan 是整体认读音节，要整体记住，不用拼读。`,
    difficulty: 2, semester: 1, chapterName: `语文园地三`, kpNames: [`yi wu yu ye yue yuan yin yun ying`],
    options: [
      { key: `A`, content: `两拼音节`, isCorrect: false },
      { key: `B`, content: `整体认读音节`, isCorrect: true },
      { key: `C`, content: `三拼音节`, isCorrect: false },
      { key: `D`, content: `声母`, isCorrect: false }
    ],
  },
  { type: 3, content: `"ye、yue、yuan"都是整体认读音节。`,
    analysis: `ye、yue、yuan 都在整体认读音节表里。`,
    difficulty: 2, semester: 1, chapterName: `语文园地三`, kpNames: [`yi wu yu ye yue yuan yin yun ying`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个是三拼音节（ ）。`,
    analysis: `guo 由声母 g、介母 u、韵母 o 组成，是三拼音节。`,
    difficulty: 3, semester: 1, chapterName: `语文园地三`, kpNames: [`三拼音节拼读`],
    options: [
      { key: `A`, content: `ba`, isCorrect: false },
      { key: `B`, content: `mi`, isCorrect: false },
      { key: `C`, content: `guo`, isCorrect: true },
      { key: `D`, content: `hu`, isCorrect: false }
    ],
  },
  { type: 1, content: `"花"huā是三拼音节，中间的音是（ ）。`,
    analysis: `huā 由 h—u—ā 拼成，中间的 u 是介母。`,
    difficulty: 3, semester: 1, chapterName: `语文园地三`, kpNames: [`三拼音节拼读`],
    options: [
      { key: `A`, content: `a`, isCorrect: false },
      { key: `B`, content: `h`, isCorrect: false },
      { key: `C`, content: `没有`, isCorrect: false },
      { key: `D`, content: `u`, isCorrect: true }
    ],
  },
  { type: 1, content: `秋天到了，树叶有什么变化（ ）。`,
    analysis: `课文写"天气凉了，树叶黄了，一片片叶子从树上落下来"。`,
    difficulty: 1, semester: 1, chapterName: `1 秋天`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `黄了，一片片落下来`, isCorrect: true },
      { key: `B`, content: `变绿了`, isCorrect: false },
      { key: `C`, content: `开花了`, isCorrect: false },
      { key: `D`, content: `结冰了`, isCorrect: false }
    ],
  },
  { type: 1, content: `秋天，一群大雁往（ ）飞。`,
    analysis: `秋天天气变冷，大雁往南方飞去过冬。`,
    difficulty: 1, semester: 1, chapterName: `1 秋天`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `北`, isCorrect: false },
      { key: `B`, content: `南`, isCorrect: true },
      { key: `C`, content: `东`, isCorrect: false },
      { key: `D`, content: `西`, isCorrect: false }
    ],
  },
  { type: 1, content: `大雁飞行时，一会儿排成个"人"字，一会儿排成个（ ）字。`,
    analysis: `课文写大雁一会儿排成个"人"字，一会儿排成个"一"字。`,
    difficulty: 2, semester: 1, chapterName: `1 秋天`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `大`, isCorrect: false },
      { key: `B`, content: `十`, isCorrect: false },
      { key: `C`, content: `一`, isCorrect: true },
      { key: `D`, content: `口`, isCorrect: false }
    ],
  },
  { type: 3, content: `"秋天的天空又蓝又高。"`,
    analysis: `课文写"天空那么蓝，那么高"，说明秋天的天空又蓝又高。`,
    difficulty: 1, semester: 1, chapterName: `1 秋天`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文《秋天》中，"天气"变得（ ）。`,
    analysis: `课文开头就写"天气凉了"，秋天天气变凉爽了。`,
    difficulty: 1, semester: 1, chapterName: `1 秋天`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `热了`, isCorrect: false },
      { key: `B`, content: `暖了`, isCorrect: false },
      { key: `C`, content: `闷了`, isCorrect: false },
      { key: `D`, content: `凉了`, isCorrect: true }
    ],
  },
  { type: 1, content: `"一片片叶子从树上落下来"中，"一片片"说明叶子（ ）。`,
    analysis: `"一片片"表示数量多，不是只有一片。`,
    difficulty: 2, semester: 1, chapterName: `1 秋天`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `很多`, isCorrect: true },
      { key: `B`, content: `只有一片`, isCorrect: false },
      { key: `C`, content: `很小`, isCorrect: false },
      { key: `D`, content: `很绿`, isCorrect: false }
    ],
  },
  { type: 3, content: `大雁往南飞，是因为南方暖和。`,
    analysis: `北方冬天寒冷，大雁飞到暖和的南方过冬。`,
    difficulty: 2, semester: 1, chapterName: `1 秋天`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `《小小的船》中，弯弯的月儿像（ ）。`,
    analysis: `课文把弯弯的月儿比作小小的船。`,
    difficulty: 1, semester: 1, chapterName: `2 小小的船`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `大伞`, isCorrect: false },
      { key: `B`, content: `小船`, isCorrect: true },
      { key: `C`, content: `圆盘`, isCorrect: false },
      { key: `D`, content: `花朵`, isCorrect: false }
    ],
  },
  { type: 1, content: `"小小的船儿两头（ ）。"`,
    analysis: `课文原句是"小小的船儿两头尖"。`,
    difficulty: 1, semester: 1, chapterName: `2 小小的船`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `圆`, isCorrect: false },
      { key: `B`, content: `方`, isCorrect: false },
      { key: `C`, content: `尖`, isCorrect: true },
      { key: `D`, content: `平`, isCorrect: false }
    ],
  },
  { type: 3, content: `"我在小小的船里坐，看见了闪闪的星星和蓝蓝的天。"`,
    analysis: `这是课文原句的意思，小朋友想象自己坐在月亮船上看到星星和蓝天。`,
    difficulty: 2, semester: 1, chapterName: `2 小小的船`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"闪闪的星星"中，"闪闪"是说星星（ ）。`,
    analysis: `"闪闪"形容星星一亮一亮地发光。`,
    difficulty: 2, semester: 1, chapterName: `2 小小的船`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `很大`, isCorrect: false },
      { key: `B`, content: `很圆`, isCorrect: false },
      { key: `C`, content: `很热`, isCorrect: false },
      { key: `D`, content: `一亮一亮的`, isCorrect: true }
    ],
  },
  { type: 1, content: `课文把月儿比作小船，是因为月儿（ ）。`,
    analysis: `月儿弯弯的，形状像小船，所以这样比喻。`,
    difficulty: 2, semester: 1, chapterName: `2 小小的船`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `弯弯的`, isCorrect: true },
      { key: `B`, content: `圆圆的`, isCorrect: false },
      { key: `C`, content: `大大的`, isCorrect: false },
      { key: `D`, content: `红红的`, isCorrect: false }
    ],
  },
  { type: 1, content: `"蓝蓝的天"中，"蓝蓝的"是用来形容（ ）。`,
    analysis: `"蓝蓝的"写的是天空的颜色。`,
    difficulty: 1, semester: 1, chapterName: `2 小小的船`, kpNames: [`词语搭配`],
    options: [
      { key: `A`, content: `声音`, isCorrect: false },
      { key: `B`, content: `颜色`, isCorrect: true },
      { key: `C`, content: `味道`, isCorrect: false },
      { key: `D`, content: `形状`, isCorrect: false }
    ],
  },
  { type: 1, content: `《江南》中，"江南可采（ ）"。`,
    analysis: `诗句是"江南可采莲，莲叶何田田"。`,
    difficulty: 1, semester: 1, chapterName: `3 江南`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `桃`, isCorrect: false },
      { key: `B`, content: `花`, isCorrect: false },
      { key: `C`, content: `莲`, isCorrect: true },
      { key: `D`, content: `茶`, isCorrect: false }
    ],
  },
  { type: 1, content: `"莲叶何田田"中，"田田"形容莲叶（ ）。`,
    analysis: `"田田"形容莲叶又多又密，铺满水面。`,
    difficulty: 3, semester: 1, chapterName: `3 江南`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `又黄又枯`, isCorrect: false },
      { key: `B`, content: `又小又少`, isCorrect: false },
      { key: `C`, content: `又干又硬`, isCorrect: false },
      { key: `D`, content: `又多又密`, isCorrect: true }
    ],
  },
  { type: 1, content: `诗中鱼儿在莲叶间（ ）。`,
    analysis: `诗句"鱼戏莲叶间"写鱼儿在莲叶间游戏。`,
    difficulty: 1, semester: 1, chapterName: `3 江南`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `游戏`, isCorrect: true },
      { key: `B`, content: `睡觉`, isCorrect: false },
      { key: `C`, content: `唱歌`, isCorrect: false },
      { key: `D`, content: `飞翔`, isCorrect: false }
    ],
  },
  { type: 3, content: `"鱼戏莲叶东，鱼戏莲叶西"中的"东西"表示方向。`,
    analysis: `"东、西、南、北"都是方向词，这里写鱼儿四处游动。`,
    difficulty: 2, semester: 1, chapterName: `3 江南`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `《江南》是一首（ ）。`,
    analysis: `《江南》是汉乐府中的一首古诗。`,
    difficulty: 1, semester: 1, chapterName: `3 江南`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `儿歌`, isCorrect: false },
      { key: `B`, content: `古诗`, isCorrect: true },
      { key: `C`, content: `谜语`, isCorrect: false },
      { key: `D`, content: `故事`, isCorrect: false }
    ],
  },
  { type: 1, content: `诗中写了鱼戏莲叶的（ ）个方向。`,
    analysis: `诗中有东、西、南、北四个方向，共四个。`,
    difficulty: 2, semester: 1, chapterName: `3 江南`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `二`, isCorrect: false },
      { key: `B`, content: `三`, isCorrect: false },
      { key: `C`, content: `四`, isCorrect: true },
      { key: `D`, content: `五`, isCorrect: false }
    ],
  },
  { type: 1, content: `草芽尖尖，他对小鸟说："我是（ ）。"`,
    analysis: `课文写草芽尖尖，对小鸟说"我是春天"。`,
    difficulty: 1, semester: 1, chapterName: `4 四季`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `夏天`, isCorrect: false },
      { key: `B`, content: `秋天`, isCorrect: false },
      { key: `C`, content: `冬天`, isCorrect: false },
      { key: `D`, content: `春天`, isCorrect: true }
    ],
  },
  { type: 1, content: `荷叶圆圆，他对青蛙说："我是（ ）。"`,
    analysis: `课文写荷叶圆圆，对青蛙说"我是夏天"。`,
    difficulty: 1, semester: 1, chapterName: `4 四季`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `夏天`, isCorrect: true },
      { key: `B`, content: `春天`, isCorrect: false },
      { key: `C`, content: `秋天`, isCorrect: false },
      { key: `D`, content: `冬天`, isCorrect: false }
    ],
  },
  { type: 1, content: `谷穗弯弯，他鞠着躬说："我是（ ）。"`,
    analysis: `课文写谷穗弯弯，鞠着躬说"我是秋天"。`,
    difficulty: 1, semester: 1, chapterName: `4 四季`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `春天`, isCorrect: false },
      { key: `B`, content: `秋天`, isCorrect: true },
      { key: `C`, content: `夏天`, isCorrect: false },
      { key: `D`, content: `冬天`, isCorrect: false }
    ],
  },
  { type: 3, content: `雪人大肚子一挺，顽皮地说："我就是冬天。"`,
    analysis: `这是课文《四季》中冬天部分的原句。`,
    difficulty: 1, semester: 1, chapterName: `4 四季`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文《四季》写了（ ）个季节。`,
    analysis: `课文写了春、夏、秋、冬四个季节。`,
    difficulty: 1, semester: 1, chapterName: `4 四季`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `二`, isCorrect: false },
      { key: `B`, content: `三`, isCorrect: false },
      { key: `C`, content: `四`, isCorrect: true },
      { key: `D`, content: `五`, isCorrect: false }
    ],
  },
  { type: 1, content: `"谷穗弯弯"像在（ ）。`,
    analysis: `谷穗弯弯低着头，好像人在鞠躬，这里用了拟人的写法。`,
    difficulty: 2, semester: 1, chapterName: `4 四季`, kpNames: [`拟人`],
    options: [
      { key: `A`, content: `跳舞`, isCorrect: false },
      { key: `B`, content: `跑步`, isCorrect: false },
      { key: `C`, content: `唱歌`, isCorrect: false },
      { key: `D`, content: `鞠躬`, isCorrect: true }
    ],
  },
  { type: 1, content: `想和新同学做朋友，可以说（ ）。`,
    analysis: `主动、有礼貌地邀请别人一起玩，容易交到好朋友。`,
    difficulty: 1, semester: 1, chapterName: `口语交际：我们做朋友`, kpNames: [`自我介绍`],
    options: [
      { key: `A`, content: `"你好，我们一起玩吧！"`, isCorrect: true },
      { key: `B`, content: `"走开！"`, isCorrect: false },
      { key: `C`, content: `"我不理你。"`, isCorrect: false },
      { key: `D`, content: `"别碰我！"`, isCorrect: false }
    ],
  },
  { type: 3, content: `和同学说话时，要看着对方，有礼貌。`,
    analysis: `看着对方说话、使用礼貌用语，是与人交往的好习惯。`,
    difficulty: 1, semester: 1, chapterName: `口语交际：我们做朋友`, kpNames: [`简单日常对话`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"一年之计在于（ ），一日之计在于晨。"`,
    analysis: `这句话告诉我们春天是一年中最重要的开始，早晨是一天中最好的时光。`,
    difficulty: 2, semester: 1, chapterName: `语文园地四`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `夏`, isCorrect: false },
      { key: `B`, content: `春`, isCorrect: true },
      { key: `C`, content: `秋`, isCorrect: false },
      { key: `D`, content: `冬`, isCorrect: false }
    ],
  },
  { type: 1, content: `"一寸光阴一寸金，寸金难买寸（ ）。"`,
    analysis: `这句话说明时间非常宝贵，用金子也买不到。`,
    difficulty: 2, semester: 1, chapterName: `语文园地四`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `黄金`, isCorrect: false },
      { key: `B`, content: `田地`, isCorrect: false },
      { key: `C`, content: `光阴`, isCorrect: true },
      { key: `D`, content: `房子`, isCorrect: false }
    ],
  },
  { type: 3, content: `早晨是一天中最好的时光，要珍惜。`,
    analysis: `"一日之计在于晨"，早晨精神好，要好好利用。`,
    difficulty: 1, semester: 1, chapterName: `语文园地四`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `《画》中"远看山有色，近听水（ ）声。"`,
    analysis: `诗句是"远看山有色，近听水无声"，画中的水不会发出声音。`,
    difficulty: 2, semester: 1, chapterName: `6 画`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `有`, isCorrect: false },
      { key: `B`, content: `大`, isCorrect: false },
      { key: `C`, content: `小`, isCorrect: false },
      { key: `D`, content: `无`, isCorrect: true }
    ],
  },
  { type: 1, content: `"春去花还在，人来鸟不（ ）。"`,
    analysis: `诗句是"春去花还在，人来鸟不惊"，写出画中的花和鸟不会变化。`,
    difficulty: 2, semester: 1, chapterName: `6 画`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `惊`, isCorrect: true },
      { key: `B`, content: `飞`, isCorrect: false },
      { key: `C`, content: `叫`, isCorrect: false },
      { key: `D`, content: `走`, isCorrect: false }
    ],
  },
  { type: 1, content: `《画》写的是（ ）里的景色。`,
    analysis: `诗中的山水花鸟都在画里，所以写的是画中的景色。`,
    difficulty: 1, semester: 1, chapterName: `6 画`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `公园`, isCorrect: false },
      { key: `B`, content: `画`, isCorrect: true },
      { key: `C`, content: `学校`, isCorrect: false },
      { key: `D`, content: `田野`, isCorrect: false }
    ],
  },
  { type: 3, content: `"远看山有色，近听水无声"写的是画中的山水。`,
    analysis: `画中的山有颜色，画中的水却没有声音，所以写的是画。`,
    difficulty: 2, semester: 1, chapterName: `6 画`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"春去花还在"说明画上的花（ ）。`,
    analysis: `春天过去，画上的花还开着，说明画的花不会凋谢。`,
    difficulty: 2, semester: 1, chapterName: `6 画`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `会枯萎`, isCorrect: false },
      { key: `B`, content: `会变颜色`, isCorrect: false },
      { key: `C`, content: `不会凋谢`, isCorrect: true },
      { key: `D`, content: `会飞走`, isCorrect: false }
    ],
  },
  { type: 1, content: `《画》是一首（ ）。`,
    analysis: `这首诗每一句都在写画的特点，其实是一首谜语诗。`,
    difficulty: 2, semester: 1, chapterName: `6 画`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `故事`, isCorrect: false },
      { key: `B`, content: `儿歌`, isCorrect: false },
      { key: `C`, content: `童话`, isCorrect: false },
      { key: `D`, content: `谜语诗`, isCorrect: true }
    ],
  },
  { type: 1, content: `"一个大，一个小，一头黄牛一只（ ）。"`,
    analysis: `课文原句是"一头黄牛一只猫"。`,
    difficulty: 1, semester: 1, chapterName: `7 大小多少`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `猫`, isCorrect: true },
      { key: `B`, content: `狗`, isCorrect: false },
      { key: `C`, content: `鸟`, isCorrect: false },
      { key: `D`, content: `鸡`, isCorrect: false }
    ],
  },
  { type: 1, content: `"一边多，一边少，一群鸭子一只（ ）。"`,
    analysis: `课文原句是"一群鸭子一只鸟"。`,
    difficulty: 1, semester: 1, chapterName: `7 大小多少`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `猫`, isCorrect: false },
      { key: `B`, content: `鸟`, isCorrect: true },
      { key: `C`, content: `牛`, isCorrect: false },
      { key: `D`, content: `马`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文中，"一个苹果一颗（ ）"。`,
    analysis: `课文原句是"一个苹果一颗枣"。`,
    difficulty: 1, semester: 1, chapterName: `7 大小多少`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `桃`, isCorrect: false },
      { key: `B`, content: `梨`, isCorrect: false },
      { key: `C`, content: `枣`, isCorrect: true },
      { key: `D`, content: `杏`, isCorrect: false }
    ],
  },
  { type: 3, content: `"一堆杏子一个桃"中的"堆"和"个"都是量词。`,
    analysis: `"堆、个、只、头、群"都是表示事物单位的量词。`,
    difficulty: 2, semester: 1, chapterName: `7 大小多少`, kpNames: [`词语搭配`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面哪个词表示"多"（ ）。`,
    analysis: `"一群"表示数量多，和"一只、一个、一颗"表示的单个相对。`,
    difficulty: 2, semester: 1, chapterName: `7 大小多少`, kpNames: [`反义词`],
    options: [
      { key: `A`, content: `一只`, isCorrect: false },
      { key: `B`, content: `一个`, isCorrect: false },
      { key: `C`, content: `一颗`, isCorrect: false },
      { key: `D`, content: `一群`, isCorrect: true }
    ],
  },
  { type: 1, content: `课文《小书包》中，"宝贝"指的是（ ）。`,
    analysis: `课文把课本、作业本、铅笔、转笔刀等学习用品称为"宝贝"。`,
    difficulty: 2, semester: 1, chapterName: `8 小书包`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `学习用品`, isCorrect: true },
      { key: `B`, content: `玩具`, isCorrect: false },
      { key: `C`, content: `零食`, isCorrect: false },
      { key: `D`, content: `衣服`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面哪个是学习用品（ ）。`,
    analysis: `转笔刀用来削铅笔，是学习用品。`,
    difficulty: 1, semester: 1, chapterName: `8 小书包`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `饭碗`, isCorrect: false },
      { key: `B`, content: `转笔刀`, isCorrect: true },
      { key: `C`, content: `枕头`, isCorrect: false },
      { key: `D`, content: `拖鞋`, isCorrect: false }
    ],
  },
  { type: 3, content: `上课时，书包里的文具要摆放整齐。`,
    analysis: `文具摆放整齐，用的时候好找，也显得爱整洁。`,
    difficulty: 1, semester: 1, chapterName: `8 小书包`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"上课静悄悄"中，"静悄悄"是说（ ）。`,
    analysis: `"静悄悄"形容非常安静，没有一点吵闹声。`,
    difficulty: 2, semester: 1, chapterName: `8 小书包`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `很热闹`, isCorrect: false },
      { key: `B`, content: `很吵`, isCorrect: false },
      { key: `C`, content: `很安静`, isCorrect: true },
      { key: `D`, content: `很快`, isCorrect: false }
    ],
  },
  { type: 1, content: `"天天起得早，陪我去（ ）。"`,
    analysis: `课文原句是"天天起得早，陪我去学校"。`,
    difficulty: 1, semester: 1, chapterName: `8 小书包`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `公园`, isCorrect: false },
      { key: `B`, content: `商店`, isCorrect: false },
      { key: `C`, content: `医院`, isCorrect: false },
      { key: `D`, content: `学校`, isCorrect: true }
    ],
  },
  { type: 1, content: `"日月（ ）"，表示明亮。`,
    analysis: `"日"和"月"合在一起就是"明"，表示明亮。`,
    difficulty: 1, semester: 1, chapterName: `9 日月明`, kpNames: [`会意字`],
    options: [
      { key: `A`, content: `明`, isCorrect: true },
      { key: `B`, content: `朋`, isCorrect: false },
      { key: `C`, content: `晶`, isCorrect: false },
      { key: `D`, content: `光`, isCorrect: false }
    ],
  },
  { type: 1, content: `"田力（ ）"，表示在田里出力的人。`,
    analysis: `"田"和"力"合起来是"男"，古时候指在田里出力干活的人。`,
    difficulty: 1, semester: 1, chapterName: `9 日月明`, kpNames: [`会意字`],
    options: [
      { key: `A`, content: `女`, isCorrect: false },
      { key: `B`, content: `男`, isCorrect: true },
      { key: `C`, content: `力`, isCorrect: false },
      { key: `D`, content: `田`, isCorrect: false }
    ],
  },
  { type: 1, content: `"双木（ ），三木森。"`,
    analysis: `两个"木"是"林"，三个"木"是"森"，都表示树多。`,
    difficulty: 1, semester: 1, chapterName: `9 日月明`, kpNames: [`会意字`],
    options: [
      { key: `A`, content: `树`, isCorrect: false },
      { key: `B`, content: `木`, isCorrect: false },
      { key: `C`, content: `林`, isCorrect: true },
      { key: `D`, content: `森`, isCorrect: false }
    ],
  },
  { type: 3, content: `"二人从，三人众"中的"众"表示人很多。`,
    analysis: `三个人是"众"，"众"就是许多人。`,
    difficulty: 2, semester: 1, chapterName: `9 日月明`, kpNames: [`会意字`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"小土（ ）"表示很小的土，是"尘"字。`,
    analysis: `"小"和"土"合起来是"尘"，指细小的土。`,
    difficulty: 2, semester: 1, chapterName: `9 日月明`, kpNames: [`会意字`],
    options: [
      { key: `A`, content: `尖`, isCorrect: false },
      { key: `B`, content: `灰`, isCorrect: false },
      { key: `C`, content: `土`, isCorrect: false },
      { key: `D`, content: `尘`, isCorrect: true }
    ],
  },
  { type: 1, content: `我们的国旗是（ ）。`,
    analysis: `五星红旗是我国的国旗。`,
    difficulty: 1, semester: 1, chapterName: `10 升国旗`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `五星红旗`, isCorrect: true },
      { key: `B`, content: `队旗`, isCorrect: false },
      { key: `C`, content: `校旗`, isCorrect: false },
      { key: `D`, content: `彩旗`, isCorrect: false }
    ],
  },
  { type: 1, content: `升国旗时，我们应该（ ）。`,
    analysis: `升国旗时要立正、敬礼，表示对国旗的尊敬。`,
    difficulty: 1, semester: 1, chapterName: `10 升国旗`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `说话`, isCorrect: false },
      { key: `B`, content: `立正、敬礼`, isCorrect: true },
      { key: `C`, content: `走动`, isCorrect: false },
      { key: `D`, content: `坐下`, isCorrect: false }
    ],
  },
  { type: 3, content: `升国旗时要唱国歌。`,
    analysis: `升国旗、奏唱国歌时要立正敬礼，认真唱国歌。`,
    difficulty: 1, semester: 1, chapterName: `10 升国旗`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"国歌声中，国旗（ ）升起。"`,
    analysis: `课文原句是"国歌声中，徐徐升起"，"徐徐"是慢慢的意思。`,
    difficulty: 2, semester: 1, chapterName: `10 升国旗`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `快速`, isCorrect: false },
      { key: `B`, content: `突然`, isCorrect: false },
      { key: `C`, content: `徐徐`, isCorrect: true },
      { key: `D`, content: `慢慢落下`, isCorrect: false }
    ],
  },
  { type: 1, content: `"迎风飘扬，多么（ ）。"`,
    analysis: `课文原句是"迎风飘扬，多么美丽"。`,
    difficulty: 1, semester: 1, chapterName: `10 升国旗`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `难看`, isCorrect: false },
      { key: `B`, content: `安静`, isCorrect: false },
      { key: `C`, content: `寒冷`, isCorrect: false },
      { key: `D`, content: `美丽`, isCorrect: true }
    ],
  },
  { type: 1, content: `"锄禾日当午，汗滴禾下土"写的是农民（ ）辛苦。`,
    analysis: `这两句诗写农民在烈日下劳动，汗水滴进土里，非常辛苦。`,
    difficulty: 2, semester: 1, chapterName: `语文园地五`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `种田`, isCorrect: true },
      { key: `B`, content: `读书`, isCorrect: false },
      { key: `C`, content: `打鱼`, isCorrect: false },
      { key: `D`, content: `放牛`, isCorrect: false }
    ],
  },
  { type: 1, content: `"谁知盘中餐，粒粒皆（ ）。"`,
    analysis: `诗句是"谁知盘中餐，粒粒皆辛苦"，告诉我们要爱惜粮食。`,
    difficulty: 2, semester: 1, chapterName: `语文园地五`, kpNames: [`古诗背诵`],
    options: [
      { key: `A`, content: `香甜`, isCorrect: false },
      { key: `B`, content: `辛苦`, isCorrect: true },
      { key: `C`, content: `金黄`, isCorrect: false },
      { key: `D`, content: `饱满`, isCorrect: false }
    ],
  },
  { type: 3, content: `我们要爱惜粮食，不浪费。`,
    analysis: `粮食来得不容易，粒粒都是农民辛苦种出来的。`,
    difficulty: 1, semester: 1, chapterName: `语文园地五`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"粒粒皆辛苦"中的"皆"意思是（ ）。`,
    analysis: `"皆"就是"都"的意思，每一粒都来得辛苦。`,
    difficulty: 3, semester: 1, chapterName: `语文园地五`, kpNames: [`古诗理解`],
    options: [
      { key: `A`, content: `少`, isCorrect: false },
      { key: `B`, content: `一半`, isCorrect: false },
      { key: `C`, content: `都`, isCorrect: true },
      { key: `D`, content: `没有`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文中，影子像一条（ ）。`,
    analysis: `课文把影子比作一条小黑狗，很可爱。`,
    difficulty: 1, semester: 1, chapterName: `5 影子`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `小白兔`, isCorrect: false },
      { key: `B`, content: `小花猫`, isCorrect: false },
      { key: `C`, content: `小金鱼`, isCorrect: false },
      { key: `D`, content: `小黑狗`, isCorrect: true }
    ],
  },
  { type: 1, content: `影子常常跟着"我"，是因为（ ）。`,
    analysis: `有光照射到人身上，就会在地上留下影子，人走影子也跟着动。`,
    difficulty: 2, semester: 1, chapterName: `5 影子`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `有光照射`, isCorrect: true },
      { key: `B`, content: `它会走路`, isCorrect: false },
      { key: `C`, content: `它喜欢我`, isCorrect: false },
      { key: `D`, content: `它饿了`, isCorrect: false }
    ],
  },
  { type: 1, content: `"影子在前，影子在后"，说明影子在"我"的（ ）。`,
    analysis: `课文写影子一会儿在前，一会儿在后，前后都有。`,
    difficulty: 2, semester: 1, chapterName: `5 影子`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `只有前面`, isCorrect: false },
      { key: `B`, content: `前后都有`, isCorrect: true },
      { key: `C`, content: `只有后面`, isCorrect: false },
      { key: `D`, content: `头顶上`, isCorrect: false }
    ],
  },
  { type: 3, content: `"影子在左，影子在右，它是我的好朋友。"`,
    analysis: `这是课文中的句子，影子常常陪着"我"。`,
    difficulty: 1, semester: 1, chapterName: `5 影子`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `影子为什么会变来变去（ ）。`,
    analysis: `人走动或者光的方向改变，影子的位置也会跟着变化。`,
    difficulty: 3, semester: 1, chapterName: `5 影子`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `影子会跑`, isCorrect: false },
      { key: `B`, content: `影子和人说话`, isCorrect: false },
      { key: `C`, content: `人走动，光的方向变了`, isCorrect: true },
      { key: `D`, content: `影子怕黑`, isCorrect: false }
    ],
  },
  { type: 1, content: `"影子常常陪着我"中，"陪"的意思是（ ）。`,
    analysis: `"陪"就是陪伴，影子一直跟着"我"。`,
    difficulty: 2, semester: 1, chapterName: `5 影子`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `离开`, isCorrect: false },
      { key: `B`, content: `躲藏`, isCorrect: false },
      { key: `C`, content: `睡觉`, isCorrect: false },
      { key: `D`, content: `陪伴`, isCorrect: true }
    ],
  },
  { type: 1, content: `谁的尾巴长（ ）。`,
    analysis: `课文写"猴子的尾巴长"。`,
    difficulty: 1, semester: 1, chapterName: `6 比尾巴`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `猴子`, isCorrect: true },
      { key: `B`, content: `兔子`, isCorrect: false },
      { key: `C`, content: `鸭子`, isCorrect: false },
      { key: `D`, content: `公鸡`, isCorrect: false }
    ],
  },
  { type: 1, content: `谁的尾巴好像一把伞（ ）。`,
    analysis: `课文写"松鼠的尾巴好像一把伞"。`,
    difficulty: 1, semester: 1, chapterName: `6 比尾巴`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `猴子`, isCorrect: false },
      { key: `B`, content: `松鼠`, isCorrect: true },
      { key: `C`, content: `鸭子`, isCorrect: false },
      { key: `D`, content: `孔雀`, isCorrect: false }
    ],
  },
  { type: 1, content: `鸭子的尾巴（ ）。`,
    analysis: `课文写"鸭子的尾巴扁"。`,
    difficulty: 1, semester: 1, chapterName: `6 比尾巴`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `长`, isCorrect: false },
      { key: `B`, content: `弯`, isCorrect: false },
      { key: `C`, content: `扁`, isCorrect: true },
      { key: `D`, content: `短`, isCorrect: false }
    ],
  },
  { type: 3, content: `"孔雀的尾巴最好看。"`,
    analysis: `课文最后写"孔雀的尾巴最好看"。`,
    difficulty: 1, semester: 1, chapterName: `6 比尾巴`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `兔子的尾巴（ ）。`,
    analysis: `课文写"兔子的尾巴短"。`,
    difficulty: 1, semester: 1, chapterName: `6 比尾巴`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `长`, isCorrect: false },
      { key: `B`, content: `弯`, isCorrect: false },
      { key: `C`, content: `扁`, isCorrect: false },
      { key: `D`, content: `短`, isCorrect: true }
    ],
  },
  { type: 1, content: `青蛙写诗时，小蝌蚪要当（ ）。`,
    analysis: `小蝌蚪有圆圆的身子和小尾巴，像个小逗号。`,
    difficulty: 1, semester: 1, chapterName: `7 青蛙写诗`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `小逗号`, isCorrect: true },
      { key: `B`, content: `小句号`, isCorrect: false },
      { key: `C`, content: `省略号`, isCorrect: false },
      { key: `D`, content: `问号`, isCorrect: false }
    ],
  },
  { type: 1, content: `池塘里的水泡泡要当（ ）。`,
    analysis: `水泡泡圆圆的，像个小句号。`,
    difficulty: 1, semester: 1, chapterName: `7 青蛙写诗`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `小逗号`, isCorrect: false },
      { key: `B`, content: `小句号`, isCorrect: true },
      { key: `C`, content: `省略号`, isCorrect: false },
      { key: `D`, content: `感叹号`, isCorrect: false }
    ],
  },
  { type: 1, content: `荷叶上的一串水珠要当（ ）。`,
    analysis: `一串水珠连在一起，像省略号的六个点。`,
    difficulty: 2, semester: 1, chapterName: `7 青蛙写诗`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `句号`, isCorrect: false },
      { key: `B`, content: `逗号`, isCorrect: false },
      { key: `C`, content: `省略号`, isCorrect: true },
      { key: `D`, content: `问号`, isCorrect: false }
    ],
  },
  { type: 3, content: `青蛙的诗写成了"呱呱，呱呱，呱呱呱"。`,
    analysis: `课文最后青蛙的诗就是"呱呱，呱呱，呱呱呱"。`,
    difficulty: 1, semester: 1, chapterName: `7 青蛙写诗`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `小蝌蚪的样子像逗号，是因为它（ ）。`,
    analysis: `小蝌蚪有圆圆的身子和小尾巴，样子和逗号很像。`,
    difficulty: 2, semester: 1, chapterName: `7 青蛙写诗`, kpNames: [`比喻`],
    options: [
      { key: `A`, content: `会游泳`, isCorrect: false },
      { key: `B`, content: `是黑色的`, isCorrect: false },
      { key: `C`, content: `生活在水里`, isCorrect: false },
      { key: `D`, content: `有圆圆的身子和小尾巴`, isCorrect: true }
    ],
  }
];
