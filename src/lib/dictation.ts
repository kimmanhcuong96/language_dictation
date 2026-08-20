import type { TargetLanguage } from "../types";
import { displayEnglishComparisonToken, normalizeEnglishForComparison } from "./englishNormalization";

export type TokenStatus = "correct" | "near-correct" | "incorrect" | "hidden";
export interface DictationToken { text: string; typed?: string; status: TokenStatus; }
export interface DictationResult { correct: boolean; tokens: DictationToken[]; displayTokens: DictationToken[]; firstIncorrectIndex: number | null; }

export interface DictationNormalizer { normalize(text: string): string; tokenize(text: string): string[]; }

const english: DictationNormalizer = {
  normalize: normalizeEnglishForComparison,
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

function displayStatus(tokens: DictationToken[]): TokenStatus {
  if (tokens.some(token => token.status === "incorrect")) return "incorrect";
  if (tokens.some(token => token.status === "near-correct")) return "near-correct";
  if (tokens.some(token => token.status === "hidden")) return "hidden";
  return "correct";
}

function buildDisplayTokens(expected: string, comparisonTokens: DictationToken[], normalizer: DictationNormalizer): DictationToken[] {
  const words = [...expected.matchAll(/[\p{L}\p{N}'\u02bc\u2018\u2019]+/gu)].map(match => ({ index: match.index, end: match.index + match[0].length }));
  if (!words.length) return expected ? [{ text: expected, status: comparisonTokens[0]?.status ?? "correct" }] : [];

  const expectedComparison = normalizer.tokenize(expected);
  const displayTokens: DictationToken[] = [];
  let wordIndex = 0, comparisonIndex = 0;
  while (wordIndex < words.length) {
    let matchedWordEnd = wordIndex + 1, matchedComparisonLength = 0;
    for (let wordEnd = wordIndex + 1; wordEnd <= words.length; wordEnd += 1) {
      const candidate = normalizer.tokenize(expected.slice(words[wordIndex].index, words[wordEnd - 1].end));
      if (candidate.length && candidate.every((token, offset) => token === expectedComparison[comparisonIndex + offset])) {
        matchedWordEnd = wordEnd;
        matchedComparisonLength = candidate.length;
        break;
      }
    }
    if (!matchedComparisonLength) matchedComparisonLength = Math.min(1, comparisonTokens.length - comparisonIndex);
    const textStart = wordIndex === 0 ? 0 : words[wordIndex].index;
    const textEnd = matchedWordEnd < words.length ? words[matchedWordEnd].index : expected.length;
    const sourceTokens = comparisonTokens.slice(comparisonIndex, comparisonIndex + matchedComparisonLength);
    displayTokens.push({ text: expected.slice(textStart, textEnd), status: displayStatus(sourceTokens) });
    wordIndex = matchedWordEnd;
    comparisonIndex += matchedComparisonLength;
  }
  return displayTokens;
}

export function evaluateAnswer({ expected, actual, language = "en" }: { expected: string; actual: string; language?: TargetLanguage }): DictationResult {
  const normalizer = getNormalizer(language), expectedTokens = normalizer.tokenize(expected), actualTokens = normalizer.tokenize(actual);
  let firstIncorrectIndex: number | null = null;
  const tokens = expectedTokens.map((comparisonText, index) => {
    const typed = actualTokens[index];
    const status: TokenStatus = typed === comparisonText ? "correct" : typed && isNearCorrect(typed, comparisonText) ? "near-correct" : "incorrect";
    if (status !== "correct" && firstIncorrectIndex === null) firstIncorrectIndex = index;
    const visibleStatus: TokenStatus = firstIncorrectIndex !== null && index > firstIncorrectIndex ? "hidden" : status;
    return { text:language === "en" ? displayEnglishComparisonToken(comparisonText) : comparisonText, typed, status: visibleStatus };
  });
  return { correct: firstIncorrectIndex === null && actualTokens.length === expectedTokens.length, tokens, displayTokens: buildDisplayTokens(expected, tokens, normalizer), firstIncorrectIndex };
}
