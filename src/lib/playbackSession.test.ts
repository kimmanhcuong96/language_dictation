import { describe, expect, it } from "vitest";
import { createPlaybackSessionController } from "./playbackSession";

describe("sentence playback sessions", () => {
  it("invalidates callbacks from an older sentence", () => {
    const controller = createPlaybackSessionController();
    const first = controller.begin();
    const second = controller.begin();
    expect(controller.isActive(first)).toBe(false);
    expect(controller.isActive(second)).toBe(true);
    controller.invalidate();
    expect(controller.isActive(second)).toBe(false);
  });
});
