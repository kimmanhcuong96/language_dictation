import type { ProgressMap } from "../types";

const KEY = "me2listen-progress-v1";
const LEGACY_KEY = "echotype-progress-v1";

export const loadProgress = (): ProgressMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const saveProgress = (progress: ProgressMap) => {
  localStorage.setItem(KEY, JSON.stringify(progress));
};

export const clearProgress = () => localStorage.removeItem(KEY);
