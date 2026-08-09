import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LessonProgress, ProgressMap, TargetLanguage } from "./types";

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  leaderboardVisible: boolean;
}

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
}

const AuthContext = createContext<AuthContextValue | null>(null);
const OUTBOX_KEY = "echotype-activity-outbox-v1";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `request_failed_${response.status}`);
  return body;
}

function loadOutbox(): ActivityEvent[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as ActivityEvent[]; } catch { return []; }
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
  }), [user, loading, csrf, sendActivity]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
