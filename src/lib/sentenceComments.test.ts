import { describe, expect, it } from "vitest";
import { decodeSentenceCommentCursor, encodeSentenceCommentCursor, normalizeSentenceComment, truncateSentenceComment } from "./sentenceComments";

describe("sentence comments", () => {
  it("normalizes safe multiline text", () => {
    expect(normalizeSentenceComment("  Hello\r\nworld  ")).toBe("Hello\nworld");
  });

  it("rejects empty, oversized, control-heavy, and excessive-line comments", () => {
    expect(normalizeSentenceComment("   ")).toBeNull();
    expect(normalizeSentenceComment("a".repeat(500))).toHaveLength(500);
    expect(normalizeSentenceComment("a".repeat(501))).toBeNull();
    expect(normalizeSentenceComment("hello\u0000world")).toBeNull();
    expect(normalizeSentenceComment(Array.from({ length: 6 }, () => "line").join("\n"))).toBeNull();
  });

  it("round-trips an opaque pagination cursor and rejects invalid cursors", () => {
    const cursor = { createdAt: "2026-08-20T12:00:00.000Z", id: "123e4567-e89b-12d3-a456-426614174000" };
    expect(decodeSentenceCommentCursor(encodeSentenceCommentCursor(cursor))).toEqual(cursor);
    expect(decodeSentenceCommentCursor("not-a-valid-cursor")).toBeNull();
  });

  it("truncates by Unicode code point instead of UTF-16 code unit", () => {
    expect([...truncateSentenceComment("😊".repeat(501))]).toHaveLength(500);
  });
});
