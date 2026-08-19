import { describe, expect, it } from "vitest";
import { lessonCompletionT, type LessonCompletionMessageKey } from "./lessonCompletionI18n";
import type { UiLocale } from "./types";

describe("lesson completion translations", () => {
  it("provides every completion message in every locale", () => {
    const locales: UiLocale[] = ["vi", "en", "zh", "ja"];
    const keys: LessonCompletionMessageKey[] = ["title", "message", "nextLesson", "repeatLesson", "allLessons", "dialogLabel"];
    for (const locale of locales) for (const key of keys) expect(lessonCompletionT(locale, key).trim()).not.toBe("");
  });
});
