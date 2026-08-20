import { afterEach, describe, expect, it } from "vitest";
import { resolveInitialTheme, THEME_STORAGE_KEY } from "./theme";

describe("theme preference", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it("uses the theme applied before React renders", () => {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(resolveInitialTheme()).toBe("dark");
  });

  it("restores a saved preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(resolveInitialTheme()).toBe("dark");
  });
});
