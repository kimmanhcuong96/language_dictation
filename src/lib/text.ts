export const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();

export const words = (value: string) => {
  const normalized = normalize(value);
  if (!normalized) return [];
  const chunks = normalized.split(/\s+/).filter(Boolean);
  return chunks.flatMap((chunk) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(chunk) ? [...chunk] : [chunk]);
};

export interface WordResult {
  word: string;
  status: "correct" | "wrong" | "missing";
  typed?: string;
}

export const compareAnswer = (answer: string, typed: string): WordResult[] => {
  const expected = words(answer);
  const actual = words(typed);
  return expected.map((word, index) => ({
    word,
    typed: actual[index],
    status: !actual[index] ? "missing" : actual[index] === word ? "correct" : "wrong",
  }));
};

export const answerScore = (answer: string, typed: string) => {
  const result = compareAnswer(answer, typed);
  if (!result.length) return 0;
  const positionMatches = result.filter((item) => item.status === "correct").length;
  const lengthPenalty = Math.max(0, words(typed).length - result.length);
  return Math.max(0, Math.round(((positionMatches - lengthPenalty * 0.25) / result.length) * 100));
};
