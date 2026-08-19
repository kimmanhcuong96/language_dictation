import type { UiLocale } from "./types";

const messages = {
  vi: {
    title: "Hoàn thành bài học!",
    message: "Chúc mừng! Bạn đã hoàn thành tất cả các câu trong bài này.",
    nextLesson: "Học bài tiếp theo",
    finish: "Hoàn tất",
    repeatLesson: "Học lại bài này",
    allLessons: "Quay về danh sách tất cả bài học",
    dialogLabel: "Thông báo hoàn thành bài học",
  },
  en: {
    title: "Lesson complete!",
    message: "Congratulations! You completed every sentence in this lesson.",
    nextLesson: "Continue to next lesson",
    finish: "Finish",
    repeatLesson: "Repeat this lesson",
    allLessons: "Back to all lessons",
    dialogLabel: "Lesson completion message",
  },
  zh: {
    title: "课程完成！",
    message: "恭喜！你已完成本课的所有句子。",
    nextLesson: "继续下一课",
    finish: "完成",
    repeatLesson: "重新学习本课",
    allLessons: "返回全部课程",
    dialogLabel: "课程完成提示",
  },
  ja: {
    title: "レッスン完了！",
    message: "おめでとうございます！このレッスンのすべての文を完了しました。",
    nextLesson: "次のレッスンへ",
    finish: "完了",
    repeatLesson: "このレッスンをもう一度",
    allLessons: "すべてのレッスンに戻る",
    dialogLabel: "レッスン完了のお知らせ",
  },
} as const satisfies Record<UiLocale, Record<string, string>>;

export type LessonCompletionMessageKey = keyof typeof messages.en;
export const lessonCompletionT = (locale: UiLocale, key: LessonCompletionMessageKey) => messages[locale][key];
