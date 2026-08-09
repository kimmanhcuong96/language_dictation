export type Level = "A1" | "A2" | "B1" | "B2";
export type TargetLanguage = "en" | "zh" | "ja";
export type UiLocale = "vi" | "en" | "zh" | "ja";

export interface Sentence {
  id: string;
  text: string;
  translation: string;
  audio?: string;
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  summary: string;
  level: Level;
  duration: number;
  topic: string;
  language: TargetLanguage;
  section: number;
  emoji: string;
  accent: "US" | "UK" | "Mandarin" | "Tokyo";
  sentences: Sentence[];
}

export interface LessonProgress {
  completed: number[];
  attempts: number;
  correct: number;
  updatedAt: string;
}

export type ProgressMap = Record<string, LessonProgress>;
