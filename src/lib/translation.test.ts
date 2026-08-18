import { describe, expect, it } from "vitest";
import { canonicalizeLanguageCode, getLessonApprovalBlockReason, getPopularTranslationLanguage, isValidLanguageName, isValidTranslationText, POPULAR_TRANSLATION_LANGUAGES } from "./translation";

describe("translation validation", () => {
  it("canonicalizes extensible BCP 47 language tags", () => {
    expect(canonicalizeLanguageCode("ZH-cn")).toBe("zh-CN");
    expect(canonicalizeLanguageCode("sr-latn-rs")).toBe("sr-Latn-RS");
    expect(canonicalizeLanguageCode("en-US-u-ca-gregory")).toBe("en-US-u-ca-gregory");
    expect(canonicalizeLanguageCode("bad_code")).toBeNull();
  });

  it("bounds language names and translated text", () => {
    expect(isValidLanguageName("한국어")).toBe(true);
    expect(isValidLanguageName("<x>")).toBe(false);
    expect(isValidTranslationText("A useful translation.")).toBe(true);
    expect(isValidTranslationText(" ")).toBe(false);
  });

  it("only resolves languages from the curated 30-language catalog",()=>{
    expect(POPULAR_TRANSLATION_LANGUAGES).toHaveLength(30);
    expect(new Set(POPULAR_TRANSLATION_LANGUAGES.map(language=>language.code)).size).toBe(30);
    expect(getPopularTranslationLanguage("KO")?.nativeName).toBe("한국어");
    expect(getPopularTranslationLanguage("sr-Latn-RS")).toBeNull();
  });

  it("enforces every whole-lesson approval precondition",()=>{
    const eligible={lessonActive:true,languageActive:true,sentenceCount:3,readySentenceCount:3,rejectedSentenceCount:0};
    expect(getLessonApprovalBlockReason(eligible)).toBeNull();
    expect(getLessonApprovalBlockReason({...eligible,lessonActive:false})).toBe("lesson_inactive");
    expect(getLessonApprovalBlockReason({...eligible,languageActive:false})).toBe("language_inactive");
    expect(getLessonApprovalBlockReason({...eligible,rejectedSentenceCount:1})).toBe("translation_set_rejected");
    expect(getLessonApprovalBlockReason({...eligible,readySentenceCount:0})).toBe("translation_set_empty");
    expect(getLessonApprovalBlockReason({...eligible,readySentenceCount:2})).toBe("translation_set_incomplete");
  });
});
