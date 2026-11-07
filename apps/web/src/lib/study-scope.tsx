"use client";

import { subscribeSession } from "@/lib/auth/client";
import { fetchGrades, fetchSubjects, type GradeDto, type SubjectDto } from "@/lib/learn/api";
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
  signedIn: boolean;
  grades: GradeDto[];
  subjects: SubjectDto[];
  gradeId: string | null;
  subjectId: string | null;
  saving: boolean;
  saveFailed: boolean;
  setGrade: (id: string | null) => void;
  setSubject: (id: string | null) => void;
  clear: () => void;
  /** 选教材时服务端已同步年级/科目，这里只同步前端状态 */
  syncFromTextbook: (textbook: { gradeId: string; subjectId: string }) => void;
}

const StudyScopeContext = createContext<StudyScopeValue | null>(null);

/**
 * 全局学习范围（年级 / 科目）：与移动端一致，存到账号设置里，
 * 导航栏选择器与教材列表共用同一份状态。
 */
export function StudyScopeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const aliveRef = useRef(true);

  const load = useCallback(() => {
    setReady(false);
    fetchSessionProfile()
      .then(async (profile) => {
        if (!aliveRef.current) return;
        if (!profile) {
          setSignedIn(false);
          setGradeId(null);
          setSubjectId(null);
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
      })
      .catch(() => {
        /* 字典或设置读取失败时保持未选状态，不影响页面其它内容 */
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

  const syncFromTextbook = useCallback(
    (textbook: { gradeId: string; subjectId: string }) => {
      setGradeId(textbook.gradeId);
      setSubjectId(textbook.subjectId);
    },
    [],
  );

  const value = useMemo<StudyScopeValue>(
    () => ({
      ready,
      signedIn,
      grades,
      subjects,
      gradeId,
      subjectId,
      saving,
      saveFailed,
      setGrade,
      setSubject,
      clear,
      syncFromTextbook,
    }),
    [
      clear,
      gradeId,
      grades,
      ready,
      saveFailed,
      saving,
      setGrade,
      setSubject,
      signedIn,
      subjectId,
      subjects,
      syncFromTextbook,
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
