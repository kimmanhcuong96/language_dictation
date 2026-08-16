import { describe, expect, it } from "vitest";
import { evaluateAnswer, isNearCorrect } from "./dictation";

describe("dictation engine", () => {
  it("normalizes English punctuation and apostrophes", () => expect(evaluateAnswer({ expected: "I don't know.", actual: " i don’t know " }).correct).toBe(true));
  it("ignores surrounding quotation marks", () => expect(evaluateAnswer({ expected: '"I don’t know."', actual: "i don't know" }).correct).toBe(true));
  it("hides words after the first error", () => expect(evaluateAnswer({ expected: "Today is November fifth.", actual: "Today is Novembar" }).tokens.map((x) => x.status)).toEqual(["correct", "correct", "near-correct", "hidden"]));
  it("uses a configurable simple fuzzy threshold", () => expect(isNearCorrect("novembar", "november")).toBe(true));
  it("does not fuzzy-match genuinely different short words", () => expect(isNearCorrect("go", "do")).toBe(false));
});
