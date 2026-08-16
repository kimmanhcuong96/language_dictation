import { describe, expect, it } from "vitest";
import { getSegmentBounds, toRealTime, toVirtualTime } from "./audioSegment";

describe("virtual audio segment calculations", () => {
  it("maps lesson time into sentence time", () => expect(toVirtualTime(13.9, 12.4, 3)).toBeCloseTo(1.5));
  it("maps virtual seek into the full audio", () => expect(toRealTime(2, 12.4, 3)).toBeCloseTo(14.4));
  it("applies padding without exceeding audio duration", () => expect(getSegmentBounds(100, 990, 1, 50)).toEqual({ startSeconds: .05, endSeconds: 1, durationSeconds: .95 }));
});
