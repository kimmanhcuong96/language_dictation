import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LessonProgress, ProgressMap, TargetLanguage } from "./types";
import type { ListeningPreferences } from "./lib/listeningPreferences";

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  leaderboardVisible: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  listeningPreferences: ListeningPreferences;
  preferredTranslationLanguage: string;
}

export interface TranslationLanguageOption { code:string; name:string; nativeName:string; isBuiltin:boolean; status:"PENDING"|"ACTIVE"|"DISABLED"; isOwner:boolean; approvedCount:number; sentenceCount:number; canContribute:boolean; }
export interface SentenceTranslation { id:string; sentenceId:string; text:string; source?:"GOOGLE"|"USER"|"ADMIN"; status?:string; updatedAt:string; }
export interface TranslationReviewItem { id:string; sentenceId:string; languageCode:string; text:string; source:string; status:string; createdAt:string; position:number; transcript:string; lessonId:string; lessonTitle:string; languageName:string; submittedBy:string|null; }
export interface TranslationSetReview { lessonId:string; lessonTitle:string; languageCode:string; languageName:string; status:string; lessonActive:boolean; languageStatus:string; sentenceCount:number; readySentenceCount:number; rejectedSentenceCount:number; canApproveLesson:boolean; approvalBlockReason:"lesson_inactive"|"language_inactive"|"translation_set_empty"|"translation_set_rejected"|"translation_set_incomplete"|null; }
export interface SentenceComment { id:string; sentenceId:string; body:string; createdAt:string; isOwner:boolean; author:{displayName:string;avatarUrl:string|null}; }
export interface SentenceCommentsPage { comments:SentenceComment[]; nextCursor:string|null; }
export interface ReportedSentenceComment { id:string;body:string;status:"VISIBLE"|"HIDDEN";createdAt:string;authorName:string;reportCount:number;reasons:string[];lessonTitle:string;position:number;transcript:string; }

export interface ActivityEvent {
  eventId: string;
  lessonId: string;
  language: TargetLanguage;
  sentenceIndex: number;
  typedAnswer: string;
  durationSeconds: number;
}

export interface ListeningProgressEvent {
  lessonId: string;
  sentenceId: string;
  position: number;
  attemptCount: number;
  firstTryCorrect: boolean;
  eventId: string;
  durationSeconds: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  value: number;
}

export type LeaderboardMetric = "study_time" | "translations";
export type LeaderboardPeriod = "7d" | "30d";
export interface LeaderboardSettings { study7DayLimit:number; study30DayLimit:number; translation7DayLimit:number; translation30DayLimit:number; updatedAt:string; }
export interface AdminUserSummary {
  id:string;email:string;displayName:string;avatarUrl:string|null;leaderboardVisible:boolean;isBlocked:boolean;isAdmin:boolean;
  blockedAt:string|null;blockReason:string|null;blockedByName:string|null;createdAt:number;updatedAt:number;lastSeenAt:number|null;
  commentCount:number;visibleCommentCount:number;completedLessonCount:number;studySeconds30d:number;approvedTranslationCount:number;
}
export interface AdminUsersPage { users:AdminUserSummary[];page:number;limit:number;total:number; }

