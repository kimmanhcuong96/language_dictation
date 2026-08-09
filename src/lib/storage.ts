import type { ProgressMap } from "../types";

const KEY = "echotype-progress-v1";

export const loadProgress = (): ProgressMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const saveProgress = (progress: ProgressMap) => {
  localStorage.setItem(KEY, JSON.stringify(progress));
};

export const clearProgress = () => localStorage.removeItem(KEY);
