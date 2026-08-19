const sentenceStartWords = new Set([
  "a", "an", "the", "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those", "there", "here",
  "what", "when", "where", "which", "who", "why", "how", "is", "are", "was", "were", "do", "does", "did", "can", "could",
  "will", "would", "should", "have", "has", "had", "today", "tomorrow", "yesterday", "please", "yes", "no",
]);

export function detectLikelyProperNouns(text: string): string[] {
  const matches = [...text.matchAll(/(?:[\p{Lu}]\.){2,}|[\p{Lu}][\p{L}\p{M}'\u2019-]*/gu)], candidates: Array<{ value:string; start:number; end:number }> = [];
  for (const match of matches) {
    const word = match[0].replace(/\u2019/gu, "'"), start = match.index ?? 0;
    const sentenceStart = start === 0 || /[.!?]\s*$/u.test(text.slice(0, start));
    if (word === "I" || (sentenceStart && sentenceStartWords.has(word.toLocaleLowerCase("en")))) continue;
    const previous = candidates.at(-1);
    if (previous && /^\s+$/u.test(text.slice(previous.end, start))) {
      previous.value += ` ${word}`;
      previous.end = start + match[0].length;
    } else candidates.push({ value:word, start, end:start + match[0].length });
  }
  const unique = new Map(candidates.map(candidate => [candidate.value.toLocaleLowerCase("en"), candidate.value]));
  return [...unique.values()];
}
