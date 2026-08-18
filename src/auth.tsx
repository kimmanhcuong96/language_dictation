import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LessonProgress, ProgressMap, TargetLanguage } from "./types";
import type { ListeningPreferences } from "./lib/listeningPreferences";

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  leaderboardVisible: boolean;
  isAdmin: boolean;
  listeningPreferences: ListeningPreferences;
  preferredTranslationLanguage: string;
}

export interface TranslationLanguageOption { code:string; name:string; nativeName:string; isBuiltin:boolean; machineTranslationEnabled:boolean; status:"PENDING"|"ACTIVE"|"DISABLED"; isOwner:boolean; approvedCount:number; sentenceCount:number; canContribute:boolean; }
export interface SentenceTranslation { id:string; sentenceId:string; text:string; source?:"GOOGLE"|"USER"|"ADMIN"; status?:string; updatedAt:string; }
export interface TranslationReviewItem { id:string; sentenceId:string; languageCode:string; text:string; source:string; status:string; createdAt:string; position:number; transcript:string; lessonId:string; lessonTitle:string; languageName:string; submittedBy:string|null; }
export interface TranslationSetReview { lessonId:string; lessonTitle:string; languageCode:string; languageName:string; machineTranslationEnabled:boolean; status:string; machineStatus:string; lastError:string|null; attemptCount:number; lessonActive:boolean; languageStatus:string; sentenceCount:number; readySentenceCount:number; rejectedSentenceCount:number; canApproveLesson:boolean; approvalBlockReason:"lesson_inactive"|"language_inactive"|"translation_set_empty"|"translation_set_rejected"|"translation_set_incomplete"|null; }

export interface ActivityEvent {
  eventId: string;
  lessonId: string;
  language: TargetLanguage;
  sentenceIndex: number;
  typedAnswer: string;
  durationSeconds: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  completed_sentences: number;
  active_seconds: number;
  points: number;
}

export interface AdminImportBatchItem {
  id: string;
  lessonName: string;
  slug: string | null;
  audioName: string | null;
  srtName: string | null;
  durationMs: number | null;
  segmentCount: number | null;
  status: "INVALID" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  errors: string[];
  errorMessage: string | null;
  lessonId: string | null;
  attemptCount: number;
  sortOrder: number;
}

export interface AdminImportBatch {
  id: string;
  input_method: "files" | "zip";
  level: string | null;
  status: "VALIDATED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
  confirmed_at: string | null;
  language_code: string;
  language_name: string;
  category_name: string;
  section_title: string;
  section_id: string;
  items: AdminImportBatchItem[];
  counts: { total:number; valid:number; invalid:number; queued:number; processing:number; completed:number; failed:number };
}

