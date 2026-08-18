import { afterEach, describe, expect, it } from "vitest";
import { hashHref, navigateToHash, navigateToPath, resolveAppView, viewHash } from "./router";

describe("application routing", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("resolves every listening-library depth", () => {
    expect(resolveAppView("/", "#/learn/en")).toEqual({ page: "english" });
    expect(resolveAppView("/", "#/learn/en/short-stories")).toEqual({ page: "english" });
    expect(resolveAppView("/", "#/learn/en/short-stories/section-1")).toEqual({ page: "english" });
    expect(resolveAppView("/lessons/a1/short-stories/first-snowfall", "")).toEqual({ page: "canonicalLesson", path: "/lessons/a1/short-stories/first-snowfall" });
  });

  it("keeps old direct library URLs readable", () => {
    expect(resolveAppView("/learn/en/short-stories/section-1", "")).toEqual({ page: "english" });
  });

  it("builds matching hash routes", () => {
    expect(hashHref("/learn/en/short-stories")).toBe("#/learn/en/short-stories");
    expect(viewHash({ page: "english" })).toBe("/learn/en");
    expect(resolveAppView("/", "#/admin")).toEqual({ page: "adminDashboard" });
    expect(viewHash({ page: "adminDashboard" })).toBe("/admin");
    expect(resolveAppView("/", "#/admin/listening/translations")).toEqual({ page: "adminTranslations" });
    expect(viewHash({ page: "adminTranslations" })).toBe("/admin/listening/translations");
  });

  it("leaves a canonical lesson before navigating back to a section", () => {
    window.history.replaceState({}, "", "/lessons/a1/short-stories/first-snowfall");
    navigateToHash("/learn/en/short-stories/section-1");
    expect(window.location.pathname).toBe("/");
    expect(window.location.hash).toBe("#/learn/en/short-stories/section-1");
  });

  it("clears the hash when opening a canonical lesson", () => {
    window.history.replaceState({}, "", "/#/learn/en/short-stories/section-1");
    navigateToPath("/lessons/a1/short-stories/first-snowfall");
    expect(window.location.pathname).toBe("/lessons/a1/short-stories/first-snowfall");
    expect(window.location.hash).toBe("");
  });
});
