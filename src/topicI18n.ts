import type { UiLocale } from "./types";

const messages = {
  vi: { eyebrow: "THƯ VIỆN TIẾNG ANH", intro: "Chọn một chủ đề phù hợp với mục tiêu và trình độ nghe của bạn.", levels: "Trình độ", allLevels: "Mọi trình độ", openTopic: "Mở chủ đề" },
  en: { eyebrow: "ENGLISH LIBRARY", intro: "Choose a topic that matches your listening goals and current level.", levels: "Levels", allLevels: "All levels", openTopic: "Open topic" },
  zh: { eyebrow: "英语课程库", intro: "选择符合你的听力目标和当前水平的主题。", levels: "级别", allLevels: "所有级别", openTopic: "打开主题" },
  ja: { eyebrow: "英語ライブラリ", intro: "リスニングの目標と現在のレベルに合うトピックを選びましょう。", levels: "レベル", allLevels: "すべてのレベル", openTopic: "トピックを開く" },
} as const satisfies Record<UiLocale, Record<string, string>>;

export type TopicMessageKey = keyof typeof messages.en;
export const topicT = (locale: UiLocale, key: TopicMessageKey) => messages[locale][key];
