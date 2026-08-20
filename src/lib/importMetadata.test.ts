import { describe, expect, it } from "vitest";
import { normalizeOptionalLevel } from "./importMetadata";

describe("optional import level", () => {
  it("accepts an omitted or blank level", () => {
    expect(normalizeOptionalLevel(null)).toBe("");
    expect(normalizeOptionalLevel(undefined)).toBe("");
    expect(normalizeOptionalLevel("   ")).toBe("");
  });

  it("normalizes a supplied level", () => {
    expect(normalizeOptionalLevel("  A2  ")).toBe("A2");
    expect(normalizeOptionalLevel("\uFF41\uFF11")).toBe("A1");
    expect(normalizeOptionalLevel("Beginner\u00a0  A1")).toBe("Beginner A1");
  });
});
