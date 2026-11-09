"use client";

import { subscribeSession } from "@/lib/auth/client";
import {
  fetchGrades,
  fetchSubjects,
  type GradeDto,
  type SubjectDto,
  type TextbookDto,
} from "@/lib/learn/api";
import {
  fetchSessionProfile,
  fetchSettings,
  updateSettings,
} from "@/lib/profile/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface StudyScopeValue {
  /** 是否已确定登录态与字典，避免导航栏先渲染占位再跳变 */
  ready: boolean;
  /** 设置读取失败：页面可据此展示重试，而不是误判为「未选教材」 */
  loadFailed: boolean;
  signedIn: boolean;
  grades: GradeDto[];
  subjects: SubjectDto[];
  gradeId: string | null;
  subjectId: string | null;
  /** 全局当前教材：胶囊、/learn 横幅与章节/知识点、我的教材页都从这里派生 */
  textbook: TextbookDto | null;
  saving: boolean;
  saveFailed: boolean;
  setGrade: (id: string | null) => void;
  setSubject: (id: string | null) => void;
  clear: () => void;
  /** 全局唯一写入点：提交 textbookId 并用服务端返回的最新教材刷新全局状态 */
  selectTextbook: (textbook: TextbookDto) => Promise<void>;
  /** 重新读取设置（失败重试 / 外部状态变化时使用） */
  reload: () => void;
}

const StudyScopeContext = createContext<StudyScopeValue | null>(null);

/**
 * 全局学习范围（年级 / 科目）：与移动端一致，存到账号设置里，
 * 导航栏选择器与教材列表共用同一份状态。
 */
export function StudyScopeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [textbook, setTextbook] = useState<TextbookDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const aliveRef = useRef(true);

  const load = useCallback(() => {
    setReady(false);
    setLoadFailed(false);
    fetchSessionProfile()
      .then(async (profile) => {
        if (!aliveRef.current) return;
        if (!profile) {
          setSignedIn(false);
          setGradeId(null);
          setSubjectId(null);
          setTextbook(null);
          return;
        }
        setSignedIn(true);
        const [gradeList, subjectList, settings] = await Promise.all([
          fetchGrades(),
          fetchSubjects(),
          fetchSettings(),
        ]);
        if (!aliveRef.current) return;
        setGrades(gradeList);
        setSubjects(subjectList);
        setGradeId(settings.gradeId);
        setSubjectId(settings.subjectId);
        setTextbook(settings.textbook);
      })
      .catch(() => {
        /* 字典或设置读取失败时保持未选状态，由 loadFailed 提示页面重试 */
        if (aliveRef.current) setLoadFailed(true);
      })
      .finally(() => {
        if (aliveRef.current) setReady(true);
      });
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    // 登录 / 退出后同步刷新
    const unsubscribe = subscribeSession(load);
    return () => {
      aliveRef.current = false;
      unsubscribe();
    };
  }, [load]);

  const persist = useCallback(
    async (
      patch: { gradeId?: string | null; subjectId?: string | null },
      revert: () => void,
    ) => {
      setSaveFailed(false);
      setSaving(true);
      try {
        await updateSettings(patch);
      } catch {
        revert();
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const setGrade = useCallback(
    (id: string | null) => {
      if (!signedIn) return;
      const previous = gradeId;
      setGradeId(id);
      void persist({ gradeId: id }, () => setGradeId(previous));
    },
    [gradeId, persist, signedIn],
  );

  const setSubject = useCallback(
    (id: string | null) => {
      if (!signedIn) return;
      const previous = subjectId;
      setSubjectId(id);
      void persist({ subjectId: id }, () => setSubjectId(previous));
    },
    [persist, signedIn, subjectId],
  );

  const clear = useCallback(() => {
    if (!signedIn) return;
    const previousGrade = gradeId;
    const previousSubject = subjectId;
    setGradeId(null);
    setSubjectId(null);
    void persist({ gradeId: null, subjectId: null }, () => {
      setGradeId(previousGrade);
      setSubjectId(previousSubject);
    });
  }, [gradeId, persist, signedIn, subjectId]);

  // 教材唯一写入点：先用已选教材快照即时更新全局状态，再用服务端回传的最新摘要校准
  const selectTextbook = useCallback(
    async (selected: TextbookDto) => {
      const previous = { gradeId, subjectId, textbook };
      setSaveFailed(false);
      setSaving(true);
      setGradeId(selected.gradeId);
      setSubjectId(selected.subjectId);
      setTextbook(selected);
      try {
        const settings = await updateSettings({ textbookId: selected.id });
        if (!aliveRef.current) return;
        setGradeId(settings.gradeId);
        setSubjectId(settings.subjectId);
        // 章节数 / 题数等统计以服务端最新结果为准，避免用目录里的旧快照
        setTextbook(settings.textbook ?? selected);
      } catch (error) {
        if (aliveRef.current) {
          setGradeId(previous.gradeId);
          setSubjectId(previous.subjectId);
          setTextbook(previous.textbook);
          setSaveFailed(true);
        }
        throw error;
      } finally {
        if (aliveRef.current) setSaving(false);
      }
    },
    [gradeId, subjectId, textbook],
  );

  // 年级/科目被单独改动后，旧教材不再属于当前范围：对外视为未选，避免横幅继续显示旧教材
  const currentTextbook = useMemo(
    () =>
      textbook &&
      gradeId &&
      subjectId &&
      textbook.gradeId === gradeId &&
      textbook.subjectId === subjectId
        ? textbook
        : null,
    [textbook, gradeId, subjectId],
  );

  const value = useMemo<StudyScopeValue>(
    () => ({
      ready,
      loadFailed,
      signedIn,
      grades,
      subjects,
      gradeId,
      subjectId,
      textbook: currentTextbook,
      saving,
      saveFailed,
      setGrade,
      setSubject,
      clear,
      selectTextbook,
      reload: load,
    }),
    [
      clear,
      currentTextbook,
      gradeId,
      grades,
      load,
      loadFailed,
      ready,
      saveFailed,
      saving,
      selectTextbook,
      setGrade,
      setSubject,
      signedIn,
      subjectId,
      subjects,
    ],
  );

  return (
    <StudyScopeContext.Provider value={value}>{children}</StudyScopeContext.Provider>
  );
}

export function useStudyScope(): StudyScopeValue {
  const value = useContext(StudyScopeContext);
  if (!value) {
    throw new Error("useStudyScope must be used within StudyScopeProvider");
  }
  return value;
}
