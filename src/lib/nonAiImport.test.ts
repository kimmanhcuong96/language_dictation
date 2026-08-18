import { describe, expect, it } from "vitest";
import { describeImportResource, normalizeImportBasename, pairImportResources, parseNonAiSrt } from "./nonAiImport";

describe("non-AI batch import", () => {
  it("pairs MP3 and SRT resources by normalized basename", () => {
    const result = pairImportResources([
      describeImportResource("English Greetings.MP3", 100),
      describeImportResource("english greetings.srt", 100),
    ]);
    expect(result).toMatchObject([{ lessonName: "English Greetings", slug: "english-greetings", errors: [] }]);
  });

  it("reports missing, unsupported and duplicate resources individually", () => {
    const result = pairImportResources([
      describeImportResource("one.mp3", 100),
      describeImportResource("two.srt", 100),
      describeImportResource("notes.txt", 10),
      describeImportResource("same.mp3", 100),
      describeImportResource("same.MP3", 100),
      describeImportResource("same.srt", 100),
    ]);
    expect(result.find((item) => item.lessonName === "one")?.errors).toContain("missing_srt");
    expect(result.find((item) => item.lessonName === "two")?.errors).toContain("missing_mp3");
    expect(result.find((item) => item.lessonName === "notes.txt")?.errors).toContain("unsupported_file_type");
    expect(result.find((item) => item.lessonName === "same")?.errors).toContain("duplicate_audio_file");
  });

  it("rejects duplicate generated slugs", () => {
    const result = pairImportResources(["One lesson.mp3", "One lesson.srt", "One--lesson.mp3", "One--lesson.srt"].map((name) => describeImportResource(name, 100)));
    expect(result.filter((item) => item.errors.includes("duplicate_slug_in_batch"))).toHaveLength(2);
  });

  it("derives understandable lesson names and validates standard SRT", () => {
    expect(normalizeImportBasename("folder/001 Greetings.mp3")).toEqual({ key: "001 greetings", lessonName: "001 Greetings", slug: "001-greetings" });
    expect(parseNonAiSrt("1\n00:00:00,000 --> 00:00:01,000\nHello.\n\n2\n00:00:01,000 --> 00:00:02,000\nWorld.", 2000)).toHaveLength(2);
    expect(() => parseNonAiSrt("1\n00:00:00,000 --> 00:00:03,000\nToo long.", 2000)).toThrow("sentence_1_outside_audio");
  });
});
