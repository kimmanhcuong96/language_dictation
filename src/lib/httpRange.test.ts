import { describe, expect, it } from "vitest";
import { resolveObjectRange } from "./httpRange";

describe("resolveObjectRange", () => {
  it("does not treat a missing or empty range as a partial response", () => {
    expect(resolveObjectRange(undefined, 1000)).toBeNull();
    expect(resolveObjectRange({}, 1000)).toBeNull();
  });

  it("resolves offset and bounded length ranges", () => {
    expect(resolveObjectRange({ offset: 100, length: 250 }, 1000)).toEqual({ start: 100, length: 250 });
    expect(resolveObjectRange({ offset: 0, length: 250, suffix: undefined }, 1000)).toEqual({ start: 0, length: 250 });
    expect(resolveObjectRange({ offset: 900, length: 250 }, 1000)).toEqual({ start: 900, length: 100 });
  });

  it("resolves suffix ranges", () => {
    expect(resolveObjectRange({ suffix: 200 }, 1000)).toEqual({ start: 800, length: 200 });
    expect(resolveObjectRange({ suffix: 2000 }, 1000)).toEqual({ start: 0, length: 1000 });
  });
});
