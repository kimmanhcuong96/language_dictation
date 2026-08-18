import type { TargetLanguage } from "./types";

export type AppView =
  | { page: "home" }
  | { page: "english" }
  | { page: "adminDashboard" }
  | { page: "admin" }
  | { page: "adminManagement" }
  | { page: "canonicalLesson"; path: string }
  | { page: "coming"; language: "ja" | "zh" }
  | { page: "library"; language: TargetLanguage }
  | { page: "lesson"; language: TargetLanguage; lessonId: string };

export function resolveAppView(pathname: string, hash: string): AppView {
  if (/^\/lessons\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/u.test(pathname)) return { page: "canonicalLesson", path: pathname };
  if (hash === "#/admin/listening/manage") return { page: "adminManagement" };
  if (hash === "#/admin/listening") return { page: "admin" };
  if (hash === "#/admin") return { page: "adminDashboard" };
  if (/^#\/learn\/en(?:\/.*)?$/u.test(hash) || /^\/learn\/en(?:\/.*)?$/u.test(pathname)) return { page: "english" };
  const comingMatch = hash.match(/^#\/learn\/(ja|zh)(?:\/.*)?$/u);
  if (comingMatch) return { page: "coming", language: comingMatch[1] as "ja" | "zh" };
  const lessonMatch = hash.match(/^#\/learn\/(en|zh|ja)\/lesson\/(.+)$/u);
  if (lessonMatch) return { page: "lesson", language: lessonMatch[1] as TargetLanguage, lessonId: lessonMatch[2] };
  const libraryMatch = hash.match(/^#\/learn\/(en|zh|ja)$/u);
  if (libraryMatch) return { page: "library", language: libraryMatch[1] as TargetLanguage };
  const legacyMatch = hash.match(/^#\/lesson\/(.+)$/u);
  return legacyMatch ? { page: "lesson", language: "en", lessonId: legacyMatch[1] } : { page: "home" };
}

export function viewHash(view: Exclude<AppView, { page: "canonicalLesson" }>) {
  return view.page === "home" ? "/"
    : view.page === "english" ? "/learn/en"
    : view.page === "adminDashboard" ? "/admin"
    : view.page === "admin" ? "/admin/listening"
    : view.page === "adminManagement" ? "/admin/listening/manage"
    : view.page === "coming" || view.page === "library" ? `/learn/${view.language}`
    : `/learn/${view.language}/lesson/${view.lessonId}`;
}

export function hashHref(path: string) {
  return `#${normalizeHashPath(path)}`;
}

export function navigateToHash(path: string) {
  const normalized = normalizeHashPath(path);
  const nextHash = `#${normalized}`;
  if (window.location.pathname !== "/" || window.location.search) {
    window.history.pushState({}, "", `/${nextHash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (window.location.hash !== nextHash) {
    window.location.hash = normalized;
  } else {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export function navigateToPath(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function normalizeHashPath(path: string) {
  const withoutHash = path.startsWith("#") ? path.slice(1) : path;
  return withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
}
