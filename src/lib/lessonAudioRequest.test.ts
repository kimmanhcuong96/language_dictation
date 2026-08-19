import { describe, expect, it } from "vitest";
import { buildLessonAudioRequestUrl } from "./lessonAudioRequest";

describe("buildLessonAudioRequestUrl", () => {
  it("keeps the stable streaming URL for the initial request", () => {
    expect(buildLessonAudioRequestUrl("/api/listening/audio/listening/lesson.mp3", 0, "page-id"))
      .toBe("/api/listening/audio/listening/lesson.mp3");
  });

  it("cache-busts retries and preserves query strings and fragments", () => {
    expect(buildLessonAudioRequestUrl("/audio.mp3?version=2#player", 3, "page id"))
      .toBe("/audio.mp3?version=2&audio_request=page%20id-3#player");
  });
});
