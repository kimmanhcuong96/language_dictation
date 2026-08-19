import { describe, expect, it } from "vitest";
import { detectLikelyProperNouns } from "./properNouns";

describe("proper noun suggestions", () => {
  it("detects names at the start and within a sentence", () => expect(detectLikelyProperNouns("Jessica met Mark in New York.")).toEqual(["Jessica", "Mark", "New York"]));
  it("ignores ordinary capitalized sentence starters and I", () => expect(detectLikelyProperNouns("Today I went home. The weather was mild.")).toEqual([]));
  it("deduplicates repeated names", () => expect(detectLikelyProperNouns("Anna called Anna.")).toEqual(["Anna"]));
  it("keeps initialisms together with an adjacent organization name", () => expect(detectLikelyProperNouns("The U.S. Navy arrived.")).toEqual(["U.S. Navy"]));
});
