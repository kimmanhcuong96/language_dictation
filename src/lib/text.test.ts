import { describe, expect, it } from "vitest";
import { answerScore, compareAnswer, normalize } from "./text";

describe("dictation text comparison", () => {
  it("ignores capitalization and punctuation", () => {
    expect(normalize("Hello, WORLD!")).toBe("hello world");
    expect(answerScore("Hello, world!", "hello world")).toBe(100);
  });

  it("marks missing and incorrect words", () => {
    expect(compareAnswer("the quick fox", "the slow").map((item) => item.status)).toEqual([
      "correct",
      "wrong",
      "missing",
    ]);
  });

  it("supports Chinese and Japanese characters", () => {
    expect(answerScore("我喜欢喝茶。", "我喜欢喝茶")).toBe(100);
    expect(answerScore("猫は白いです。", "猫は白いです")).toBe(100);
  });
});
