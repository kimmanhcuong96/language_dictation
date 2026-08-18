import { describe, expect, it } from "vitest";
import { defaultListeningPreferences, matchesReplayShortcut, normalizeListeningPreferences, parseListeningPreferences, type ReplayKeyboardEvent } from "./listeningPreferences";

describe("listening preferences", () => {
  it("accepts a complete valid preference set", () => {
    const value = { replayKey:"Control+Shift", playPauseKey:"Backquote", autoReplay:true, replayDelaySeconds:1, wordSuggestions:true, shortcutTips:false };
    expect(parseListeningPreferences(value)).toEqual(value);
  });

  it("rejects invalid values at the API boundary", () => {
    expect(parseListeningPreferences({ ...defaultListeningPreferences, replayDelaySeconds:99 })).toBeNull();
    expect(parseListeningPreferences({ ...defaultListeningPreferences, replayKey:"KeyR" })).toBeNull();
    expect(parseListeningPreferences({ ...defaultListeningPreferences, playPauseKey:"Space" })).toBeNull();
  });

  it("normalizes partial stored preferences without losing safe defaults", () => {
    expect(normalizeListeningPreferences({ autoReplay:true })).toEqual({ ...defaultListeningPreferences, autoReplay:true });
  });

  it("matches modifier and combination replay shortcuts", () => {
    const event = (overrides:Partial<ReplayKeyboardEvent>):ReplayKeyboardEvent => ({ key:"", code:"", ctrlKey:false, shiftKey:false, altKey:false, metaKey:false, ...overrides });
    expect(matchesReplayShortcut(event({ key:"Control", ctrlKey:true }), "Control")).toBe(true);
    expect(matchesReplayShortcut(event({ key:"Shift", ctrlKey:true, shiftKey:true }), "Control+Shift")).toBe(true);
    expect(matchesReplayShortcut(event({ code:"Space", key:" ", ctrlKey:true }), "Control+Space")).toBe(true);
    expect(matchesReplayShortcut(event({ code:"KeyB", key:"b", ctrlKey:true }), "Control+KeyB")).toBe(true);
    expect(matchesReplayShortcut(event({ code:"KeyB", key:"b" }), "Control+KeyB")).toBe(false);
  });
});
