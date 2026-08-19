import { describe, expect, it, vi } from "vitest";
import { findActiveTranscriptIndex, seekAndPlayTranscript } from "./transcriptTracking";

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

describe("seekAndPlayTranscript", () => {
  it("seeks to the sentence start and starts the existing audio", async () => {
    const audio = { currentTime:0, play:vi.fn().mockResolvedValue(undefined) };
    await expect(seekAndPlayTranscript(audio, 2_500)).resolves.toBe(true);
    expect(audio.currentTime).toBe(2.5);
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it("ignores invalid timestamps", async () => {
    const audio = { currentTime:0, play:vi.fn().mockResolvedValue(undefined) };
    await expect(seekAndPlayTranscript(audio, -1)).resolves.toBe(false);
    expect(audio.play).not.toHaveBeenCalled();
  });
});
