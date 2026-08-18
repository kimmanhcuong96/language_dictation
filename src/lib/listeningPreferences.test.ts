import { describe, expect, it } from "vitest";
import { defaultListeningPreferences, normalizeListeningPreferences, parseListeningPreferences } from "./listeningPreferences";

describe("listening preferences", () => {
  it("accepts a complete valid preference set", () => {
    const value = { replayKey:"ControlLeft", playPauseKey:"Backquote", autoReplay:true, replayDelaySeconds:1, wordSuggestions:true, shortcutTips:false };
    expect(parseListeningPreferences(value)).toEqual(value);
  });

  it("rejects invalid values at the API boundary", () => {
    expect(parseListeningPreferences({ ...defaultListeningPreferences, replayDelaySeconds:99 })).toBeNull();
    expect(parseListeningPreferences({ ...defaultListeningPreferences, replayKey:"Backquote", playPauseKey:"Backquote" })).toBeNull();
  });

  it("normalizes partial stored preferences without losing safe defaults", () => {
    expect(normalizeListeningPreferences({ autoReplay:true })).toEqual({ ...defaultListeningPreferences, autoReplay:true });
  });
});
