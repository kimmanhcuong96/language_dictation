import { describe, expect, it } from "vitest";
import { sentenceCommentsMessages, sentenceCommentsT } from "./sentenceCommentsI18n";

describe("sentence comments i18n", () => {
  it("keeps every locale complete", () => {
    const expected = Object.keys(sentenceCommentsMessages.en).sort();
    for (const messages of Object.values(sentenceCommentsMessages)) {
      expect(Object.keys(messages).sort()).toEqual(expected);
      expect(Object.values(messages).every(Boolean)).toBe(true);
    }
  });

  it("interpolates sentence and character counts", () => {
    expect(sentenceCommentsT("vi", "sentence", { number: 3 })).toContain("3");
    expect(sentenceCommentsT("en", "characterCount", { count: 12, max: 500 })).toBe("12/500 characters");
  });
});
