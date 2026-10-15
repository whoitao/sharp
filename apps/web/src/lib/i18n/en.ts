export const en = {
  nav: {
    home: "Home",
    docs: "Docs",
    about: "About",
    github: "GitHub",
  },
  common: {
    backHome: "Back to Home",
  },
  home: {
    heroPrefix: "Master Your Learning with",
    heroHighlight: "Sharp",
    heroSuffix: "",
    heroSubtitle:
      "A modern quiz and vocabulary learning platform. Track your progress, build streaks, and achieve your learning goals.",
    getStarted: "Get Started",
    learnMore: "Learn More",
    featuresTitle: "Features",
    featuresSubtitle: "Everything you need for effective learning",
    features: [
      {
        title: "Structured Learning",
        description:
          "Organized categories and units for systematic progress through your learning journey.",
      },
      {
        title: "Smart Practice",
        description:
          "Adaptive quizzes that focus on your weak areas and track your improvement over time.",
      },
      {
        title: "Progress Tracking",
        description:
          "Detailed statistics and streak tracking to keep you motivated and consistent.",
      },
      {
        title: "Cross-Platform",
        description:
          "Seamless experience across web and mobile with synchronized progress.",
      },
    ],
    ctaTitle: "Ready to Start Learning?",
    ctaSubtitle:
      "Join thousands of learners who are already using Sharp to achieve their goals.",
    ctaButton: "View Documentation",
  },
  about: {
    title: "About Sharp",
    subtitle: "A modern learning platform built with passion for education",
    missionTitle: "Our Mission",
    missionText:
      "Sharp is designed to make learning more effective and enjoyable. We believe that consistent practice, progress tracking, and smart feedback are the keys to mastering any subject. Whether you're preparing for exams, learning a new language, or expanding your vocabulary, Sharp provides the tools you need to succeed.",
    whyTitle: "Why Sharp?",
    whyItems: [
      {
        label: "Structured Content:",
        text: "Organized categories and units for systematic learning",
      },
      {
        label: "Progress Tracking:",
        text: "Detailed statistics and streak tracking to keep you motivated",
      },
      {
        label: "Smart Practice:",
        text: "Focus on weak areas with adaptive quizzes",
      },
      {
        label: "Cross-Platform:",
        text: "Seamless experience across web and mobile",
      },
      {
        label: "Open Source:",
        text: "Built with modern technologies, fully customizable",
      },
    ],
    builtTitle: "Built With",
    techItems: [
      { name: "Next.js 15", role: "Web Framework" },
      { name: "React 19.3", role: "UI Library" },
      { name: "React Native", role: "Mobile" },
      { name: "TypeScript", role: "Language" },
      { name: "Prisma", role: "ORM" },
      { name: "PostgreSQL", role: "Database" },
    ],
    contactTitle: "Get in Touch",
    contactText: "Have questions or suggestions? We'd love to hear from you.",
    contactButton: "Contact",
    footerA: "Made with",
    footerB: "by the Sharp team",
  },
  docs: {
    title: "Documentation",
    subtitle: "Learn how to use and contribute to Sharp",
    sections: [
      {
        title: "Tech Stack",
        description: "Modern technologies for full-stack development",
        content: `Backend:
• Next.js 15 with App Router
• Prisma ORM with PostgreSQL
• JWT authentication

Mobile:
• React Native 0.83 (Expo SDK 55)
• React Navigation v7
• Redux Toolkit v2

Web:
• Next.js 15
• React 19.3
• Tailwind CSS + shadcn/ui
• Redux Toolkit`,
      },
    ],
  },
  notFound: {
    title: "404",
    description: "The page you are looking for does not exist or has been moved.",
  },
};

export type Messages = typeof en;
