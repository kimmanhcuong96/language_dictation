import { describe, expect, it } from "vitest";
import type { LessonManifestItem } from "./lessonManifest";
import { buildTopicSummaries, formatLevelRange } from "./topicCatalog";

const lesson = (overrides: Partial<LessonManifestItem>): LessonManifestItem => ({ id: crypto.randomUUID(), name: "Lesson", slug: "lesson", path: "/lessons/a1/topic/lesson", parentId: "en-section", language: "en", level: "A1", categorySlug: "short-stories", categoryName: "Short Stories", sectionId: "section", sectionNumber: 1, sectionTitle: "Section 1", order: 1, sentenceCount: 20, updatedAt: "2026-01-01", ...overrides });

describe("topic catalog", () => {
  it("aggregates lesson count and ordered level range", () => {
    const topics = buildTopicSummaries([lesson({ level: "B1" }), lesson({ level: "A1" }), lesson({ level: "B1" }), lesson({ language: "zh" })], "en");
    expect(topics).toHaveLength(1);
    expect(topics[0]).toMatchObject({ lessonCount: 3, levels: ["A1", "B1"], initials: "SS" });
    expect(formatLevelRange(topics[0].levels, "All")).toBe("A1–B1");
  });

  it("handles topics without a level", () => {
    const [topic] = buildTopicSummaries([lesson({ level: null })], "en", [{ slug: "short-stories", name: "Short Stories", description: "Short listening stories." }]);
    expect(formatLevelRange(topic.levels, "All levels")).toBe("All levels");
    expect(topic.description).toBe("Short listening stories.");
  });

  it("keeps published categories that do not have lessons yet", () => {
    const topics = buildTopicSummaries([], "en", [{ slug: "conversations", name: "Conversations", description: null }]);
    expect(topics[0]).toMatchObject({ slug: "conversations", lessonCount: 0 });
  });
});
