import type { Messages } from "./en";

export const zh: Messages = {
  nav: {
    home: "首页",
    docs: "文档",
    about: "关于",
    github: "GitHub",
  },
  common: {
    backHome: "返回首页",
  },
  home: {
    heroPrefix: "用",
    heroHighlight: "Sharp",
    heroSuffix: "掌握高效学习",
    heroSubtitle:
      "现代化的测验与词汇学习平台。追踪学习进度、连续打卡，实现你的学习目标。",
    getStarted: "立即开始",
    learnMore: "了解更多",
    featuresTitle: "功能特性",
    featuresSubtitle: "高效学习所需的一切",
    features: [
      {
        title: "结构化学习",
        description: "分类与单元体系化组织，让学习之旅循序渐进。",
      },
      {
        title: "智能练习",
        description: "自适应测验聚焦你的薄弱环节，持续追踪进步。",
      },
      {
        title: "进度追踪",
        description: "详尽统计与连续打卡记录，让你保持动力与自律。",
      },
      {
        title: "跨平台",
        description: "Web 与移动端无缝体验，学习进度实时同步。",
      },
    ],
    ctaTitle: "准备好开始学习了吗？",
    ctaSubtitle: "加入成千上万已在用 Sharp 实现目标的学习者。",
    ctaButton: "查看文档",
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
    builtTitle: "技术栈",
    techItems: [
      { name: "Next.js 15", role: "Web 框架" },
      { name: "React 19.3", role: "UI 库" },
      { name: "React Native", role: "移动端" },
      { name: "TypeScript", role: "开发语言" },
      { name: "Prisma", role: "ORM" },
      { name: "PostgreSQL", role: "数据库" },
    ],
    contactTitle: "联系我们",
    contactText: "有问题或建议？我们期待你的反馈。",
    contactButton: "联系",
    footerA: "由 Sharp 团队用",
    footerB: "打造",
  },
  docs: {
    title: "文档",
    subtitle: "了解如何使用 Sharp 并参与贡献",
    sections: [
      {
        title: "技术栈",
        description: "全栈开发的现代技术选型",
        content: `后端：
• Next.js 15（App Router）
• Prisma ORM + PostgreSQL
• JWT 认证

移动端：
• React Native 0.83（Expo SDK 55）
• React Navigation v7
• Redux Toolkit v2

Web：
• Next.js 15
• React 19.3
• Tailwind CSS + shadcn/ui
• Redux Toolkit`,
      },
    ],
  },
  notFound: {
    title: "404",
    description: "您访问的页面不存在或已被移动。",
  },
};
