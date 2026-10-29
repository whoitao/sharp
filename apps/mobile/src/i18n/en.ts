import { formatCount } from '../utils/format';
import type { TranslationKeys } from './zh';

export const en: TranslationKeys = {
  // Navigation
  home: 'Home',
  study: 'Study',
  profile: 'Profile',

  // Settings
  settings: 'Settings',
  unitSize: 'Questions per Unit',
  unitSizeDesc: 'Set the number of questions for each practice session',
  theme: 'Theme',
  themeDesc: 'Choose the app appearance theme',
  language: 'Language',
  languageDesc: 'Choose the app display language',
  displayDensity: 'Display',
  displayDensityDesc: 'Control spacing and font size',
  densityCompact: 'Compact',
  densityComfortable: 'Standard',
  densitySpacious: 'Spacious',
  about: 'About',
  version: 'Version',
  appName: 'App Name',
  appNameValue: 'Sharp Smart Quiz',
  logout: 'Logout',
  logoutConfirm: 'Are you sure you want to logout?',
  cancel: 'Cancel',
  confirm: 'Confirm',

  // Theme options
  light: 'Light',
  dark: 'Dark',
  system: 'System',

  // Language options
  chinese: '中文',
  english: 'English',

  // Profile
  studyRecords: 'Study Records',
  wrongQuestions: 'Wrong Questions',

  // Home
  startLearning: 'Start Learning',
  selectCategory: 'Choose a category to start',
  noCategories: 'No categories yet',
  subjectQuestionCount: (num: number) => `${formatCount(num)} questions`,
  subjectProgressLabel: (num: number) => `${num}% learned`,
  homeContinueAction: 'Continue practice',
  homeSubjects: 'Subjects',
  homeSubjectCount: (num: number) => `${num} ${num === 1 ? 'subject' : 'subjects'}`,
  homeNoQuestions: 'No questions yet',
  homeStreak: (days: number) => `${days}-day streak`,
  homeDaily: 'Daily Challenge',
  homeReport: 'Study Report',

  // Study
  studySelectCategory: 'Select Category',
  studySelectSubject: 'Select Subject',
  studySelectKnowledgePoint: 'Select Knowledge Point',
  studySelectCategoryFirst: 'Please select a category first',
  studyNoUnits: 'No units for this filter',
  studySelectAllFilters: 'Select category, subject and knowledge point',

  // Common
  loading: 'Loading...',
  noData: 'No data',
  back: 'Back',
  minuteShort: 'm',
  secondShort: 's',
  monthDay: (month: number, day: number) => `${month}/${day}`,
  clockTime: (h: string, m: string) => `${h}:${m}`,

  // Nav titles
  quizResultTitle: 'Quiz Result',
  defaultUser: 'User',

  // Unit list (UnitItem)
  unitNumber: (num: number) => `Unit ${num}`,
  unitQuestionRange: (start: number, end: number, total: number) =>
    `Questions ${start} - ${end} · ${total} total`,
  unitAccuracy: 'Accuracy',
  statusNotStarted: 'Not started',
  statusInProgress: 'In progress',
  statusCompleted: 'Completed',

  // Study records
  recordsEmpty: 'No study records',
  recordsEmptySub: 'Records will appear here once you start',
  statQuestions: 'Questions',
  statCorrect: 'Correct',
  statWrong: 'Wrong',
  statDuration: 'Time',
  statTotal: 'Total',

  // Wrong questions
  wrongEmpty: 'No wrong questions',
  wrongEmptySub: 'Keep it up, mistakes will show here',
  analysis: 'Analysis',
  difficultyLabel: 'Difficulty: ',
  singleChoice: 'Single choice',
  multipleChoice: 'Multiple choice',

  // Quiz
  quit: 'Quit',
  quitQuizTitle: 'Quit Practice',
  quitQuizConfirm: 'Quit this session? Progress will not be saved.',
  quitConfirm: 'Quit',
  loadingQuestions: 'Loading questions...',
  submitAnswer: 'Submit Answer',
  selectedCount: (num: number) => ` (${num} selected)`,
  viewResult: 'View Result',
  nextQuestion: 'Next →',
  prevQuestion: '← Prev',
  swipeHint: '← Swipe left / right to switch →',
  studyAgain: 'Study again',
  studyAgainTitle: 'Study again',
  studyAgainConfirm: 'This clears the previous record for this unit and restarts from the first question.',
  studyAgainAction: 'Restart',
  previousStudy: 'Last attempt',
  previousStudyScore: (correct: number, total: number) => `${correct}/${total} correct`,
  previousStudyDuration: (duration: string) => `${duration} spent`,

  // Quiz result
  noResultData: 'No result data',
  accuracyRate: 'Accuracy',
  wrongReviewTitle: (num: number) => `Wrong Questions (${num})`,
  yourAnswer: 'Your answer:',
  correctAnswerLabel: 'Correct:',
  retry: 'Try Again',
  continueStudy: 'Continue',

  // Auth
  appTagline: 'Smart quizzes, efficient learning',
  alertTitle: 'Notice',
  retryLater: 'Please try again',
  username: 'Username',
  password: 'Password',
  usernamePlaceholder: 'Enter your username',
  passwordPlaceholder: 'Enter your password',
  loginButton: 'Sign In',
  loginFailed: 'Login failed',
  noAccount: 'No account? ',
  registerNow: 'Sign up',
  fillUsernamePassword: 'Enter username and password',
  createAccount: 'Create Account',
  startLearningJourney: 'Start your learning journey',
  confirmPassword: 'Confirm Password',
  passwordMinLengthPlaceholder: 'Enter password (min 6 chars)',
  confirmPasswordPlaceholder: 'Re-enter your password',
  passwordMismatch: 'Passwords do not match',
  passwordTooShort: 'Password must be at least 6 characters',
  registerButton: 'Sign Up',
  hasAccount: 'Have an account? ',
  registerFailed: 'Registration failed',
  backToLogin: 'Back to login',

  // Crash fallback
  crashTitle: 'Something went wrong',
  crashDesc: 'This part of the app failed to render. Other pages still work.',
  crashRetry: 'Retry',
  crashScope: 'Location',
  crashDetails: 'View details',
  crashHideDetails: 'Hide details',
  crashLogTitle: 'Crash logs',
  crashLogDesc: 'App exceptions are recorded here (up to 20 entries).',
  crashLogEmpty: 'No crash recorded',
  crashLogClear: 'Clear',
  crashLogClearConfirm: 'Clear all crash logs?',

  // Textbook
  textbookTitle: 'Textbooks',
  textbookMy: 'My Textbook',
  textbookNotSet: 'Not set',
  textbookSelectTitle: 'Select textbook',
  textbookEmpty: 'No textbook content yet. Chapters will appear once questions are added.',
  textbookNoChapters: 'No chapters in this textbook',
  textbookNoQuestions: 'No questions in this chapter',
  textbookUnitsEmpty: 'No units in this chapter',
  textbookChapterQuestions: (num: number) => `${formatCount(num)} questions`,
  textbookGrade: (level: number) => `Grade ${level}`,

  // Avatar
  editAvatar: 'Tap to change avatar',
  avatarUploading: 'Uploading avatar…',
  avatarUploadFailed: 'Avatar upload failed, please try again',
  avatarTooLarge: 'Avatar is larger than 1MB, pick another image',
  avatarPermission: 'Photo library permission is required to change the avatar',
};
