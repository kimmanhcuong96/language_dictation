import { describe, expect, it } from "vitest";
import { evaluateAnswer, getNormalizer, isNearCorrect } from "./dictation";

describe("dictation engine", () => {
  it("normalizes English punctuation and apostrophes", () => expect(evaluateAnswer({ expected: "I don't know.", actual: " i don’t know " }).correct).toBe(true));
  it("ignores surrounding quotation marks", () => expect(evaluateAnswer({ expected: '"I don’t know."', actual: "i don't know" }).correct).toBe(true));
  it("hides words after the first error", () => expect(evaluateAnswer({ expected: "Today is November fifth.", actual: "Today is Novembar" }).tokens.map((x) => x.status)).toEqual(["correct", "correct", "near-correct", "hidden"]));
  it("uses a configurable simple fuzzy threshold", () => expect(isNearCorrect("novembar", "november")).toBe(true));
  it("does not fuzzy-match genuinely different short words", () => expect(isNearCorrect("go", "do")).toBe(false));
  it("normalizes harmless whitespace and all punctuation", () => expect(evaluateAnswer({ expected: "I have gone.", actual: "  I   have—gone!!!  " }).correct).toBe(true));
  it.each([
    ["I am ready", "I'm ready"], ["I have finished", "I've finished"], ["I'd gone", "I had gone"],
    ["You are here", "You're here"], ["He has arrived", "He's arrived"], ["We will go", "We'll go"],
    ["They have left", "They've left"], ["She will return", "She'll return"], ["He had gone", "He'd gone"],
    ["You had finished", "You'd finished"], ["They had arrived", "They'd arrived"], ["I cannot stay", "I can't stay"],
    ["She did not leave", "She didn't leave"], ["It will not work", "It won't work"], ["You should not wait", "You shouldn't wait"],
    ["I have not finished", "I haven't finished"], ["You are not late", "You aren't late"], ["You are not late", "You're not late"],
    ["He is not ready", "He's not ready"], ["He is not ready", "He isn't ready"], ["I am not ready", "I'm not ready"],
    ["We could have waited", "We could've waited"], ["You might not agree", "You mightn't agree"],
  ])("treats %s and %s as equivalent", (expected, actual) => expect(evaluateAnswer({ expected, actual }).correct).toBe(true));
  it.each([
    ["I have one apple", "I have 1 apple"], ["This is the twenty first lesson", "This is the 21st lesson"],
    ["There are nine hundred ninety nine pages", "There are 999 pages"], ["There are nine hundred and ninety nine pages", "There are 999 pages"],
    ["She finished one hundredth", "She finished 100th"], ["This is the one hundred and first lesson", "This is the 101st lesson"],
  ])("normalizes numeric form in %s", (expected, actual) => expect(evaluateAnswer({ expected, actual }).correct).toBe(true));
  it("does not mutate the supplied text", () => { const input = "  I'M ready!  "; getNormalizer("en").normalize(input); expect(input).toBe("  I'M ready!  "); });
  it("keeps internal canonical markers out of feedback", () => expect(evaluateAnswer({ expected:"I am first", actual:"you are second" }).tokens.map(token => token.text)).toEqual(["i am", "first"]));
});
