import { describe, expect, it } from "vitest";
import { lessonT, type LessonMessageKey } from "./lessonI18n";
import type { UiLocale } from "./types";

describe("lesson i18n", () => {
  it("provides every lesson UI message for each locale", () => {
    const locales: UiLocale[] = ["vi", "en", "zh", "ja"];
    const keys = ["vocabLevel", "sentenceProgress", "previousSentence", "nextSentence", "answer", "correctAnswer", "revealedAnswer", "pronunciation", "pronunciationHint", "microphoneSoon", "listeningTip", "listeningTipText", "nextLesson", "checkShortcut", "skipShortcut", "settings", "dictationTab", "transcriptTab", "settingsTitle", "closeSettings", "settingsDescription", "replayKey", "playPauseKey", "autoReplay", "replayDelay", "wordSuggestions", "shortcutTips", "seconds", "enabled", "disabled", "settingsSaveError", "replayShortcut", "playPauseShortcut", "playSentence", "pauseSentence", "seekSentence", "repeatSentence", "audioConnectionError", "fullLessonAudio", "retryAnswer", "retryAnswerError", "resetLesson", "resetLessonConfirm", "resetLessonError", "addFavorite", "removeFavorite", "favoriteError", "stars", "completedLesson"] satisfies LessonMessageKey[];
    for (const locale of locales) for (const key of keys) expect(lessonT(locale, key).trim()).not.toBe("");
  });
});
