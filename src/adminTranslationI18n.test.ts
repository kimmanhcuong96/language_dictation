import { describe, expect, it } from "vitest";
import { adminTranslationT, type AdminTranslationKey } from "./adminTranslationI18n";
import type { UiLocale } from "./types";

describe("admin translation i18n",()=>{
  it("provides every review label",()=>{
    const locales:UiLocale[]=["vi","en","zh","ja"],keys:AdminTranslationKey[]=["title","description","search","approve","reject","approveLesson","retryGoogle","pending","empty","loadError","incomplete","emptySet","rejectedSet","lessonInactive","languageInactive","manage"];
    for(const locale of locales)for(const key of keys)expect(adminTranslationT(locale,key).trim()).not.toBe("");
  });
});