export interface AdminImportBatchItem {
  id: string;
  lessonName: string;
  slug: string | null;
  sourceType: "audio" | "youtube";
  audioName: string | null;
  linkName: string | null;
  srtName: string | null;
  namesName: string | null;
  youtubeVideoId: string | null;
  translationFiles: Record<string,string>;
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
  leaderboard: (metric: LeaderboardMetric, period: LeaderboardPeriod) => Promise<{ leaders: LeaderboardEntry[]; currentUserId: string | null; limit:number; startsAt:string }>;
  saveListeningProgress: (input: ListeningProgressEvent) => Promise<void>;
  resetListeningProgress: (input: { lessonId: string; sentenceId: string; position: number }) => Promise<void>;
  resetListeningLessonProgress: (lessonId: string) => Promise<void>;
  setListeningLessonFavorite: (lessonId: string, favorite: boolean) => Promise<{ lessonId: string; starCount: number; isStarred: boolean }>;
  getSentenceComments: (sentenceId:string,cursor?:string) => Promise<SentenceCommentsPage>;
  createSentenceComment: (sentenceId:string,body:string) => Promise<SentenceComment>;
  deleteSentenceComment: (commentId:string) => Promise<void>;
  reportSentenceComment: (commentId:string,reason:"SPAM"|"HARASSMENT"|"HATE"|"SEXUAL"|"VIOLENCE"|"OTHER",details?:string) => Promise<void>;
  saveListeningPreferences: (preferences: ListeningPreferences) => Promise<ListeningPreferences>;
  adminCreateSection: (input: { categoryId: string; title: string; description?: string }) => Promise<{ section: { section_id: string; category_id: string; category_name: string; section_title: string; language_code: string } }>;
  adminValidateImportBatch: (form: FormData) => Promise<{ batch: AdminImportBatch }>;
  adminGetImportBatch: (batchId: string) => Promise<{ batch: AdminImportBatch }>;
  adminConfirmImportBatch: (batchId: string) => Promise<{ batch: AdminImportBatch }>;
  adminProcessImportBatchItem: (batchId: string, itemId: string) => Promise<{ batch: AdminImportBatch }>;
  adminUpdateLesson: (lessonId: string, input: unknown) => Promise<void>;
  adminDeleteLesson: (lessonId: string) => Promise<void>;
  adminDeleteLessons: (lessonIds: string[]) => Promise<{ deleted: string[]; failed: Array<{ lessonId: string; error: string }> }>;
  getTranslationLanguages: (lessonId:string) => Promise<TranslationLanguageOption[]>;
  getLessonTranslations: (lessonId:string,languageCode:string) => Promise<{approved:SentenceTranslation[];contributions:SentenceTranslation[];set:{status:string}|null}>;
  addTranslationLanguage: (code:string) => Promise<TranslationLanguageOption>;
  submitSentenceTranslation: (sentenceId:string,input:{languageCode:string;text:string}) => Promise<SentenceTranslation>;
  saveTranslationPreference: (languageCode:string) => Promise<void>;
  adminGetTranslations: (query?:string) => Promise<{translations:TranslationReviewItem[];translationSets:TranslationSetReview[]}>;
  adminReviewTranslation: (translationId:string,action:"approve"|"reject",reason?:string) => Promise<void>;
  adminApproveLessonTranslations: (lessonId:string,languageCode:string) => Promise<void>;
  adminImportTranslations: (form:FormData) => Promise<{lessonId:string;translations:Array<{languageCode:string;lineCount:number}>}>;
  adminGetReportedComments: () => Promise<{comments:ReportedSentenceComment[]}>;
  adminModerateComment: (commentId:string,action:"hide"|"restore",reason:string) => Promise<void>;
  adminGetLeaderboardSettings: () => Promise<LeaderboardSettings>;
  adminUpdateLeaderboardSettings: (settings:Omit<LeaderboardSettings,"updatedAt">) => Promise<LeaderboardSettings>;
  adminGetUsers: (input:{query?:string;status?:"all"|"active"|"blocked";page?:number}) => Promise<AdminUsersPage>;
  adminModerateUser: (userId:string,action:"block"|"unblock",reason:string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const OUTBOX_KEY = "me2listen-activity-outbox-v1";
const LISTENING_OUTBOX_KEY = "me2listen-listening-progress-outbox-v1";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  const body = await response.json() as T & { error?: string; details?: string };
  if (!response.ok) throw new Error(body.details ? `${body.error ?? "request_failed"}: ${body.details}` : body.error ?? `request_failed_${response.status}`);
  return body;
}

function loadUserOutbox<T>(key:string,userId:string): T[] {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null") as {userId?:unknown;events?:unknown}|null;
    return stored?.userId === userId && Array.isArray(stored.events) ? stored.events as T[] : [];
  } catch { return []; }
}

