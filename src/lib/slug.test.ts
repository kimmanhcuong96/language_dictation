import { describe, expect, it } from "vitest";
import { slugifyTitle } from "./slug";

describe("slugifyTitle", () => {
  it("creates a URL-safe slug from a title", () => expect(slugifyTitle("First Snowfall")).toBe("first-snowfall"));
  it("removes accents and punctuation", () => expect(slugifyTitle("Café: A Quiet Morning!")).toBe("cafe-a-quiet-morning"));
  it("returns an empty slug when no Latin title characters remain", () => expect(slugifyTitle("中文课")).toBe(""));
});
