import { formatCount } from '../utils/format';

// 文案里的数字统一走 formatCount，中文和英文共用同一套千分位
export const zh = {
  // Navigation
  home: '首页',
  study: '学习',
  profile: '我的',

  // Settings
  settings: '设置',
  unitSize: '每单元题数',
  unitSizeDesc: '设置每次练习的题目数量',
  theme: '主题',
  themeDesc: '选择应用的外观主题',
  language: '语言',
  languageDesc: '选择应用显示语言',
  displayDensity: '展示效果',
  displayDensityDesc: '控制间距与字体大小',
  densityCompact: '紧凑',
  densityComfortable: '标准',
  densitySpacious: '舒展',
  about: '关于',
  version: '版本',
  appName: '应用名称',
  appNameValue: 'Sharp 智能刷题',
  logout: '退出登录',
  logoutConfirm: '确定要退出登录吗？',
  cancel: '取消',
  confirm: '确定',

  // Theme options
  light: '浅色',
  dark: '深色',
  system: '跟随系统',

  // Language options
  chinese: '中文',
  english: 'English',

  // Profile
  studyRecords: '学习记录',
  wrongQuestions: '错题本',

  // Home
  startLearning: '开始学习',
  selectCategory: '选择一个分类开始练习',
  noCategories: '暂无分类',
  subjectQuestionCount: (num: number) => `${formatCount(num)} 道题`,
  subjectProgressLabel: (num: number) => `已学 ${num}%`,
  homeContinueAction: '继续练习',
  homeSubjects: '学科',
  homeSubjectCount: (num: number) => `${num} 个`,
  homeNoQuestions: '暂无题目',
  homeStreak: (days: number) => `连续 ${days} 天`,
  homeDaily: '每日挑战',
  homeReport: '学习报告',

  // Study
  studySelectCategory: '选择分类',
  studySelectSubject: '选择科目',
  studySelectKnowledgePoint: '选择知识点',
  studySelectCategoryFirst: '请先选择分类',
  studyNoUnits: '该条件下暂无单元',
  studySelectAllFilters: '请同时选择分类、科目和知识点',

  // Common
  loading: '加载中...',
  noData: '暂无数据',
  back: '返回',
  minuteShort: '分',
  secondShort: '秒',
  monthDay: (month: number, day: number) => `${month}月${day}日`,
  clockTime: (h: string, m: string) => `${h}:${m}`,

  // Nav titles
  quizResultTitle: '练习结果',
  defaultUser: '用户',

  // Unit list (UnitItem)
  unitNumber: (num: number) => `第 ${num} 单元`,
  unitQuestionRange: (start: number, end: number, total: number) =>
    `${start} - ${end} 题 · 共 ${total} 题`,
  unitAccuracy: '正确率',
  statusNotStarted: '未开始',
  statusInProgress: '进行中',
  statusCompleted: '已完成',

  // Study records
  recordsEmpty: '暂无学习记录',
  recordsEmptySub: '开始学习后记录将显示在这里',
  statQuestions: '题目',
  statCorrect: '正确',
  statWrong: '错误',
  statDuration: '用时',
  statTotal: '总题数',

  // Wrong questions
  wrongEmpty: '暂无错题',
  wrongEmptySub: '继续保持，错题会显示在这里',
  analysis: '解析',
  difficultyLabel: '难度：',
  singleChoice: '单选题',
  multipleChoice: '多选题',

  // Quiz
  quit: '退出',
  quitQuizTitle: '退出练习',
  quitQuizConfirm: '确定要退出当前练习吗？进度将不会保存。',
  quitConfirm: '确定退出',
  loadingQuestions: '加载题目中...',
  submitAnswer: '提交答案',
  selectedCount: (num: number) => `（已选 ${num} 项）`,
  viewResult: '查看结果',
  nextQuestion: '下一题 →',
  prevQuestion: '← 上一题',
  swipeHint: '← 左右滑动切换题目 →',
  studyAgain: '再学一次',
  studyAgainTitle: '再学一次',
  studyAgainConfirm: '将清除本单元之前的学习记录，并从第一题重新开始。',
  studyAgainAction: '重新开始',
  previousStudy: '上次学习',
  previousStudyScore: (correct: number, total: number) => `正确 ${correct}/${total}`,
  previousStudyDuration: (duration: string) => `用时 ${duration}`,

  // Quiz result
  noResultData: '暂无结果数据',
  accuracyRate: '正确率',
  wrongReviewTitle: (num: number) => `错题回顾 (${num}题)`,
  yourAnswer: '你的答案：',
  correctAnswerLabel: '正确答案：',
  retry: '再练一次',
  continueStudy: '继续学习',

  // Auth
  appTagline: '智能刷题，高效学习',
  alertTitle: '提示',
  retryLater: '请重试',
  username: '用户名',
  password: '密码',
  usernamePlaceholder: '请输入用户名',
  passwordPlaceholder: '请输入密码',
  loginButton: '登 录',
  loginFailed: '登录失败',
  noAccount: '没有账号？ ',
  registerNow: '立即注册',
  fillUsernamePassword: '请输入用户名和密码',
  createAccount: '创建账号',
  startLearningJourney: '开始你的学习之旅',
  confirmPassword: '确认密码',
  passwordMinLengthPlaceholder: '请输入密码（至少6位）',
  confirmPasswordPlaceholder: '请再次输入密码',
  passwordMismatch: '两次输入的密码不一致',
  passwordTooShort: '密码长度不能少于6位',
  registerButton: '注 册',
  registerFailed: '注册失败',
  hasAccount: '已有账号？ ',
  backToLogin: '返回登录',

  // Crash fallback
  crashTitle: '界面出错了',
  crashDesc: '这一部分在渲染时发生异常，其它页面仍可正常使用。',
  crashRetry: '重试',
  crashScope: '出错位置',
  crashDetails: '查看详情',
  crashHideDetails: '收起详情',
  crashLogTitle: '崩溃日志',
  crashLogDesc: '应用出现异常时会记录在这里，最多保留 20 条。',
  crashLogEmpty: '暂无崩溃记录',
  crashLogClear: '清空',
  crashLogClearConfirm: '确定清空全部崩溃日志吗？',

  // Avatar
  editAvatar: '点击更换头像',
  avatarUploading: '正在上传头像…',
  avatarUploadFailed: '头像上传失败，请稍后重试',
  avatarTooLarge: '头像体积超过 1MB，请重新选择',
  avatarPermission: '需要相册权限才能更换头像',
};

export type TranslationKeys = typeof zh;

export type StringTranslationKey = {
  [K in keyof TranslationKeys]: TranslationKeys[K] extends string ? K : never;
}[keyof TranslationKeys];