function saveUserOutbox<T>(key:string,userId:string,events:T[]) { localStorage.setItem(key, JSON.stringify({userId,events:events.slice(-200)})); }

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

  const sendListeningProgress = useCallback(async (input:ListeningProgressEvent) => {
    if (!csrf) throw new Error("not_authenticated");
    await api("/api/listening/progress", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
  }, [csrf]);

  const flushOutbox = useCallback(async () => {
    if (!csrf || !user) return;
    const pending = loadUserOutbox<ActivityEvent>(OUTBOX_KEY,user.id);
    const sent = new Set<string>();
    for (const event of pending) {
      try { await sendActivity(event); sent.add(event.eventId); } catch { /* Keep failed events for the next retry. */ }
    }
    saveUserOutbox(OUTBOX_KEY,user.id,loadUserOutbox<ActivityEvent>(OUTBOX_KEY,user.id).filter(event=>!sent.has(event.eventId)));
    const listeningPending=loadUserOutbox<ListeningProgressEvent>(LISTENING_OUTBOX_KEY,user.id),listeningSent=new Set<string>();
    for(const event of listeningPending){try{await sendListeningProgress(event);listeningSent.add(event.eventId);}catch{/* Keep failed events for the next retry. */}}
    saveUserOutbox(LISTENING_OUTBOX_KEY,user.id,loadUserOutbox<ListeningProgressEvent>(LISTENING_OUTBOX_KEY,user.id).filter(event=>!listeningSent.has(event.eventId)));
  }, [csrf,user,sendActivity,sendListeningProgress]);

  useEffect(() => {
    if (user && csrf) void flushOutbox();
    const onOnline = () => { if (user && csrf) void flushOutbox(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user, csrf, flushOutbox]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: () => { window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(window.location.pathname)}`); },
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
      if (user.isBlocked) throw new Error("user_blocked");
      const result = await api<{ user: AccountUser }>("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ displayName: user.displayName, leaderboardVisible: visible }) });
      setUser(result.user);
    },
    recordActivity: async (event) => {
      if (!user || !csrf) return;
      const completeEvent = { ...event, eventId: crypto.randomUUID() };
      const pending = [...loadUserOutbox<ActivityEvent>(OUTBOX_KEY,user.id), completeEvent];
      saveUserOutbox(OUTBOX_KEY,user.id,pending);
      try {
        await sendActivity(completeEvent);
        saveUserOutbox(OUTBOX_KEY,user.id,loadUserOutbox<ActivityEvent>(OUTBOX_KEY,user.id).filter((item) => item.eventId !== completeEvent.eventId));
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
    leaderboard: async (metric, period) => api(`/api/leaderboard?metric=${metric}&period=${period}`),
    saveListeningProgress: async (input) => {
      if (!csrf || !user) throw new Error("not_authenticated");
      saveUserOutbox(LISTENING_OUTBOX_KEY,user.id,[...loadUserOutbox<ListeningProgressEvent>(LISTENING_OUTBOX_KEY,user.id),input]);
      await sendListeningProgress(input);
      saveUserOutbox(LISTENING_OUTBOX_KEY,user.id,loadUserOutbox<ListeningProgressEvent>(LISTENING_OUTBOX_KEY,user.id).filter(item=>item.eventId!==input.eventId));
    },
    resetListeningProgress: async (input) => {
      if (!csrf) throw new Error("not_authenticated");
      await api("/api/listening/progress", { method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
    },
    resetListeningLessonProgress: async (lessonId) => {
      if (!csrf) throw new Error("not_authenticated");
      await api("/api/listening/progress/lesson", { method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ lessonId }) });
    },
    setListeningLessonFavorite: async (lessonId, favorite) => {
      if (!csrf) throw new Error("not_authenticated");
      return api(`/api/listening/lessons/${encodeURIComponent(lessonId)}/favorite`, { method: favorite ? "PUT" : "DELETE", headers: { "X-CSRF-Token": csrf } });
    },
    getSentenceComments: async (sentenceId,cursor) => api(`/api/listening/sentences/${encodeURIComponent(sentenceId)}/comments${cursor?`?cursor=${encodeURIComponent(cursor)}`:""}`),
    createSentenceComment: async (sentenceId,body) => {
      if(!csrf||!user)throw new Error("not_authenticated");
      if(user.isBlocked)throw new Error("user_blocked");
      const result=await api<{comment:SentenceComment}>(`/api/listening/sentences/${encodeURIComponent(sentenceId)}/comments`,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({id:crypto.randomUUID(),body})});
      return result.comment;
    },
    deleteSentenceComment: async (commentId) => {
      if(!csrf||!user)throw new Error("not_authenticated");
      await api(`/api/listening/comments/${encodeURIComponent(commentId)}`,{method:"DELETE",headers:{"X-CSRF-Token":csrf}});
    },
    reportSentenceComment: async (commentId,reason,details) => {
      if(!csrf||!user)throw new Error("not_authenticated");
      await api(`/api/listening/comments/${encodeURIComponent(commentId)}/reports`,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({reason,details})});
    },
    saveListeningPreferences: async (preferences) => {
      if (!csrf || !user) throw new Error("not_authenticated");
      const result = await api<{ preferences: ListeningPreferences }>("/api/listening-preferences", { method:"PATCH", headers:{ "Content-Type":"application/json", "X-CSRF-Token":csrf }, body:JSON.stringify(preferences) });
      setUser({ ...user, listeningPreferences:result.preferences });
      return result.preferences;
    },
    adminCreateSection: async (input) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      return api("/api/listening/admin/sections", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
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
    adminUpdateLesson: async (lessonId, input) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      await api(`/api/listening/admin/lessons/${encodeURIComponent(lessonId)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(input) });
    },
    adminDeleteLesson: async (lessonId) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      await api(`/api/listening/admin/lessons/${encodeURIComponent(lessonId)}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
    },
    adminDeleteLessons: async (lessonIds) => {
      if (!csrf || !user?.isAdmin) throw new Error("forbidden");
      return api("/api/listening/admin/lessons", { method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ lessonIds }) });
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
    adminImportTranslations: async (form) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");return api("/api/listening/admin/translations/import",{method:"POST",headers:{"X-CSRF-Token":csrf},body:form});
    },
    adminGetReportedComments: async () => {
      if(!user?.isAdmin)throw new Error("forbidden");return api<{comments:ReportedSentenceComment[]}>("/api/listening/admin/comments/reports");
    },
    adminModerateComment: async (commentId,action,reason) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");await api(`/api/listening/admin/comments/${encodeURIComponent(commentId)}/moderation`,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({action,reason})});
    },
    adminGetLeaderboardSettings: async () => {
      if(!user?.isAdmin)throw new Error("forbidden");
      return (await api<{settings:LeaderboardSettings}>("/api/admin/leaderboard-settings")).settings;
    },
    adminUpdateLeaderboardSettings: async (settings) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");
      return (await api<{settings:LeaderboardSettings}>("/api/admin/leaderboard-settings",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(settings)})).settings;
    },
    adminGetUsers: async ({query="",status="all",page=1}) => {
      if(!user?.isAdmin)throw new Error("forbidden");
      return api<AdminUsersPage>(`/api/admin/users?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${page}`);
    },
    adminModerateUser: async (userId,action,reason) => {
      if(!csrf||!user?.isAdmin)throw new Error("forbidden");
      await api(`/api/admin/users/${encodeURIComponent(userId)}/moderation`,{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify({action,reason})});
    },
  }), [user, loading, csrf, sendActivity, sendListeningProgress]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
