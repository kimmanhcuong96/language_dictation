import { describe, expect, it } from "vitest";
import { parseYouTubeLinkText, parseYouTubeVideoId } from "./youtube";

describe("YouTube lesson URLs", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=12",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  ])("extracts a supported video id from %s", (url) => {
    expect(parseYouTubeVideoId(url)).toBe("dQw4w9WgXcQ");
  });

  it.each([
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=too-short",
    "not a url",
  ])("rejects unsupported URLs: %s", (url) => {
    expect(parseYouTubeVideoId(url)).toBeNull();
  });

  it("accepts one trimmed URL in a UTF-8 link file", () => {
    expect(parseYouTubeLinkText("\uFEFF  https://youtu.be/dQw4w9WgXcQ  \n")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeLinkText("https://youtu.be/dQw4w9WgXcQ\nextra")).toBeNull();
  });
});
