export type RawOption = {
  key: string;          // A/B/C/D/E
  content: string;
  isCorrect: boolean;
};

export type RawQuestion = {
  /** 1=单选 2=多选 3=判断 4=填空 */
  type: number;
  content: string;
  analysis?: string;
  difficulty?: number;   // 1-5
  score?: number;
  /** 用章节名匹配（优先 L2 节，没匹配到再 L1 单元） */
  chapterName?: string;
  /** 教材学期（1=上册 2=下册），用于区分跨册重名章节，如「语文园地一」 */
  semester?: 1 | 2;
  /** 知识点名称，脚本动态查 id */
  kpNames?: string[];
  options: RawOption[];
};
