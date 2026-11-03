import type { Messages } from "./en";

export const zh: Messages = {
  nav: {
    home: "首页",
    docs: "使用指南",
    about: "关于",
    github: "GitHub",
    articles: "新闻中心",
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
    subtitle: "从选教材到看懂解析，跟着截图一步步上手。",
    sections: [
      {
        title: "快速开始",
        description: "注册账号，选好正在使用的教材。",
        steps: [
          "注册并登录账号",
          "在「我的教材」选择学段、年级与科目",
          "勾选正在使用的教材版本",
        ],
      },
      {
        title: "按单元学",
        description: "跟着教材章节，逐单元推进。",
        steps: [
          "在「学习」页切换到「按章节学」",
          "依次选择章、节，进入单元列表",
          "按单元开始练习，进度与题量一目了然",
        ],
      },
      {
        title: "按知识点学",
        description: "沿知识点树定位，一次专注一个点。",
        steps: [
          "切换到「按知识点学」",
          "沿知识点树逐层展开（如 数式 → 实数）",
          "进入该知识点的单元列表开始练习",
        ],
      },
      {
        title: "查看练习结果",
        description: "提交后立即看到本次表现。",
        steps: [
          "查看正确率、正确题数、错误题数与总用时",
          "错题按题号汇总在「错题回顾」中，默认折叠",
          "点击任意错题展开详情",
        ],
      },
      {
        title: "看懂错题解析",
        description: "对照答案，跟着详解复盘每一步。",
        steps: [
          "展开错题，对比你的答案与正确答案",
          "阅读【分析】与【详解】中的解题过程",
          "选择「再练一次」或「继续学习」",
        ],
      },
      {
        title: "看懂学习统计",
        description: "用正确率、用时与维度汇总，安排下一次练习。",
        steps: [
          "查看今日答题、学习次数与今日用时",
          "按时间、章节或知识点切换视图",
          "按已学进度与正确率安排下一次练习",
        ],
      },
    ],
  },
  notFound: {
    title: "404",
    description: "您访问的页面不存在或已被移动。",
  },
  articles: {
    title: "新闻中心",
    subtitle: "产品动态、学习指南与备考技巧",
    all: "全部",
    empty: "暂无已发布的新闻。",
  },
};
