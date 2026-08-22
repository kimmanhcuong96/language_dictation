import type { UiLocale } from "./types";

const messages = {
  vi: { intro: "Khám phá các bài luyện nghe theo từng phần, trình độ và chủ đề bạn quan tâm.", search: "Tìm bài học", searchPlaceholder: "Tìm theo tên bài học...", allLevels: "Tất cả trình độ", clearFilters: "Xóa bộ lọc", sentences: "câu", unknownLevel: "Mọi trình độ", expand: "Mở", collapse: "Thu gọn", sectionResults: "phần phù hợp", video: "Video" },
  en: { intro: "Explore listening lessons by section, level, and the topic that interests you.", search: "Search lessons", searchPlaceholder: "Search by lesson title...", allLevels: "All levels", clearFilters: "Clear filters", sentences: "sentences", unknownLevel: "All levels", expand: "Expand", collapse: "Collapse", sectionResults: "matching sections", video: "Video" },
  zh: { intro: "按单元、级别和感兴趣的主题探索听力课程。", search: "搜索课程", searchPlaceholder: "按课程名称搜索…", allLevels: "所有级别", clearFilters: "清除筛选", sentences: "句", unknownLevel: "所有级别", expand: "展开", collapse: "收起", sectionResults: "个匹配单元", video: "视频" },
  ja: { intro: "セクション、レベル、興味のあるトピックからリスニング教材を探せます。", search: "レッスンを検索", searchPlaceholder: "レッスン名で検索…", allLevels: "すべてのレベル", clearFilters: "絞り込みを解除", sentences: "文", unknownLevel: "すべてのレベル", expand: "開く", collapse: "閉じる", sectionResults: "件のセクション", video: "動画" },
} as const satisfies Record<UiLocale, Record<string, string>>;

export type SectionMessageKey = keyof typeof messages.en;
export const sectionT = (locale: UiLocale, key: SectionMessageKey) => messages[locale][key];
