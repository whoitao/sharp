import type { Messages } from "./en";

export const zh: Messages = {
  nav: {
    home: "首页",
    docs: "使用指南",
    about: "关于",
    github: "GitHub",
    articles: "文章",
  },
  common: {
    backHome: "返回首页",
  },
  home: {
    heroPrefix: "按单元、按知识点，",
    heroHighlight: "精准掌握",
    heroSuffix: "每一课",
    heroSubtitle: "覆盖小学到高中、多版本教材，练习即时批改。",
    getStarted: "立即开始",
    learnMore: "了解学习方式",
    pathsTitle: "选择你的学习方式",
    pathsSubtitle:
      "按教材单元同步学，锁定一个知识点专项突破，或自由选择练习范围。",
    paths: [
      {
        title: "按单元学",
        description:
          "跟着教材章节同步推进。选教材、选单元，逐节练习，学完即测，单元掌握情况一目了然。",
      },
      {
        title: "按知识点学",
        description:
          "拆到最小知识单元。围绕单一知识点集中练习，哪里薄弱补哪里，避免无效刷题。",
      },
      {
        title: "自由题库练习",
        description:
          "按学段、年级、科目自由选择范围。支持单选、多选、判断、填空，随时开始一场针对性练习。",
      },
    ],
    advantagesTitle: "不只是刷题，更是精准把控",
    advantagesSubtitle:
      "每次练习都有记录，正确率与用时按章节、知识点汇总，下一步练什么有依据。",
    advantages: [
      {
        title: "精准把控",
        description: "正确率、用时按章节与知识点汇总。",
      },
      {
        title: "全学段覆盖",
        description: "小学、初中、高中全贯通。",
      },
      {
        title: "多版本教材",
        description: "跟随你正在使用的教材版本。",
      },
      {
        title: "跨端同步",
        description: "手机练习，Web 管理，记录实时同步。",
      },
    ],
    ctaTitle: "从今天的第一道题开始",
    ctaSubtitle:
      "选好教材与单元，或直接锁定一个知识点，开始你的第一次精准练习。",
    ctaButton: "查看使用指南",
  },
  about: {
    title: "关于 Sharp",
    subtitle: "一个以教育热情构建的现代化学习平台",
    missionTitle: "我们的使命",
    missionText:
      "Sharp 旨在让学习更高效、更有趣。我们相信，持续练习、进度追踪与智能反馈是掌握任何学科的关键。无论你是在备考、学习新语言，还是扩充词汇量，Sharp 都能为你提供成功所需的工具。",
    whyTitle: "为什么选择 Sharp？",
    whyItems: [
      { label: "结构化内容：", text: "分类与单元体系化组织，学习更系统" },
      { label: "进度追踪：", text: "详尽统计与连续打卡，让你保持动力" },
      { label: "智能练习：", text: "自适应测验专注薄弱环节" },
      { label: "跨平台：", text: "Web 与移动端无缝体验" },
      { label: "开源：", text: "基于现代技术构建，完全可定制" },
    ],
    contactTitle: "联系我们",
    contactText: "有问题或建议？我们期待你的反馈。",
    contactButton: "联系",
    footerA: "由 Sharp 团队用",
    footerB: "打造",
  },
  docs: {
    title: "使用指南",
    subtitle: "从注册到看懂学习统计，四步上手 Sharp",
    sections: [
      {
        title: "快速开始",
        description: "注册账号，选好你的教材。",
        steps: [
          "注册并登录账号",
          "选择我的教材",
          "按单元学或按知识点学",
        ],
      },
      {
        title: "按单元学",
        description: "跟着你实际使用的教材，逐章逐节推进。",
        steps: [
          "选择教材版本",
          "选择章与所属单元",
          "逐节开始练习，完成后即时批改",
        ],
      },
      {
        title: "按知识点学",
        description: "一次只聚焦一个知识点，专项突破。",
        steps: [
          "在科目下定位知识点",
          "针对该知识点开始专项练习",
          "做完查看解析与正确率",
        ],
      },
      {
        title: "看懂学习统计",
        description: "用正确率、用时与维度汇总，安排下一次练习。",
        steps: [
          "在每日趋势中查看练习量",
          "按章节、知识点查看掌握情况",
          "针对正确率低的范围安排下一次练习",
        ],
      },
    ],
  },
  notFound: {
    title: "404",
    description: "您访问的页面不存在或已被移动。",
  },
  articles: {
    title: "文章",
    subtitle: "产品动态、学习指南与备考技巧",
    empty: "暂无已发布的文章。",
    backToList: "返回文章列表",
  },
};
