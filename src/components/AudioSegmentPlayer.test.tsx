import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioSegmentPlayer } from "./AudioSegmentPlayer";

afterEach(() => vi.restoreAllMocks());

describe("AudioSegmentPlayer", () => {
  it("streams from the stable lesson URL without creating a Blob source", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const source = "/api/listening/audio/listening/en/lessons/lesson-id/audio.mp3";
    const { container } = render(<AudioSegmentPlayer locale="en" src={source} startMs={0} endMs={1000} />);
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute("src")).toBe(source);
    expect(audio?.getAttribute("preload")).toBe("auto");
  });
});
