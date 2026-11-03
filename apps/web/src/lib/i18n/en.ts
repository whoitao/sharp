export const en = {
  nav: {
    home: "Home",
    docs: "Guide",
    about: "About",
    github: "GitHub",
    articles: "News Center",
  },
  common: {
    backHome: "Back to Home",
  },
  home: {
    heroPrefix: "Learn by unit or knowledge point,",
    heroHighlight: "master",
    heroSuffix: "every lesson",
    heroSubtitle:
      "Primary to high school, across textbook editions, with instant grading.",
    getStarted: "Get Started",
    learnMore: "See How It Works",
    pathsTitle: "Choose Your Way to Learn",
    pathsSubtitle:
      "Study along textbook units, drill into a single knowledge point, or freely choose your practice range.",
    paths: [
      {
        title: "Learn by Unit",
        description:
          "Follow your textbook chapter by chapter. Pick a textbook, choose a unit, practice lesson by lesson, and test right after each one.",
      },
      {
        title: "Learn by Knowledge Point",
        description:
          "Break content down to the smallest unit. Focus on one knowledge point at a time and fix weak spots instead of grinding through random questions.",
      },
      {
        title: "Free Practice",
        description:
          "Pick any stage, grade, and subject. Single choice, multiple choice, true/false, and fill-in-the-blank — start a targeted session anytime.",
      },
    ],
    advantagesTitle: "More Than Practice — Precise Control",
    advantagesSubtitle:
      "Every session is recorded. Accuracy and time are summarized by chapter and knowledge point, so you always know what to practice next.",
    advantages: [
      {
        title: "Precision Tracking",
        description:
          "Accuracy and time summarized by chapter and knowledge point.",
      },
      {
        title: "All Stages Covered",
        description: "Primary, middle, and high school, end to end.",
      },
      {
        title: "Multiple Textbooks",
        description: "Follows the edition you actually use.",
      },
      {
        title: "Learn Anywhere",
        description: "Practice on mobile, manage on web, synced in real time.",
      },
    ],
    ctaTitle: "Start with Your First Question Today",
    ctaSubtitle:
      "Pick a textbook and unit, or lock onto one knowledge point, and begin your first focused practice.",
    ctaButton: "Read the Guide",
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
    contactTitle: "Get in Touch",
    contactText: "Have questions or suggestions? We'd love to hear from you.",
    contactButton: "Contact",
    footerA: "Made with",
    footerB: "by the Sharp team",
  },
  docs: {
    title: "Guide",
    subtitle:
      "From choosing a textbook to reading explanations — follow the screenshots step by step.",
    sections: [
      {
        title: "Quick Start",
        description: "Create an account and pick the textbook you actually use.",
        steps: [
          "Create an account and sign in",
          "Choose stage, grade, and subject in My Textbooks",
          "Tick the edition you are using",
        ],
      },
      {
        title: "Learn by Unit",
        description: "Move through chapters, unit by unit.",
        steps: [
          "Switch to “By Chapter” on the Study page",
          "Pick the chapter and section to open the unit list",
          "Practice a unit — progress and question count at a glance",
        ],
      },
      {
        title: "Learn by Knowledge Point",
        description: "Follow the knowledge tree and focus on one point at a time.",
        steps: [
          "Switch to “By Knowledge Point”",
          "Expand the tree level by level (e.g. Number → Real Numbers)",
          "Open the unit list for that point and start",
        ],
      },
      {
        title: "Check Your Results",
        description: "See how you did right after submitting.",
        steps: [
          "Review accuracy, correct/incorrect counts, and total time",
          "Wrong answers are grouped by number under Review (collapsed by default)",
          "Tap any wrong question to expand it",
        ],
      },
      {
        title: "Read Explanations",
        description: "Compare answers and go through each step.",
        steps: [
          "Expand a wrong question to compare your answer with the correct one",
          "Read the Analysis and Solution sections",
          "Choose “Practice Again” or “Continue Learning”",
        ],
      },
      {
        title: "Read Your Stats",
        description: "Use accuracy, time, and breakdowns to plan the next step.",
        steps: [
          "Review today's questions, sessions, and study time",
          "Switch views by time, chapter, or knowledge point",
          "Plan the next session by progress and accuracy",
        ],
      },
    ],
  },
  notFound: {
    title: "404",
    description: "The page you are looking for does not exist or has been moved.",
  },
  articles: {
    title: "News Center",
    subtitle: "Product updates, learning guides and study tips",
    all: "All",
    empty: "No news published yet.",
  },
};

export type Messages = typeof en;
