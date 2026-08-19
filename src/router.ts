import type { TargetLanguage } from "./types";

export type AppView =
  | { page: "home" }
  | { page: "english" }
  | { page: "adminDashboard" }
  | { page: "admin" }
  | { page: "adminManagement" }
  | { page: "adminTranslations" }
  | { page: "canonicalLesson"; path: string }
  | { page: "coming"; language: "ja" | "zh" }
  | { page: "library"; language: TargetLanguage }
  | { page: "lesson"; language: TargetLanguage; lessonId: string };

export function resolveAppView(pathname: string, hash: string): AppView {
  const routePath = pathname === "/" && /^#\//u.test(hash) ? hash.slice(1) : pathname;
  if (/^\/lessons\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/u.test(routePath)) return { page: "canonicalLesson", path: routePath };
  if (routePath === "/admin/listening/manage") return { page: "adminManagement" };
  if (routePath === "/admin/listening/translations") return { page: "adminTranslations" };
  if (routePath === "/admin/listening") return { page: "admin" };
  if (routePath === "/admin") return { page: "adminDashboard" };
  if (/^\/(?:learn\/)?en(?:\/.*)?$/u.test(routePath)) return { page: "english" };
  const comingMatch = routePath.match(/^\/(?:learn\/)?(ja|zh)(?:\/.*)?$/u);
  if (comingMatch) return { page: "coming", language: comingMatch[1] as "ja" | "zh" };
  const lessonMatch = routePath.match(/^\/learn\/(en|zh|ja)\/lesson\/(.+)$/u);
  if (lessonMatch) return { page: "lesson", language: lessonMatch[1] as TargetLanguage, lessonId: lessonMatch[2] };
  const libraryMatch = routePath.match(/^\/learn\/(en|zh|ja)$/u);
  if (libraryMatch) return { page: "library", language: libraryMatch[1] as TargetLanguage };
  const legacyMatch = routePath.match(/^\/lesson\/(.+)$/u);
  return legacyMatch ? { page: "lesson", language: "en", lessonId: legacyMatch[1] } : { page: "home" };
}

export function viewPath(view: Exclude<AppView, { page: "canonicalLesson" }>) {
  return view.page === "home" ? "/"
    : view.page === "english" ? "/en"
    : view.page === "adminDashboard" ? "/admin"
    : view.page === "admin" ? "/admin/listening"
    : view.page === "adminManagement" ? "/admin/listening/manage"
    : view.page === "adminTranslations" ? "/admin/listening/translations"
    : view.page === "coming" || view.page === "library" ? `/${view.language}`
    : `/${view.language}/lesson/${view.lessonId}`;
}

export function pathHref(path: string) { return normalizePath(path); }

export function navigateToPath(path: string) {
  window.history.pushState({}, "", normalizePath(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function migrateLegacyHashRoute(hash: string): boolean {
  if (!/^#\/(?:admin|learn|lesson)(?:\/|$)/u.test(hash)) return false;
  const legacyPath = hash.slice(1);
  window.history.replaceState({}, "", legacyPath.replace(/^\/learn\/(?=(?:en|ja|zh)(?:\/|$))/u, "/"));
  window.dispatchEvent(new PopStateEvent("popstate"));
  return true;
}

function normalizePath(path: string) {
  const withoutHash = path.startsWith("#") ? path.slice(1) : path;
  return withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
}
