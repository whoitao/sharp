export const en = {
  nav: {
    home: "Home",
    docs: "Guide",
    about: "About",
    github: "GitHub",
    articles: "Articles",
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
      "From sign-up to reading your stats — four steps to get started with Sharp",
    sections: [
      {
        title: "Quick Start",
        description: "Create an account and choose your textbook.",
        steps: [
          "Create an account and sign in",
          "Choose my textbook",
          "Learn by unit or by knowledge point",
        ],
      },
      {
        title: "Learn by Unit",
        description: "Follow the textbook you actually use, chapter by chapter.",
        steps: [
          "Select your textbook edition",
          "Choose a chapter and its unit",
          "Practice unit by unit and get instant grading",
        ],
      },
      {
        title: "Learn by Knowledge Point",
        description: "Focus on one knowledge point at a time.",
        steps: [
          "Locate a knowledge point under the subject",
          "Start a focused session on that single point",
          "Review the analysis and your accuracy afterwards",
        ],
      },
      {
        title: "Read Your Stats",
        description: "Use accuracy, time, and breakdowns to plan the next step.",
        steps: [
          "Check daily practice volume in the trend view",
          "Review mastery by chapter and knowledge point",
          "Schedule your next practice around low-accuracy areas",
        ],
      },
    ],
  },
  notFound: {
    title: "404",
    description: "The page you are looking for does not exist or has been moved.",
  },
  articles: {
    title: "Articles",
    subtitle: "Product updates, learning guides and study tips",
    empty: "No articles published yet.",
    backToList: "Back to Articles",
  },
};

export type Messages = typeof en;
