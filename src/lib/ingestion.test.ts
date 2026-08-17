import { describe, expect, it } from "vitest";
import { alignTranscriptToVtt, createDraftSentences, parsePreTimedSrt, parseSrt, parseVtt, splitTranscript, validateAlignedSentences } from "./ingestion";

describe("lesson ingestion foundation", () => {
  it("parses deterministic one-sentence-per-line transcripts", () => expect(splitTranscript("One.\n\n Two.")).toEqual(["One.", "Two."]));
  it("creates ordered draft timestamps without splitting audio", () => expect(createDraftSentences("One.\nTwo.", 4000)).toEqual([{ position: 1, text: "One.", startMs: 0, endMs: 2000, confidence: 0 }, { position: 2, text: "Two.", startMs: 2000, endMs: 4000, confidence: 0 }]));
  it("keeps invalid imports out of publication", () => expect(validateAlignedSentences([{ position: 1, text: "", startMs: 10, endMs: 5 }], 1000).length).toBeGreaterThan(0));
  it("maps only supplied script text and ignores unscripted ASR speech", () => {
    const vtt = "WEBVTT\n\n00:00.000 --> 00:01.000\nWelcome to the show\n\n00:01.000 --> 00:02.000\nCanonical one\n\n00:02.000 --> 00:03.000\nUnscripted aside\n\n00:03.000 --> 00:04.000\nCanonical two\n\n00:04.000 --> 00:05.000\nThanks for listening";
    expect(parseVtt(vtt)).toHaveLength(5);
    const aligned = alignTranscriptToVtt("Canonical one.\nCanonical two.", vtt, 5000);
    expect(aligned.map((item) => item.text)).toEqual(["Canonical one.", "Canonical two."]);
    expect(aligned.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([[1000, 2000], [3000, 4000]]);
  });
  it("rejects a script line that cannot be mapped to ASR cues", () => {
    expect(() => alignTranscriptToVtt("Missing line.", "WEBVTT\n\n00:00.000 --> 00:01.000\nOther words", 1000)).toThrow("transcript_alignment_unmappable_1");
  });
  it("normalizes SRT into the shared sentence format", () => expect(parsePreTimedSrt("1\n00:00:00,000 --> 00:00:00,900\nOne.\n\n2\n00:00:00,900 --> 00:00:01,800\nTwo.","One.\nTwo.")).toEqual([{position:1,text:"One.",startMs:0,endMs:900,confidence:1},{position:2,text:"Two.",startMs:900,endMs:1800,confidence:1}]));
  it("rejects invalid SRT and unmappable pre-timed segments", () => {
    expect(()=>parseSrt("1\n00:00:00,000 --> 00:00:00,900\nOne.")).not.toThrow();
    expect(()=>parsePreTimedSrt("1\n00:00:00,000 --> 00:00:00,900\nOne.","One.\nTwo.")).toThrow("pre_timed_srt_script_count_mismatch");
    expect(()=>parsePreTimedSrt("1\n00:00:00,000 --> 00:00:00,900\nWrong.","One.")).toThrow("pre_timed_srt_script_mismatch_1");
    expect(validateAlignedSentences(parsePreTimedSrt("1\n00:00:00,000 --> 00:00:01,000\nOne.\n\n2\n00:00:00,900 --> 00:00:01,800\nTwo.","One.\nTwo."),1800)).toContain("timestamps_not_ordered");
  });
});
