import { describe, expect, it } from "vitest";
import { translations } from "./i18n";
import { lessonsByLanguage } from "./data/lessons";

describe("internationalization", () => {
  it("keeps all locale dictionaries structurally complete", () => {
    const baseline = Object.keys(translations.vi).sort();
    for (const dictionary of Object.values(translations)) {
      expect(Object.keys(dictionary).sort()).toEqual(baseline);
      expect(Object.values(dictionary).every(Boolean)).toBe(true);
    }
  });

  it("keeps lessons isolated by target language", () => {
    for (const [language, lessons] of Object.entries(lessonsByLanguage)) {
      expect(lessons.length).toBeGreaterThan(0);
      expect(lessons.every((lesson) => lesson.language === language)).toBe(true);
    }
  });
});
