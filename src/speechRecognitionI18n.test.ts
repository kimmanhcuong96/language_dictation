import { describe, expect, it } from "vitest";
import { speechRecognitionT, type SpeechRecognitionMessageKey } from "./speechRecognitionI18n";
import type { UiLocale } from "./types";

describe("speech recognition i18n", () => {
  it("provides every message in every interface locale", () => {
    const locales: UiLocale[] = ["vi", "en", "zh", "ja"];
    const keys: SpeechRecognitionMessageKey[] = ["start", "stop", "listening", "unsupported", "languageUnsupported", "permission", "noSpeech", "audioCapture", "network", "unknown"];
    for (const locale of locales) for (const key of keys) expect(speechRecognitionT(locale, key).trim()).not.toBe("");
  });
});
