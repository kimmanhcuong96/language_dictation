import { describe, expect, it } from "vitest";
import { findActiveTranscriptIndex } from "./transcriptTracking";

const lines = [
  { start_ms: 0, end_ms: 1_000 },
  { start_ms: 1_000, end_ms: 2_000 },
  { start_ms: 2_500, end_ms: 3_000 },
];

describe("findActiveTranscriptIndex", () => {
  it("selects the line containing the current playback time", () => {
    expect(findActiveTranscriptIndex(lines, 0)).toBe(0);
    expect(findActiveTranscriptIndex(lines, 1_500)).toBe(1);
  });

  it("moves to the next line at a shared boundary", () => {
    expect(findActiveTranscriptIndex(lines, 1_000)).toBe(1);
  });

  it("does not highlight a line during a transcript gap", () => {
    expect(findActiveTranscriptIndex(lines, 2_250)).toBe(-1);
  });

  it("includes the final line end but excludes later playback", () => {
    expect(findActiveTranscriptIndex(lines, 3_000)).toBe(2);
    expect(findActiveTranscriptIndex(lines, 3_001)).toBe(-1);
  });
});
