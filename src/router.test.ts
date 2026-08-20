import { afterEach, describe, expect, it } from "vitest";
import { migrateLegacyHashRoute, navigateToPath, pathHref, resolveAppView, viewPath } from "./router";

describe("application routing", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("resolves every listening-library depth", () => {
    expect(resolveAppView("/en", "")).toEqual({ page: "english" });
    expect(resolveAppView("/en/short-stories", "")).toEqual({ page: "english" });
    expect(resolveAppView("/en/short-stories/section-1", "")).toEqual({ page: "english" });
    expect(resolveAppView("/lessons/a1/short-stories/first-snowfall", "")).toEqual({ page: "canonicalLesson", path: "/lessons/a1/short-stories/first-snowfall" });
  });

  it("keeps old direct library URLs readable", () => {
    expect(resolveAppView("/learn/en/short-stories/section-1", "")).toEqual({ page: "english" });
  });

  it("builds matching history routes", () => {
    expect(pathHref("/en/short-stories")).toBe("/en/short-stories");
    expect(viewPath({ page: "english" })).toBe("/en");
    expect(viewPath({ page: "coming", language: "ja" })).toBe("/ja");
    expect(viewPath({ page: "coming", language: "zh" })).toBe("/zh");
    expect(resolveAppView("/admin", "")).toEqual({ page: "adminDashboard" });
    expect(viewPath({ page: "adminDashboard" })).toBe("/admin");
    expect(resolveAppView("/admin/listening/translations", "")).toEqual({ page: "adminTranslations" });
    expect(viewPath({ page: "adminTranslations" })).toBe("/admin/listening/translations");
    expect(resolveAppView("/admin/listening/comments", "")).toEqual({ page: "adminComments" });
    expect(viewPath({ page: "adminComments" })).toBe("/admin/listening/comments");
    expect(resolveAppView("/admin/leaderboard", "")).toEqual({ page: "adminLeaderboard" });
    expect(viewPath({ page: "adminLeaderboard" })).toBe("/admin/leaderboard");
  });

  it("leaves a canonical lesson before navigating back to a section", () => {
    window.history.replaceState({}, "", "/lessons/a1/short-stories/first-snowfall");
    navigateToPath("/en/short-stories/section-1");
    expect(window.location.pathname).toBe("/en/short-stories/section-1");
    expect(window.location.hash).toBe("");
  });

  it("clears the hash when opening a canonical lesson", () => {
    window.history.replaceState({}, "", "/en/short-stories/section-1");
    navigateToPath("/lessons/a1/short-stories/first-snowfall");
    expect(window.location.pathname).toBe("/lessons/a1/short-stories/first-snowfall");
    expect(window.location.hash).toBe("");
  });

  it("migrates legacy hash deep links without adding a history entry", () => {
    window.history.replaceState({}, "", "/#/learn/en/short-stories");
    expect(migrateLegacyHashRoute(window.location.hash)).toBe(true);
    expect(window.location.pathname).toBe("/en/short-stories");
    expect(window.location.hash).toBe("");
  });

  it("keeps non-learning legacy hash routes working", () => {
    window.history.replaceState({}, "", "/#/admin/listening");
    expect(migrateLegacyHashRoute(window.location.hash)).toBe(true);
    expect(window.location.pathname).toBe("/admin/listening");
    expect(window.location.hash).toBe("");
  });
});
