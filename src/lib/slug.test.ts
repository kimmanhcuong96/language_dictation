import { describe, expect, it } from "vitest";
import { slugifyTitle, uniqueSlug } from "./slug";

describe("slugifyTitle", () => {
  it("creates a URL-safe slug from a title", () => expect(slugifyTitle("First Snowfall")).toBe("first-snowfall"));
  it("removes accents and punctuation", () => expect(slugifyTitle("Café: A Quiet Morning!")).toBe("cafe-a-quiet-morning"));
  it("returns an empty slug when no Latin title characters remain", () => expect(slugifyTitle("中文课")).toBe(""));
});

describe("uniqueSlug", () => {
  it("keeps an unused slug unchanged", () => expect(uniqueSlug("lesson-demo", () => false)).toBe("lesson-demo"));
  it("selects the first available sequential suffix", () => expect(uniqueSlug("lesson-demo", value => new Set(["lesson-demo", "lesson-demo-1"]).has(value))).toBe("lesson-demo-2"));
  it("keeps suffixed slugs within the existing length limit", () => expect(uniqueSlug("a".repeat(80), value => value === "a".repeat(80))).toHaveLength(80));
});
