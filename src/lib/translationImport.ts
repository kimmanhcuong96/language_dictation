export const TRANSLATION_IMPORT_LANGUAGES = [
  { code: "vi", name: "Vietnamese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
] as const;

export type TranslationImportLanguageCode = typeof TRANSLATION_IMPORT_LANGUAGES[number]["code"];

const languageByCode = new Map<string, typeof TRANSLATION_IMPORT_LANGUAGES[number]>(
  TRANSLATION_IMPORT_LANGUAGES.map((language) => [language.code, language]),
);

export function getTranslationImportLanguage(code: string) {
  return languageByCode.get(code.toLocaleLowerCase());
}

export interface ParsedTranslationText {
  lines: string[];
  error?: "translation_empty" | "translation_blank_line" | "translation_line_count_mismatch";
  line?: number;
  expected?: number;
  actual?: number;
}

export function parseTranslationText(text: string, expectedLineCount: number): ParsedTranslationText {
  const normalized = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = normalized.split(/\r\n|\n|\r/u);
  if (lines.at(-1) === "") lines.pop();
  if (!lines.length) return { lines, error: "translation_empty" };
  const blankIndex = lines.findIndex((line) => !line.trim());
  if (blankIndex >= 0) return { lines, error: "translation_blank_line", line: blankIndex + 1 };
  if (lines.length !== expectedLineCount) {
    return { lines, error: "translation_line_count_mismatch", expected: expectedLineCount, actual: lines.length };
  }
  return { lines: lines.map((line) => line.trim()) };
}

export function parsePackageTranslationFilename(name: string) {
  const fileName = name.replace(/\\/gu, "/").split("/").at(-1) ?? "";
  const match = fileName.match(/^(.+)\.([^.]+)\.txt$/u);
  if (!match) return null;
  const language = getTranslationImportLanguage(match[2]);
  return { basename: match[1], languageCode: match[2].toLocaleLowerCase(), language };
}