interface AuthContextValue {
  user: AccountUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  rename: (displayName: string) => Promise<void>;
  setLeaderboardVisible: (visible: boolean) => Promise<void>;
  recordActivity: (event: Omit<ActivityEvent, "eventId">) => Promise<void>;
  syncProgress: (local: ProgressMap, lessonLanguages: Record<string, TargetLanguage>) => Promise<ProgressMap>;
  leaderboard: (period: "day" | "week" | "month" | "year") => Promise<{ leaders: LeaderboardEntry[]; currentUserId: string | null }>;
  saveListeningProgress: (input: { lessonId: string; sentenceId: string; position: number; attemptCount: number; firstTryCorrect: boolean }) => Promise<void>;
  saveListeningPreferences: (preferences: ListeningPreferences) => Promise<ListeningPreferences>;
  adminImportLesson: (form: FormData) => Promise<{ jobId: string; lessonId: string; status: string; sentences: unknown[] }>;
  adminValidateImportBatch: (form: FormData) => Promise<{ batch: AdminImportBatch }>;
  adminGetImportBatch: (batchId: string) => Promise<{ batch: AdminImportBatch }>;
  adminConfirmImportBatch: (batchId: string) => Promise<{ batch: AdminImportBatch }>;
  adminProcessImportBatchItem: (batchId: string, itemId: string) => Promise<{ batch: AdminImportBatch }>;
  adminReviewLesson: (lessonId: string, input: unknown) => Promise<void>;
  adminUpdateLesson: (lessonId: string, input: unknown) => Promise<void>;
  adminDeleteLesson: (lessonId: string) => Promise<void>;
  getTranslationLanguages: (lessonId:string) => Promise<TranslationLanguageOption[]>;
  getLessonTranslations: (lessonId:string,languageCode:string) => Promise<{approved:SentenceTranslation[];contributions:SentenceTranslation[];set:{status:string;machineStatus:string;lastError:string|null}|null}>;
  addTranslationLanguage: (code:string) => Promise<TranslationLanguageOption>;
  submitSentenceTranslation: (sentenceId:string,input:{languageCode:string;text:string}) => Promise<SentenceTranslation>;
  saveTranslationPreference: (languageCode:string) => Promise<void>;
  adminGetTranslations: (query?:string) => Promise<{translations:TranslationReviewItem[];translationSets:TranslationSetReview[]}>;
  adminReviewTranslation: (translationId:string,action:"approve"|"reject",reason?:string) => Promise<void>;
  adminApproveLessonTranslations: (lessonId:string,languageCode:string) => Promise<void>;
  adminGenerateLessonTranslations: (lessonId:string,languageCode?:string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const OUTBOX_KEY = "me2listen-activity-outbox-v1";
const LEGACY_OUTBOX_KEY = "echotype-activity-outbox-v1";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  const body = await response.json() as T & { error?: string; details?: string };
  if (!response.ok) throw new Error(body.details ? `${body.error ?? "request_failed"}: ${body.details}` : body.error ?? `request_failed_${response.status}`);
  return body;
}

function loadOutbox(): ActivityEvent[] {
  try {
    const current = localStorage.getItem(OUTBOX_KEY);
    const legacy = localStorage.getItem(LEGACY_OUTBOX_KEY);
    return JSON.parse(current ?? legacy ?? "[]") as ActivityEvent[];
  } catch { return []; }
}

function saveOutbox(events: ActivityEvent[]) { localStorage.setItem(OUTBOX_KEY, JSON.stringify(events.slice(-200))); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [csrf, setCsrf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api<{ user: AccountUser | null; csrfToken?: string }>("/api/me");
      setUser(result.user); setCsrf(result.csrfToken ?? null);
    } catch { setUser(null); setCsrf(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const sendActivity = useCallback(async (event: ActivityEvent) => {
    if (!csrf) throw new Error("not_authenticated");
    await api("/api/progress/events", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(event) });
  }, [csrf]);

  const flushOutbox = useCallback(async () => {
    if (!csrf) return;
    const pending = loadOutbox();
    const failed: ActivityEvent[] = [];
    for (const event of pending) {
      try { await sendActivity(event); } catch { failed.push(event); }
    }
    saveOutbox(failed);
  }, [csrf, sendActivity]);

  useEffect(() => {
    if (user && csrf) void flushOutbox();
    const onOnline = () => { if (user && csrf) void flushOutbox(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user, csrf, flushOutbox]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: () => { window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(window.location.hash || "#/")}`); },
    logout: async () => {
      if (csrf) await api("/api/logout", { method: "POST", headers: { "X-CSRF-Token": csrf } });
      setUser(null); setCsrf(null);
    },
    rename: async (displayName) => {
      if (!csrf) throw new Error("not_authenticated");
      const result = await api<{ user: AccountUser }>("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ displayName, leaderboardVisible: user?.leaderboardVisible ?? false }) });
      setUser(result.user);
    },
    setLeaderboardVisible: async (visible) => {
      if (!csrf || !user) throw new Error("not_authenticated");
      const result = await api<{ user: AccountUser }>("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ displayName: user.displayName, leaderboardVisible: visible }) });
      setUser(result.user);
    },
    recordActivity: async (event) => {
      if (!user || !csrf) return;
      const completeEvent = { ...event, eventId: crypto.randomUUID() };
      const pending = [...loadOutbox(), completeEvent];
      saveOutbox(pending);
      try {
        await sendActivity(completeEvent);
        saveOutbox(loadOutbox().filter((item) => item.eventId !== completeEvent.eventId));
      } catch { /* The durable local outbox retries when connectivity returns. */ }
    },
    syncProgress: async (local, lessonLanguages) => {
      if (!csrf) return local;
      const items = Object.entries(local).flatMap(([lessonId, item]) => item.completed.map((sentenceIndex) => ({ lessonId, language: lessonLanguages[lessonId], sentenceIndex }))).filter((item) => item.language);
      for (let index = 0; index < items.length; index += 100) {
        await api("/api/progress/import", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ items: items.slice(index, index + 100) }) });
      }
      const remote = await api<{ progress: Array<{ lesson_id: string; sentence_index: number; best_score: number; attempts: number; completed: number; updated_at: number }> }>("/api/progress");
      const merged: ProgressMap = structuredClone(local);
      const remoteByLesson: ProgressMap = {};
      for (const row of remote.progress) {
        const current: LessonProgress = remoteByLesson[row.lesson_id] ?? { completed: [], attempts: 0, correct: 0, updatedAt: "" };
        if (row.completed && !current.completed.includes(row.sentence_index)) current.completed.push(row.sentence_index);
        current.attempts += row.attempts;
        current.correct += row.completed;
        if (!current.updatedAt || row.updated_at > Date.parse(current.updatedAt) / 1000) current.updatedAt = new Date(row.updated_at * 1000).toISOString();
        remoteByLesson[row.lesson_id] = current;
      }
      for (const [lessonId, remoteLesson] of Object.entries(remoteByLesson)) {
        const localLesson = merged[lessonId] ?? { completed: [], attempts: 0, correct: 0, updatedAt: "" };
        merged[lessonId] = {
          completed: [...new Set([...localLesson.completed, ...remoteLesson.completed])].sort((a, b) => a - b),
          attempts: Math.max(localLesson.attempts, remoteLesson.attempts),
          correct: Math.max(localLesson.correct, remoteLesson.correct),
          updatedAt: localLesson.updatedAt > remoteLesson.updatedAt ? localLesson.updatedAt : remoteLesson.updatedAt,
        };
      }
      return merged;
    },
    leaderboard: async (period) => api(`/api/leaderboard?period=${period}`),
    saveListeningProgress: async (input) => {
      if (!csrf) throw new Error("not_authenticated");
      await api("/api/listening/progress", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
    },
    saveListeningPreferences: async (preferences) => {
      if (!csrf || !user) throw new Error("not_authenticated");
      const result = await api<{ preferences: ListeningPreferences }>("/api/listening-preferences", { method:"PATCH", headers:{ "Content-Type":"application/json", "X-CSRF-Token":csrf }, body:JSON.stringify(preferences) });
      setUser({ ...user, listeningPreferences:result.preferences });
      return result.preferences;
    },
    adminImportLesson: async (form) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      return api("/api/listening/admin/import", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: form });
    },
    adminValidateImportBatch: async (form) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      return api("/api/listening/admin/import-batches/validate", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: form });
    },
    adminGetImportBatch: async (batchId) => {
      if (!user?.isAdmin) throw new Error("forbidden");
      return api(`/api/listening/admin/import-batches/${encodeURIComponent(batchId)}`);
    },
    adminConfirmImportBatch: async (batchId) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      return api(`/api/listening/admin/import-batches/${encodeURIComponent(batchId)}/confirm`, { method:"POST", headers:{ "X-CSRF-Token":csrf } });
    },
    adminProcessImportBatchItem: async (batchId,itemId) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      return api(`/api/listening/admin/import-batches/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}/process`, { method:"POST", headers:{ "X-CSRF-Token":csrf } });
    },
    adminReviewLesson: async (lessonId, input) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      await api(`/api/listening/admin/lessons/${encodeURIComponent(lessonId)}/review`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
    },
    adminUpdateLesson: async (lessonId, input) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      await api(`/api/listening/admin/lessons/${encodeURIComponent(lessonId)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
    },
    adminDeleteLesson: async (lessonId) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      await api(`/api/listening/admin/lessons/${encodeURIComponent(lessonId)}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
    },
    getTranslationLanguages: async (lessonId) => (await api<{languages:TranslationLanguageOption[]}>(`/api/listening/translation-languages?lessonId=${encodeURIComponent(lessonId)}`)).languages,
    getLessonTranslations: async (lessonId,languageCode) => api(`/api/listening/translations?lessonId=${encodeURIComponent(lessonId)}&languageCode=${encodeURIComponent(languageCode)}`),
    addTranslationLanguage: async (code) => {
      if(!csrf||!user)throw new Error("not_authenticated");
      const result=await api<{language:TranslationLanguageOption}>("/api/listening/translation-languages",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({code})});return result.language;
    },
    submitSentenceTranslation: async (sentenceId,input) => {
      if(!csrf||!user)throw new Error("not_authenticated");
      const result=await api<{translation:SentenceTranslation}>(`/api/listening/translations/${encodeURIComponent(sentenceId)}`,{method:"PUT",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(input)});return result.translation;
    },
    saveTranslationPreference: async (languageCode) => {
      if(!csrf||!user)throw new Error("not_authenticated");await api("/api/listening/translation-preference",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({languageCode})});setUser({...user,preferredTranslationLanguage:languageCode});
    },
    adminGetTranslations: async (query="") => {
      if(!user?.isAdmin)throw new Error("forbidden");return api<{translations:TranslationReviewItem[];translationSets:TranslationSetReview[]}>(`/api/listening/admin/translations?status=PENDING&q=${encodeURIComponent(query)}`);
    },
    adminReviewTranslation: async (translationId,action,reason) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");await api(`/api/listening/admin/translations/${encodeURIComponent(translationId)}`,{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({action,reason})});
    },
    adminApproveLessonTranslations: async (lessonId,languageCode) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");await api(`/api/listening/admin/translations/lessons/${encodeURIComponent(lessonId)}/${encodeURIComponent(languageCode)}/approve`,{method:"POST",headers:{"X-CSRF-Token":csrf}});
    },
    adminGenerateLessonTranslations: async (lessonId,languageCode) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");await api(`/api/listening/admin/translations/lessons/${encodeURIComponent(lessonId)}/generate`,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(languageCode?{languageCode}:{})});
    },
  }), [user, loading, csrf, sendActivity]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
