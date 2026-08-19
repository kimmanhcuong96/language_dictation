import { describe, expect, it } from "vitest";
import { adminTranslationMachineStatus, adminTranslationSource, adminTranslationT, type AdminTranslationKey } from "./adminTranslationI18n";
import type { UiLocale } from "./types";

describe("admin translation i18n",()=>{
  it("provides every review label",()=>{
    const locales:UiLocale[]=["vi","en","zh","ja"],keys:AdminTranslationKey[]=["title","description","search","approve","reject","approveLesson","retryGoogle","pending","empty","loadError","incomplete","emptySet","rejectedSet","lessonInactive","languageInactive","manage","sourceUser","sourceAdmin","sourceGoogle","machineNotRequested","machinePending","machineProcessing","machineCompleted","machineFailed","machineNotConfigured"];
    for(const locale of locales)for(const key of keys)expect(adminTranslationT(locale,key).trim()).not.toBe("");
  });
  it("localizes source and machine statuses",()=>{expect(adminTranslationSource("vi","USER")).toBe("Cộng đồng");expect(adminTranslationMachineStatus("ja","PROCESSING")).toBe("処理中");});
});
