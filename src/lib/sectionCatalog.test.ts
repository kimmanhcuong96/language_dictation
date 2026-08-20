import { describe, expect, it } from "vitest";
import type { LessonManifestItem } from "./lessonManifest";
import { buildLessonSections, collectLessonLevels, filterLessonSections } from "./sectionCatalog";

const lesson = (overrides: Partial<LessonManifestItem>): LessonManifestItem => ({ id: crypto.randomUUID(), name: "Lesson", slug: "lesson", path: "/lessons/a1/topic/lesson", parentId: "en-section-1", language: "en", level: "A1", categorySlug: "topic", categoryName: "Topic", sectionId: "section-1", sectionNumber: 1, sectionTitle: "Section 1", order: 1, sentenceCount: 20, updatedAt: "2026-01-01", ...overrides });

describe("section catalog", () => {
  it("groups and orders sections and lessons", () => {
    const sections = buildLessonSections([
      lesson({ id: "later", sectionId: "section-2", sectionNumber: 2 }),
      lesson({ id: "second", order: 2 }),
      lesson({ id: "first", order: 1 }),
    ], "en", "topic");
    expect(sections.map(section => section.id)).toEqual(["section-1", "section-2"]);
    expect(sections[0].lessons.map(item => item.id)).toEqual(["first", "second"]);
  });

  it("preserves filename-derived gaps while sorting by order", () => {
    const sections = buildLessonSections([
      lesson({ id: "fifth", order: 5 }),
      lesson({ id: "first", order: 1 }),
      lesson({ id: "third", order: 3 }),
    ], "en", "topic");
    expect(sections[0].lessons.map(item => [item.id,item.order])).toEqual([["first",1],["third",3],["fifth",5]]);
  });

  it("filters lessons while retaining their section", () => {
    const sections = buildLessonSections([lesson({ name: "First Snowfall" }), lesson({ name: "Summer Holiday", level: "B1" })], "en", "topic");
    expect(filterLessonSections(sections, "snow", "A1")[0].lessons[0].name).toBe("First Snowfall");
    expect(filterLessonSections(sections, "snow", "B1")).toEqual([]);
  });

  it("collects levels in CEFR order", () => {
    const sections = buildLessonSections([lesson({ level: "C1" }), lesson({ level: "A2" }), lesson({ level: null })], "en", "topic");
    expect(collectLessonLevels(sections)).toEqual(["A2", "C1"]);
  });

  it("retains authoritative empty sections until filters are applied", () => {
    const sections = buildLessonSections([], "en", "topic", [{ id: "empty", number: 1, title: "Section 1" }]);
    expect(sections).toHaveLength(1);
    expect(filterLessonSections(sections, "", "all")).toHaveLength(1);
    expect(filterLessonSections(sections, "lesson", "all")).toEqual([]);
  });
});
