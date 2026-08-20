export const SENTENCE_COMMENT_MAX_LENGTH = 500;
export const SENTENCE_COMMENT_MAX_LINES = 5;

export function truncateSentenceComment(value: string): string {
  return [...value].slice(0, SENTENCE_COMMENT_MAX_LENGTH).join("");
}

export interface SentenceCommentCursor {
  createdAt: string;
  id: string;
}

export function normalizeSentenceComment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  if (!normalized || [...normalized].length > SENTENCE_COMMENT_MAX_LENGTH) return null;
  if (normalized.split("\n").length > SENTENCE_COMMENT_MAX_LINES) return null;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(normalized)) return null;
  return normalized;
}

export function encodeSentenceCommentCursor(cursor: SentenceCommentCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
}

export function decodeSentenceCommentCursor(value: string | null): SentenceCommentCursor | null {
  if (!value || value.length > 512 || !/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    const padded = value.replace(/-/gu, "+").replace(/_/gu, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as Partial<SentenceCommentCursor>;
    if (typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt))) return null;
    if (typeof parsed.id !== "string" || !/^[0-9a-f-]{36}$/iu.test(parsed.id)) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
