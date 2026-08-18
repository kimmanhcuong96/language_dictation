import { describe, expect, it } from "vitest";
import { findNextLesson, type LessonManifest, type LessonManifestItem } from "./lessonManifest";

const lesson = (id: string, language: string): LessonManifestItem => ({
  id, language, name: `Lesson ${id}`, slug: id, path: `/lessons/a1/topic/${id}`,
  parentId: `${language}-section`, level: "A1", categorySlug: "topic", categoryName: "Topic",
  sectionId: "section", sectionNumber: 1, sectionTitle: "Section 1", order: 1,
  sentenceCount: 5, updatedAt: "2026-01-01",
});

const manifest: LessonManifest = { version: "1", lessons: [lesson("en-1", "en"), lesson("ja-1", "ja"), lesson("en-2", "en")] };

describe("findNextLesson", () => {
  it("returns the next lesson in manifest order for the requested language", () => {
    expect(findNextLesson(manifest, "en-1")?.id).toBe("en-2");
  });

  it("returns undefined for the final or unknown lesson", () => {
    expect(findNextLesson(manifest, "en-2")).toBeUndefined();
    expect(findNextLesson(manifest, "missing")).toBeUndefined();
  });
});
