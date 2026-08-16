import type { TargetLanguage } from "../types";

export type TokenStatus = "correct" | "near-correct" | "incorrect" | "hidden";
export interface DictationToken { text: string; typed?: string; status: TokenStatus; }
export interface DictationResult { correct: boolean; tokens: DictationToken[]; firstIncorrectIndex: number | null; }

export interface DictationNormalizer { normalize(text: string): string; tokenize(text: string): string[]; }

const sentencePunctuation = /^[.!?;,:]+|[.!?;,:]+$/gu;
const english: DictationNormalizer = {
  normalize(text) {
    return text.normalize("NFKC").toLocaleLowerCase().replace(/[’‘]/gu, "'").replace(/[“”"]/gu, "").replace(/\s+/gu, " ").trim().replace(sentencePunctuation, "").trim();
  },
  tokenize(text) { const value = this.normalize(text); return value ? value.split(/\s+/u).filter(Boolean) : []; },
};

const generic: DictationNormalizer = {
  normalize(text) { return text.normalize("NFKC").replace(/\s+/gu, " ").trim(); },
  tokenize(text) { const value = this.normalize(text); return value ? value.split(/\s+/u).filter(Boolean) : []; },
};

export const normalizers: Record<TargetLanguage, DictationNormalizer> = { en: english, ja: generic, zh: generic };
export const getNormalizer = (language: TargetLanguage): DictationNormalizer => normalizers[language];

export function levenshtein(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j++) { const above = row[j]; row[j] = left[i - 1] === right[j - 1] ? diagonal : 1 + Math.min(row[j], row[j - 1], diagonal); diagonal = above; }
  }
  return row[right.length];
}

export const isNearCorrect = (actual: string, expected: string) => {
  if (expected.length < 4) return false;
  const distance = levenshtein(actual, expected);
  return distance > 0 && distance <= Math.max(1, Math.floor(expected.length * 0.25));
};

export function evaluateAnswer({ expected, actual, language = "en" }: { expected: string; actual: string; language?: TargetLanguage }): DictationResult {
  const normalizer = getNormalizer(language), expectedTokens = normalizer.tokenize(expected), actualTokens = normalizer.tokenize(actual);
  let firstIncorrectIndex: number | null = null;
  const tokens = expectedTokens.map((text, index) => {
    const typed = actualTokens[index];
    const status: TokenStatus = typed === text ? "correct" : typed && isNearCorrect(typed, text) ? "near-correct" : "incorrect";
    if (status !== "correct" && firstIncorrectIndex === null) firstIncorrectIndex = index;
    const visibleStatus: TokenStatus = firstIncorrectIndex !== null && index > firstIncorrectIndex ? "hidden" : status;
    return { text, typed, status: visibleStatus };
  });
  return { correct: firstIncorrectIndex === null && actualTokens.length === expectedTokens.length, tokens, firstIncorrectIndex };
}
