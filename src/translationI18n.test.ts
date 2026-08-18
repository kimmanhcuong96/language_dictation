import { describe, expect, it } from "vitest";
import { translationT, type TranslationMessageKey } from "./translationI18n";
import type { UiLocale } from "./types";

describe("translation i18n",()=>{
  it("provides every translation workflow label",()=>{
    const locales:UiLocale[]=["vi","en","zh","ja"],keys:TranslationMessageKey[]=["translation","targetLanguage","approved","pending","unavailable","contribute","suggestEdit","translationText","submit","submitting","submitted","addLanguage","selectLanguage","alreadyAdded","createLanguage","cancel","signIn","loadError","saveError"];
    for(const locale of locales)for(const key of keys)expect(translationT(locale,key).trim()).not.toBe("");
  });
});
