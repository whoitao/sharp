import type { RawQuestion } from "./types";

// ────────────────────────────────────────────────
// 人教版一年级语文（上册）Part 1：100 道
// 覆盖：我上学了 / 识字（一） / 汉语拼音（前 10 课）
// ────────────────────────────────────────────────

export const grade1ChinesePart1: RawQuestion[] = [
  { type: 3, content: `我们的祖国是中国，我们都是中国人。`,
    analysis: `课文告诉我们，中国是我们的祖国，五十六个民族的小朋友都是中国人。`,
    difficulty: 1, semester: 1, chapterName: `我是中国人`, kpNames: [`感受课文情感`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `我们国家的国旗是（ ）。`,
    analysis: `五星红旗是中华人民共和国的国旗，我们要爱护国旗。`,
    difficulty: 1, semester: 1, chapterName: `我是中国人`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `五星红旗`, isCorrect: true },
      { key: `B`, content: `太阳旗`, isCorrect: false },
      { key: `C`, content: `星条旗`, isCorrect: false },
      { key: `D`, content: `米字旗`, isCorrect: false }
    ],
  },
  { type: 1, content: `天安门在我国的首都（ ）。`,
    analysis: `天安门在北京，北京是我国的首都。`,
    difficulty: 1, semester: 1, chapterName: `我是中国人`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `上海`, isCorrect: false },
      { key: `B`, content: `北京`, isCorrect: true },
      { key: `C`, content: `广州`, isCorrect: false },
      { key: `D`, content: `南京`, isCorrect: false }
    ],
  },
  { type: 1, content: `我国一共有（ ）个民族。`,
    analysis: `我国是一个多民族的国家，共有五十六个民族。`,
    difficulty: 2, semester: 1, chapterName: `我是中国人`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `五十五`, isCorrect: false },
      { key: `B`, content: `五十`, isCorrect: false },
      { key: `C`, content: `五十六`, isCorrect: true },
      { key: `D`, content: `六十`, isCorrect: false }
    ],
  },
  { type: 1, content: `上课时，我们应该（ ）。`,
    analysis: `上课要认真听讲，不做小动作，这样才能学到知识。`,
    difficulty: 1, semester: 1, chapterName: `我是小学生`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `随便说话`, isCorrect: false },
      { key: `B`, content: `玩玩具`, isCorrect: false },
      { key: `C`, content: `跑来跑去`, isCorrect: false },
      { key: `D`, content: `认真听讲`, isCorrect: true }
    ],
  },
  { type: 3, content: `上课时，有问题可以大声喊叫。`,
    analysis: `上课有问题应该先举手，得到老师允许后再发言，不能大声喊叫。`,
    difficulty: 1, semester: 1, chapterName: `我是小学生`, kpNames: [`表达清楚完整`],
    options: [
      { key: `A`, content: `正确`, isCorrect: false },
      { key: `B`, content: `错误`, isCorrect: true }
    ],
  },
  { type: 1, content: `见到老师时，我们应该（ ）。`,
    analysis: `见到老师主动问好，是有礼貌的表现。`,
    difficulty: 1, semester: 1, chapterName: `我是小学生`, kpNames: [`简单日常对话`],
    options: [
      { key: `A`, content: `主动问好`, isCorrect: true },
      { key: `B`, content: `低头走开`, isCorrect: false },
      { key: `C`, content: `假装没看见`, isCorrect: false },
      { key: `D`, content: `大声喊叫`, isCorrect: false }
    ],
  },
  { type: 1, content: `上课想发言，应该先（ ）。`,
    analysis: `想发言要先举手，等老师同意后再站起来说。`,
    difficulty: 1, semester: 1, chapterName: `我是小学生`, kpNames: [`倾听与回应`],
    options: [
      { key: `A`, content: `站起来`, isCorrect: false },
      { key: `B`, content: `举手`, isCorrect: true },
      { key: `C`, content: `拍桌子`, isCorrect: false },
      { key: `D`, content: `离开座位`, isCorrect: false }
    ],
  },
  { type: 1, content: `语文课上，我们主要学习（ ）。`,
    analysis: `语文课学习认字、读书、写字，还学习说话和写话。`,
    difficulty: 1, semester: 1, chapterName: `我爱学语文`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `只学数数`, isCorrect: false },
      { key: `B`, content: `只学画画`, isCorrect: false },
      { key: `C`, content: `认字、读书、写字`, isCorrect: true },
      { key: `D`, content: `只学跑步`, isCorrect: false }
    ],
  },
  { type: 3, content: `读书写字时，眼睛离书本越近越好。`,
    analysis: `读书写字要保持正确的姿势，眼睛离书本一尺左右，太近容易近视。`,
    difficulty: 1, semester: 1, chapterName: `我爱学语文`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: true },
      { key: `B`, content: `正确`, isCorrect: false }
    ],
  },
  { type: 1, content: `写字时，正确的坐姿是（ ）。`,
    analysis: `写字要做到头正、身直、臂开、足安，这样字才写得好，身体也不累。`,
    difficulty: 1, semester: 1, chapterName: `我爱学语文`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `趴在桌子上`, isCorrect: false },
      { key: `B`, content: `歪着头写字`, isCorrect: false },
      { key: `C`, content: `站着写字`, isCorrect: false },
      { key: `D`, content: `头正、身直、臂开、足安`, isCorrect: true }
    ],
  },
  { type: 1, content: `学习语文可以让我们（ ）。`,
    analysis: `学好语文，我们就能认识很多字，读懂有趣的故事。`,
    difficulty: 1, semester: 1, chapterName: `我爱学语文`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `认识很多字，读懂故事`, isCorrect: true },
      { key: `B`, content: `只会唱歌`, isCorrect: false },
      { key: `C`, content: `只会数数`, isCorrect: false },
      { key: `D`, content: `只会画画`, isCorrect: false }
    ],
  },
  { type: 1, content: `"天"的反义词是（ ）。`,
    analysis: `"天"和"地"意思相对，是一对反义词。`,
    difficulty: 1, semester: 1, chapterName: `1 天地人`, kpNames: [`反义词`],
    options: [
      { key: `A`, content: `人`, isCorrect: false },
      { key: `B`, content: `地`, isCorrect: true },
      { key: `C`, content: `你`, isCorrect: false },
      { key: `D`, content: `我`, isCorrect: false }
    ],
  },
  { type: 1, content: `"人"字一共有（ ）笔。`,
    analysis: `"人"字先写撇，再写捺，一共两笔。`,
    difficulty: 1, semester: 1, chapterName: `1 天地人`, kpNames: [`基本笔画`],
    options: [
      { key: `A`, content: `一`, isCorrect: false },
      { key: `B`, content: `三`, isCorrect: false },
      { key: `C`, content: `两`, isCorrect: true },
      { key: `D`, content: `四`, isCorrect: false }
    ],
  },
  { type: 3, content: `"你、我、他"都是表示人的称呼。`,
    analysis: `"你、我、他"都是人称代词，用来称呼人。`,
    difficulty: 1, semester: 1, chapterName: `1 天地人`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `称呼自己的时候用（ ）。`,
    analysis: `说话时称自己用"我"，称对方用"你"，称别人用"他"。`,
    difficulty: 1, semester: 1, chapterName: `1 天地人`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `你`, isCorrect: false },
      { key: `B`, content: `他`, isCorrect: false },
      { key: `C`, content: `她`, isCorrect: false },
      { key: `D`, content: `我`, isCorrect: true }
    ],
  },
  { type: 1, content: `选字填空："蓝蓝的（ ）上飘着白云。"`,
    analysis: `白云飘在天空中，所以填"天"。`,
    difficulty: 2, semester: 1, chapterName: `1 天地人`, kpNames: [`词语搭配`],
    options: [
      { key: `A`, content: `天`, isCorrect: true },
      { key: `B`, content: `地`, isCorrect: false },
      { key: `C`, content: `水`, isCorrect: false },
      { key: `D`, content: `火`, isCorrect: false }
    ],
  },
  { type: 3, content: `"地"字的第一笔是横。`,
    analysis: `"地"是左右结构，左边是提土旁，第一笔是横。`,
    difficulty: 2, semester: 1, chapterName: `1 天地人`, kpNames: [`笔顺书写规则`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"一二三四五，金木水火土"中，一共有（ ）种事物。`,
    analysis: `金、木、水、火、土是五种事物。`,
    difficulty: 1, semester: 1, chapterName: `2 金木水火土`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `三`, isCorrect: false },
      { key: `B`, content: `五`, isCorrect: true },
      { key: `C`, content: `四`, isCorrect: false },
      { key: `D`, content: `六`, isCorrect: false }
    ],
  },
  { type: 1, content: `"日月照今古"中的"日月"指的是（ ）。`,
    analysis: `"日"是太阳，"月"是月亮，"日月"就是太阳和月亮。`,
    difficulty: 1, semester: 1, chapterName: `2 金木水火土`, kpNames: [`词语在语境中的意思`],
    options: [
      { key: `A`, content: `天和地`, isCorrect: false },
      { key: `B`, content: `山和水`, isCorrect: false },
      { key: `C`, content: `太阳和月亮`, isCorrect: true },
      { key: `D`, content: `人和动物`, isCorrect: false }
    ],
  },
  { type: 1, content: `数字"三"后面的数是（ ）。`,
    analysis: `按顺序数：一、二、三、四，三后面是四。`,
    difficulty: 1, semester: 1, chapterName: `2 金木水火土`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `二`, isCorrect: false },
      { key: `B`, content: `五`, isCorrect: false },
      { key: `C`, content: `一`, isCorrect: false },
      { key: `D`, content: `四`, isCorrect: true }
    ],
  },
  { type: 3, content: `"金木水火土"中，"水"和"火"是一对反义词。`,
    analysis: `"水"和"火"是两种不同的事物，不是意思相对的词，所以不是反义词。`,
    difficulty: 2, semester: 1, chapterName: `2 金木水火土`, kpNames: [`反义词`],
    options: [
      { key: `A`, content: `正确`, isCorrect: false },
      { key: `B`, content: `错误`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个字表示"树木"（ ）。`,
    analysis: `"木"就是树的意思，看到"木"字旁的字大多和树木有关。`,
    difficulty: 1, semester: 1, chapterName: `2 金木水火土`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `木`, isCorrect: true },
      { key: `B`, content: `水`, isCorrect: false },
      { key: `C`, content: `火`, isCorrect: false },
      { key: `D`, content: `土`, isCorrect: false }
    ],
  },
  { type: 1, content: `"日"这个字表示（ ）。`,
    analysis: `"日"是象形字，古时候写成太阳的样子，表示太阳。`,
    difficulty: 1, semester: 1, chapterName: `2 金木水火土`, kpNames: [`象形字`],
    options: [
      { key: `A`, content: `月亮`, isCorrect: false },
      { key: `B`, content: `太阳`, isCorrect: true },
      { key: `C`, content: `星星`, isCorrect: false },
      { key: `D`, content: `云朵`, isCorrect: false }
    ],
  },
  { type: 1, content: `我们用来听声音的是（ ）。`,
    analysis: `"耳"是耳朵，耳朵用来听声音。`,
    difficulty: 1, semester: 1, chapterName: `3 口耳目`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `口`, isCorrect: false },
      { key: `B`, content: `目`, isCorrect: false },
      { key: `C`, content: `耳`, isCorrect: true },
      { key: `D`, content: `手`, isCorrect: false }
    ],
  },
  { type: 1, content: `"站如松，坐如钟"告诉我们站和坐要（ ）。`,
    analysis: `像松树一样挺直站立，像钟一样稳稳坐好，就是要求姿势端正。`,
    difficulty: 1, semester: 1, chapterName: `3 口耳目`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `随便`, isCorrect: false },
      { key: `B`, content: `歪斜`, isCorrect: false },
      { key: `C`, content: `弯腰`, isCorrect: false },
      { key: `D`, content: `端正`, isCorrect: true }
    ],
  },
  { type: 3, content: `"口"就是嘴巴。`,
    analysis: `"口"是象形字，形状像张开的嘴，就是嘴巴。`,
    difficulty: 1, semester: 1, chapterName: `3 口耳目`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面哪个字和"看"有关（ ）。`,
    analysis: `"目"就是眼睛，眼睛用来看东西。`,
    difficulty: 1, semester: 1, chapterName: `3 口耳目`, kpNames: [`象形字`],
    options: [
      { key: `A`, content: `目`, isCorrect: true },
      { key: `B`, content: `口`, isCorrect: false },
      { key: `C`, content: `耳`, isCorrect: false },
      { key: `D`, content: `足`, isCorrect: false }
    ],
  },
  { type: 1, content: `"日、月、水、火"这些字都是（ ）。`,
    analysis: `这些字都是照着事物的样子画出来的，叫象形字。`,
    difficulty: 2, semester: 1, chapterName: `4 日月水火`, kpNames: [`象形字`],
    options: [
      { key: `A`, content: `形声字`, isCorrect: false },
      { key: `B`, content: `象形字`, isCorrect: true },
      { key: `C`, content: `多音字`, isCorrect: false },
      { key: `D`, content: `同音字`, isCorrect: false }
    ],
  },
  { type: 3, content: `"山"字的样子像高高低低的山峰。`,
    analysis: `"山"是象形字，中间高两边低，像连绵的山峰。`,
    difficulty: 1, semester: 1, chapterName: `4 日月水火`, kpNames: [`象形字`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个字像一块块田地的样子（ ）。`,
    analysis: `"田"字像一个方方的田块，中间有田埂，是象形字。`,
    difficulty: 1, semester: 1, chapterName: `4 日月水火`, kpNames: [`象形字`],
    options: [
      { key: `A`, content: `石`, isCorrect: false },
      { key: `B`, content: `禾`, isCorrect: false },
      { key: `C`, content: `田`, isCorrect: true },
      { key: `D`, content: `火`, isCorrect: false }
    ],
  },
  { type: 1, content: `"禾"字表示（ ）。`,
    analysis: `"禾"像一株成熟的庄稼，表示禾苗。`,
    difficulty: 1, semester: 1, chapterName: `4 日月水火`, kpNames: [`词语的本义`],
    options: [
      { key: `A`, content: `石头`, isCorrect: false },
      { key: `B`, content: `大山`, isCorrect: false },
      { key: `C`, content: `河水`, isCorrect: false },
      { key: `D`, content: `禾苗`, isCorrect: true }
    ],
  },
  { type: 1, content: `"云对雨，雪对风"，"云"对的是（ ）。`,
    analysis: `课文第一句就是"云对雨，雪对风"，云和雨相对。`,
    difficulty: 1, semester: 1, chapterName: `5 对韵歌`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `雨`, isCorrect: true },
      { key: `B`, content: `风`, isCorrect: false },
      { key: `C`, content: `雪`, isCorrect: false },
      { key: `D`, content: `花`, isCorrect: false }
    ],
  },
  { type: 1, content: `"山清对水秀，柳绿对桃红"中，"柳绿"对的是（ ）。`,
    analysis: `"柳绿"和"桃红"相对，一个写颜色，一个写花，读起来很整齐。`,
    difficulty: 2, semester: 1, chapterName: `5 对韵歌`, kpNames: [`词语搭配`],
    options: [
      { key: `A`, content: `山清`, isCorrect: false },
      { key: `B`, content: `桃红`, isCorrect: true },
      { key: `C`, content: `水秀`, isCorrect: false },
      { key: `D`, content: `花红`, isCorrect: false }
    ],
  },
  { type: 3, content: `"花对树，鸟对虫"是一组相对的词。`,
    analysis: `课文中有"花对树，鸟对虫"，前后两两相对。`,
    difficulty: 1, semester: 1, chapterName: `5 对韵歌`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `课文中和"鸟"相对的是（ ）。`,
    analysis: `"鸟对虫"是课文中的原句，鸟和虫相对。`,
    difficulty: 1, semester: 1, chapterName: `5 对韵歌`, kpNames: [`提取主要信息`],
    options: [
      { key: `A`, content: `花`, isCorrect: false },
      { key: `B`, content: `树`, isCorrect: false },
      { key: `C`, content: `虫`, isCorrect: true },
      { key: `D`, content: `云`, isCorrect: false }
    ],
  },
  { type: 1, content: `老师说"请你摸摸左耳朵"，小朋友应该（ ）。`,
    analysis: `口语交际时要听清楚老师的要求，再照着做。`,
    difficulty: 1, semester: 1, chapterName: `口语交际：我说你做`, kpNames: [`倾听与回应`],
    options: [
      { key: `A`, content: `站着不动`, isCorrect: false },
      { key: `B`, content: `大声哭`, isCorrect: false },
      { key: `C`, content: `跑出教室`, isCorrect: false },
      { key: `D`, content: `按老师说的做`, isCorrect: true }
    ],
  },
  { type: 3, content: `别人说话时，要认真听清楚再做。`,
    analysis: `认真倾听是口语交际的好习惯，听清楚才能做对。`,
    difficulty: 1, semester: 1, chapterName: `口语交际：我说你做`, kpNames: [`倾听与回应`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `谜语诗"一片两片三四片……飞入水中都不见"写的是（ ）。`,
    analysis: `雪花一片一片飘落，落到水里就化了，所以谜底是雪花。`,
    difficulty: 2, semester: 1, chapterName: `语文园地一`, kpNames: [`理解课文大意`],
    options: [
      { key: `A`, content: `雪花`, isCorrect: true },
      { key: `B`, content: `树叶`, isCorrect: false },
      { key: `C`, content: `花瓣`, isCorrect: false },
      { key: `D`, content: `纸片`, isCorrect: false }
    ],
  },
  { type: 1, content: `数字"七"后面的数是（ ）。`,
    analysis: `按顺序数：六、七、八，七后面是八。`,
    difficulty: 1, semester: 1, chapterName: `语文园地一`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `六`, isCorrect: false },
      { key: `B`, content: `八`, isCorrect: true },
      { key: `C`, content: `九`, isCorrect: false },
      { key: `D`, content: `十`, isCorrect: false }
    ],
  },
  { type: 3, content: `"十"比"九"大。`,
    analysis: `按数字顺序，九后面是十，十比九多一。`,
    difficulty: 1, semester: 1, chapterName: `语文园地一`, kpNames: [`课文背诵`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面哪个字读"shǒu"（ ）。`,
    analysis: `"手"读 shǒu，和"口、足、目"的读音不同。`,
    difficulty: 2, semester: 1, chapterName: `语文园地一`, kpNames: [`同音字与近音字`],
    options: [
      { key: `A`, content: `口`, isCorrect: false },
      { key: `B`, content: `足`, isCorrect: false },
      { key: `C`, content: `手`, isCorrect: true },
      { key: `D`, content: `目`, isCorrect: false }
    ],
  },
  { type: 1, content: `读书时遇到不认识的字，可以（ ）。`,
    analysis: `遇到不认识的字，可以问老师、问同学，也可以查字典。`,
    difficulty: 1, semester: 1, chapterName: `快乐读书吧`, kpNames: [`部首查字法`],
    options: [
      { key: `A`, content: `跳过去不看`, isCorrect: false },
      { key: `B`, content: `把书撕掉`, isCorrect: false },
      { key: `C`, content: `大声哭`, isCorrect: false },
      { key: `D`, content: `问老师或查字典`, isCorrect: true }
    ],
  },
  { type: 3, content: `每天坚持读书，可以认识更多的字。`,
    analysis: `坚持阅读能积累识字量，还能增长知识。`,
    difficulty: 1, semester: 1, chapterName: `快乐读书吧`, kpNames: [`联系生活实际理解`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `单韵母"a"发音时，嘴巴要（ ）。`,
    analysis: `发"a"时嘴巴张大，舌头放平，声音响亮。`,
    difficulty: 1, semester: 1, chapterName: `1 a o e`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `张大`, isCorrect: true },
      { key: `B`, content: `闭紧`, isCorrect: false },
      { key: `C`, content: `撮圆`, isCorrect: false },
      { key: `D`, content: `咧开`, isCorrect: false }
    ],
  },
  { type: 1, content: `单韵母"o"读作（ ）。`,
    analysis: `"o"发音时嘴唇圆圆的，读"喔"。`,
    difficulty: 1, semester: 1, chapterName: `1 a o e`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `鹅`, isCorrect: false },
      { key: `B`, content: `喔`, isCorrect: true },
      { key: `C`, content: `衣`, isCorrect: false },
      { key: `D`, content: `乌`, isCorrect: false }
    ],
  },
  { type: 3, content: `"e"是单韵母。`,
    analysis: `a、o、e 都是单韵母。`,
    difficulty: 1, semester: 1, chapterName: `1 a o e`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面全是单韵母的一组是（ ）。`,
    analysis: `a、o、e 都是单韵母；b p m 是声母，ai ei ui 是复韵母，zh ch sh 是声母。`,
    difficulty: 2, semester: 1, chapterName: `1 a o e`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `b p m`, isCorrect: false },
      { key: `B`, content: `ai ei ui`, isCorrect: false },
      { key: `C`, content: `a o e`, isCorrect: true },
      { key: `D`, content: `zh ch sh`, isCorrect: false }
    ],
  },
  { type: 1, content: `"阿姨"的"阿"的韵母是（ ）。`,
    analysis: `"阿"读 ā，韵母是单韵母 a。`,
    difficulty: 1, semester: 1, chapterName: `1 a o e`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `o`, isCorrect: false },
      { key: `B`, content: `e`, isCorrect: false },
      { key: `C`, content: `i`, isCorrect: false },
      { key: `D`, content: `a`, isCorrect: true }
    ],
  },
  { type: 1, content: `给"a"标第三声，正确的是（ ）。`,
    analysis: `第三声的符号是"ˇ"，标在 a 上就是 ǎ。`,
    difficulty: 2, semester: 1, chapterName: `1 a o e`, kpNames: [`声调与标调规则`],
    options: [
      { key: `A`, content: `ǎ`, isCorrect: true },
      { key: `B`, content: `ā`, isCorrect: false },
      { key: `C`, content: `á`, isCorrect: false },
      { key: `D`, content: `à`, isCorrect: false }
    ],
  },
  { type: 1, content: `单韵母"ü"上面有（ ）。`,
    analysis: `"ü"和"u"不同，"ü"上面有两点。`,
    difficulty: 1, semester: 1, chapterName: `2 i u ü y w`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `一横`, isCorrect: false },
      { key: `B`, content: `两点`, isCorrect: true },
      { key: `C`, content: `一撇`, isCorrect: false },
      { key: `D`, content: `没有变化`, isCorrect: false }
    ],
  },
  { type: 3, content: `"i"标声调时，要先去掉上面的点。`,
    analysis: `"i"上面有小点，标调时去掉点，声调符号写在点的位置。`,
    difficulty: 2, semester: 1, chapterName: `2 i u ü y w`, kpNames: [`声调与标调规则`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"衣服"的"衣"的韵母是（ ）。`,
    analysis: `"衣"读 yī，韵母是单韵母 i。`,
    difficulty: 1, semester: 1, chapterName: `2 i u ü y w`, kpNames: [`单韵母 a o e i u ü`],
    options: [
      { key: `A`, content: `u`, isCorrect: false },
      { key: `B`, content: `ü`, isCorrect: false },
      { key: `C`, content: `i`, isCorrect: true },
      { key: `D`, content: `a`, isCorrect: false }
    ],
  },
  { type: 1, content: `"乌鸦"的"乌"读音是（ ）。`,
    analysis: `"乌"读 wū，是整体认读音节 wu 的第一声。`,
    difficulty: 2, semester: 1, chapterName: `2 i u ü y w`, kpNames: [`yi wu yu ye yue yuan yin yun ying`],
    options: [
      { key: `A`, content: `yī`, isCorrect: false },
      { key: `B`, content: `yú`, isCorrect: false },
      { key: `C`, content: `wǔ`, isCorrect: false },
      { key: `D`, content: `wū`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个是整体认读音节（ ）。`,
    analysis: `yi 是整体认读音节，要整体记住，不用拼读；ba、ma、lu 都是两拼音节。`,
    difficulty: 2, semester: 1, chapterName: `2 i u ü y w`, kpNames: [`yi wu yu ye yue yuan yin yun ying`],
    options: [
      { key: `A`, content: `yi`, isCorrect: true },
      { key: `B`, content: `ba`, isCorrect: false },
      { key: `C`, content: `ma`, isCorrect: false },
      { key: `D`, content: `lu`, isCorrect: false }
    ],
  },
  { type: 3, content: `"y"和"w"都是声母。`,
    analysis: `y 和 w 是声母，可以和韵母组成音节。`,
    difficulty: 2, semester: 1, chapterName: `2 i u ü y w`, kpNames: [`隔音符号 y w 的用法`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"爸爸"的"爸"的声母是（ ）。`,
    analysis: `"爸"读 bà，声母是 b。`,
    difficulty: 1, semester: 1, chapterName: `3 b p m f`, kpNames: [`双唇音 b p m`],
    options: [
      { key: `A`, content: `p`, isCorrect: false },
      { key: `B`, content: `b`, isCorrect: true },
      { key: `C`, content: `m`, isCorrect: false },
      { key: `D`, content: `f`, isCorrect: false }
    ],
  },
  { type: 1, content: `"妈妈"的"妈"的声母是（ ）。`,
    analysis: `"妈"读 mā，声母是 m。`,
    difficulty: 1, semester: 1, chapterName: `3 b p m f`, kpNames: [`双唇音 b p m`],
    options: [
      { key: `A`, content: `b`, isCorrect: false },
      { key: `B`, content: `p`, isCorrect: false },
      { key: `C`, content: `m`, isCorrect: true },
      { key: `D`, content: `f`, isCorrect: false }
    ],
  },
  { type: 1, content: `"婆婆"的"婆"的声母是（ ）。`,
    analysis: `"婆"读 pó，声母是 p。`,
    difficulty: 1, semester: 1, chapterName: `3 b p m f`, kpNames: [`双唇音 b p m`],
    options: [
      { key: `A`, content: `b`, isCorrect: false },
      { key: `B`, content: `m`, isCorrect: false },
      { key: `C`, content: `f`, isCorrect: false },
      { key: `D`, content: `p`, isCorrect: true }
    ],
  },
  { type: 3, content: `"f"是唇齿音。`,
    analysis: `发 f 时上齿轻轻接触下唇，所以叫唇齿音。`,
    difficulty: 2, semester: 1, chapterName: `3 b p m f`, kpNames: [`唇齿音 f`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面全是双唇音的一组是（ ）。`,
    analysis: `b、p、m 发音时上下嘴唇接触，都是双唇音。`,
    difficulty: 2, semester: 1, chapterName: `3 b p m f`, kpNames: [`双唇音 b p m`],
    options: [
      { key: `A`, content: `b p m`, isCorrect: true },
      { key: `B`, content: `d t n`, isCorrect: false },
      { key: `C`, content: `g k h`, isCorrect: false },
      { key: `D`, content: `j q x`, isCorrect: false }
    ],
  },
  { type: 1, content: `"飞机"的"飞"的声母是（ ）。`,
    analysis: `"飞"读 fēi，声母是 f。`,
    difficulty: 1, semester: 1, chapterName: `3 b p m f`, kpNames: [`唇齿音 f`],
    options: [
      { key: `A`, content: `b`, isCorrect: false },
      { key: `B`, content: `f`, isCorrect: true },
      { key: `C`, content: `p`, isCorrect: false },
      { key: `D`, content: `m`, isCorrect: false }
    ],
  },
  { type: 1, content: `"弟弟"的"弟"的声母是（ ）。`,
    analysis: `"弟"读 dì，声母是 d。`,
    difficulty: 1, semester: 1, chapterName: `4 d t n l`, kpNames: [`舌尖中音 d t n l`],
    options: [
      { key: `A`, content: `t`, isCorrect: false },
      { key: `B`, content: `n`, isCorrect: false },
      { key: `C`, content: `d`, isCorrect: true },
      { key: `D`, content: `l`, isCorrect: false }
    ],
  },
  { type: 1, content: `"兔子"的"兔"的声母是（ ）。`,
    analysis: `"兔"读 tù，声母是 t。`,
    difficulty: 1, semester: 1, chapterName: `4 d t n l`, kpNames: [`舌尖中音 d t n l`],
    options: [
      { key: `A`, content: `d`, isCorrect: false },
      { key: `B`, content: `n`, isCorrect: false },
      { key: `C`, content: `l`, isCorrect: false },
      { key: `D`, content: `t`, isCorrect: true }
    ],
  },
  { type: 3, content: `"n"和"l"都是舌尖中音。`,
    analysis: `d、t、n、l 发音时舌尖抵住上牙床，都是舌尖中音。`,
    difficulty: 2, semester: 1, chapterName: `4 d t n l`, kpNames: [`舌尖中音 d t n l`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"牛奶"的"牛"的声母是（ ）。`,
    analysis: `"牛"读 niú，声母是 n。`,
    difficulty: 1, semester: 1, chapterName: `4 d t n l`, kpNames: [`舌尖中音 d t n l`],
    options: [
      { key: `A`, content: `n`, isCorrect: true },
      { key: `B`, content: `d`, isCorrect: false },
      { key: `C`, content: `t`, isCorrect: false },
      { key: `D`, content: `l`, isCorrect: false }
    ],
  },
  { type: 1, content: `"老师"的"老"的声母是（ ）。`,
    analysis: `"老"读 lǎo，声母是 l。`,
    difficulty: 1, semester: 1, chapterName: `4 d t n l`, kpNames: [`舌尖中音 d t n l`],
    options: [
      { key: `A`, content: `d`, isCorrect: false },
      { key: `B`, content: `l`, isCorrect: true },
      { key: `C`, content: `t`, isCorrect: false },
      { key: `D`, content: `n`, isCorrect: false }
    ],
  },
  { type: 1, content: `"哥哥"的"哥"的声母是（ ）。`,
    analysis: `"哥"读 gē，声母是 g。`,
    difficulty: 1, semester: 1, chapterName: `5 g k h`, kpNames: [`舌根音 g k h`],
    options: [
      { key: `A`, content: `k`, isCorrect: false },
      { key: `B`, content: `h`, isCorrect: false },
      { key: `C`, content: `g`, isCorrect: true },
      { key: `D`, content: `j`, isCorrect: false }
    ],
  },
  { type: 1, content: `"裤子"的"裤"的声母是（ ）。`,
    analysis: `"裤"读 kù，声母是 k。`,
    difficulty: 1, semester: 1, chapterName: `5 g k h`, kpNames: [`舌根音 g k h`],
    options: [
      { key: `A`, content: `g`, isCorrect: false },
      { key: `B`, content: `h`, isCorrect: false },
      { key: `C`, content: `j`, isCorrect: false },
      { key: `D`, content: `k`, isCorrect: true }
    ],
  },
  { type: 1, content: `"花朵"的"花"的声母是（ ）。`,
    analysis: `"花"读 huā，声母是 h。`,
    difficulty: 1, semester: 1, chapterName: `5 g k h`, kpNames: [`舌根音 g k h`],
    options: [
      { key: `A`, content: `h`, isCorrect: true },
      { key: `B`, content: `g`, isCorrect: false },
      { key: `C`, content: `k`, isCorrect: false },
      { key: `D`, content: `j`, isCorrect: false }
    ],
  },
  { type: 3, content: `"g、k、h"都是舌根音。`,
    analysis: `g、k、h 发音部位在舌根，是舌根音。`,
    difficulty: 2, semester: 1, chapterName: `5 g k h`, kpNames: [`舌根音 g k h`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个字的声母是"h"（ ）。`,
    analysis: `"河"读 hé，声母是 h；"哥"是 g，"苦"是 k，"鸡"是 j。`,
    difficulty: 2, semester: 1, chapterName: `5 g k h`, kpNames: [`舌根音 g k h`],
    options: [
      { key: `A`, content: `哥`, isCorrect: false },
      { key: `B`, content: `河`, isCorrect: true },
      { key: `C`, content: `苦`, isCorrect: false },
      { key: `D`, content: `鸡`, isCorrect: false }
    ],
  },
  { type: 1, content: `"小鸡"的"鸡"的声母是（ ）。`,
    analysis: `"鸡"读 jī，声母是 j。`,
    difficulty: 1, semester: 1, chapterName: `6 j q x`, kpNames: [`舌面音 j q x`],
    options: [
      { key: `A`, content: `q`, isCorrect: false },
      { key: `B`, content: `x`, isCorrect: false },
      { key: `C`, content: `j`, isCorrect: true },
      { key: `D`, content: `z`, isCorrect: false }
    ],
  },
  { type: 1, content: `"气球"的"气"的声母是（ ）。`,
    analysis: `"气"读 qì，声母是 q。`,
    difficulty: 1, semester: 1, chapterName: `6 j q x`, kpNames: [`舌面音 j q x`],
    options: [
      { key: `A`, content: `j`, isCorrect: false },
      { key: `B`, content: `x`, isCorrect: false },
      { key: `C`, content: `z`, isCorrect: false },
      { key: `D`, content: `q`, isCorrect: true }
    ],
  },
  { type: 1, content: `"西瓜"的"西"的声母是（ ）。`,
    analysis: `"西"读 xī，声母是 x。`,
    difficulty: 1, semester: 1, chapterName: `6 j q x`, kpNames: [`舌面音 j q x`],
    options: [
      { key: `A`, content: `x`, isCorrect: true },
      { key: `B`, content: `j`, isCorrect: false },
      { key: `C`, content: `q`, isCorrect: false },
      { key: `D`, content: `z`, isCorrect: false }
    ],
  },
  { type: 3, content: `"j、q、x"和"ü"相拼时，"ü"上的两点要省略。`,
    analysis: `这是拼音规则：j、q、x 和 ü 相拼，ü 上两点去掉，写成 u。`,
    difficulty: 2, semester: 1, chapterName: `6 j q x`, kpNames: [`两拼音节拼读`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `音节"ju"中的"u"其实是（ ）。`,
    analysis: `j 和 ü 相拼写成 ju，这里的 u 实际读 ü。`,
    difficulty: 3, semester: 1, chapterName: `6 j q x`, kpNames: [`两拼音节拼读`],
    options: [
      { key: `A`, content: `u`, isCorrect: false },
      { key: `B`, content: `ü`, isCorrect: true },
      { key: `C`, content: `i`, isCorrect: false },
      { key: `D`, content: `a`, isCorrect: false }
    ],
  },
  { type: 1, content: `"写字"的"字"的声母是（ ）。`,
    analysis: `"字"读 zì，声母是 z。`,
    difficulty: 1, semester: 1, chapterName: `7 z c s`, kpNames: [`舌尖前音 z c s`],
    options: [
      { key: `A`, content: `c`, isCorrect: false },
      { key: `B`, content: `s`, isCorrect: false },
      { key: `C`, content: `z`, isCorrect: true },
      { key: `D`, content: `zh`, isCorrect: false }
    ],
  },
  { type: 1, content: `"草地"的"草"的声母是（ ）。`,
    analysis: `"草"读 cǎo，声母是 c。`,
    difficulty: 1, semester: 1, chapterName: `7 z c s`, kpNames: [`舌尖前音 z c s`],
    options: [
      { key: `A`, content: `z`, isCorrect: false },
      { key: `B`, content: `s`, isCorrect: false },
      { key: `C`, content: `ch`, isCorrect: false },
      { key: `D`, content: `c`, isCorrect: true }
    ],
  },
  { type: 1, content: `"四个"的"四"的声母是（ ）。`,
    analysis: `"四"读 sì，声母是 s。`,
    difficulty: 1, semester: 1, chapterName: `7 z c s`, kpNames: [`舌尖前音 z c s`],
    options: [
      { key: `A`, content: `s`, isCorrect: true },
      { key: `B`, content: `z`, isCorrect: false },
      { key: `C`, content: `c`, isCorrect: false },
      { key: `D`, content: `sh`, isCorrect: false }
    ],
  },
  { type: 3, content: `"zi、ci、si"都是整体认读音节。`,
    analysis: `zi、ci、si 要整体记住，是整体认读音节。`,
    difficulty: 2, semester: 1, chapterName: `7 z c s`, kpNames: [`zhi chi shi ri zi ci si`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个音节要整体认读，不能拼读（ ）。`,
    analysis: `si 是整体认读音节；sa、su、se 都是两拼音节。`,
    difficulty: 2, semester: 1, chapterName: `7 z c s`, kpNames: [`zhi chi shi ri zi ci si`],
    options: [
      { key: `A`, content: `sa`, isCorrect: false },
      { key: `B`, content: `si`, isCorrect: true },
      { key: `C`, content: `su`, isCorrect: false },
      { key: `D`, content: `se`, isCorrect: false }
    ],
  },
  { type: 1, content: `"竹子"的"竹"的声母是（ ）。`,
    analysis: `"竹"读 zhú，声母是 zh。`,
    difficulty: 1, semester: 1, chapterName: `8 zh ch sh r`, kpNames: [`舌尖后音 zh ch sh r`],
    options: [
      { key: `A`, content: `z`, isCorrect: false },
      { key: `B`, content: `ch`, isCorrect: false },
      { key: `C`, content: `zh`, isCorrect: true },
      { key: `D`, content: `sh`, isCorrect: false }
    ],
  },
  { type: 1, content: `"吃饭"的"吃"的声母是（ ）。`,
    analysis: `"吃"读 chī，声母是 ch。`,
    difficulty: 1, semester: 1, chapterName: `8 zh ch sh r`, kpNames: [`舌尖后音 zh ch sh r`],
    options: [
      { key: `A`, content: `zh`, isCorrect: false },
      { key: `B`, content: `sh`, isCorrect: false },
      { key: `C`, content: `r`, isCorrect: false },
      { key: `D`, content: `ch`, isCorrect: true }
    ],
  },
  { type: 1, content: `"狮子"的"狮"的声母是（ ）。`,
    analysis: `"狮"读 shī，声母是 sh。`,
    difficulty: 1, semester: 1, chapterName: `8 zh ch sh r`, kpNames: [`舌尖后音 zh ch sh r`],
    options: [
      { key: `A`, content: `sh`, isCorrect: true },
      { key: `B`, content: `zh`, isCorrect: false },
      { key: `C`, content: `ch`, isCorrect: false },
      { key: `D`, content: `r`, isCorrect: false }
    ],
  },
  { type: 3, content: `"r"是舌尖后音。`,
    analysis: `zh、ch、sh、r 都是舌尖后音。`,
    difficulty: 2, semester: 1, chapterName: `8 zh ch sh r`, kpNames: [`舌尖后音 zh ch sh r`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `"日出"的"日"读音是（ ）。`,
    analysis: `"日"读 rì，是整体认读音节 ri 的第四声。`,
    difficulty: 2, semester: 1, chapterName: `8 zh ch sh r`, kpNames: [`zhi chi shi ri zi ci si`],
    options: [
      { key: `A`, content: `yi`, isCorrect: false },
      { key: `B`, content: `ri`, isCorrect: true },
      { key: `C`, content: `chi`, isCorrect: false },
      { key: `D`, content: `zhi`, isCorrect: false }
    ],
  },
  { type: 1, content: `下面音节中，声母是"zh"的是（ ）。`,
    analysis: `"桌"读 zhuō，声母是 zh；"草"是 c，"山"是 sh，"鸟"是 n。`,
    difficulty: 2, semester: 1, chapterName: `语文园地二`, kpNames: [`舌尖后音 zh ch sh r`],
    options: [
      { key: `A`, content: `草 cǎo`, isCorrect: false },
      { key: `B`, content: `山 shān`, isCorrect: false },
      { key: `C`, content: `桌 zhuō`, isCorrect: true },
      { key: `D`, content: `鸟 niǎo`, isCorrect: false }
    ],
  },
  { type: 3, content: `"b"和"d"是两个不同的声母，不能写混。`,
    analysis: `b 和 d 形状相近但方向不同，读音也不同，要认真区分。`,
    difficulty: 2, semester: 1, chapterName: `语文园地二`, kpNames: [`形近字辨析`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"皮球"的"皮"的声母是（ ）。`,
    analysis: `"皮"读 pí，声母是 p。`,
    difficulty: 1, semester: 1, chapterName: `语文园地二`, kpNames: [`双唇音 b p m`],
    options: [
      { key: `A`, content: `b`, isCorrect: false },
      { key: `B`, content: `m`, isCorrect: false },
      { key: `C`, content: `f`, isCorrect: false },
      { key: `D`, content: `p`, isCorrect: true }
    ],
  },
  { type: 1, content: `"白菜"的"白"的韵母是（ ）。`,
    analysis: `"白"读 bái，韵母是复韵母 ai。`,
    difficulty: 1, semester: 1, chapterName: `9 ai ei ui`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ai`, isCorrect: true },
      { key: `B`, content: `ei`, isCorrect: false },
      { key: `C`, content: `ui`, isCorrect: false },
      { key: `D`, content: `ao`, isCorrect: false }
    ],
  },
  { type: 1, content: `"妹妹"的"妹"的韵母是（ ）。`,
    analysis: `"妹"读 mèi，韵母是复韵母 ei。`,
    difficulty: 1, semester: 1, chapterName: `9 ai ei ui`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ai`, isCorrect: false },
      { key: `B`, content: `ei`, isCorrect: true },
      { key: `C`, content: `ui`, isCorrect: false },
      { key: `D`, content: `ao`, isCorrect: false }
    ],
  },
  { type: 1, content: `"喝水"的"水"的韵母是（ ）。`,
    analysis: `"水"读 shuǐ，韵母是复韵母 ui。`,
    difficulty: 1, semester: 1, chapterName: `9 ai ei ui`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ai`, isCorrect: false },
      { key: `B`, content: `ei`, isCorrect: false },
      { key: `C`, content: `ui`, isCorrect: true },
      { key: `D`, content: `iu`, isCorrect: false }
    ],
  },
  { type: 3, content: `"ai、ei、ui"都是复韵母。`,
    analysis: `由两个或三个元音组成的韵母叫复韵母，ai、ei、ui 都是。`,
    difficulty: 2, semester: 1, chapterName: `9 ai ei ui`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `正确`, isCorrect: true },
      { key: `B`, content: `错误`, isCorrect: false }
    ],
  },
  { type: 1, content: `音节"ui"标声调时，声调符号标在（ ）上。`,
    analysis: `ui 标调标在后一个元音 i 上，如 huī、shuǐ。`,
    difficulty: 3, semester: 1, chapterName: `9 ai ei ui`, kpNames: [`声调与标调规则`],
    options: [
      { key: `A`, content: `u`, isCorrect: false },
      { key: `B`, content: `都不标`, isCorrect: false },
      { key: `C`, content: `两个都标`, isCorrect: false },
      { key: `D`, content: `i`, isCorrect: true }
    ],
  },
  { type: 1, content: `下面哪个词两个字的韵母都是"ai"（ ）。`,
    analysis: `"白"读 bái，"菜"读 cài，韵母都是 ai。`,
    difficulty: 3, semester: 1, chapterName: `9 ai ei ui`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `白菜`, isCorrect: true },
      { key: `B`, content: `妹妹`, isCorrect: false },
      { key: `C`, content: `喝水`, isCorrect: false },
      { key: `D`, content: `小鸟`, isCorrect: false }
    ],
  },
  { type: 1, content: `"小猫"的"猫"的韵母是（ ）。`,
    analysis: `"猫"读 māo，韵母是复韵母 ao。`,
    difficulty: 1, semester: 1, chapterName: `10 ao ou iu`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ou`, isCorrect: false },
      { key: `B`, content: `ao`, isCorrect: true },
      { key: `C`, content: `iu`, isCorrect: false },
      { key: `D`, content: `ai`, isCorrect: false }
    ],
  },
  { type: 1, content: `"小手"的"手"的韵母是（ ）。`,
    analysis: `"手"读 shǒu，韵母是复韵母 ou。`,
    difficulty: 1, semester: 1, chapterName: `10 ao ou iu`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ao`, isCorrect: false },
      { key: `B`, content: `iu`, isCorrect: false },
      { key: `C`, content: `ou`, isCorrect: true },
      { key: `D`, content: `ei`, isCorrect: false }
    ],
  },
  { type: 3, content: `"iu"是复韵母。`,
    analysis: `iu 由 i 和 u 组成，是复韵母。`,
    difficulty: 2, semester: 1, chapterName: `10 ao ou iu`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `错误`, isCorrect: false },
      { key: `B`, content: `正确`, isCorrect: true }
    ],
  },
  { type: 1, content: `"牛"的韵母是（ ）。`,
    analysis: `"牛"读 niú，韵母是复韵母 iu。`,
    difficulty: 1, semester: 1, chapterName: `10 ao ou iu`, kpNames: [`复韵母 ai ei ui ao ou iu ie üe er`],
    options: [
      { key: `A`, content: `ao`, isCorrect: false },
      { key: `B`, content: `ou`, isCorrect: false },
      { key: `C`, content: `ui`, isCorrect: false },
      { key: `D`, content: `iu`, isCorrect: true }
    ],
  }
];
