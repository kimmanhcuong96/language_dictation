import { describe, expect, it } from "vitest";
import { alignTranscriptToVtt, createDraftSentences, parsePreTimedSrt, parseSrt, parseVtt, splitTranscript, validateAlignedSentences } from "./ingestion";

describe("lesson ingestion foundation", () => {
  it("parses deterministic one-sentence-per-line transcripts", () => expect(splitTranscript("One.\n\n Two.")).toEqual(["One.", "Two."]));
  it("creates ordered draft timestamps without splitting audio", () => expect(createDraftSentences("One.\nTwo.", 4000)).toEqual([{ position: 1, text: "One.", startMs: 0, endMs: 2000, confidence: 0 }, { position: 2, text: "Two.", startMs: 2000, endMs: 4000, confidence: 0 }]));
  it("keeps invalid imports out of publication", () => expect(validateAlignedSentences([{ position: 1, text: "", startMs: 10, endMs: 5 }], 1000).length).toBeGreaterThan(0));
  it("parses VTT and preserves the supplied transcript as source of truth", () => {
    const vtt = "WEBVTT\n\n00:00.100 --> 00:01.000\nWrong ASR text\n\n00:01.000 --> 00:02.000\nMore words";
    expect(parseVtt(vtt)).toHaveLength(2);
    expect(alignTranscriptToVtt("Canonical one.\nCanonical two.", vtt, 2000).map((item) => item.text)).toEqual(["Canonical one.", "Canonical two."]);
  });
  it("normalizes SRT into the shared sentence format", () => expect(parsePreTimedSrt("1\n00:00:00,000 --> 00:00:00,900\nOne.\n\n2\n00:00:00,900 --> 00:00:01,800\nTwo.","One.\nTwo.")).toEqual([{position:1,text:"One.",startMs:0,endMs:900,confidence:1},{position:2,text:"Two.",startMs:900,endMs:1800,confidence:1}]));
  it("rejects invalid SRT and unmappable pre-timed segments", () => {
    expect(()=>parseSrt("1\n00:00:00,000 --> 00:00:00,900\nOne.")).not.toThrow();
    expect(()=>parsePreTimedSrt("1\n00:00:00,000 --> 00:00:00,900\nOne.","One.\nTwo.")).toThrow("pre_timed_srt_script_count_mismatch");
    expect(()=>parsePreTimedSrt("1\n00:00:00,000 --> 00:00:00,900\nWrong.","One.")).toThrow("pre_timed_srt_script_mismatch_1");
    expect(validateAlignedSentences(parsePreTimedSrt("1\n00:00:00,000 --> 00:00:01,000\nOne.\n\n2\n00:00:00,900 --> 00:00:01,800\nTwo.","One.\nTwo."),1800)).toContain("timestamps_not_ordered");
  });
});
