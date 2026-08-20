import { describe, expect, it } from "vitest";
import { describeImportResource, normalizeImportBasename, pairImportResources, parseNonAiSrt, validateImportCandidateSlugs } from "./nonAiImport";

describe("non-AI batch import", () => {
  it("pairs MP3 and SRT resources by their exact filename stem", () => {
    const result = pairImportResources([
      describeImportResource("01_English Greetings.mp3", 100),
      describeImportResource("01_English Greetings.srt", 100),
    ]);
    expect(result).toMatchObject([{ lessonName: "English Greetings", slug: "english-greetings", lessonOrder: 1, errors: [] }]);
  });

  it("reports missing, unsupported and duplicate resources individually", () => {
    const result = pairImportResources([
      describeImportResource("01_one.mp3", 100),
      describeImportResource("02_two.srt", 100),
      describeImportResource("notes.pdf", 10),
      describeImportResource("03_same.mp3", 100),
      describeImportResource("03_same.mp3", 100),
      describeImportResource("03_same.srt", 100),
    ]);
    expect(result.find((item) => item.lessonName === "one")?.errors).toContain("missing_srt");
    expect(result.find((item) => item.lessonName === "two")?.errors).toContain("missing_mp3");
    expect(result.find((item) => item.lessonName === "notes.pdf")?.errors).toContain("unsupported_file_type");
    expect(result.find((item) => item.lessonName === "same")?.errors).toContain("duplicate_audio_file");
  });

  it("attaches supported translation files to their lesson package", () => {
    const [result] = pairImportResources([
      describeImportResource("01_business.mp3", 100),
      describeImportResource("01_business.srt", 100),
      describeImportResource("01_business.vi.txt", 100),
      describeImportResource("01_business.zh.txt", 100),
    ]);
    expect(result.translations).toEqual({ vi: "01_business.vi.txt", zh: "01_business.zh.txt" });
    expect(result.errors).toEqual([]);
  });

  it("ignores redundant .en.txt files and keeps SRT as the canonical source", () => {
    expect(describeImportResource("01_business.en.txt",100)).toMatchObject({kind:"ignored"});
    const [result]=pairImportResources([
      describeImportResource("01_business.mp3",100),
      describeImportResource("01_business.srt",100),
      describeImportResource("01_business.en.txt",100),
      describeImportResource("01_business.vi.txt",100),
    ]);
    expect(result).toMatchObject({translations:{vi:"01_business.vi.txt"},errors:[]});
    expect(result.errors).not.toContain("unsupported_translation_language:en");
  });

  it("groups a YouTube link, SRT, and translations as one lesson", () => {
    const [result] = pairImportResources([
      describeImportResource("lesson 01.link.txt", 100),
      describeImportResource("lesson 01.srt", 100),
      describeImportResource("lesson 01.name.json", 100),
      describeImportResource("lesson 01.vi.txt", 100),
      describeImportResource("lesson 01.zh.txt", 100),
    ]);
    expect(result).toMatchObject({
      key: "lesson 01",
      lessonName: "lesson 01",
      sourceType: "youtube",
      linkName: "lesson 01.link.txt",
      namesName: "lesson 01.name.json",
      srtName: "lesson 01.srt",
      translations: { vi: "lesson 01.vi.txt", zh: "lesson 01.zh.txt" },
      errors: [],
    });
  });

  it("does not treat .link.txt as a translation and requires the matching SRT", () => {
    expect(describeImportResource("name.link.txt", 100)).toMatchObject({ kind: "youtube_link", lessonBasename: "name" });
    const [result] = pairImportResources([describeImportResource("name.link.txt", 100)]);
    expect(result.errors).toContain("missing_srt");
    expect(result.errors).not.toContain("missing_mp3");
  });

  it("recognizes .name.json as optional sentence metadata",()=>{
    expect(describeImportResource("name.name.json",100)).toMatchObject({kind:"names",lessonBasename:"name"});
  });

  it("attaches a .name.json file to a numbered audio lesson",()=>{
    const [result]=pairImportResources([
      describeImportResource("01_people.mp3",100),
      describeImportResource("01_people.srt",100),
      describeImportResource("01_people.name.json",100),
    ]);
    expect(result).toMatchObject({sourceType:"audio",namesName:"01_people.name.json",errors:[]});
  });

  it("rejects a group containing both R2 audio and a YouTube link", () => {
    const [result] = pairImportResources([
      describeImportResource("01_conflict.mp3", 100),
      describeImportResource("01_conflict.link.txt", 100),
      describeImportResource("01_conflict.srt", 100),
    ]);
    expect(result.errors).toContain("conflicting_media_sources");
  });

  it("invalidates the package when a translation language is unsupported", () => {
    const result = pairImportResources([
      describeImportResource("01_business.mp3", 100),
      describeImportResource("01_business.srt", 100),
      describeImportResource("01_business.fr.txt", 100),
    ]).find(candidate=>candidate.lessonName==="business");
    expect(result?.errors).toContain("unsupported_translation_language:fr");
  });

  it("does not silently accept a spelled-out language token", () => {
    const result = pairImportResources([
      describeImportResource("01_business.mp3", 100),
      describeImportResource("01_business.srt", 100),
      describeImportResource("01_business.vietnamese.txt", 100),
    ]).find(candidate=>candidate.lessonName==="business");
    expect(result?.errors).toContain("unsupported_translation_language:vietnamese");
  });

  it("assigns sequential slugs for duplicate generated slugs within one batch", () => {
    const candidates = pairImportResources(["01_One lesson.mp3", "01_One lesson.srt", "02_One--lesson.mp3", "02_One--lesson.srt"].map((name) => describeImportResource(name, 100)));
    const result = validateImportCandidateSlugs(candidates, () => false);
    expect(result.map((item) => item.slug)).toEqual(["one-lesson", "one-lesson-1"]);
    expect(result.every((item) => item.errors.length===0)).toBe(true);
  });

  it("assigns the first available suffix when generated slugs are already used", () => {
    const candidates = pairImportResources(["01_One lesson.mp3", "01_One lesson.srt"].map((name) => describeImportResource(name, 100)));
    const result = validateImportCandidateSlugs(candidates, (slug) => new Set(["one-lesson","one-lesson-1"]).has(slug));
    expect(result[0].slug).toBe("one-lesson-2");
    expect(result[0].errors).toEqual([]);
  });

  it("derives understandable lesson names and validates standard SRT", () => {
    expect(normalizeImportBasename("folder/09_Greetings.mp3")).toEqual({ key: "09_Greetings", lessonName: "Greetings", slug: "greetings", lessonOrder: 9, sourceFilename: "09_Greetings.mp3" });
    expect(normalizeImportBasename("1_Greetings.mp3")).toBeNull();
    expect(normalizeImportBasename("00_Greetings.mp3")).toBeNull();
    expect(normalizeImportBasename("100_Greetings.mp3")).toBeNull();
    expect(normalizeImportBasename("01-Greetings.mp3")).toBeNull();
    expect(normalizeImportBasename("01 - Greetings.mp3")).toBeNull();
    expect(normalizeImportBasename("Greetings_01.mp3")).toBeNull();
    expect(normalizeImportBasename("Greetings.mp3")).toBeNull();
    expect(describeImportResource("01_Greetings.MP3",100).error).toBe("invalid_lesson_filename");
    expect(parseNonAiSrt("1\n00:00:00,000 --> 00:00:01,000\nHello.\n\n2\n00:00:01,000 --> 00:00:02,000\nWorld.", 2000)).toHaveLength(2);
    expect(() => parseNonAiSrt("1\n00:00:00,000 --> 00:00:03,000\nToo long.", 2000)).toThrow("sentence_1_outside_audio");
  });

  it("does not pair stems that differ by case", () => {
    const result = pairImportResources([describeImportResource("01_Lesson.mp3", 100), describeImportResource("01_lesson.srt", 100)]);
    expect(result).toHaveLength(2);
    expect(result.flatMap((item) => item.errors)).toEqual(expect.arrayContaining(["missing_mp3", "missing_srt"]));
  });

  it("rejects duplicate lesson orders even when lesson names differ", () => {
    const result = pairImportResources(["01_First.mp3", "01_First.srt", "01_Second.mp3", "01_Second.srt"].map((name) => describeImportResource(name, 100)));
    expect(result.every((item) => item.errors.includes("duplicate_lesson_order:1"))).toBe(true);
  });

  it("derives order from each filename instead of upload order", () => {
    const result = pairImportResources(["07_Later.srt","02_Earlier.mp3","07_Later.mp3","02_Earlier.srt"].map((name)=>describeImportResource(name,100)));
    expect(Object.fromEntries(result.map((item)=>[item.lessonName,item.lessonOrder]))).toEqual({Later:7,Earlier:2});
  });
});
